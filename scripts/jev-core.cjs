#!/usr/bin/env node
'use strict';
/**
 * scripts/jev-core.cjs
 *
 * Nucleo compartilhado da integracao Jev (TypeSafe System One).
 * Concentra: configuracao por ambiente, payload das perguntas, leitura do
 * transcript da IDE, cache isolado por sessao/mensagem, chamada REST oficial,
 * politica de gating por confianca e diretiva adaptativa.
 *
 * Correcoes implementadas aqui (ver docs/correcoes-jev-grpc-2026-09-20.md):
 * 1. Cache por sessao + passo + hash do texto (fim da colisao por step_index).
 * 2. Confianca governa a diretiva (faixas alta/media/baixa).
 * 3. Diretiva segue tipo de tarefa, testes reais, risco de producao e severidade.
 * 4. Falhas sempre registradas com reason/error_code (observabilidade).
 * 5. Adaptador de transcript para USER_INPUT, event_msg/payload e role:user.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const SPECIALISTS = {
  ana_ui_ux: 'Ana (Especialista em UI/UX)',
  kastiel_dev: 'Kastiel (Desenvolvedor Senior Fullstack)',
  crowley_sec: 'Crowley (Especialista em Seguranca da Informacao)',
  teclide_qa: 'Teclide (Engenheiro de QA e Performance)',
  vitor_sre: 'Vitor (SRE / Infraestrutura e Producao)'
};

const DEFAULT_CONFIG = {
  apiBaseUrl: 'https://api.typesafe.ai',
  model: 'jev-latest',
  restTimeoutMs: 6000,
  grpcAddress: '127.0.0.1:50051',
  grpcTimeoutMs: 3000,
  grpcProbeMs: 400,
  transport: 'auto',
  stateDir: path.join(PROJECT_ROOT, 'scratch'),
  metricsDir: path.join(PROJECT_ROOT, '.metrics'),
  cacheTtlMs: 30 * 60 * 1000,
  cacheMaxEntries: 24,
  maxStateChars: 20000,
  // Limiares seguem a recomendacao oficial de faixas de confianca
  // (https://docs.typesafe.ai/confidence): piso para agir, faixa alta para
  // impor decisao e mandato de teste so acima de um piso proprio.
  thresholds: {
    leaderHigh: 0.65,
    leaderLow: 0.45,
    taskConfidenceFloor: 0.5,
    testsMandatory: 0.6,
    testsConsider: 0.25,
    prodRisk: 0.5,
    severityHigh: 1.5
  }
};

const CACHE_FILE = '.jev_route_cache.json';
const CACHE_VERSION = 2;

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function loadEnvFile(explicitPath) {
  if (typeof process.loadEnvFile !== 'function') return;
  // JEV_SKIP_DOTENV=1 desliga a leitura do .env (usado por testes e para
  // reproduzir o estado "sem configuracao"). Variaveis ja presentes no
  // ambiente sempre prevalecem sobre o arquivo.
  if (/^(1|true|yes|on)$/i.test(String(process.env.JEV_SKIP_DOTENV || ''))) return;
  const candidates = [explicitPath, path.join(PROJECT_ROOT, '.env')].filter(Boolean);
  for (const file of candidates) {
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      // arquivo ausente: segue com o ambiente atual
    }
  }
}

function getConfig(overrides = {}) {
  loadEnvFile(overrides.envFile);
  const env = process.env;
  const thresholds = { ...DEFAULT_CONFIG.thresholds };
  if (env.JEV_THRESHOLDS_JSON) {
    try {
      Object.assign(thresholds, JSON.parse(env.JEV_THRESHOLDS_JSON));
    } catch {
      // JSON invalido: mantem os limiares padrao
    }
  }
  const config = {
    apiKey: env.TYPESAFE_API_KEY || '',
    apiBaseUrl: (env.JEV_API_BASE_URL || DEFAULT_CONFIG.apiBaseUrl).replace(/\/+$/, ''),
    model: env.JEV_MODEL || DEFAULT_CONFIG.model,
    restTimeoutMs: toNumber(env.JEV_REST_TIMEOUT_MS, DEFAULT_CONFIG.restTimeoutMs),
    grpcAddress: env.JEV_GRPC_ADDRESS || DEFAULT_CONFIG.grpcAddress,
    grpcPort: toNumber(env.JEV_GRPC_PORT, 50051),
    grpcHost: env.JEV_GRPC_HOST || '127.0.0.1',
    grpcTimeoutMs: toNumber(env.JEV_GRPC_TIMEOUT_MS, DEFAULT_CONFIG.grpcTimeoutMs),
    grpcProbeMs: toNumber(env.JEV_GRPC_PROBE_MS, DEFAULT_CONFIG.grpcProbeMs),
    transport: String(env.JEV_TRANSPORT || DEFAULT_CONFIG.transport).toLowerCase(),
    grpcRequired: toBool(env.JEV_GRPC_REQUIRED, false),
    debug: toBool(env.JEV_DEBUG, false),
    stateDir: env.JEV_STATE_DIR || DEFAULT_CONFIG.stateDir,
    metricsDir: env.JEV_METRICS_DIR || DEFAULT_CONFIG.metricsDir,
    cacheTtlMs: toNumber(env.JEV_CACHE_TTL_MS, DEFAULT_CONFIG.cacheTtlMs),
    cacheMaxEntries: toNumber(env.JEV_CACHE_MAX_ENTRIES, DEFAULT_CONFIG.cacheMaxEntries),
    maxStateChars: toNumber(env.JEV_MAX_STATE_CHARS, DEFAULT_CONFIG.maxStateChars),
    thresholds
  };
  const merged = { ...config, ...overrides };
  merged.thresholds = { ...thresholds, ...(overrides.thresholds || {}) };
  return merged;
}

function buildQuestions() {
  return {
    especialista_tone: {
      type: 'choice',
      instructions: 'Qual especialista da Operacao TONE deve liderar esta demanda tecnica?',
      criteria: {
        ana_ui_ux: 'Alteracoes visuais, componentes de tela, cores, tipografia, jornada do usuario e CSS',
        kastiel_dev: 'Implementacao de logica no codigo, hooks, funcoes, APIs, componentes React e integracao',
        crowley_sec: 'Seguranca, autenticacao, permissoes, sanitizacao contra XSS e analise de risco',
        teclide_qa: 'Testes de performance, assertividade, qualidade de codigo e homologacao funcional',
        vitor_sre: 'Infraestrutura, Docker, deploy na VPS, portas de rede, Caddy, SSL e disponibilidade'
      }
    },
    tipo_tarefa: {
      type: 'choice',
      instructions: 'Qual o formato e o tipo desta tarefa?',
      criteria: {
        bugfix_urgente: 'Correcao de algo que quebrou ou nao esta se comportando como o esperado',
        nova_feature: 'Construcao de uma funcionalidade nova ou pagina nao existente',
        duvida_conceitual: 'Pergunta sobre arquitetura, ferramentas, documentacao ou estrategia',
        deploy_infra: 'Publicacao, subida de versao, comandos de servidor ou apontamento'
      }
    },
    toca_producao: {
      type: 'noul',
      instructions: 'Esta solicitacao afeta diretamente o servidor de producao, containers Docker ou servicos no ar?'
    },
    requer_testes_reais: {
      type: 'noul',
      instructions: 'A conclusao desta demanda exige execucao de testes reais automatizados no terminal?'
    },
    severidade: {
      type: 'score',
      instructions: 'Nivel de criticidade ou impacto da demanda',
      criteria: [
        'Baixo: duvida ou refinamento visual menor',
        'Medio: ajuste de funcionalidade ativa com impacto local',
        'Alto: erro bloqueante de operacao ou risco a producao'
      ]
    }
  };
}

function normalizeUserText(raw) {
  if (raw === undefined || raw === null) return '';
  let text = typeof raw === 'string' ? raw : String(raw);
  const reqMatch = text.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
  if (reqMatch) text = reqMatch[1];
  return text.replace(/\u0000/g, '').trim();
}

function coerceText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => (typeof part === 'string' ? part : part && (part.text || part.content) ? String(part.text || part.content) : ''))
      .join('\n');
  }
  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (typeof value.content === 'string') return value.content;
  }
  return '';
}

/**
 * Adaptador de transcript: cada cliente/IDE grava um formato diferente.
 * Devolve { text, stepIndex, sessionId, shape } para o primeiro registro de
 * usuario encontrado de baixo para cima, ou null se nenhum for reconhecido.
 */
function extractUserEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const type = String(entry.type || '').toLowerCase();
  const payload = entry.payload && typeof entry.payload === 'object' ? entry.payload : null;
  const eventMsg = entry.event_msg && typeof entry.event_msg === 'object' ? entry.event_msg : null;
  const eventPayload = eventMsg && eventMsg.payload && typeof eventMsg.payload === 'object' ? eventMsg.payload : null;
  const stepIndex = entry.step_index ?? entry.stepIndex ?? entry.index ?? null;
  const sessionId = entry.session_id ?? entry.sessionId ?? entry.conversation_id ?? entry.conversationId ?? null;
  const meta = (shape) => ({ stepIndex, sessionId, shape });

  const candidates = [];
  if (type === 'user_input') candidates.push(['user_input.content', entry.content]);
  const payloadType = payload && payload.type ? String(payload.type).toLowerCase() : '';
  const eventType = eventPayload && eventPayload.type ? String(eventPayload.type).toLowerCase() : '';
  if (payloadType.includes('user_message') || payloadType.includes('user_input')) {
    candidates.push(['payload.user_message', payload.message ?? payload.text ?? payload.content]);
  }
  if (eventType.includes('user_message') || eventType.includes('user_input')) {
    candidates.push(['event_msg.payload', eventPayload.message ?? eventPayload.text ?? eventPayload.content]);
  }
  if (payload && (payload.role === 'user' || String(payload.role || '').toLowerCase() === 'user')) {
    candidates.push(['payload.role_user', payload.content ?? payload.text]);
  }
  if (String(entry.role || '').toLowerCase() === 'user') candidates.push(['entry.role_user', entry.content ?? entry.text]);

  for (const [shape, value] of candidates) {
    const text = normalizeUserText(coerceText(value));
    if (text.length >= 2) {
      return { text, ...meta(shape) };
    }
  }
  return null;
}

function readLatestUserPrompt(transcriptPath, options = {}) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return { ok: false, reason: 'transcript_missing', path: transcriptPath || null };
  }
  let content = '';
  try {
    content = fs.readFileSync(transcriptPath, 'utf8');
  } catch (err) {
    return { ok: false, reason: 'transcript_unreadable', error: err && err.message };
  }
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const maxLines = options.maxLines || 500;
  const start = Math.max(0, lines.length - maxLines);
  for (let i = lines.length - 1; i >= start; i--) {
    let entry = null;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const found = extractUserEntry(entry);
    if (found) {
      return { ok: true, ...found, line: i + 1, transcriptPath };
    }
  }
  return { ok: false, reason: 'no_user_entry_in_transcript', path: transcriptPath };
}

function hashValue(value, length = 20) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length);
}

function cacheFilePath(config) {
  return path.join(config.stateDir, CACHE_FILE);
}

/**
 * Chave de cache com isolamento real: sessao + passo + hash do texto.
 * Antes bastava o step_index, o que suprimia pedidos de outras sessoes.
 */
function cacheKey({ sessionId, stepIndex, text }) {
  const textHash = hashValue(normalizeUserText(text).replace(/\s+/g, ' '), 32);
  const session = sessionId === null || sessionId === undefined || sessionId === '' ? 'no-session' : sessionId;
  const step = stepIndex === null || stepIndex === undefined || stepIndex === '' ? 'no-step' : stepIndex;
  return `${hashValue(`${session}|${step}|${textHash}`, 28)}`;
}

function readCacheFile(config) {
  const file = cacheFilePath(config);
  if (!fs.existsSync(file)) return { version: CACHE_VERSION, entries: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed && Array.isArray(parsed.entries)) return parsed;
  } catch {
    // cache corrompido: recomeca vazio
  }
  return { version: CACHE_VERSION, entries: [] };
}

function writeCacheFile(config, data) {
  const file = cacheFilePath(config);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  } catch {
    // cache e otimizacao: falha silenciosa nao pode quebrar o turno
  }
}

function pruneEntries(entries, config) {
  const now = Date.now();
  const alive = entries.filter((entry) => entry && entry.expiresAt > now);
  if (alive.length <= config.cacheMaxEntries) return alive;
  return alive.slice(alive.length - config.cacheMaxEntries);
}

function cacheLookup(config, key) {
  const data = readCacheFile(config);
  const alive = pruneEntries(data.entries, config);
  const hit = alive.find((entry) => entry.key === key);
  if (!hit) {
    if (alive.length !== data.entries.length) writeCacheFile(config, { version: CACHE_VERSION, entries: alive });
    return { hit: false };
  }
  return { hit: true, directive: hit.directive, createdAt: hit.createdAt, meta: hit.meta || {} };
}

function cacheStore(config, key, directive, meta = {}) {
  const data = readCacheFile(config);
  const now = Date.now();
  const entries = pruneEntries(data.entries, config).filter((entry) => entry.key !== key);
  entries.push({ key, directive, meta, createdAt: new Date(now).toISOString(), expiresAt: now + config.cacheTtlMs });
  writeCacheFile(config, { version: CACHE_VERSION, entries: pruneEntries(entries, config) });
}

function cacheClear(config) {
  writeCacheFile(config, { version: CACHE_VERSION, entries: [] });
}

function appendJsonl(file, payload) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(payload)}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/** Registro de execucao do hook/ponte. Nunca grava o texto do prompt. */
function logEvent(config, event) {
  const entry = {
    ts: new Date().toISOString(),
    service: 'jev-hook',
    ...event
  };
  return appendJsonl(path.join(config.metricsDir, 'jev-hook-events.jsonl'), entry);
}

/** Telemetria compativel com o formato historico do jev-prompt-router. */
function appendTelemetry(config, entry) {
  return appendJsonl(path.join(config.metricsDir, 'jev-telemetry.jsonl'), entry);
}

async function classifyViaRest({ state, config, fetchImpl, questions }) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.restTimeoutMs);
  const elapsed = () => Date.now() - started;
  try {
    const res = await (fetchImpl || globalThis.fetch)(`${config.apiBaseUrl}/v1/systemone`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ state, model: config.model, questions: questions || buildQuestions() }),
      signal: controller.signal
    });
    if (!res.ok) {
      let body = '';
      try {
        body = (await res.text()).slice(0, 300);
      } catch {
        body = '';
      }
      return {
        ok: false,
        errorCode: 'upstream_error',
        errorMessage: `HTTP ${res.status}${body ? `: ${body}` : ''}`,
        httpStatus: res.status,
        durationMs: elapsed()
      };
    }
    const data = await res.json();
    if (!data || typeof data !== 'object' || !data.answers || typeof data.answers !== 'object') {
      return {
        ok: false,
        errorCode: 'upstream_contract',
        errorMessage: 'Resposta sem o campo answers',
        httpStatus: res.status,
        durationMs: elapsed()
      };
    }
    return { ok: true, model: data.model || config.model, answers: data.answers, usage: data.usage || {}, durationMs: elapsed() };
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    return {
      ok: false,
      errorCode: aborted ? 'timeout' : 'network_error',
      errorMessage: err && err.message ? err.message : String(err),
      durationMs: elapsed()
    };
  } finally {
    clearTimeout(timer);
  }
}

function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function pct(value) {
  return value === null ? 'n/d' : `${(value * 100).toFixed(1)}%`;
}

function topAlternatives(answer, limit = 2) {
  const probabilities = answer && answer.probabilities ? answer.probabilities : null;
  if (!probabilities) return [];
  return Object.entries(probabilities)
    .filter(([name, value]) => name !== answer.choice && Number.isFinite(value) && value > 0.001)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/**
 * Politica de gating por confianca (docs.typesafe.ai/confidence + intent-routing).
 * A classificacao nunca concede autoridade: ela orienta a forma de trabalhar.
 */
function decideRouting(answers, config) {
  const th = config.thresholds;
  const src = answers || {};
  const leaderAnswer = src.especialista_tone || {};
  const leaderId = leaderAnswer.choice || null;
  const leaderConfidence = finiteOrNull(leaderAnswer.confidence);
  const leaderLevel =
    leaderConfidence === null ? 'unknown' : leaderConfidence >= th.leaderHigh ? 'alta' : leaderConfidence >= th.leaderLow ? 'media' : 'baixa';
  const leaderAuthoritative = leaderLevel === 'alta';

  const taskAnswer = src.tipo_tarefa || {};
  const taskChoice = taskAnswer.choice || null;
  const taskConfidence = finiteOrNull(taskAnswer.confidence);
  const taskConfident = taskConfidence === null ? true : taskConfidence >= th.taskConfidenceFloor;
  const taskType = taskConfident ? taskChoice : null;

  const testsProbability = finiteOrNull(src.requer_testes_reais && src.requer_testes_reais.noul);
  const testsPolicy =
    testsProbability === null ? 'unknown' : testsProbability >= th.testsMandatory ? 'mandatory' : testsProbability >= th.testsConsider ? 'recommended' : 'none';

  const productionProbability = finiteOrNull(src.toca_producao && src.toca_producao.noul);
  const productionRisk = productionProbability !== null && productionProbability >= th.prodRisk;

  const severity = finiteOrNull(src.severidade && src.severidade.score);
  const severityConfidence = finiteOrNull(src.severidade && src.severidade.confidence);
  const severityHigh = severity !== null && severity >= th.severityHigh;
  const severityUncertain = severityConfidence !== null && severityConfidence < th.taskConfidenceFloor;

  const notices = [];
  if (leaderLevel === 'baixa') notices.push('lideranca_inconclusiva');
  if (leaderLevel === 'media') notices.push('lideranca_hipotese');
  if (!taskConfident && taskChoice) notices.push('tipo_tarefa_nao_classificado');
  if (productionRisk) notices.push('indicio_producao');
  if (testsPolicy === 'none') notices.push('sem_mandato_de_testes');
  if (severityHigh) notices.push('severidade_alta');
  if (severityUncertain && !severityHigh) notices.push('severidade_incerta');

  const mustAskUser =
    leaderLevel === 'baixa' || (!taskConfident && leaderLevel !== 'alta') || (taskChoice === null && leaderId === null);

  return {
    leaderId,
    leaderName: leaderId ? SPECIALISTS[leaderId] || leaderId : null,
    leaderConfidence,
    leaderLevel,
    leaderAuthoritative,
    leaderAlternatives: topAlternatives(leaderAnswer),
    taskType,
    taskChoice,
    taskConfidence,
    taskConfident,
    testsProbability,
    testsPolicy,
    productionProbability,
    productionRisk,
    severity,
    severityConfidence,
    severityHigh,
    notices,
    mustAskUser
  };
}

/**
 * Diretiva adaptativa: cada decisao da classificacao muda o texto entregue ao
 * agente. Nenhuma linha exige obediencia cega nem atesta seguranca.
 */
function buildDirective(decision, meta = {}) {
  const transportLabel =
    meta.transport === 'grpc'
      ? 'gRPC (ponte local)'
      : meta.transport === 'grpc-cache'
        ? 'gRPC (ponte local, cache)'
        : meta.transport === 'rest'
          ? 'HTTPS direto'
          : 'transporte local';
  const duration = Number.isFinite(meta.durationMs) ? `${meta.durationMs}ms` : 'n/d';
  const lines = [];
  lines.push(`===== [ORQUESTRAÇÃO JEV · TypeSafe System One via ${transportLabel} — ${duration}] =====`);
  lines.push(`Classificação: ${meta.model || 'modelo n/d'} · política de gating aplicada em código`);

  const alt = decision.leaderAlternatives.length
    ? ` · alternativas: ${decision.leaderAlternatives.map(([name, value]) => `${name} ${pct(value)}`).join(', ')}`
    : '';
  if (decision.leaderLevel === 'alta' && decision.leaderName) {
    lines.push(`- Liderança designada: ${decision.leaderName} — ${pct(decision.leaderConfidence)} de confiança (faixa alta)${alt}`);
  } else if (decision.leaderLevel === 'media' && decision.leaderName) {
    lines.push(`- Liderança sugerida (hipótese): ${decision.leaderName} — ${pct(decision.leaderConfidence)} de confiança (faixa média)${alt}`);
    lines.push('  Confirme a leitura no código antes de decisões de arquitetura; se discordar, diga por quê.');
  } else if (decision.leaderId) {
    const floorPct = Number.isFinite(meta.leaderLowPct) ? meta.leaderLowPct : 45;
    lines.push(
      `- Liderança INCONCLUSIVA: o Jev apontou ${decision.leaderId} com apenas ${pct(decision.leaderConfidence)} de confiança (abaixo do piso ${floorPct.toFixed(0)}%). Não imponha especialista.${alt}`
    );
  } else {
    lines.push('- Liderança não classificada: nenhum especialista acima do piso de confiança.');
  }

  if (decision.taskType) {
    lines.push(`- Tipo de tarefa: ${decision.taskType} — ${pct(decision.taskConfidence)} de confiança`);
  } else if (decision.taskChoice) {
    lines.push(
      `- Tipo de tarefa: INCERTO (${decision.taskChoice} com ${pct(decision.taskConfidence)}, abaixo do piso) → trate como não classificado`
    );
  }

  if (decision.productionRisk) {
    lines.push(
      `- Risco de produção: ${pct(decision.productionProbability)} — INDÍCIO de impacto em produção. Não execute deploy, comandos de servidor ou mudanças de infraestrutura sem autorização explícita do PO; proponha plano e rollback antes de agir.`
    );
  } else {
    lines.push(
      `- Risco de produção: ${pct(decision.productionProbability)} — indício baixo. Isso não é atestado de segurança: deploy, exclusão de dados e mudança de infraestrutura seguem exigindo autorização explícita do PO.`
    );
  }

  lines.push(`- Exigência de testes reais: ${pct(decision.testsProbability)}`);
  lines.push(
    `- Severidade calibrada: ${decision.severity === null ? 'n/d' : decision.severity.toFixed(2)} / 2.00${decision.severityConfidence !== null ? ` (confiança ${pct(decision.severityConfidence)})` : ''}`
  );
  lines.push('');
  lines.push('COMO CONDUZIR ESTA DEMANDA:');

  let step = 1;
  if (decision.mustAskUser) {
    lines.push(
      `${step}. A classificação não foi conclusiva. Se o pedido do Yuri for ambíguo, faça UMA pergunta objetiva antes de mudanças de escopo ou arquitetura. Se for inequívoco, siga a leitura mais simples e diga qual especialista você adotou e por quê.`
    );
    step += 1;
  }
  if (decision.taskType === 'duvida_conceitual') {
    lines.push(`${step}. Demanda conceitual: responda a pergunta primeiro; não altere código sem pedido explícito.`);
    step += 1;
  }
  if (decision.testsPolicy === 'mandatory') {
    lines.push(`${step}. Testes reais: obrigatórios antes de declarar conclusão — registre os comandos executados e o resultado obtido.`);
    step += 1;
  } else if (decision.testsPolicy === 'recommended') {
    lines.push(`${step}. Testes reais: recomendados para o que for tocado; o que não for validado precisa ser declarado como não validado.`);
    step += 1;
  } else {
    lines.push(`${step}. Testes reais: sem mandato de testes nesta demanda; declare explicitamente o que ficou sem validação.`);
    step += 1;
  }
  lines.push(`${step}. Não presuma comportamento: valide no código e no ambiente real quando acessível. Se usar dados simulados, mocks ou fixtures, diga o que foi simulado.`);
  step += 1;
  if (decision.severityHigh) {
    lines.push(`${step}. Severidade alta: contenção primeiro, uma mudança por vez, com healthcheck e rollback descrito antes de aplicar.`);
    step += 1;
  }
  if (decision.productionRisk) {
    lines.push(`${step}. Antes de qualquer ação sensível, apresente o plano e espere autorização do PO.`);
    step += 1;
  }
  lines.push('');
  lines.push('LIMITES DESTA DIRETIVA:');
  lines.push('- Orienta a forma de trabalhar; não autoriza deploy, acesso a produção, exclusão de dados, rotação de segredos nem mudança de escopo.');
  lines.push('- Classificação é probabilística: encaminhamento errado é possível. Prevalecem o pedido do Yuri, o código atual e os invariantes do projeto.');
  return lines.join('\n');
}

module.exports = {
  PROJECT_ROOT,
  SPECIALISTS,
  DEFAULT_CONFIG,
  CACHE_FILE,
  CACHE_VERSION,
  toNumber,
  toBool,
  loadEnvFile,
  getConfig,
  buildQuestions,
  normalizeUserText,
  extractUserEntry,
  readLatestUserPrompt,
  hashValue,
  cacheKey,
  cacheFilePath,
  readCacheFile,
  writeCacheFile,
  cacheLookup,
  cacheStore,
  cacheClear,
  appendJsonl,
  logEvent,
  appendTelemetry,
  classifyViaRest,
  decideRouting,
  buildDirective,
  finiteOrNull,
  pct,
  topAlternatives
};
