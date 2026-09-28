#!/usr/bin/env node
'use strict';
/**
 * scripts/jev-claude-usage.cjs — gancho Stop do Claude Code.
 *
 * Ao fim de cada resposta, soma os tokens do agente desde o ultimo pedido do usuario
 * (lidos do transcript: message.usage, sem repetir o mesmo message.id) e grava em
 * .metrics/jev-claude-usage.jsonl junto com o que o Jev fez naquele pedido
 * (injected | disabled | falha). E a base para comparar tokens com e sem Jev.
 * Nunca bloqueia: sai sempre com codigo 0 e sem saida.
 */

const fs = require('fs');
const path = require('path');
const core = require('./jev-core.cjs');

function isUserPrompt(entry) {
  if (!entry || entry.type !== 'user' || entry.isMeta) return false;
  const content = entry.message && entry.message.content;
  if (typeof content === 'string') return content.trim().length > 0;
  return Array.isArray(content) && content.some((block) => block && block.type === 'text');
}

// Soma os tokens das respostas do agente depois do ultimo pedido real do usuario.
function summarizeLastTurn(lines) {
  const entries = lines.map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
  let start = -1;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (isUserPrompt(entries[i])) { start = i; break; }
  }
  const totals = { input: 0, cacheCreation: 0, cacheRead: 0, output: 0, apiCalls: 0 };
  const seen = new Set();
  for (const entry of entries.slice(start + 1)) {
    if (entry.type !== 'assistant' || !entry.message || !entry.message.usage) continue;
    const id = entry.message.id || entry.uuid;
    if (seen.has(id)) continue;
    seen.add(id);
    const u = entry.message.usage;
    totals.input += u.input_tokens || 0;
    totals.cacheCreation += u.cache_creation_input_tokens || 0;
    totals.cacheRead += u.cache_read_input_tokens || 0;
    totals.output += u.output_tokens || 0;
    totals.apiCalls += 1;
  }
  return {
    promptId: start >= 0 ? entries[start].promptId || null : null,
    model: [...entries].reverse().find((e) => e.type === 'assistant' && e.message && e.message.model)?.message.model || null,
    ...totals,
  };
}

function jevOutcomeFor(metricsDir, sessionId, promptId) {
  try {
    const file = path.join(metricsDir, 'jev-hook-events.jsonl');
    const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).slice(-200).reverse();
    for (const line of lines) {
      const event = JSON.parse(line);
      if (event.client !== 'claude-code' || event.sessionId !== sessionId) continue;
      if (promptId && event.stepIndex && event.stepIndex !== promptId) continue;
      return { jev: event.reason, jevInputTokens: event.inputTokens || 0, jevOutputTokens: event.outputTokens || 0 };
    }
  } catch {
    // sem registro do Jev para este pedido
  }
  return { jev: 'sem_registro', jevInputTokens: 0, jevOutputTokens: 0 };
}

async function main() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  const input = JSON.parse(data || '{}');
  const transcript = input.transcript_path;
  if (!transcript || !fs.existsSync(transcript)) return;
  const config = core.getConfig();
  const lines = fs.readFileSync(transcript, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  const turn = summarizeLastTurn(lines.slice(-3000));
  const sessionId = String(input.session_id || 'no-session');
  core.appendJsonl(path.join(config.metricsDir, 'jev-claude-usage.jsonl'), {
    ts: new Date().toISOString(),
    sessionId,
    ...turn,
    ...jevOutcomeFor(config.metricsDir, sessionId, turn.promptId),
  });
}

module.exports = { summarizeLastTurn, isUserPrompt };

if (require.main === module) {
  main().catch(() => {}).finally(() => { process.exitCode = 0; });
}
