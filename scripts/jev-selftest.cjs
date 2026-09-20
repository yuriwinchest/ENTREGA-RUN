#!/usr/bin/env node
'use strict';
/**
 * scripts/jev-selftest.cjs
 *
 * Validacao automatizada da integracao Jev (hook + nucleo + ponte gRPC).
 * Reproduz os defeitos encontrados no diagnostico e prova que estao corrigidos,
 * com API oficial simulada (mock HTTP local), nenhuma chamada externa e nenhuma
 * credencial real. Rode com: npm run jev:selftest
 */

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const core = require('./jev-core.cjs');
const grpcClient = require('./jev-grpc-client.cjs');

const HOOK = path.join(__dirname, 'jev-pre-invocation-hook.cjs');
const GRPC_SERVER = path.join(__dirname, 'jev-grpc-server.cjs');
const CLIENT = path.join(__dirname, 'jev-grpc-client.cjs');
const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-selftest-'));
const TEST_KEY = 'selftest-key';
const SECRET_MARKER = 'SELFTEST_SECRET_MARKER_NAO_DEVE_APARECER_NA_TELEMETRIA';

const PROB = (winner, losers = {}) => ({ [winner]: 0.78, ...losers });

const PROFILES = {
  default: {
    especialista_tone: { choice: 'kastiel_dev', confidence: 0.8, probabilities: PROB('kastiel_dev', { crowley_sec: 0.12, teclide_qa: 0.05, ana_ui_ux: 0.03 }) },
    tipo_tarefa: { choice: 'bugfix_urgente', confidence: 0.63, probabilities: { bugfix_urgente: 0.66, deploy_infra: 0.2, nova_feature: 0.08, duvida_conceitual: 0.06 } },
    toca_producao: 0.08,
    requer_testes_reais: 0.72,
    severidade: { score: 0.64, confidence: 0.55 }
  },
  lowconf: {
    especialista_tone: { choice: 'vitor_sre', confidence: 0.2, probabilities: { vitor_sre: 0.31, teclide_qa: 0.29, kastiel_dev: 0.24, crowley_sec: 0.16 } },
    tipo_tarefa: { choice: 'nova_feature', confidence: 0.34, probabilities: { nova_feature: 0.42, bugfix_urgente: 0.35, duvida_conceitual: 0.23 } },
    toca_producao: 0.41,
    requer_testes_reais: 0.44,
    severidade: { score: 0.9, confidence: 0.3 }
  },
  concept: {
    especialista_tone: { choice: 'teclide_qa', confidence: 0.71, probabilities: PROB('teclide_qa', { kastiel_dev: 0.15, crowley_sec: 0.07 }) },
    tipo_tarefa: { choice: 'duvida_conceitual', confidence: 0.99, probabilities: { duvida_conceitual: 0.99, nova_feature: 0.01 } },
    toca_producao: 0.03,
    requer_testes_reais: 0.09,
    severidade: { score: 0.01, confidence: 0.99 }
  },
  prodrisk: {
    especialista_tone: { choice: 'vitor_sre', confidence: 0.82, probabilities: PROB('vitor_sre', { crowley_sec: 0.1, kastiel_dev: 0.05 }) },
    tipo_tarefa: { choice: 'deploy_infra', confidence: 0.9, probabilities: { deploy_infra: 0.92, bugfix_urgente: 0.08 } },
    toca_producao: 0.93,
    requer_testes_reais: 0.8,
    severidade: { score: 1.7, confidence: 0.8 }
  }
};

function answersFor(profileName) {
  const profile = PROFILES[profileName] || PROFILES.default;
  return {
    especialista_tone: { type: 'choice', ...profile.especialista_tone },
    tipo_tarefa: { type: 'choice', ...profile.tipo_tarefa },
    toca_producao: { type: 'noul', noul: profile.toca_producao },
    requer_testes_reais: { type: 'noul', noul: profile.requer_testes_reais },
    severidade: { type: 'score', score: profile.severidade.score, confidence: profile.severidade.confidence, probabilities: { 0: 1 - profile.severidade.score / 2, 1: 0.2, 2: profile.severidade.score / 2 } }
  };
}

const mock = {
  server: null,
  baseUrl: '',
  calls: 0,
  states: [],
  authHeaders: [],
  failNext: false
};

function startMockApi() {
  return new Promise((resolve) => {
    mock.server = http.createServer((req, res) => {
      if (req.method !== 'POST' || !req.url.startsWith('/v1/systemone')) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'not_found' }));
        return;
      }
      mock.calls += 1;
      mock.authHeaders.push(req.headers.authorization || '');
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        let payload = {};
        try {
          payload = JSON.parse(body);
        } catch {
          payload = {};
        }
        const state = String(payload.state || '');
        mock.states.push(state);
        if (mock.failNext) {
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'internal_selftest' }));
          return;
        }
        const profileName = state.includes('#LOWCONF')
          ? 'lowconf'
          : state.includes('#CONCEPT')
            ? 'concept'
            : state.includes('#PRODRISK')
              ? 'prodrisk'
              : 'default';
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            model: 'jev-selftest-1.0.0',
            answers: answersFor(profileName),
            usage: { input_tokens: 700, output_tokens: 190 }
          })
        );
      });
    });
    mock.server.listen(0, '127.0.0.1', () => {
      mock.baseUrl = `http://127.0.0.1:${mock.server.address().port}`;
      resolve(mock.baseUrl);
    });
  });
}

function stateDir(name) {
  const dir = path.join(TEMP_ROOT, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function baseEnv(dir, extra = {}) {
  return {
    ...process.env,
    TYPESAFE_API_KEY: TEST_KEY,
    JEV_API_BASE_URL: mock.baseUrl,
    JEV_STATE_DIR: dir,
    JEV_METRICS_DIR: dir,
    JEV_MODEL: 'jev-selftest',
    JEV_TRANSPORT: 'rest',
    JEV_REST_TIMEOUT_MS: '5000',
    JEV_GRPC_TIMEOUT_MS: '2500',
    JEV_GRPC_PROBE_MS: '600',
    JEV_DEBUG: '0',
    JEV_SKIP_DOTENV: '',
    ...extra
  };
}

function writeTranscript(dir, name, entries) {
  const file = path.join(dir, `${name}.jsonl`);
  fs.writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`, 'utf8');
  return file;
}

function userInputEntry(text, stepIndex) {
  return { type: 'USER_INPUT', content: `<USER_REQUEST>${text}</USER_REQUEST>`, step_index: stepIndex };
}

function runNode(script, args, env, timeoutMs = 25000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

function runHook({ transcriptPath, context = {}, env, timeoutMs = 25000, hookPath = HOOK }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [hookPath], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      let parsed = null;
      const lastLine = stdout.trim().split('\n').filter(Boolean).pop();
      try {
        parsed = JSON.parse(lastLine);
      } catch {
        parsed = null;
      }
      const steps = parsed && Array.isArray(parsed.injectSteps) ? parsed.injectSteps : null;
      resolve({
        code,
        stdout,
        stderr,
        parsed,
        steps,
        empty: steps !== null && steps.length === 0,
        directive: steps && steps.length ? steps[0].ephemeralMessage || '' : ''
      });
    });
    child.stdin.end(JSON.stringify({ transcriptPath, ...context }));
  });
}

function readEvents(dir) {
  const file = path.join(dir, 'jev-hook-events.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function findEvent(events, predicate) {
  return events.find(predicate) || null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}

function spawnGrpcServer(env) {
  const child = spawn(process.execPath, [GRPC_SERVER], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (chunk) => {
    log += chunk;
  });
  child.stderr.on('data', (chunk) => {
    log += chunk;
  });
  return { child, getLog: () => log };
}

async function waitBridge(address, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    const probe = await grpcClient.healthViaGrpc({ address, timeoutMs: 500 });
    if (probe.ok) return probe;
    await sleep(150);
  }
  return null;
}

const results = [];
async function scenario(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err && err.message ? err.message : String(err) });
    console.log(`FAIL  ${name}\n      ${err && err.message ? err.message : err}`);
  }
}

async function runScenarios() {
  const sharedDir = stateDir('cache-group');
  const promptBase = `Corrige a lista de cidades que não filtra ao digitar a letra A ${SECRET_MARKER}`;

  await scenario('1. REST: diretiva injetada com faixa alta de confiança', async () => {
    const transcript = writeTranscript(sharedDir, 's1', [userInputEntry(promptBase, 1)]);
    const before = mock.calls;
    const res = await runHook({ transcriptPath: transcript, context: { sessionId: 'sessao-A', stepIndex: 1 }, env: baseEnv(sharedDir) });
    assert.ok(res.steps && res.steps.length === 1, `esperava 1 diretiva; stdout=${res.stdout.trim() || 'vazio'} stderr=${res.stderr.trim()}`);
    assert.match(res.directive, /Liderança designada: Kastiel/);
    assert.match(res.directive, /faixa alta/);
    assert.match(res.directive, /Testes reais: obrigatórios/);
    assert.strictEqual(mock.calls, before + 1, 'esperava exatamente uma chamada ao provedor');
    const injected = findEvent(readEvents(sharedDir), (event) => event.reason === 'injected');
    assert.ok(injected, 'evento injected ausente');
    assert.strictEqual(injected.transport, 'rest');
    assert.strictEqual(injected.leader, 'kastiel_dev');
  });

  await scenario('2. Cache não suprime pedido diferente no mesmo passo', async () => {
    const transcript = writeTranscript(sharedDir, 's2', [userInputEntry('Ajusta o botão de salvar para verde quando houver alterações', 1)]);
    const before = mock.calls;
    const res = await runHook({ transcriptPath: transcript, context: { sessionId: 'sessao-A', stepIndex: 1 }, env: baseEnv(sharedDir) });
    assert.ok(res.steps && res.steps.length === 1, `pedido novo foi suprimido pelo cache; stdout=${res.stdout.trim() || 'vazio'}`);
    assert.strictEqual(mock.calls, before + 1);
  });

  await scenario('3. Cache não suprime pedido de outra sessão no mesmo passo', async () => {
    const transcript = writeTranscript(sharedDir, 's3', [userInputEntry(promptBase, 1)]);
    const before = mock.calls;
    const res = await runHook({ transcriptPath: transcript, context: { sessionId: 'sessao-B', stepIndex: 1 }, env: baseEnv(sharedDir) });
    assert.ok(res.steps && res.steps.length === 1, `pedido de outra sessão foi suprimido; stdout=${res.stdout.trim() || 'vazio'}`);
    assert.strictEqual(mock.calls, before + 1);
  });

  await scenario('4. Mesmo pedido e mesmo turno: cache hit sem nova chamada', async () => {
    const transcript = writeTranscript(sharedDir, 's4', [userInputEntry(promptBase, 1)]);
    const before = mock.calls;
    const res = await runHook({ transcriptPath: transcript, context: { sessionId: 'sessao-A', stepIndex: 1 }, env: baseEnv(sharedDir) });
    assert.ok(res.empty, `esperava injectSteps vazio; recebido ${res.stdout.trim()}`);
    assert.strictEqual(mock.calls, before, 'cache hit não deveria chamar o provedor');
    const hit = findEvent(readEvents(sharedDir), (event) => event.reason === 'cache_hit');
    assert.ok(hit, 'evento cache_hit ausente');
  });

  await scenario('5. Baixa confiança não vira ordem de obediência', async () => {
    const dir = stateDir('lowconf');
    const transcript = writeTranscript(dir, 't', [userInputEntry('#LOWCONF verifica se o deploy subiu', 1)]);
    const res = await runHook({ transcriptPath: transcript, context: { sessionId: 'sessao-L', stepIndex: 1 }, env: baseEnv(dir) });
    assert.ok(res.steps && res.steps.length === 1, `esperava diretiva; stdout=${res.stdout.trim() || 'vazio'}`);
    assert.match(res.directive, /INCONCLUSIVA/);
    assert.match(res.directive, /Não imponha especialista/);
    assert.match(res.directive, /faça UMA pergunta objetiva/);
    assert.doesNotMatch(res.directive, /Liderança designada/);
    assert.doesNotMatch(res.directive, /OBRIGATÓRIA/);
    const injected = findEvent(readEvents(dir), (event) => event.reason === 'injected');
    assert.strictEqual(injected.leaderLevel, 'baixa');
    assert.strictEqual(injected.mustAskUser, true);
    assert.ok(injected.notices.includes('lideranca_inconclusiva'), 'aviso de política ausente');
  });

  await scenario('6. Demanda conceitual não manda executar testes', async () => {
    const dir = stateDir('concept');
    const transcript = writeTranscript(dir, 't', [userInputEntry('#CONCEPT explica como o hook escolhe o especialista', 1)]);
    const res = await runHook({ transcriptPath: transcript, context: { sessionId: 'sessao-C', stepIndex: 1 }, env: baseEnv(dir) });
    assert.ok(res.steps && res.steps.length === 1, `esperava diretiva; stdout=${res.stdout.trim() || 'vazio'}`);
    assert.match(res.directive, /Demanda conceitual/);
    assert.match(res.directive, /sem mandato de testes/);
    assert.doesNotMatch(res.directive, /Testes reais: obrigatórios/);
    const injected = findEvent(readEvents(dir), (event) => event.reason === 'injected');
    assert.strictEqual(injected.testsPolicy, 'none');
    assert.strictEqual(injected.taskType, 'duvida_conceitual');
  });

  await scenario('7. Risco de produção exige autorização e não atesta segurança', async () => {
    const dir = stateDir('prodrisk');
    const transcript = writeTranscript(dir, 't', [userInputEntry('#PRODRISK sobe a nova versão no servidor', 1)]);
    const res = await runHook({ transcriptPath: transcript, context: { sessionId: 'sessao-P', stepIndex: 1 }, env: baseEnv(dir) });
    assert.ok(res.steps && res.steps.length === 1, `esperava diretiva; stdout=${res.stdout.trim() || 'vazio'}`);
    assert.match(res.directive, /INDÍCIO de impacto em produção/);
    assert.match(res.directive, /não autoriza deploy/);
    assert.match(res.directive, /Severidade alta/);
    assert.doesNotMatch(res.directive, /Seguro:/);
    const injected = findEvent(readEvents(dir), (event) => event.reason === 'injected');
    assert.strictEqual(injected.productionRisk, true);
  });

  await scenario('8. Adaptador de transcript aceita event_msg/payload', async () => {
    const dir = stateDir('adapter');
    const transcriptTop = writeTranscript(dir, 'top', [
      { type: 'system', content: 'ruido irrelevante' },
      { type: 'event_msg', payload: { type: 'user_message', message: '#CONCEPT como funciona o cache por sessao' } }
    ]);
    const resTop = await runHook({ transcriptPath: transcriptTop, context: { sessionId: 'sessao-E', stepIndex: 7 }, env: baseEnv(dir) });
    assert.ok(resTop.steps && resTop.steps.length === 1, `payload de topo ignorado; stdout=${resTop.stdout.trim() || 'vazio'}`);
    const injectedTop = findEvent(readEvents(dir), (event) => event.reason === 'injected' && event.transcriptShape === 'payload.user_message');
    assert.ok(injectedTop, 'shape payload.user_message não registrado');

    const transcriptNested = writeTranscript(dir, 'nested', [
      { type: 'event_msg', event_msg: { payload: { type: 'user_message', message: '#PRODRISK sobe a versao no servidor' } } }
    ]);
    const resNested = await runHook({ transcriptPath: transcriptNested, context: { sessionId: 'sessao-E2', stepIndex: 1 }, env: baseEnv(dir) });
    assert.ok(resNested.steps && resNested.steps.length === 1, `event_msg aninhado ignorado; stdout=${resNested.stdout.trim() || 'vazio'}`);
    const injectedNested = findEvent(readEvents(dir), (event) => event.reason === 'injected' && event.transcriptShape === 'event_msg.payload');
    assert.ok(injectedNested, 'shape event_msg.payload não registrado');
  });

  await scenario('9. Sem chave: nada injetado e motivo registrado', async () => {
    const dir = stateDir('nokey');
    const transcript = writeTranscript(dir, 't', [userInputEntry('qualquer pedido', 1)]);
    const res = await runHook({
      transcriptPath: transcript,
      context: { sessionId: 'sessao-K', stepIndex: 1 },
      env: baseEnv(dir, { JEV_SKIP_DOTENV: '1', TYPESAFE_API_KEY: '' })
    });
    assert.ok(res.empty, `esperava injectSteps vazio; recebido ${res.stdout.trim()}`);
    const event = findEvent(readEvents(dir), (item) => item.reason === 'missing_api_key');
    assert.ok(event, 'motivo missing_api_key não registrado');
    assert.strictEqual(event.ok, false);
  });

  await scenario('10. Erro do provedor: falha visível com motivo e status', async () => {
    const dir = stateDir('upstream');
    const transcript = writeTranscript(dir, 't', [userInputEntry('pedido que vai falhar no provedor', 1)]);
    mock.failNext = true;
    let res;
    try {
      res = await runHook({ transcriptPath: transcript, context: { sessionId: 'sessao-F', stepIndex: 1 }, env: baseEnv(dir) });
    } finally {
      mock.failNext = false;
    }
    assert.ok(res.empty, `esperava injectSteps vazio; recebido ${res.stdout.trim()}`);
    const event = findEvent(readEvents(dir), (item) => item.reason === 'upstream_error');
    assert.ok(event, 'motivo upstream_error não registrado');
    assert.strictEqual(event.httpStatus, 500);
  });

  await scenario('11. Ponte gRPC: hook classifica via ponte local e CLI responde', async () => {
    const dir = stateDir('grpc');
    const port = await freePort();
    const address = `127.0.0.1:${port}`;
    const env = baseEnv(dir, { JEV_GRPC_PORT: String(port), JEV_TRANSPORT: 'grpc', JEV_GRPC_ADDRESS: address });
    const bridge = spawnGrpcServer(env);
    try {
      const health = await waitBridge(address);
      assert.ok(health, `ponte não respondeu; log: ${bridge.getLog().trim()}`);
      assert.strictEqual(health.health.service, 'jev-grpc-bridge');
      assert.strictEqual(health.health.has_api_key, true);

      const transcript = writeTranscript(dir, 't', [userInputEntry('Corrige a ordenação da lista de atletas', 1)]);
      const res = await runHook({ transcriptPath: transcript, context: { sessionId: 'sessao-G', stepIndex: 1 }, env });
      assert.ok(res.steps && res.steps.length === 1, `hook não injetou via gRPC; stdout=${res.stdout.trim() || 'vazio'} stderr=${res.stderr.trim()}`);
      assert.match(res.directive, /via gRPC \(ponte local\)/);
      const injected = findEvent(readEvents(dir), (event) => event.reason === 'injected');
      assert.strictEqual(injected.transport, 'grpc');

      const cli = await runNode(CLIENT, ['--json', '--bypass-cache', 'Corrige a ordenação da lista de atletas'], env);
      assert.strictEqual(cli.code, 0, `CLI retornou ${cli.code}: ${cli.stderr.trim()}`);
      const parsed = JSON.parse(cli.stdout);
      assert.strictEqual(parsed.ok, true);
      assert.strictEqual(parsed.transport, 'grpc');
      assert.strictEqual(parsed.leader, 'kastiel_dev');
      assert.ok(parsed.directive.includes('ORQUESTRAÇÃO JEV'), 'CLI não devolveu a diretiva');
    } finally {
      bridge.child.kill();
    }
  });

  await scenario('12. Ponte fora do ar: hook cai para HTTPS e registra o motivo', async () => {
    const dir = stateDir('fallback');
    const port = await freePort();
    const transcript = writeTranscript(dir, 't', [userInputEntry('Ajusta o contador de entregas', 1)]);
    const res = await runHook({
      transcriptPath: transcript,
      context: { sessionId: 'sessao-H', stepIndex: 1 },
      env: baseEnv(dir, { JEV_TRANSPORT: 'auto', JEV_GRPC_ADDRESS: `127.0.0.1:${port}` })
    });
    assert.ok(res.steps && res.steps.length === 1, `fallback não injetou; stdout=${res.stdout.trim() || 'vazio'}`);
    const injected = findEvent(readEvents(dir), (event) => event.reason === 'injected');
    assert.strictEqual(injected.transport, 'rest');
    assert.ok(String(injected.fallbackFrom || '').startsWith('grpc_probe:'), `fallbackFrom inesperado: ${injected.fallbackFrom}`);
  });

  await scenario('13. Telemetria não expõe o texto do prompt nem credencial', async () => {
    const files = [];
    const isAuditArtifact = (name) =>
      /^(jev-hook-events|jev-telemetry)\.jsonl$/.test(name) || /^\.jev_route_cache\.json$/.test(name) || /\.log$/.test(name);
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (isAuditArtifact(entry.name)) files.push(full);
      }
    };
    walk(TEMP_ROOT);
    assert.ok(files.length > 0, 'nenhum artefato de telemetria encontrado');
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(!content.includes(SECRET_MARKER), `arquivo ${file} expôs o texto do prompt`);
      assert.ok(!content.includes('Bearer '), `arquivo ${file} registrou header de autorização`);
    }
    assert.ok(mock.authHeaders.length > 0, 'mock não recebeu chamadas');
    for (const header of mock.authHeaders) {
      assert.strictEqual(header, `Bearer ${TEST_KEY}`, 'chamada não usou apenas a credencial de teste');
    }
  });

  await scenario('14. Projeto sem cliente gRPC instalado: hook segue por HTTPS', async () => {
    const dir = stateDir('nogrpc');
    const isolated = stateDir('nogrpc/bin');
    fs.copyFileSync(path.join(__dirname, 'jev-core.cjs'), path.join(isolated, 'jev-core.cjs'));
    fs.copyFileSync(HOOK, path.join(isolated, 'jev-pre-invocation-hook.cjs'));
    const transcript = writeTranscript(dir, 't', [userInputEntry('Ajusta o total de entregas por modalidade', 1)]);
    const res = await runHook({
      transcriptPath: transcript,
      context: { sessionId: 'sessao-N', stepIndex: 1 },
      env: baseEnv(dir, { JEV_TRANSPORT: 'auto' }),
      hookPath: path.join(isolated, 'jev-pre-invocation-hook.cjs')
    });
    assert.ok(res.steps && res.steps.length === 1, `hook não sobreviveu sem o cliente gRPC; stdout=${res.stdout.trim() || 'vazio'}`);
    const injected = findEvent(readEvents(dir), (event) => event.reason === 'injected');
    assert.strictEqual(injected.transport, 'rest');
    assert.strictEqual(injected.fallbackFrom, 'grpc_probe:grpc_client_unavailable');
  });
}

async function main() {
  await startMockApi();
  console.log(`[jev:selftest] API oficial simulada em ${mock.baseUrl} | artefatos em ${TEMP_ROOT}`);
  console.log('[jev:selftest] nenhuma chamada externa e nenhuma credencial real são usadas\n');

  await runScenarios();
  mock.server.close();

  const failed = results.filter((item) => !item.ok);
  console.log('\n' + '='.repeat(70));
  console.log(`[jev:selftest] ${results.length - failed.length}/${results.length} cenarios aprovados | chamadas simuladas ao provedor: ${mock.calls}`);
  console.log('='.repeat(70));
  if (failed.length) {
    console.log('Falhas:');
    for (const item of failed) console.log(` - ${item.name}: ${item.error}`);
    console.log(`Artefatos preservados para diagnostico em ${TEMP_ROOT}`);
    process.exitCode = 1;
    return;
  }
  try {
    fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
  } catch {
    // limpeza opcional
  }
  console.log('Verificado: cache isolado por sessao/turno/texto, confianca governando a diretiva,');
  console.log('gRPC local com fallback para HTTPS, falhas com motivo registrado e telemetria sem prompt.');
}

main().catch((err) => {
  console.error(`[jev:selftest] erro fatal: ${err && err.stack ? err.stack : err}`);
  if (mock.server) mock.server.close();
  process.exitCode = 1;
});


