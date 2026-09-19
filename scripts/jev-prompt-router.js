#!/usr/bin/env node
/**
 * scripts/jev-prompt-router.js
 * 
 * Demonstração prática do padrão "Model Routing & Prompt Orchestrator" usando Jev (TypeSafe System One).
 * O Jev avalia em ~150ms o prompt bruto do usuário, classifica intenções, identifica o especialista da
 * Operação TONE necessário e gera as diretivas estruturadas que alimentam o LLM (Gemini/Claude).
 */

const API_KEY = process.env.TYPESAFE_API_KEY || 'apikey_245fdc191a32dd84185941696d4ce97f966_8613e4e612e8e55a46f9ba92c568cc2b5681e75c29ef981c28d47edd1a1fa54f'

async function routeWithJev(userPrompt) {
  console.log('\n' + '='.repeat(70))
  console.log('🤖 [JEV ROUTER] Enviando prompt para o modelo Jev da TypeSafe...')
  console.log('📝 Prompt bruto:', JSON.stringify(userPrompt))
  console.log('='.repeat(70) + '\n')

  const t0 = performance.now()

  const payload = {
    state: userPrompt,
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
  }

  const response = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const t1 = performance.now()
  const durationMs = Math.round(t1 - t0)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Erro na API do Jev (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const answers = data.answers

  console.log(`⚡ [RESPOSTA DO JEV EM ${durationMs}ms] (Modelo: ${data.model})`)
  console.log('─'.repeat(70))
  console.log(`🎯 Especialista Recomendado: ${answers.especialista_tone.choice} (Confiança: ${(answers.especialista_tone.confidence * 100).toFixed(1)}%)`)
  console.log(`📌 Tipo de Tarefa:           ${answers.tipo_tarefa.choice} (Confiança: ${(answers.tipo_tarefa.confidence * 100).toFixed(1)}%)`)
  console.log(`⚠️  Toca Produção / Servidor:   ${(answers.toca_producao.noul * 100).toFixed(1)}% de probabilidade`)
  console.log(`🧪 Requer Testes Reais:        ${(answers.requer_testes_reais.noul * 100).toFixed(1)}% de probabilidade`)
  console.log(`📊 Severidade Calibrada:       ${answers.severidade.score.toFixed(2)} / 2.00 (Confiança: ${(answers.severidade.confidence * 100).toFixed(1)}%)`)
  console.log(`💰 Tokens consumidos:          Entrada: ${data.usage.input_tokens} | Saída: ${data.usage.output_tokens}`)
  console.log('─'.repeat(70) + '\n')

  // GERAÇÃO DO PROMPT OTIMIZADO PARA O GEMINI / CLAUDE
  const especialistaNome = {
    ana_ui_ux: 'Ana (Especialista em UI/UX)',
    kastiel_dev: 'Kastiel (Desenvolvedor Sênior Fullstack)',
    crowley_sec: 'Crowley (Especialista em Segurança da Informação)',
    teclide_qa: 'Teclide (Engenheiro de QA e Performance)',
    vitor_sre: 'Vitor (SRE / Infraestrutura e Produção)'
  }[answers.especialista_tone.choice] || 'TONE'

  const optimizedPrompt = `
[DIRETIVA DE EXECUÇÃO OTIMIZADA PELO JEV ROUTER]
- Liderança Designada: ${especialistaNome}
- Classificação: ${answers.tipo_tarefa.choice.toUpperCase()} (Severidade: ${answers.severidade.score.toFixed(1)})
- Alerta de Produção: ${answers.toca_producao.noul > 0.5 ? 'CRÍTICO: Alteração de infraestrutura detectada. Vitor deve validar isolamento.' : 'Seguro: Escopo limitado a código da aplicação.'}
- Mandato de Teste: ${answers.requer_testes_reais.noul > 0.6 ? 'OBRIGATÓRIO executar testes reais no terminal e validar build antes da entrega.' : 'Verificação padrão de integridade.'}

DEMANDA ORIGINAL DO PO:
"${userPrompt}"

INSTRUÇÕES PARA O AGENTE (GEMINI):
1. ${answers.especialista_tone.choice === 'vitor_sre' ? 'Verifique containers, portas e logs do Caddy/Docker sem derrubar produção.' : 'Resolva a demanda cirurgicamente no código sem introduzir regressões.'}
2. Não use mock; use a base de dados real do projeto.
3. Ao finalizar, reporte a causa raiz e os testes executados.
`.trim()

  console.log('🚀 [PROMPT OTIMIZADO GERADO PARA O GEMINI]:')
  console.log('='.repeat(70))
  console.log(optimizedPrompt)
  console.log('='.repeat(70) + '\n')

  return { answers, optimizedPrompt, durationMs }
}

// Execução de teste com a frase enviada pelo Yuri
const promptTeste = process.argv.slice(2).join(' ') || 
  'Eu tô colocando aqui o nome e as primeiras iniciais da cidade, e não tá aparecendo a cidade, não tá aparecendo a lista. Inclusive, se colocar a letra A, eu quero ver todas as cidades ali que tenham a letra A. Corrige isso.'

routeWithJev(promptTeste).catch(console.error)
