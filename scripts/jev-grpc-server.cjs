#!/usr/bin/env node
'use strict';
/**
 * scripts/jev-grpc-server.cjs
 *
 * Ponte gRPC local do Jev (TypeSafe System One).
 * Implementa o contrato de scripts/jev-router.proto chamando a API oficial
 * (HTTPS /v1/systemone) e devolvendo a classificacao normalizada + a decisao
 * de politica (gating por confianca) + a diretiva pronta.
 *
 * Por que gRPC aqui: contrato tipado entre linguagens, deadline por chamada,
 * codigos de status estruturados e um unico ponto de orquestracao reutilizavel
 * por Node, Python, C# e Android. A API oficial continua sendo a fonte do Jev.
 */

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const core = require('./jev-core.cjs');

const PROTO_PATH = path.join(__dirname, 'jev-router.proto');
const SERVICE_NAME = 'jev-grpc-bridge';
const SERVICE_VERSION = '1.0.0';
const STARTED_AT = Date.now();

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDefinition);
const JevRouterService = proto.jev.v1.JevRouter.service;

function numberOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toProtoAnswer(name, answer) {
  const source = answer && typeof answer === 'object' ? answer : {};
  return {
    name,
    type: source.type || '',
    choice: source.choice || '',
    confidence: numberOrZero(source.confidence),
    score: numberOrZero(source.score),
    noul: numberOrZero(source.noul),
    probabilities: source.probabilities && typeof source.probabilities === 'object' ? source.probabilities : {},
    legend_json: source.legend ? JSON.stringify(source.legend) : ''
  };
}

function answersToProto(answers) {
  return Object.entries(answers || {}).map(([name, answer]) => toProtoAnswer(name, answer));
}

function failure(errorCode, errorMessage, httpStatus) {
  return {
    ok: false,
    error_code: errorCode || 'unknown',
    error_message: errorMessage || '',
    http_status: httpStatus || 0,
    transport: 'grpc',
    answers: []
  };
}

async function handleRoute(call, callback) {
  const baseConfig = core.getConfig();
  const request = call.request || {};
  const state = String(request.state || '').trim();
  const sessionId = request.session_id || null;
  const stepIndex = request.step_index || null;
  const eventBase = {
    event: 'route',
    transport: 'grpc',
    sessionId,
    stepIndex,
    promptHash: core.hashValue(state, 16),
    promptLength: state.length
  };

  if (!state) {
    core.logEvent(baseConfig, { ...eventBase, ok: false, reason: 'invalid_state' });
    return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'state obrigatorio e nao vazio' });
  }
  if (state.length > baseConfig.maxStateChars) {
    core.logEvent(baseConfig, { ...eventBase, ok: false, reason: 'state_too_large' });
    return callback({ code: grpc.status.INVALID_ARGUMENT, message: `state excede ${baseConfig.maxStateChars} caracteres` });
  }
  if (!baseConfig.apiKey) {
    core.logEvent(baseConfig, { ...eventBase, ok: false, reason: 'missing_api_key' });
    return callback(null, failure('missing_api_key', 'TYPESAFE_API_KEY ausente no ambiente da ponte'));
  }

  const config = {
    ...baseConfig,
    model: request.model || baseConfig.model,
    restTimeoutMs: request.timeout_ms > 0 ? request.timeout_ms : baseConfig.restTimeoutMs
  };
  const key = core.cacheKey({ sessionId, stepIndex, text: state });

  if (!request.bypass_cache && request.include_directive) {
    const hit = core.cacheLookup(config, key);
    if (hit.hit) {
      core.logEvent(config, { ...eventBase, ok: true, reason: 'grpc_cache_hit', cached: true, durationMs: 0 });
      return callback(null, {
        ok: true,
        model: config.model,
        duration_ms: 0,
        transport: 'grpc-cache',
        cached: true,
        route_id: core.hashValue(`${key}|cached`, 12),
        answers: answersToProto(hit.meta.answers || {}),
        decision_json: JSON.stringify(hit.meta.decision || null),
        directive: hit.directive || '',
        leader: hit.meta.leader || '',
        leader_confidence: numberOrZero(hit.meta.leaderConfidence),
        leader_confidence_level: hit.meta.leaderLevel || 'unknown'
      });
    }
  }

  const result = await core.classifyViaRest({ state, config });
  if (!result.ok) {
    core.logEvent(config, { ...eventBase, ok: false, reason: result.errorCode, httpStatus: result.httpStatus || 0, durationMs: result.durationMs });
    return callback(null, failure(result.errorCode, result.errorMessage, result.httpStatus));
  }

  const decision = core.decideRouting(result.answers, config);
  const directive = request.include_directive
    ? core.buildDirective(decision, { model: result.model, transport: 'grpc', durationMs: result.durationMs })
    : '';
  if (request.include_directive) {
    core.cacheStore(config, key, directive, {
      decision,
      answers: result.answers,
      leader: decision.leaderId,
      leaderConfidence: decision.leaderConfidence,
      leaderLevel: decision.leaderLevel
    });
  }
  core.logEvent(config, {
    ...eventBase,
    ok: true,
    reason: 'ok',
    cached: false,
    model: result.model,
    durationMs: result.durationMs,
    leader: decision.leaderId,
    leaderLevel: decision.leaderLevel,
    leaderConfidence: decision.leaderConfidence,
    taskType: decision.taskType,
    testsPolicy: decision.testsPolicy,
    productionRisk: decision.productionRisk,
    severity: decision.severity
  });

  const usage = result.usage || {};
  return callback(null, {
    ok: true,
    model: result.model,
    duration_ms: result.durationMs,
    transport: 'grpc',
    cached: false,
    route_id: core.hashValue(`${key}|${result.durationMs}`, 12),
    answers: answersToProto(result.answers),
    input_tokens: numberOrZero(usage.input_tokens),
    output_tokens: numberOrZero(usage.output_tokens),
    decision_json: JSON.stringify(decision),
    directive,
    leader: decision.leaderId || '',
    leader_confidence: numberOrZero(decision.leaderConfidence),
    leader_confidence_level: decision.leaderLevel
  });
}

function handleHealth(call, callback) {
  const config = core.getConfig();
  callback(null, {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    has_api_key: Boolean(config.apiKey),
    api_base_url: config.apiBaseUrl,
    model: config.model,
    uptime_ms: Date.now() - STARTED_AT
  });
}

function startServer() {
  const config = core.getConfig();
  const allowNonLoopback = core.toBool(process.env.JEV_GRPC_ALLOW_NON_LOOPBACK, false);
  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(config.grpcHost);
  const host = isLoopback || allowNonLoopback ? config.grpcHost : '127.0.0.1';
  if (!isLoopback && allowNonLoopback) {
    console.error('[jev-grpc-bridge] AVISO: bind fora do loopback sem autenticacao; qualquer processo da rede pode consultar o Jev com a sua chave.');
  }
  const server = new grpc.Server();
  server.addService(JevRouterService, { Route: handleRoute, Health: handleHealth });
  const address = `${host}:${config.grpcPort}`;
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(`[jev-grpc-bridge] falha ao abrir ${address}: ${err.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `[jev-grpc-bridge] ativo em ${host}:${port} | versao ${SERVICE_VERSION} | chave configurada: ${config.apiKey ? 'sim' : 'nao'} | api: ${config.apiBaseUrl}`
    );
  });
  const shutdown = (signal) => {
    console.log(`[jev-grpc-bridge] encerrando por ${signal}`);
    server.tryShutdown(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, PROTO_PATH, SERVICE_NAME, SERVICE_VERSION, answersToProto, failure };
