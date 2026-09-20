#!/usr/bin/env node
'use strict';
/**
 * scripts/jev-watch.cjs
 *
 * Monitor do que chega ao Jev (TypeSafe System One).
 *
 * Uso:
 *   npm run jev:watch                          # acompanha ao vivo
 *   npm run jev:watch -- --once                # mostra as ultimas chegadas e sai
 *   npm run jev:watch -- --once --since=300    # veredito dos ultimos 5 minutos
 *   npm run jev:watch -- --once --limit=30
 *
 * Fontes:
 *   .metrics/jev-hook-events.jsonl -> HOOK (turno da IDE) e PONTE (rota via gRPC)
 *   .metrics/jev-telemetry.jsonl   -> ROUTER (classificacao manual)
 *
 * Nunca imprime o texto do pedido: mostra hash, tamanho e a decisao.
 */

const fs = require('fs');
const path = require('path');
const core = require('./jev-core.cjs');

const LABELS = {
  injected: 'INJETADA',
  ok: 'PONTE-OK',
  cache_hit: 'CACHE',
  missing_api_key: 'SEM-CHAVE',
  state_too_large: 'ESTADO-GRANDE',
  transcript_missing: 'SEM-TRANSCRIPT',
  transcript_unreadable: 'TRANSCRIPT-ERRO',
  no_user_entry_in_transcript: 'SEM-PEDIDO',
  missing_transcript_path: 'SEM-CAMINHO',
  stdin_empty: 'STDIN-VAZIO',
  stdin_not_json: 'STDIN-INVALIDO',
  stdin_too_large: 'STDIN-GRANDE',
  upstream_error: 'ERRO-API',
  upstream_contract: 'CONTRATO-API',
  timeout: 'TIMEOUT',
  network_error: 'REDE',
  hook_exception: 'EXCECAO',
  grpc_unavailable: 'PONTE-FORA',
  grpc_deadline_exceeded: 'PONTE-TIMEOUT',
  bridge_without_api_key: 'PONTE-SEM-CHAVE',
  grpc_client_unavailable: 'SEM-CLIENTE-GRPC',
  invalid_state: 'ESTADO-VAZIO'
};

const FAILURE_REASONS = new Set([
  'missing_api_key',
  'upstream_error',
  'upstream_contract',
  'timeout',
  'network_error',
  'hook_exception',
  'state_too_large',
  'invalid_state'
]);

function parseArgs(argv) {
  const options = { once: false, limit: 15, sinceSeconds: null, intervalMs: 1000 };
  for (const raw of argv) {
    if (raw === '--once') options.once = true;
    else if (raw === '--follow') options.once = false;
    else if (raw.startsWith('--limit=')) options.limit = Math.max(1, Number(raw.split('=')[1]) || 15);
    else if (raw.startsWith('--since=')) options.sinceSeconds = Math.max(1, Number(raw.split('=')[1]) || 300);
    else if (raw.startsWith('--interval=')) options.intervalMs = Math.max(200, Number(raw.split('=')[1]) || 1000);
  }
  return options;
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function clock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatRow(kind, entry) {
  const ts = clock(entry.ts || entry.timestamp);
  const reason = entry.reason || (kind === 'ROUTER' ? 'classificado' : 'ok');
  const label = (LABELS[reason] || String(reason).toUpperCase()).padEnd(16);
  const session = entry.sessionId
    ? `${String(entry.sessionId).slice(0, 20)}${entry.stepIndex !== undefined && entry.stepIndex !== null ? `#${entry.stepIndex}` : ''}`
    : '-';
  const decision = entry.decision || {};
  const leader = entry.leader || decision.leaderId || '-';
  const level = entry.leaderLevel || decision.leaderLevel || '-';
  const confidence = core.finiteOrNull(entry.leaderConfidence ?? decision.leaderConfidence);
  const tests = entry.testsPolicy || decision.testsPolicy || '-';
  const transport = entry.transport || '-';
  const duration = Number.isFinite(Number(entry.durationMs)) ? `${Number(entry.durationMs)}ms` : '-';
  const chars = Number.isFinite(Number(entry.promptLength)) ? `${entry.promptLength}c` : '-';
  return `${ts}  ${kind.padEnd(6)} ${label} sessao=${session.padEnd(22)} lider=${leader}/${level} ${core.pct(confidence).padStart(6)} testes=${tests.padEnd(11)} ${transport.padEnd(11)} ${duration.padStart(7)} ${chars}`;
}

function collect(config) {
  const hookEvents = readJsonl(path.join(config.metricsDir, 'jev-hook-events.jsonl')).map((entry) => ({
    kind: entry.event === 'hook' ? 'HOOK' : 'PONTE',
    entry
  }));
  const telemetry = readJsonl(path.join(config.metricsDir, 'jev-telemetry.jsonl')).map((entry) => ({
    kind: 'ROUTER',
    entry: { ts: entry.timestamp, ...entry }
  }));
  return [...hookEvents, ...telemetry].sort((a, b) => String(b.entry.ts || '').localeCompare(String(a.entry.ts || '')));
}

function verdict(rows, sinceSeconds) {
  const classified = rows.filter((row) => row.entry.reason === 'injected' || row.kind === 'ROUTER').length;
  const cached = rows.filter((row) => row.entry.reason === 'cache_hit').length;
  const failures = rows.filter((row) => FAILURE_REASONS.has(row.entry.reason)).length;
  console.log('');
  console.log(`[jev:watch] ${rows.length} registros | ${classified} classificados/injetados | ${cached} em cache | ${failures} falhas`);
  if (!rows.length) {
    console.log('[jev:watch] ATENCAO: nenhuma mensagem chegou ao Jev ainda.');
    console.log('[jev:watch] Se voce acabou de enviar um pedido na IDE, o cliente nao esta disparando o PreInvocation hook.');
    console.log('[jev:watch] Envie manualmente com: npm run jev:route -- "seu pedido"');
    process.exitCode = 1;
    return;
  }
  const last = rows[0];
  const ageSeconds = Math.round((Date.now() - new Date(last.entry.ts).getTime()) / 1000);
  console.log(`[jev:watch] ultima chegada: ${clock(last.entry.ts)} (${ageSeconds}s atras, ${last.kind}/${last.entry.reason || 'classificado'})`);
  if (sinceSeconds && ageSeconds > sinceSeconds) {
    console.log(`[jev:watch] ATENCAO: nenhuma mensagem nos ultimos ${sinceSeconds}s — o cliente da IDE nao esta disparando o hook.`);
    console.log('[jev:watch] Envie manualmente com: npm run jev:route -- "seu pedido"');
    process.exitCode = 1;
    return;
  }
  console.log('[jev:watch] OK: mensagens estao chegando ao Jev.');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = core.getConfig();
  console.log(`[jev:watch] fontes: ${path.join(config.metricsDir, 'jev-hook-events.jsonl')} + jev-telemetry.jsonl`);

  if (options.once) {
    const rows = collect(config).slice(0, options.limit);
    for (const row of [...rows].reverse()) console.log(formatRow(row.kind, row.entry));
    verdict(rows, options.sinceSeconds);
    return;
  }

  let seen = 0;
  const tick = () => {
    const rows = collect(config);
    if (rows.length < seen) seen = 0;
    if (rows.length > seen) {
      const novas = rows.slice(0, rows.length - seen).reverse();
      for (const row of novas) {
        const isFailure = FAILURE_REASONS.has(row.entry.reason);
        console.log(`${isFailure ? '!' : '+'} ${formatRow(row.kind, row.entry)}`);
      }
      seen = rows.length;
    }
  };
  tick();
  console.log('[jev:watch] acompanhando... (Ctrl+C para sair) — envie um pedido na IDE ou npm run jev:route -- "texto"');
  setInterval(tick, options.intervalMs);
}

main();
