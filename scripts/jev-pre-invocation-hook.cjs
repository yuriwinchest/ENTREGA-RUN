#!/usr/bin/env node
'use strict';
/**
 * scripts/jev-pre-invocation-hook.cjs
 *
 * PreInvocation lifecycle hook: intercepta o pedido do usuario, consulta o Jev
 * (TypeSafe System One) e injeta a diretiva estruturada antes da resposta.
 *
 * Correcoes aplicadas (ver docs/correcoes-jev-grpc-2026-09-20.md):
 * 1. Cache por sessao + passo + hash do texto; nunca suprime pedido alheio.
 * 2. Confianca governa a diretiva (alta/media/baixa) conforme docs oficiais.
 * 3. Diretiva adaptativa (tipo de tarefa, testes, producao, severidade).
 * 4. Toda saida vazia tem motivo registrado em .metrics/jev-hook-events.jsonl.
 * 5. Transporte: ponte gRPC local primeiro (auto) com fallback para HTTPS.
 * 6. Contrato de transcript com adaptadores (USER_INPUT, event_msg/payload, role:user).
 */

const path = require('path');
const core = require('./jev-core.cjs');

const STDIN_MAX_BYTES = 1024 * 1024;

function emit(payload) {
  return new Promise((resolve) => {
    process.stdout.write(`${JSON.stringify(payload)}\n`, () => resolve());
  });
}

function emitEmpty() {
  return emit({ injectSteps: [] });
}

function debug(config, message) {
  if (config && config.debug) console.error(`[jev-hook] ${message}`);
}

async function readStdin() {
  let data = '';
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > STDIN_MAX_BYTES) return { ok: false, reason: 'stdin_too_large' };
    data += chunk;
  }
  if (!data.trim()) return { ok: false, reason: 'stdin_empty' };
  try {
    return { ok: true, context: JSON.parse(data) };
  } catch {
    return { ok: false, reason: 'stdin_not_json' };
  }
}

function resolveTranscriptPath(context) {
  const candidate = context.transcriptPath || context.transcript_path || context.transcript || null;
  if (!candidate || typeof candidate !== 'string') return null;
  return path.isAbsolute(candidate) ? candidate : path.resolve(core.PROJECT_ROOT, candidate);
}

function resolveSessionId(context, prompt) {
  const fromContext = context.sessionId || context.session_id || context.conversationId || context.conversation_id || null;
  if (fromContext) return String(fromContext);
  if (prompt && prompt.sessionId) return String(prompt.sessionId);
  if (prompt && prompt.transcriptPath) return `transcript:${core.hashValue(prompt.transcriptPath, 12)}`;
  return 'no-session';
}

function resolveStepIndex(context, prompt) {
  if (prompt && prompt.stepIndex !== null && prompt.stepIndex !== undefined) return prompt.stepIndex;
  const candidate = context.stepIndex ?? context.step_index ?? null;
  return candidate === '' ? null : candidate;
}

async function probeBridge(config) {
  try {
    const { healthViaGrpc } = require('./jev-grpc-client.cjs');
    const probe = await healthViaGrpc({ address: config.grpcAddress, timeoutMs: config.grpcProbeMs });
    if (!probe.ok) return { ok: false, errorCode: probe.errorCode || 'grpc_unavailable' };
    if (!probe.health || !probe.health.has_api_key) return { ok: false, errorCode: 'bridge_without_api_key' };
    return { ok: true };
  } catch (err) {
    // Projeto sem @grpc/grpc-js ou sem o cliente: segue por HTTPS direto.
    return { ok: false, errorCode: 'grpc_client_unavailable', errorMessage: err && err.message ? err.message : String(err) };
  }
}

async function callBridge(config, { text, sessionId, stepIndex }) {
  try {
    const { routeViaGrpc } = require('./jev-grpc-client.cjs');
    return await routeViaGrpc({
      state: text,
      sessionId,
      stepIndex,
      address: config.grpcAddress,
      timeoutMs: config.grpcTimeoutMs,
      includeDirective: true
    });
  } catch (err) {
    return { ok: false, transport: 'grpc', errorCode: 'grpc_client_unavailable', errorMessage: err && err.message ? err.message : String(err) };
  }
}

async function routeWithFallback(config, { text, sessionId, stepIndex }) {
  const attempts = [];
  const grpcFirst = config.transport === 'grpc' || config.transport === 'auto';

  if (grpcFirst) {
    let probeFailure = null;
    if (config.transport === 'auto') {
      const probe = await probeBridge(config);
      if (!probe.ok) probeFailure = probe.errorCode;
    }
    if (!probeFailure) {
      const grpc = await callBridge(config, { text, sessionId, stepIndex });
      if (grpc.ok) {
        attempts.push('grpc:ok');
        return { ...grpc, attempts };
      }
      attempts.push(`grpc:${grpc.errorCode}`);
      if (config.grpcRequired) {
        return { ok: false, transport: 'grpc', errorCode: grpc.errorCode, errorMessage: grpc.errorMessage, attempts };
      }
    } else {
      attempts.push(`grpc_probe:${probeFailure}`);
      if (config.grpcRequired) {
        return { ok: false, transport: 'grpc', errorCode: probeFailure, errorMessage: 'ponte gRPC indisponivel', attempts };
      }
    }
  }

  const rest = await core.classifyViaRest({ state: text, config });
  attempts.push(rest.ok ? 'rest:ok' : `rest:${rest.errorCode}`);
  if (rest.ok) {
    return { ...rest, transport: 'rest', fallbackFrom: attempts.length > 1 ? attempts[0] : null, attempts };
  }
  return {
    ok: false,
    transport: 'rest',
    errorCode: rest.errorCode,
    errorMessage: rest.errorMessage,
    httpStatus: rest.httpStatus,
    durationMs: rest.durationMs,
    attempts
  };
}

async function main() {
  const config = core.getConfig();
  const stdin = await readStdin();
  if (!stdin.ok) {
    core.logEvent(config, { event: 'hook', ok: false, reason: stdin.reason });
    debug(config, `entrada ignorada: ${stdin.reason}`);
    await emitEmpty();
    return;
  }

  const context = stdin.context && typeof stdin.context === 'object' ? stdin.context : {};
  const transcriptPath = resolveTranscriptPath(context);
  if (!transcriptPath) {
    core.logEvent(config, { event: 'hook', ok: false, reason: 'missing_transcript_path' });
    await emitEmpty();
    return;
  }

  const prompt = core.readLatestUserPrompt(transcriptPath);
  if (!prompt.ok) {
    core.logEvent(config, { event: 'hook', ok: false, reason: prompt.reason, transcriptHash: core.hashValue(transcriptPath, 12) });
    await emitEmpty();
    return;
  }

  const text = prompt.text;
  const sessionId = resolveSessionId(context, prompt);
  const stepIndex = resolveStepIndex(context, prompt);
  const baseEvent = {
    event: 'hook',
    sessionId,
    stepIndex,
    promptHash: core.hashValue(text, 16),
    promptLength: text.length,
    transcriptShape: prompt.shape
  };

  if (!config.apiKey) {
    core.logEvent(config, { ...baseEvent, ok: false, reason: 'missing_api_key' });
    debug(config, 'TYPESAFE_API_KEY ausente; nenhuma diretiva injetada');
    await emitEmpty();
    return;
  }
  if (text.length > config.maxStateChars) {
    core.logEvent(config, { ...baseEvent, ok: false, reason: 'state_too_large' });
    await emitEmpty();
    return;
  }

  const key = core.cacheKey({ sessionId, stepIndex, text });
  if (!core.toBool(process.env.JEV_HOOK_BYPASS_CACHE, false)) {
    const hit = core.cacheLookup(config, key);
    if (hit.hit) {
      core.logEvent(config, { ...baseEvent, ok: true, reason: 'cache_hit', cachedAt: hit.createdAt });
      debug(config, 'mesmo pedido ja roteado; nada injetado');
      await emitEmpty();
      return;
    }
  }

  const result = await routeWithFallback(config, { text, sessionId, stepIndex });
  if (!result.ok) {
    core.logEvent(config, {
      ...baseEvent,
      ok: false,
      reason: result.errorCode,
      transport: result.transport,
      httpStatus: result.httpStatus || 0,
      durationMs: result.durationMs || 0,
      attempts: result.attempts
    });
    debug(config, `sem diretiva: ${result.errorCode} ${result.errorMessage || ''}`);
    await emitEmpty();
    return;
  }

  const decision = core.decideRouting(result.answers, config);
  const directive =
    result.directive ||
    core.buildDirective(decision, {
      model: result.model,
      transport: result.transport,
      durationMs: result.durationMs,
      leaderLowPct: config.thresholds.leaderLow * 100
    });
  core.cacheStore(config, key, directive, { decision, transport: result.transport });

  const usage = result.usage || {};
  core.logEvent(config, {
    ...baseEvent,
    ok: true,
    reason: 'injected',
    transport: result.transport,
    transportCached: Boolean(result.cached),
    fallbackFrom: result.fallbackFrom || null,
    attempts: result.attempts,
    model: result.model,
    durationMs: result.durationMs,
    leader: decision.leaderId,
    leaderLevel: decision.leaderLevel,
    leaderConfidence: decision.leaderConfidence,
    taskType: decision.taskType,
    testsPolicy: decision.testsPolicy,
    productionRisk: decision.productionRisk,
    severity: decision.severity,
    mustAskUser: decision.mustAskUser,
    notices: decision.notices,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    directiveChars: directive.length
  });
  await emit({ injectSteps: [{ ephemeralMessage: directive }] });
}

main()
  .catch(async (err) => {
    try {
      const config = core.getConfig();
      core.logEvent(config, {
        event: 'hook',
        ok: false,
        reason: 'hook_exception',
        errorMessage: err && err.message ? err.message : String(err)
      });
      debug(config, `excecao: ${err && err.message ? err.message : err}`);
    } catch {
      // nada a fazer: o hook nunca pode quebrar o turno
    }
    await emitEmpty();
  })
  .finally(() => {
    if (!core.toBool(process.env.JEV_HOOK_NO_EXIT, false)) process.exit(0);
  });
