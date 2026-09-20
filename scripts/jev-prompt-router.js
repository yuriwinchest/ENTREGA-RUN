#!/usr/bin/env node
/**
 * scripts/jev-prompt-router.js
 *
 * CLI de demonstracao/uso manual do roteamento com Jev (TypeSafe System One).
 * Reutiliza o mesmo nucleo compartilhado da ponte gRPC (scripts/jev-core.cjs),
 * portanto a politica de confianca e a diretiva sao identicas em todos os caminhos.
 *
 * Uso:
 *   node scripts/jev-prompt-router.js "pedido do PO"
 *   node scripts/jev-prompt-router.js --grpc "pedido do PO"      (usa a ponte gRPC local)
 *   node scripts/jev-prompt-router.js --json "pedido do PO"      (imprime respostas cruas)
 *   node scripts/jev-prompt-router.js --include-prompt "..."     (grava o texto na telemetria)
 *
 * A telemetria vai para .metrics/jev-telemetry.jsonl. Por padrao nao grava o
 * texto integral do pedido: registra hash e tamanho (ver Crowley/TONE invariante 4).
 */

import jevCore from './jev-core.cjs';

const args = process.argv.slice(2);
const useGrpc = args.includes('--grpc');
const asJson = args.includes('--json');
const includePrompt = args.includes('--include-prompt') || /^(1|true|yes|on)$/i.test(process.env.JEV_TELEMETRY_INCLUDE_PROMPT || '');
const words = args.filter((arg) => !arg.startsWith('--'));
const config = jevCore.getConfig();

if (!config.apiKey) {
  console.error('❌ [JEV ROUTER] Erro: TYPESAFE_API_KEY não configurada no ambiente ou no arquivo .env.');
  console.error('👉 Defina TYPESAFE_API_KEY no arquivo .env local ou nas variáveis de ambiente do sistema.');
  process.exit(1);
}

async function routeWithJev(userPrompt) {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 [JEV ROUTER] Enviando prompt para o Jev (TypeSafe System One)...');
  console.log(`📝 Prompt: ${JSON.stringify(userPrompt.length > 240 ? `${userPrompt.slice(0, 240)}…` : userPrompt)}`);
  console.log(`🔌 Transporte: ${useGrpc ? `gRPC local (${config.grpcAddress})` : 'HTTPS direto (api.typesafe.ai)'}`);
  console.log('='.repeat(70) + '\n');

  let result;
  if (useGrpc) {
    const { routeViaGrpc } = await import('./jev-grpc-client.cjs');
    const grpc = await routeViaGrpc({ state: userPrompt, address: config.grpcAddress, includeDirective: true });
    if (!grpc.ok) {
      console.error(`❌ [JEV ROUTER] Ponte gRPC indisponível (${grpc.errorCode}): ${grpc.errorMessage || ''}`);
      console.error('👉 Inicie a ponte com: npm run jev:bridge');
      process.exit(2);
    }
    result = {
      ok: true,
      model: grpc.model,
      answers: grpc.answers,
      usage: grpc.usage,
      durationMs: grpc.durationMs,
      transport: grpc.transport,
      cached: grpc.cached,
      directive: grpc.directive
    };
  } else {
    const rest = await jevCore.classifyViaRest({ state: userPrompt, config });
    if (!rest.ok) {
      console.error(`❌ [JEV ROUTER] Falha na classificação (${rest.errorCode}): ${rest.errorMessage}`);
      process.exit(1);
    }
    result = { ...rest, transport: 'rest' };
  }

  const decision = jevCore.decideRouting(result.answers, config);
  const directive =
    result.directive ||
    jevCore.buildDirective(decision, {
      model: result.model,
      transport: result.transport,
      durationMs: result.durationMs,
      leaderLowPct: config.thresholds.leaderLow * 100
    });

  console.log(`⚡ [RESPOSTA DO JEV EM ${result.durationMs}ms] (Modelo: ${result.model} | transporte: ${result.transport}${result.cached ? ' | cache' : ''})`);
  console.log('─'.repeat(70));
  console.log(`🎯 Especialista: ${decision.leaderId || 'n/d'} (${jevCore.pct(decision.leaderConfidence)} de confiança, faixa ${decision.leaderLevel})`);
  console.log(`📌 Tipo de Tarefa: ${decision.taskType || `${decision.taskChoice || 'n/d'} — não classificado`} (${jevCore.pct(decision.taskConfidence)})`);
  console.log(`⚠️  Toca Produção: ${jevCore.pct(decision.productionProbability)}${decision.productionRisk ? ' → indício de impacto' : ''}`);
  console.log(`🧪 Requer Testes Reais: ${jevCore.pct(decision.testsProbability)} → política ${decision.testsPolicy}`);
  console.log(`📊 Severidade: ${decision.severity === null ? 'n/d' : `${decision.severity.toFixed(2)} / 2.00`}`);
  console.log(`💰 Tokens: entrada ${result.usage?.input_tokens ?? 'n/d'} | saída ${result.usage?.output_tokens ?? 'n/d'}`);
  if (decision.notices.length) console.log(`🔎 Avisos de política: ${decision.notices.join(', ')}`);
  console.log('─'.repeat(70) + '\n');

  jevCore.appendTelemetry(config, {
    timestamp: new Date().toISOString(),
    transport: result.transport,
    model: result.model,
    durationMs: result.durationMs,
    usage: result.usage,
    answers: result.answers,
    decision,
    promptHash: jevCore.hashValue(userPrompt, 16),
    promptLength: userPrompt.length,
    ...(includePrompt ? { prompt: userPrompt } : {})
  });

  console.log('🚀 [DIRETIVA GERADA PELO JEV PARA O AGENTE]:');
  console.log('='.repeat(70));
  console.log(directive);
  console.log('='.repeat(70) + '\n');

  if (asJson) {
    console.log(
      JSON.stringify(
        { model: result.model, transport: result.transport, durationMs: result.durationMs, usage: result.usage, answers: result.answers, decision },
        null,
        2
      )
    );
  }

  return { answers: result.answers, directive, decision, durationMs: result.durationMs };
}

const promptTeste =
  words.join(' ') ||
  'Eu tô colocando aqui o nome e as primeiras iniciais da cidade, e não tá aparecendo a cidade, não tá aparecendo a lista. Inclusive, se colocar a letra A, eu quero ver todas as cidades ali que tenham a letra A. Corrige isso.';

routeWithJev(promptTeste).catch((err) => {
  console.error(`❌ [JEV ROUTER] erro inesperado: ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
});
