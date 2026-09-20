#!/usr/bin/env node
'use strict';
/**
 * scripts/jev-bridge.cjs
 *
 * Ciclo de vida da ponte gRPC local do Jev.
 *   node scripts/jev-bridge.cjs start|stop|status|restart
 * Equivale a: npm run jev:bridge / jev:bridge:stop / jev:bridge:status
 *
 * A ponte roda destacada, grava log em .metrics/jev-bridge.log e pid em
 * .metrics/jev-bridge.pid. Nada aqui toca producao: e um processo local.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const core = require('./jev-core.cjs');

const SERVER_SCRIPT = path.join(__dirname, 'jev-grpc-server.cjs');

function paths(config) {
  return {
    pidFile: path.join(config.metricsDir, 'jev-bridge.pid'),
    logFile: path.join(config.metricsDir, 'jev-bridge.log')
  };
}

function readPid(pidFile) {
  try {
    return Number(fs.readFileSync(pidFile, 'utf8').trim()) || null;
  } catch {
    return null;
  }
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return Boolean(err && err.code === 'EPERM');
  }
}

async function healthCheck(config) {
  const { healthViaGrpc } = require('./jev-grpc-client.cjs');
  return healthViaGrpc({ address: config.grpcAddress, timeoutMs: 800 });
}

async function waitForHealth(config, attempts = 20, delayMs = 250) {
  let last = { ok: false, errorCode: 'timeout_waiting_bridge' };
  for (let i = 0; i < attempts; i += 1) {
    last = await healthCheck(config);
    if (last.ok) return last;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return last;
}

async function start(config) {
  const { pidFile, logFile } = paths(config);
  const existing = readPid(pidFile);
  if (isAlive(existing)) {
    const probe = await healthCheck(config);
    if (probe.ok) {
      console.log(`[jev-bridge] ja ativo (pid ${existing}) em ${config.grpcAddress}`);
      return 0;
    }
    console.warn(`[jev-bridge] pid ${existing} existe mas a ponte nao responde; reiniciando`);
    stop(config, { quiet: true });
  }

  fs.mkdirSync(config.metricsDir, { recursive: true });
  const out = fs.openSync(logFile, 'a');
  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    detached: true,
    stdio: ['ignore', out, out],
    env: process.env,
    cwd: core.PROJECT_ROOT
  });
  child.unref();
  fs.closeSync(out);
  fs.writeFileSync(pidFile, String(child.pid), 'utf8');

  const probe = await waitForHealth(config);
  if (!probe.ok) {
    console.error(`[jev-bridge] ponte nao respondeu (${probe.errorCode}). Log: ${logFile}`);
    return 1;
  }
  console.log(
    `[jev-bridge] ativo (pid ${child.pid}) em ${config.grpcAddress} | chave: ${probe.health.has_api_key ? 'sim' : 'nao'} | api: ${probe.health.api_base_url} | log: ${logFile}`
  );
  return 0;
}

function stop(config, options = {}) {
  const { pidFile } = paths(config);
  const pid = readPid(pidFile);
  if (!pid) {
    if (!options.quiet) console.log('[jev-bridge] nenhum pid registrado; nada a parar');
    return 0;
  }
  if (!isAlive(pid)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // pidfile ja removido
    }
    if (!options.quiet) console.log(`[jev-bridge] pid ${pid} nao estava ativo; pidfile limpo`);
    return 0;
  }
  try {
    process.kill(pid);
  } catch (err) {
    console.error(`[jev-bridge] falha ao encerrar pid ${pid}: ${err && err.message ? err.message : err}`);
    return 1;
  }
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // pidfile ja removido
  }
  if (!options.quiet) console.log(`[jev-bridge] encerrado (pid ${pid})`);
  return 0;
}

async function status(config) {
  const { pidFile, logFile } = paths(config);
  const pid = readPid(pidFile);
  const probe = await healthCheck(config);
  if (probe.ok) {
    console.log(`[jev-bridge] ATIVO em ${config.grpcAddress}${pid ? ` (pid ${pid})` : ''}`);
    console.log(`  servico: ${probe.health.service} ${probe.health.version}`);
    console.log(`  chave configurada: ${probe.health.has_api_key ? 'sim' : 'nao'}`);
    console.log(`  api base: ${probe.health.api_base_url}`);
    console.log(`  modelo: ${probe.health.model}`);
    console.log(`  uptime: ${Math.round(Number(probe.health.uptime_ms || 0) / 1000)}s`);
    return 0;
  }
  console.log(`[jev-bridge] INATIVO (${probe.errorCode})${pid ? ` | pid registrado: ${pid}` : ''}`);
  console.log(`  inicie com: npm run jev:bridge (log: ${logFile})`);
  return 0;
}

async function main() {
  const action = (process.argv[2] || 'status').toLowerCase();
  const config = core.getConfig();
  let code = 0;
  if (action === 'start') code = await start(config);
  else if (action === 'stop') code = stop(config);
  else if (action === 'restart') {
    stop(config, { quiet: true });
    code = await start(config);
  } else if (action === 'status') code = await status(config);
  else {
    console.error('[jev-bridge] uso: start | stop | status | restart');
    code = 2;
  }
  process.exit(code);
}

main().catch((err) => {
  console.error(`[jev-bridge] erro inesperado: ${err && err.message ? err.message : err}`);
  process.exit(1);
});
