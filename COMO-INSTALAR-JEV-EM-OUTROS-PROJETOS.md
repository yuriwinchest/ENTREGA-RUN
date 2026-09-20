# GUIA MESTRE — COMO INSTALAR E ATIVAR O JEV (TYPESAFE SYSTEM ONE) EM QUALQUER PROJETO

> **Versão 2 — 20/09/2026.** O código embutido neste guia (Passo 2) foi substituído
> pelo conjunto atual, que inclui política de confiança, cache isolado por
> sessão/turno, observabilidade e ponte gRPC local com fallback. Prefira o
> instalador da seção 4, que copia os arquivos atuais verbatim, e consulte a
> seção 5 para a arquitetura em vigor e os comandos de verificação.
> Detalhes das correções: `docs/correcoes-jev-grpc-2026-09-20.md` no Entregas-run.

> **Instrução Direta para a IA / Agente de Código (Gemini, Claude, Codex, GPT, Antigravity):**  
> Se o Yuri enviou ou indicou este arquivo para você na abertura de um novo projeto, **execute imediatamente os passos abaixo** para configurar o **Jev (TypeSafe System One)** como a primeira camada de inteligência e roteamento obrigatório deste repositório. Toda pergunta do Yuri deve ser avaliada e orquestrada pelo Jev antes da sua execução técnica.

---

## 1. O Que é o Jev e Por Que Usamos?
O **Jev** é o modelo de **System One da TypeSafe**. Ele avalia o prompt bruto do usuário em **~150ms–900ms**, classifica com alta precisão a intenção real, escolhe o especialista da equipe técnica (Operação TONE), calibra o risco e a severidade, e entrega as **diretivas estruturadas** para que o LLM principal execute o trabalho sem alucinações, sem dúvidas e sem desvios de escopo.

---

## 2. Credenciais e Configurações Oficiais

* **Endpoint Oficial**: `https://api.typesafe.ai/v1/systemone`
* **Modelo Recomendado**: `jev-latest` (ou `jev-1.13.0`)
* **Chave de API (API Key)**:
Configurada exclusivamente na variável de ambiente `TYPESAFE_API_KEY` ou no arquivo `.env` do projeto:
```bash
TYPESAFE_API_KEY=sua_chave_typesafe_aqui
```
*(Nunca commite a chave real no repositório).*

---

## 3. Passo a Passo de Instalação no Novo Projeto

### Passo 1: Criar a pasta `.agents` e o arquivo `.agents/hooks.json`
Crie o arquivo `.agents/hooks.json` na raiz do projeto para que a IDE Antigravity intercepte automaticamente toda pergunta do usuário:

```json
{
  "jev-system-one-router": {
    "PreInvocation": [
      {
        "type": "command",
        "command": "node \"./scripts/jev-pre-invocation-hook.cjs\"",
        "timeout": 10
      }
    ]
  }
}
```

---

### Passo 2: Criar o script interceptador `scripts/jev-pre-invocation-hook.cjs`
Crie o arquivo `scripts/jev-pre-invocation-hook.cjs` na raiz do projeto com o seguinte código (CommonJS):

```javascript
#!/usr/bin/env node
/**
 * scripts/jev-pre-invocation-hook.cjs
 * 
 * Antigravity PreInvocation Lifecycle Hook.
 * Intercepta a pergunta do usuário, consulta o Jev (TypeSafe System One)
 * e injeta a diretiva estruturada antes de o modelo responder.
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.TYPESAFE_API_KEY;

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

    let rawText = latestUserInput.content;
    const reqMatch = rawText.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
    if (reqMatch) {
      rawText = reqMatch[1].trim();
    }

    if (!rawText || rawText.length < 2) {
      console.log(JSON.stringify({ injectSteps: [] }));
      return;
    }

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
      console.log(JSON.stringify({ injectSteps: [] }));
      return;
    }

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
  } catch {
    console.log(JSON.stringify({ injectSteps: [] }));
  }
}

main();
```

---

### Passo 3: Criar o script de teste manual `scripts/jev-prompt-router.js`
Crie o arquivo `scripts/jev-prompt-router.js` para testar prompts diretamente via terminal (`node scripts/jev-prompt-router.js "seu prompt"`):

```javascript
#!/usr/bin/env node
const API_KEY = process.env.TYPESAFE_API_KEY;

async function routeWithJev(userPrompt) {
  console.log('\n🤖 [JEV ROUTER] Enviando prompt para o modelo Jev da TypeSafe...');
  console.log('📝 Prompt:', JSON.stringify(userPrompt));

  const t0 = performance.now();
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
  };

  const response = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const durMs = Math.round(performance.now() - t0);
  if (!response.ok) {
    throw new Error(`Erro na API do Jev (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  const answers = data.answers;

  console.log(`⚡ [RESPOSTA DO JEV EM ${durMs}ms] (Modelo: ${data.model})`);
  console.log(`🎯 Especialista: ${answers.especialista_tone.choice} (${(answers.especialista_tone.confidence * 100).toFixed(0)}%)`);
  console.log(`📌 Tipo de Tarefa: ${answers.tipo_tarefa.choice}`);
  console.log(`⚠️  Toca Produção: ${(answers.toca_producao.noul * 100).toFixed(1)}%`);
  console.log(`🧪 Requer Testes: ${(answers.requer_testes_reais.noul * 100).toFixed(1)}%`);
  console.log(`📊 Severidade: ${answers.severidade.score.toFixed(2)} / 2.00\n`);
}

const promptArg = process.argv.slice(2).join(' ') || 'teste de roteamento inicial';
routeWithJev(promptArg);
```

---

### Passo 4: Registrar no `TONE-INVARIANTS.md` e `AGENTS.md`
Adicione esta regra no arquivo `TONE-INVARIANTS.md` do projeto:

```markdown
10. Roteamento Inteligente Obrigatório via Jev (TypeSafe System One): Toda demanda ou pergunta do Yuri é interceptada e pré-orquestrada pelo modelo Jev (via PreInvocation hook em `.agents/hooks.json` e `scripts/jev-pre-invocation-hook.cjs`), definindo o especialista líder da TONE e calibrando a severidade antes da ação técnica.
```

---

## 4. Script de Instalação em 1 Comando (PowerShell)

Para instalar o Jev automaticamente na raiz de qualquer projeto sem precisar colar arquivos manualmente, basta abrir o terminal na raiz do projeto e rodar:

```powershell
& "D:\Projetos\Clientes\INSTALAR-JEV-AQUI.ps1"
```

---

## 5. Arquitetura em vigor (v2) — instalação e verificação

### 5.1 O que o instalador copia

| Arquivo (pasta `scripts/`) | Papel |
|---|---|
| `jev-core.cjs` | Núcleo: config por ambiente, perguntas do Jev, adaptadores de transcript, cache por sessão/passo/texto, política de confiança e diretiva adaptativa |
| `jev-pre-invocation-hook.cjs` | Hook PreInvocation: lê o transcript, consulta o Jev (gRPC → fallback HTTPS) e injeta a diretiva |
| `jev-router.proto` | Contrato gRPC (`jev.v1.JevRouter` com `Route` e `Health`) |
| `jev-grpc-server.cjs` | Ponte local que chama `https://api.typesafe.ai/v1/systemone` |
| `jev-grpc-client.cjs` | Cliente da ponte e CLI (`--health`, `--json`, `--no-directive`, `--bypass-cache`) |
| `jev-bridge.cjs` | Ciclo de vida da ponte: `start` / `stop` / `status` / `restart` |
| `jev-watch.cjs` | Monitor das mensagens que chegam ao Jev (`--once --since=300` dá o veredito) |
| `jev-prompt-router.js` | CLI de classificação manual (HTTPS direto ou `--grpc`) |
| `jev-selftest.cjs` | Verificação automatizada dos 14 cenários com API simulada |

Também são necessários: `.agents/hooks.json` (timeout 20), as devDependencies
`@grpc/grpc-js` e `@grpc/proto-loader`, e a Invariante 10 revisada em
`TONE-INVARIANTS.md`.

### 5.2 Instalação

```powershell
& "D:\Projetos\Clientes\INSTALAR-JEV-AQUI.ps1" -TargetDir "D:\Projetos\Clientes\NOME-DO-PROJETO"
```

O script copia os arquivos, instala as dependências do gRPC, adiciona a Invariante
10 (se ainda não existir) e roda `scripts/jev-selftest.cjs` como prova de
instalação. Nenhuma credencial é copiada: cada projeto usa o próprio `.env` com
`TYPESAFE_API_KEY`.

### 5.3 Operação

```bash
npm run jev:bridge           # sobe a ponte local (opcional)
npm run jev:bridge:status    # confirma serviço, versão, chave e base URL
npm run jev:route -- "texto" # classifica pela ponte e imprime a diretiva
npm run jev:router -- "texto"        # classificação manual via HTTPS
npm run jev:router -- --grpc "texto" # classificação manual via ponte
npm run jev:selftest         # valida a integração inteira (sem rede)
npm run jev:watch -- --once --since=300   # confirma se as mensagens estão chegando ao Jev
npm run jev:watch            # monitor ao vivo
npm run jev:bridge:stop      # encerra a ponte
```

### 5.4 Variáveis de ambiente relevantes

| Variável | Padrão | Para que serve |
|---|---|---|
| `TYPESAFE_API_KEY` | — | Credencial do Jev (obrigatória) |
| `JEV_TRANSPORT` | `auto` | `auto` (gRPC com fallback) / `grpc` / `rest` |
| `JEV_GRPC_ADDRESS` | `127.0.0.1:50051` | Endereço da ponte |
| `JEV_GRPC_REQUIRED` | `0` | `1` = não injetar diretiva se a ponte estiver fora do ar |
| `JEV_THRESHOLDS_JSON` | — | Ajusta limiares de confiança sem editar código |
| `JEV_CACHE_TTL_MS` | `1800000` | Validade do cache de roteamento |
| `JEV_DEBUG` | `0` | `1` = diagnóstico no stderr do hook |
| `JEV_HOOK_BYPASS_CACHE` | `0` | `1` = ignora o cache do hook e força nova classificação |
| `JEV_SKIP_DOTENV` | `0` | `1` = ignora o `.env` (usado nos testes) |

### 5.5 O que observar depois de instalar

- `.metrics/jev-hook-events.jsonl`: cada turno gera um evento com `reason`
  (`injected`, `cache_hit`, `missing_api_key`, `upstream_error`, ...). Se não
  houver evento, o hook não está sendo chamado pelo cliente.
- A diretiva deve trazer a faixa de confiança (alta/média/baixa) e, em faixa
  baixa, pedir uma pergunta em vez de impor especialista.
- Diferença entre `routes` no log e turnos reais indica cache funcionando.

### 5.6 Limites

A ponte é local (loopback), sem TLS e sem autenticação; não exponha na rede sem
TLS/mTLS e autorização explícita. A classificação do Jev orienta o trabalho e não
autoriza deploy, produção, exclusão de dados ou uso de segredos. O ganho de
desenvolvimento ainda depende de medição comparativa por projeto.

Ele cria `.agents/hooks.json`, os scripts em `scripts/` e registra a Invariante 10 automaticamente.
