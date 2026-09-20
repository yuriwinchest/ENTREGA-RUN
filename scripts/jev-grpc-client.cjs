#!/usr/bin/env node
'use strict';
/**
 * scripts/jev-grpc-client.cjs
 *
 * Cliente da ponte gRPC local do Jev (scripts/jev-grpc-server.cjs).
 * Usado pelo PreInvocation hook e disponivel como CLI:
 *   node scripts/jev-grpc-client.cjs "texto do pedido"
 *   node scripts/jev-grpc-client.cjs --health
 *   node scripts/jev-grpc-client.cjs --json --no-directive "texto"
 */

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const core = require('./jev-core.cjs');

const PROTO_PATH = path.join(__dirname, 'jev-router.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDefinition);
const JevRouterClient = proto.jev.v1.JevRouter;

const STATUS_REASONS = {
  [grpc.status.UNAVAILABLE]: 'grpc_unavailable',
  [grpc.status.DEADLINE_EXCEEDED]: 'grpc_deadline_exceeded',
  [grpc.status.INVALID_ARGUMENT]: 'grpc_invalid_argument',
  [grpc.status.PERMISSION_DENIED]: 'grpc_permission_denied',
  [grpc.status.UNIMPLEMENTED]: 'grpc_unimplemented',
  [grpc.status.INTERNAL]: 'grpc_internal'
};

function createClient(address) {
  return new JevRouterClient(address, grpc.credentials.createInsecure());
}

function unary(client, method, request, timeoutMs) {
  return new Promise((resolve) => {
    const deadline = new Date(Date.now() + Math.max(50, timeoutMs || 800));
    client[method](request, { deadline }, (err, response) => {
      if (err) {
        resolve({
          ok: false,
          errorCode: STATUS_REASONS[err.code] || 'grpc_error',
          errorMessage: err.details || err.message,
          grpcCode: err.code
        });
        return;
      }
      resolve({ ok: true, response });
    });
  });
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function answersFromProto(answers) {
  const out = {};
  for (const answer of answers || []) {
    out[answer.name] = {
      type: answer.type,
      choice: answer.choice || undefined,
      confidence: answer.confidence,
      score: answer.score,
      noul: answer.noul,
      probabilities: answer.probabilities || {},
      legend: answer.legend_json ? safeParse(answer.legend_json) : undefined
    };
  }
  return out;
}

async function healthViaGrpc(options = {}) {
  const config = core.getConfig();
  const address = options.address || config.grpcAddress;
  const timeoutMs = options.timeoutMs || config.grpcProbeMs;
  const client = createClient(address);
  try {
    const result = await unary(client, 'health', {}, timeoutMs);
    if (!result.ok) return { ok: false, address, ...result };
    return { ok: true, address, health: result.response };
  } finally {
    client.close();
  }
}

async function routeViaGrpc(options = {}) {
  const config = core.getConfig();
  const address = options.address || config.grpcAddress;
  const timeoutMs = options.timeoutMs || config.grpcTimeoutMs;
  const client = createClient(address);
  try {
    const request = {
      state: options.state || '',
      model: options.model || '',
      session_id: options.sessionId || '',
      step_index: options.stepIndex === null || options.stepIndex === undefined ? '' : String(options.stepIndex),
      bypass_cache: Boolean(options.bypassCache),
      timeout_ms: options.upstreamTimeoutMs || 0,
      include_directive: options.includeDirective !== false
    };
    const result = await unary(client, 'route', request, timeoutMs);
    if (!result.ok) return { ok: false, address, transport: 'grpc', ...result };
    const response = result.response;
    if (!response.ok) {
      return {
        ok: false,
        address,
        transport: 'grpc',
        errorCode: response.error_code || 'upstream_error',
        errorMessage: response.error_message || '',
        httpStatus: response.http_status || 0,
        durationMs: response.duration_ms || 0
      };
    }
    return {
      ok: true,
      address,
      transport: response.transport || 'grpc',
      cached: Boolean(response.cached),
      model: response.model,
      durationMs: Number(response.duration_ms) || 0,
      routeId: response.route_id,
      answers: answersFromProto(response.answers),
      decision: safeParse(response.decision_json),
      directive: response.directive || '',
      usage: { input_tokens: Number(response.input_tokens) || 0, output_tokens: Number(response.output_tokens) || 0 },
      leader: response.leader,
      leaderConfidence: response.leader_confidence,
      leaderLevel: response.leader_confidence_level
    };
  } finally {
    client.close();
  }
}

async function runCli(argv) {
  const words = [];
  let asJson = false;
  let healthOnly = false;
  let includeDirective = true;
  let bypassCache = false;
  let address = null;

  for (const raw of argv) {
    if (raw === '--json') asJson = true;
    else if (raw === '--health') healthOnly = true;
    else if (raw === '--no-directive') includeDirective = false;
    else if (raw === '--bypass-cache') bypassCache = true;
    else if (raw.startsWith('--address=')) address = raw.slice('--address='.length);
    else words.push(raw);
  }

  const config = core.getConfig();
  address = address || config.grpcAddress;
  const health = await healthViaGrpc({ address });
  if (!health.ok) {
    console.error(`[jev-client] ponte indisponivel em ${address} (${health.errorCode}${health.errorMessage ? `: ${health.errorMessage}` : ''})`);
    console.error('[jev-client] inicie a ponte com: npm run jev:bridge');
    process.exitCode = 2;
    return;
  }
  if (healthOnly) {
    console.log(JSON.stringify(health.health, null, 2));
    return;
  }

  const state = words.join(' ').trim() || 'teste de roteamento via gRPC';
  // Cada envio manual recebe sessao propria: garante que a mensagem realmente
  // chega ao Jev em vez de ser respondida pelo cache de um envio anterior.
  const sessionId = `cli-${Date.now().toString(36)}`;
  const result = await routeViaGrpc({ state, address, includeDirective, bypassCache, sessionId });
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
    return;
  }
  if (!result.ok) {
    console.error(`[jev-client] falha (${result.errorCode}): ${result.errorMessage}`);
    process.exitCode = 1;
    return;
  }

  const decision = result.decision || {};
  const p = (value) => core.pct(core.finiteOrNull(value));
  console.log('='.repeat(70));
  console.log(`JEV via gRPC - modelo ${result.model} - ${result.durationMs}ms - transporte ${result.transport}${result.cached ? ' (cache)' : ''}`);
  console.log(`Lideranca: ${decision.leaderName || decision.leaderId || 'n/d'} (${p(decision.leaderConfidence)}, faixa ${decision.leaderLevel || 'n/d'})`);
  console.log(`Tipo de tarefa: ${decision.taskType || decision.taskChoice || 'n/d'} (${p(decision.taskConfidence)})`);
  console.log(`Testes reais: ${p(decision.testsProbability)} -> politica ${decision.testsPolicy || 'n/d'}`);
  console.log(`Risco de producao: ${p(decision.productionProbability)}${decision.productionRisk ? ' (INDICIO)' : ''}`);
  console.log(`Severidade: ${typeof decision.severity === 'number' ? decision.severity.toFixed(2) : 'n/d'}`);
  console.log(`Tokens: entrada ${result.usage.input_tokens} | saida ${result.usage.output_tokens}`);
  console.log('='.repeat(70));
  if (result.directive) console.log(result.directive);
}

if (require.main === module) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error(`[jev-client] erro inesperado: ${err && err.message ? err.message : err}`);
    process.exitCode = 1;
  });
}

module.exports = { PROTO_PATH, createClient, healthViaGrpc, routeViaGrpc, answersFromProto };
