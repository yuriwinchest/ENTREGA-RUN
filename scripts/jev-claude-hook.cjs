#!/usr/bin/env node
'use strict';
/**
 * scripts/jev-claude-hook.cjs
 *
 * Adaptador do Jev para o Claude Code (evento UserPromptSubmit).
 * Contrato oficial (https://code.claude.com/docs/en/hooks):
 *   entrada: JSON no stdin com o pedido em `user_input` (ou `prompt`), `session_id`, `prompt_id`;
 *   saida:   {"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}.
 * O gancho do Antigravity/Codex (.agents/hooks.json) le transcript e responde `injectSteps`,
 * formato que o Claude Code ignora — por isso este adaptador existe.
 *
 * Nunca bloqueia o turno: qualquer falha sai com codigo 0, sem contexto, e o motivo fica em
 * .metrics/jev-hook-events.jsonl (client: "claude-code").
 * JEV_CLAUDE_DISABLE=1 desliga o roteamento (linha de base para medir tokens com e sem Jev).
 */

const core = require('./jev-core.cjs');
const { routeWithFallback } = require('./jev-pre-invocation-hook.cjs');

const STDIN_MAX_BYTES = 1024 * 1024;
const CLIENT = 'claude-code';

function write(payload) {
  return new Promise((resolve) => {
    if (payload === null) return resolve();
    process.stdout.write(`${JSON.stringify(payload)}\n`, () => resolve());
  });
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
    return { ok: true, input: JSON.parse(data) };
  } catch {
    return { ok: false, reason: 'stdin_not_json' };
  }
}

function promptText(input) {
  const raw = input.user_input ?? input.prompt ?? '';
  return typeof raw === 'string' ? raw.trim() : '';
}

function contextFor(directive) {
  return {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: directive,
    },
  };
}

async function run() {
  const config = core.getConfig();
  const stdin = await readStdin();
  if (!stdin.ok) {
    core.logEvent(config, { event: 'hook', client: CLIENT, ok: false, reason: stdin.reason });
    return null;
  }

  const input = stdin.input && typeof stdin.input === 'object' ? stdin.input : {};
  const text = promptText(input);
  const sessionId = String(input.session_id || 'no-session');
  // prompt_id e unico por pedido: o mesmo texto repetido ("continua") volta a ser roteado.
  const stepIndex = String(input.prompt_id || Date.now());
  const base = {
    event: 'hook',
    client: CLIENT,
    sessionId,
    stepIndex,
    promptHash: text ? core.hashValue(text, 16) : null,
    promptLength: text.length,
  };

  if (core.toBool(process.env.JEV_CLAUDE_DISABLE, false)) {
    core.logEvent(config, { ...base, ok: true, reason: 'disabled' });
    return null;
  }
  if (!text) {
    core.logEvent(config, { ...base, ok: false, reason: 'empty_prompt' });
    return null;
  }
  if (!config.apiKey) {
    core.logEvent(config, { ...base, ok: false, reason: 'missing_api_key' });
    return null;
  }
  if (text.length > config.maxStateChars) {
    core.logEvent(config, { ...base, ok: false, reason: 'state_too_large' });
    return null;
  }

  const result = await routeWithFallback(config, { text, sessionId, stepIndex });
  if (!result.ok) {
    core.logEvent(config, {
      ...base,
      ok: false,
      reason: result.errorCode,
      transport: result.transport,
      httpStatus: result.httpStatus || 0,
      durationMs: result.durationMs || 0,
      attempts: result.attempts,
    });
    return null;
  }

  const decision = core.decideRouting(result.answers, config);
  const directive = result.directive || core.buildDirective(decision, {
    model: result.model,
    transport: result.transport,
    durationMs: result.durationMs,
    leaderLowPct: config.thresholds.leaderLow * 100,
  });
  const usage = result.usage || {};
  core.logEvent(config, {
    ...base,
    ok: true,
    reason: 'injected',
    transport: result.transport,
    attempts: result.attempts,
    model: result.model,
    durationMs: result.durationMs,
    leader: decision.leaderId,
    leaderLevel: decision.leaderLevel,
    leaderConfidence: decision.leaderConfidence,
    taskType: decision.taskType,
    productionRisk: decision.productionRisk,
    severity: decision.severity,
    mustAskUser: decision.mustAskUser,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    directiveChars: directive.length,
  });
  return contextFor(directive);
}

run()
  .then(write)
  .catch((err) => {
    try {
      core.logEvent(core.getConfig(), {
        event: 'hook',
        client: CLIENT,
        ok: false,
        reason: 'hook_exception',
        errorMessage: err && err.message ? err.message : String(err),
      });
    } catch {
      // o gancho nunca pode quebrar o turno
    }
  })
  // Sem process.exit(): no Windows, sair a força com o socket HTTPS ainda fechando
  // aborta o Node (libuv UV_HANDLE_CLOSING) e o Claude Code descarta a saída.
  .finally(() => { process.exitCode = 0; });
