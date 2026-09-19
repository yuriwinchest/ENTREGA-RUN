#!/usr/bin/env node
/**
 * scripts/jev-pre-invocation-hook.cjs
 * 
 * Antigravity PreInvocation Lifecycle Hook.
 * Este script é executado automaticamente pela IDE antes de cada chamada ao modelo.
 * Ele lê o arquivo de transcript, intercepta a pergunta do usuário, envia para o modelo
 * Jev (TypeSafe System One), e injeta as instruções estruturadas diretamente no prompt.
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.TYPESAFE_API_KEY || 'apikey_245fdc191a32dd84185941696d4ce97f966_8613e4e612e8e55a46f9ba92c568cc2b5681e75c29ef981c28d47edd1a1fa54f';

async function main() {
  let stdinData = '';
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    stdinData += chunk;
  }

  let hookContext = {};
  try {
    if (stdinData.trim()) {
      hookContext = JSON.parse(stdinData);
    }
  } catch {
    console.log(JSON.stringify({ injectSteps: [] }));
    return;
  }

  const transcriptPath = hookContext.transcriptPath;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    console.log(JSON.stringify({ injectSteps: [] }));
    return;
  }

  // Lê as últimas 150 linhas do transcript.jsonl para capturar o último USER_INPUT
  try {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    let latestUserInput = null;

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const item = JSON.parse(lines[i]);
        if (item.type === 'USER_INPUT' && item.content) {
          latestUserInput = item;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!latestUserInput) {
      console.log(JSON.stringify({ injectSteps: [] }));
      return;
    }

    // Extrai apenas o texto entre <USER_REQUEST> e </USER_REQUEST> se existir
    let rawText = latestUserInput.content;
    const reqMatch = rawText.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
    if (reqMatch) {
      rawText = reqMatch[1].trim();
    }

    if (!rawText || rawText.length < 2) {
      console.log(JSON.stringify({ injectSteps: [] }));
      return;
    }

    // Cache para não re-rotear o mesmo step_index em múltiplas invocações do mesmo turno
    const cacheDir = path.resolve(__dirname, '../scratch');
    const cacheFile = path.join(cacheDir, '.last_routed_step.json');
    if (!fs.existsSync(cacheDir)) {
      try { fs.mkdirSync(cacheDir, { recursive: true }); } catch {}
    }

    let lastRouted = {};
    if (fs.existsSync(cacheFile)) {
      try { lastRouted = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch {}
    }

    if (lastRouted.stepIndex === latestUserInput.step_index && lastRouted.directive) {
      // Já roteado neste mesmo turno
      console.log(JSON.stringify({ injectSteps: [] }));
      return;
    }

    // Envia a pergunta bruta para o Jev (TypeSafe System One)
    const t0 = performance.now();
    const payload = {
      state: rawText,
      model: 'jev-latest',
      questions: {
        especialista_tone: {
          type: 'choice',
          instructions: 'Qual especialista da Operação TONE deve liderar esta demanda técnica?',
          criteria: {
            ana_ui_ux: 'Alterações visuais, componentes de tela, cores, tipografia, jornada do usuário e CSS',
            kastiel_dev: 'Implementação de lógica no código, hooks, funções, APIs, componentes React e integração',
            crowley_sec: 'Segurança, autenticação, permissões, sanitização contra XSS e análise de risco',
            teclide_qa: 'Testes de performance, assertividade, qualidade de código e homologação funcional',
            vitor_sre: 'Infraestrutura, Docker, deploy na VPS, portas de rede, Caddy, SSL e disponibilidade'
          }
        },
        tipo_tarefa: {
          type: 'choice',
          instructions: 'Qual o formato e o tipo desta tarefa?',
          criteria: {
            bugfix_urgente: 'Correção de algo que quebrou ou não está se comportando como o esperado',
            nova_feature: 'Construção de uma funcionalidade nova ou página não existente',
            duvida_conceitual: 'Pergunta sobre arquitetura, ferramentas, documentação ou estratégia',
            deploy_infra: 'Publicação, subida de versão, comandos de servidor ou apontamento'
          }
        },
        toca_producao: {
          type: 'noul',
          instructions: 'Esta solicitação afeta diretamente o servidor de produção, containers Docker ou serviços no ar?'
        },
        requer_testes_reais: {
          type: 'noul',
          instructions: 'A conclusão desta demanda exige execução de testes reais automatizados no terminal?'
        },
        severidade: {
          type: 'score',
          instructions: 'Nível de criticidade ou impacto da demanda',
          criteria: [
            'Baixo: dúvida ou refinamento visual menor',
            'Médio: ajuste de funcionalidade ativa com impacto local',
            'Alto: erro bloqueante de operação ou risco a produção'
          ]
        }
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.log(JSON.stringify({ injectSteps: [] }));
      return;
    }

    const data = await res.json();
    const durMs = Math.round(performance.now() - t0);
    const answers = data.answers;

    const especialistaNome = {
      ana_ui_ux: 'Ana (Especialista em UI/UX)',
      kastiel_dev: 'Kastiel (Desenvolvedor Sênior Fullstack)',
      crowley_sec: 'Crowley (Especialista em Segurança da Informação)',
      teclide_qa: 'Teclide (Engenheiro de QA e Performance)',
      vitor_sre: 'Vitor (SRE / Infraestrutura e Produção)'
    }[answers.especialista_tone.choice] || 'TONE';

    const directive = `
======================================================================
⚡ [ORQUESTRAÇÃO OFICIAL JEV (TypeSafe System One) — ${durMs}ms]
======================================================================
- Especialista Líder Designado: ${especialistaNome} (${(answers.especialista_tone.confidence * 100).toFixed(0)}% confiança)
- Tipo de Tarefa:               ${answers.tipo_tarefa.choice.toUpperCase()} (${(answers.tipo_tarefa.confidence * 100).toFixed(0)}% confiança)
- Risco em Produção:            ${(answers.toca_producao.noul * 100).toFixed(1)}%
- Exigência de Testes Reais:    ${(answers.requer_testes_reais.noul * 100).toFixed(1)}%
- Severidade Calibrada:         ${answers.severidade.score.toFixed(2)} / 2.00
- Modelo Jev Ativo:             ${data.model}

DIRETIVA OBRIGATÓRIA PARA ESTA RESPOSTA:
1. Obedeça a liderança de ${especialistaNome}.
2. Execute todos os testes reais automatizados necessários no terminal.
3. Não presuma nem use mocks quando o sistema real estiver acessível.
======================================================================
`.trim();

    try {
      fs.writeFileSync(cacheFile, JSON.stringify({ stepIndex: latestUserInput.step_index, directive }));
    } catch {}

    console.log(JSON.stringify({
      injectSteps: [
        {
          ephemeralMessage: directive
        }
      ]
    }));
  } catch (err) {
    console.log(JSON.stringify({ injectSteps: [] }));
  }
}

main();
