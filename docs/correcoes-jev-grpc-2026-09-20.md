# Correções da integração Jev + ponte gRPC — 20/09/2026

**Autor: Cline** (agente de código no terminal/Cline). Documento anexo à entrada de
memória de mesmo título em `HANDOFF.md`.

Fase A (construir). Escopo: corrigir os defeitos reproduzidos em
`docs/avaliacao-jev-existente-2026-09-20.md` e concluir a ponte gRPC que havia
sido iniciada (dependências instaladas, sem código).

Nada aqui toca produção. As chamadas reais usadas como evidência foram duas, com
o pedido do próprio projeto, sem dados de cliente.

## 1. Fluxo depois das correções

```
pedido do Yuri
  └─ transcript da IDE (.jsonl)
       └─ PreInvocation hook  scripts/jev-pre-invocation-hook.cjs
            ├─ adaptador de transcript (USER_INPUT | payload | event_msg | role:user)
            ├─ cache por sessão + passo + hash do texto
            ├─ transporte: ponte gRPC local (auto) → senão HTTPS direto
            │    └─ scripts/jev-grpc-server.cjs  →  https://api.typesafe.ai/v1/systemone
            ├─ gating de confiança em código  scripts/jev-core.cjs
            └─ diretiva adaptativa injetada no turno (injectSteps.ephemeralMessage)
```

O Jev continua sendo a fonte da classificação (API oficial). O gRPC é a ponte
local que transforma a decisão em um contrato tipado, reutilizável por Node,
Python, C# e Android, com deadline e status estruturados.

## 2. Defeito → correção → evidência

| # | Defeito reproduzido no diagnóstico | Correção | Verificação |
|---|---|---|---|
| 1 | Cache comparava só `step_index`: pedido de outra sessão era suprimido | Chave = `sessão + passo + hash do texto`; TTL 30 min e limite de 24 entradas (`jev-core.cjs` cacheKey/cacheLookup) | selftest 2, 3 e 4 |
| 2 | Pedido sem `step_index` colidia depois do primeiro | Chave sempre inclui hash do texto e usa `no-step` quando ausente | selftest 2 e 4 |
| 3 | Confiança 20% virava “obedeça ao especialista” | Faixas alta ≥ 0,65 / média ≥ 0,45 / baixa < 0,45; baixa proíbe imposição e pede uma pergunta objetiva | selftest 5 |
| 4 | Diretiva mandava testar sempre | Política de testes ≥ 0,60 obrigatórios, ≥ 0,25 recomendados, abaixo disso sem mandato | selftest 1, 5, 6 |
| 5 | Demanda conceitual recebia ordem de código/teste | Tipo `duvida_conceitual` orienta responder primeiro e não alterar código sem pedido | selftest 6 |
| 6 | “Seguro: escopo limitado” era tratado como atestado | Texto nunca afirma segurança; qualquer probabilidade vem com a ressalva de autorização do PO | selftest 7 |
| 7 | Falhas invisíveis (`injectSteps: []` sem motivo) | Evento em `.metrics/jev-hook-events.jsonl` com `reason`/`error_code` em toda saída | selftest 4, 9, 10 |
| 8 | Transcript só no contrato `USER_INPUT` | Adaptadores para `USER_INPUT`, `payload.user_message`, `event_msg.payload`, `role:user` | selftest 8 |
| 9 | gRPC iniciado e não terminado | `.proto` tipado, servidor, cliente, gerenciador da ponte e fallback HTTPS | selftest 11 e 12 |
| 10 | Telemetria gravava o prompt bruto | Eventos guardam `promptHash` e `promptLength`; texto integral só no router manual com `--include-prompt` | selftest 13 |

Detalhes por defeito, com o comportamento antigo e o novo:

1. **Cache com isolamento real.** O hook antigo gravava um único arquivo
   `scratch/.last_routed_step.json` e comparava apenas o número do turno. Agora
   `scratch/.jev_route_cache.json` guarda entradas com `expiresAt`, e a chave é
   `sha256(sessão|passo|hash do texto)`. Dois pedidos diferentes no mesmo turno
   são roteados; o mesmo pedido repetido no mesmo turno não repete a chamada.
2. **Confiança governa o comportamento.** Seguindo
   <https://docs.typesafe.ai/confidence> e
   <https://docs.typesafe.ai/patterns/confidence-routing>: abaixo do piso a
   classificação não é aplicada — ela vira pergunta. A diretiva mostra a faixa
   (alta/média/baixa) e as alternativas com suas probabilidades.
3. **Diretiva adaptativa.** Cada resposta do Jev muda o texto: tipo de tarefa,
   política de testes, indício de produção e severidade. A severidade alta
   acrescenta contenção com rollback descrito.
4. **Sem autoridade concedida.** A diretiva termina com um bloco de limites:
   não autoriza deploy, produção, exclusão de dados, rotação de segredos ou
   mudança de escopo. Isso está alinhado à Invariante 5 do projeto.
5. **Observabilidade.** Cada execução gera uma linha com: evento, motivo,
   transporte, tentativas, modelo, duração, líder, faixa, tipo, política de
   testes, risco, severidade, tokens e avisos. Nunca o texto do pedido.


## 3. Política de confiança (limiares e por quê)

Os limiares ficam em `scripts/jev-core.cjs` (`DEFAULT_CONFIG.thresholds`) e podem
ser ajustados por `JEV_THRESHOLDS_JSON` sem editar código.

| Sinal | Limiar padrão | Efeito no comportamento |
|---|---|---|
| Liderança — faixa alta | confiança ≥ 0,65 | Especialista designado como liderança firme |
| Liderança — faixa média | 0,45 ≤ confiança < 0,65 | Hipótese: confirmar no código antes de decidir arquitetura |
| Liderança — faixa baixa | confiança < 0,45 | Não impõe especialista; pede uma pergunta objetiva se houver ambiguidade |
| Tipo de tarefa | confiança ≥ 0,50 | Abaixo disso o tipo é tratado como não classificado |
| Testes reais | probabilidade ≥ 0,60 | Obrigatórios antes de declarar conclusão |
| Testes reais | 0,25 ≤ prob. < 0,60 | Recomendados; o que não foi validado deve ser declarado |
| Testes reais | prob. < 0,25 | Sem mandato de testes |
| Produção | probabilidade ≥ 0,50 | Indício: plano + rollback + autorização explícita do PO |
| Severidade | score ≥ 1,50 | Contenção primeiro, uma mudança por vez |

Exemplo de ajuste sem tocar no código:

```bash
JEV_THRESHOLDS_JSON='{"leaderHigh":0.7,"leaderLow":0.5,"testsMandatory":0.7}'
```

## 4. Ponte gRPC

Contrato: `scripts/jev-router.proto` (pacote `jev.v1`, serviço `JevRouter`).

| RPC | Entrada | Saída |
|---|---|---|
| `Route` | `state`, `model`, `session_id`, `step_index`, `bypass_cache`, `timeout_ms`, `include_directive` | `ok`, `error_code`, `answers[]`, `decision_json`, `directive`, `leader`, `leader_confidence`, `leader_confidence_level`, `duration_ms`, `transport`, `cached`, tokens |
| `Health` | vazio | `service`, `version`, `has_api_key`, `api_base_url`, `model`, `uptime_ms` |

Semântica de erro escolhida de propósito:

- **gRPC `INVALID_ARGUMENT`** para pedido malformado (estado vazio ou acima de
  `JEV_MAX_STATE_CHARS`). Falha de contrato, não de negócio.
- **`ok: false` no payload** para falha do provedor (`missing_api_key`,
  `upstream_error`, `timeout`, `network_error`, `upstream_contract`). Assim o
  cliente recebe motivo e status HTTP sem precisar mapear códigos gRPC.

Comandos:

```bash
npm run jev:bridge           # sobe a ponte destacada (pid + log em .metrics/)
npm run jev:bridge:status    # serviço, versão, chave, base URL, uptime
npm run jev:bridge:stop      # encerra
npm run jev:route -- "texto" # classifica pela ponte e imprime a diretiva
node scripts/jev-grpc-client.cjs --health
node scripts/jev-grpc-client.cjs --json --no-directive "texto"
```

Decisões de segurança da ponte:

- Bind padrão em `127.0.0.1:50051`. `JEV_GRPC_HOST=0.0.0.0` só tem efeito com
  `JEV_GRPC_ALLOW_NON_LOOPBACK=1` e emite aviso: a ponte não tem autenticação e
  usa a chave do ambiente.
- A chave nunca sai na resposta; `Health` informa apenas `has_api_key`.
- Credencial insegura (sem TLS) porque o transporte é loopback; para uso em rede
  seria necessário TLS/mTLS antes de considerar.
- O cliente fecha o canal em `finally`, e a ponte encerra por `SIGINT`/`SIGTERM`
  com `tryShutdown`.

## 5. Observabilidade

Arquivo: `.metrics/jev-hook-events.jsonl` (hook e ponte) — nunca o texto do pedido.

```json
{"ts":"...","service":"jev-hook","event":"hook","sessionId":"real-check","stepIndex":1,
 "promptHash":"dd143ccceacacad4","promptLength":63,"transcriptShape":"user_input.content",
 "ok":true,"reason":"injected","transport":"grpc","attempts":["grpc:ok"],
 "fallbackFrom":null,"model":"jev-1.13.0","durationMs":281,"leader":"kastiel_dev",
 "leaderLevel":"media","leaderConfidence":0.51,"taskType":"bugfix_urgente",
 "testsPolicy":"mandatory","productionRisk":false,"severity":1.09,
 "mustAskUser":false,"notices":["lideranca_hipotese"],
 "inputTokens":761,"outputTokens":191,"directiveChars":1301}
```

Motivos possíveis (`reason`): `injected`, `cache_hit`, `missing_api_key`,
`state_too_large`, `transcript_missing`, `transcript_unreadable`,
`no_user_entry_in_transcript`, `missing_transcript_path`, `stdin_empty`,
`stdin_not_json`, `stdin_too_large`, `upstream_error`, `timeout`, `network_error`,
`upstream_contract`, `hook_exception` e os de transporte (`grpc_unavailable`,
`grpc_deadline_exceeded`, `bridge_without_api_key`).

Telemetria de classificação: `.metrics/jev-telemetry.jsonl` (escrita pelo CLI
`jev-prompt-router.js`), com `promptHash`/`promptLength` no lugar do texto.
O prompt integral só é gravado com `--include-prompt` ou

## 6. Como rodar e verificar

```bash
npm run jev:selftest          # 14 cenários, API oficial simulada, sem rede e sem chave real
npm run jev:bridge            # sobe a ponte local (opcional; o hook funciona sem ela)
npm run jev:route -- "texto"  # classificação real pela ponte
node scripts/jev-prompt-router.js --grpc "texto"   # mesma coisa, com relatório detalhado
npm run jev:watch -- --once --since=300            # as mensagens estão chegando ao Jev?
npm run jev:watch                                  # monitor ao vivo (Ctrl+C para sair)
```

`jev:watch` responde à pergunta operacional "as mensagens estão chegando ao Jev?".
Linhas `HOOK` significam turno disparado pela IDE; `PONTE`, envio pela ponte;
`ROUTER`, classificação manual. O modo `--once --since=300` termina com
`OK: mensagens estão chegando ao Jev.` ou com o aviso de que o cliente da IDE não
está disparando o hook (código de saída 1, útil para automatizar conferência).

Resultados reais obtidos em 20/09/2026 (sem dados de cliente):

| Verificação | Resultado |
|---|---|
| `npm run jev:selftest` | 14/14 cenários aprovados, 13 chamadas ao provedor simulado, nenhuma requisição externa |
| `npm run jev:route -- "Corrige a lista de cidades…"` | `jev-1.13.0`, 783 ms, `kastiel_dev` 100% (faixa alta), política `recommended` para testes |
| Hook real ponta a ponta (auto → gRPC) | `injectSteps=1`, 281 ms, `kastiel_dev` 51% (faixa média → hipótese), testes obrigatórios (74%) |
| `npm run jev:bridge:status` | ATIVO em `127.0.0.1:50051`, `jev-grpc-bridge 1.0.0`, chave configurada, `api.typesafe.ai` |

O selftest cobre exatamente os defeitos do diagnóstico: colisão de cache entre
pedidos e sessões, confiança baixa, demanda conceitual, risco de produção,
contrato alternativo de transcript, chave ausente, erro do provedor, ponte gRPC,
queda da ponte com fallback, projeto sem as dependências gRPC e ausência do texto
do prompt na telemetria.

## 7. Reuso em outros projetos

O instalador `D:\\Projetos\\Clientes\\INSTALAR-JEV-AQUI.ps1` copia agora o
conjunto completo (núcleo, hook, proto, servidor, cliente, gerenciador, router e
selftest), instala `@grpc/grpc-js` + `@grpc/proto-loader` como devDependencies,
registra a Invariante 10 revisada e roda o selftest como prova de instalação.

Arquivos do conjunto (mesma pasta `scripts/` em qualquer projeto):

| Arquivo | Papel |
|---|---|
| `jev-core.cjs` | Núcleo: config, perguntas, transcript, cache, política, diretiva |
| `jev-pre-invocation-hook.cjs` | Hook PreInvocation (entrada da IDE) |
| `jev-router.proto` | Contrato gRPC |
| `jev-grpc-server.cjs` | Ponte local (chama a API oficial) |
| `jev-grpc-client.cjs` | Cliente da ponte + CLI |
| `jev-bridge.cjs` | start/stop/status da ponte |
| `jev-prompt-router.js` | CLI manual de classificação (HTTPS ou gRPC) |
| `jev-selftest.cjs` | Verificação automatizada dos 14 cenários |
| `jev-watch.cjs` | Monitor das mensagens que chegam ao Jev (`--once --since=300` dá o veredito) |

Consumo da ponte em outras linguagens (a mesma ponte serve qualquer stack):

```bash
# Diagnóstico rápido sem escrever código
grpcurl -plaintext 127.0.0.1:50051 jev.v1.JevRouter/Health

# Python
pip install grpcio grpcio-tools
python -m grpc_tools.protoc -I scripts --python_out=. --grpc_python_out=. scripts/jev-router.proto
```

```python
import grpc, jev_router_pb2 as pb, jev_router_pb2_grpc as pbg

with grpc.insecure_channel("127.0.0.1:50051") as channel:
    router = pbg.JevRouterStub(channel)
    answer = router.Route(pb.RouteRequest(
        state="corrige o filtro de cidades",
        session_id="sessao-1", step_index="1", include_directive=True))
    print(answer.leader, answer.leader_confidence_level)
    print(answer.directive)
```

```csharp
// C#: dotnet add package Grpc.Net.Client
using var channel = GrpcChannel.ForAddress("http://127.0.0.1:50051");
var client = new Jev.V1.JevRouter.JevRouterClient(channel);
var reply = await client.RouteAsync(new Jev.V1.RouteRequest {
    State = "corrige o filtro de cidades", SessionId = "sessao-1", StepIndex = "1",
    IncludeDirective = true
});
Console.WriteLine($"{reply.Leader} ({reply.LeaderConfidenceLevel})");
```

Uso em Android/Kotlin segue o mesmo caminho (`grpc-kotlin` + `protobuf-gradle-plugin`)
apontando para a ponte; em projeto Python puro, o ideal é reaproveitar apenas
`jev-core` traduzido ou consumir a ponte via gRPC, para que a política de
confiança seja uma só em todos os projetos.

## 8. Limites desta entrega

- **Benefício de desenvolvimento ainda não medido.** O que está provado agora é
  que o caminho `pedido → Jev → diretiva entregue ao agente` funciona, com
  política aplicada e falhas visíveis. Falta a comparação A/B (negócios iguais
  com e sem Jev) olhando retrabalho, erros e tokens totais — o custo do Jev é
  pequeno (≈760 tokens de entrada, ≈190 de saída por chamada), mas o ganho segue
  hipótese até essa medição.
- **Consumo da diretiva pelo agente.** O hook entrega `injectSteps.ephemeralMessage`;
  se algum cliente ignorar esse contrato, a diretiva não chega. Isso agora é
  detectável no log (evento sem `injected`), mas depende do cliente.
- **Dependência do provedor.** Sem a API oficial não há classificação. Nesse caso
  a diretiva simplesmente não é injetada e o turno continua (falha silenciosa para
  o usuário, mas registrada e com motivo).
- **Limiares são estimativas iniciais.** Foram escolhidos a partir da
  documentação oficial (piso 0,5–0,6) e não de dados do projeto. Ajuste-os com
  `JEV_THRESHOLDS_JSON` após observar o comportamento.
- **Nada de produção.** A ponte é local, loopback, sem TLS e sem autenticação;
  não deve ser exposta na rede sem TLS/mTLS e autorização explícita.

`JEV_TELEMETRY_INCLUDE_PROMPT=1`, por decisão explícita de quem roda.
