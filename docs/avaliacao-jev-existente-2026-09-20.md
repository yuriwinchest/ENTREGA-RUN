# Avaliação da implementação Jev existente no Entregas-run

Data: 20/09/2026. Fase A: diagnóstico pontual da integração de apoio ao desenvolvimento. Não é Fase C nem auditoria geral.

## Veredito

A integração com a API funciona por execução manual. A implementação de roteamento está incompleta e apresenta falhas reproduzíveis. Não há evidência suficiente de disparo automático pela IDE, consumo da diretiva ou melhoria no resultado de desenvolvimento. Não recomendar replicação como integração validada.

## Evidências atuais

- `scripts/jev-prompt-router.js:82`: chama a API com Choice, Score e Noul; a chamada feita nesta conversa retornou jev-1.13.0. Isso é um uso compatível com a proposta do modelo.
- `scripts/jev-prompt-router.js:144`: monta texto com a classificação. O código não despacha um especialista nem muda o modelo principal. Pode orientar o agente, mas efeito efetivo não foi medido.
- `.agents/hooks.json`: declara PreInvocation, enquanto `scripts/jev-pre-invocation-hook.cjs:49` espera transcriptPath, `:65` espera USER_INPUT e `:209` emite injectSteps. Não foi demonstrado que a IDE ativa e consome esse contrato nesta sessão. Testar script manualmente não equivale a testar integração da IDE.
- `scratch/test_hook_execution.cjs`, citado no HANDOFF histórico, não existe no checkout no momento desta avaliação; não foi possível revisar ou repetir esse teste histórico.
- A telemetria atual contém duas entradas: 1079 ms e 877 ms, com confiança do especialista de 47% e 75%, respectivamente. Não foram expostos prompts nem credenciais. Os tempos do CLI terminam antes da leitura do JSON, portanto não representam duração ponta a ponta.

## Defeitos reproduzidos

Executado o código real do hook em node:vm, com filesystem em memória, credencial fictícia e fetch simulado. Nenhuma alteração no cache real, nenhuma chamada externa e nenhum dado de cliente. Estes testes verificam lógica local, não qualidade da API nem integração da IDE.

| Cenário | Chamadas ao fetch simulado | Diretivas emitidas | Resultado |
|---|---:|---:|---|
| Sessão A, índice 1, confiança 20% | 1 | 1 | Impõe liderança apesar de baixa confiança |
| Sessão B, outro pedido, índice 1 | 0 | 0 | Pedido de outra sessão suprimido indevidamente |
| Primeiro pedido sem step_index | 1 | 1 | Aceita contrato incompleto |
| Segundo pedido sem step_index | 0 | 0 | Novo pedido suprimido indevidamente |
| Registro com outro contrato, event_msg/payload | 0 | 0 | Ignorado silenciosamente; requer adaptador compatível com o cliente |

1. **Cache sem isolamento de sessão:** `scripts/jev-pre-invocation-hook.cjs:92`, `:102`, `:205` usam arquivo único e somente step_index. Pedidos diferentes com o mesmo índice colidem. Sem índice, undefined também colide depois do primeiro resultado.
2. **Confiança não governa comportamento:** `:190` mostra confiança, mas `:198` ordena obedecer ao especialista sem limiar ou alternativa. No teste com 20%, a ordem foi emitida normalmente. A documentação recomenda tratar explicitamente a incerteza: https://docs.typesafe.ai/confidence.
3. **Diretiva genérica não acompanha decisões:** `:199` manda executar testes mesmo quando a pergunta foi classificada como conceitual e a probabilidade de exigir testes foi 1% no teste. O código também orienta evitar mocks se sistema real acessível, sem distinguir teste isolado de uso de dados/serviço real.
4. **Falhas invisíveis:** erros e contratos não reconhecidos resultam em injectSteps vazio, sem diagnóstico operacional. Ausência de diretiva pode significar cache, entrada incompatível, chave ausente ou API com erro.
5. **Classificação não prova segurança:** no CLI, `scripts/jev-prompt-router.js:148` transforma probabilidade baixa de tocar produção em texto "Seguro". Esse resultado não substitui análise do escopo ou autorização.

## Utilidade e resultados

Faz sentido usar Jev como classificador de intenção para apoiar desenvolvimento; a própria documentação descreve classificação seguida de encaminhamento explícito: https://docs.typesafe.ai/patterns/intent-routing.

No estado atual, o benefício demonstrado é apenas produzir uma classificação e uma diretiva textual. Não há medidas de encaminhamento correto, diretiva efetivamente aplicada, sucesso da tarefa, regressões, retrabalho, tokens do agente principal ou comparação sem Jev. Os registros não permitem afirmar economia nem código melhor. Também não permitem afirmar benefício zero: essa avaliação ainda não foi feita.


## Status posterior (20/09/2026, mesma data)

As correções listadas acima foram implementadas e verificadas em
`docs/correcoes-jev-grpc-2026-09-20.md` (cache por sessão/passo/texto, gating por
confiança, diretiva adaptativa, observabilidade, adaptadores de transcript e ponte
gRPC local com fallback). Este documento permanece como registro do diagnóstico
original; os defeitos 1 a 4 descritos aqui não descrevem mais o código atual.

Próximas correções necessárias: verificar o contrato real da IDE; isolar cache por sessão e mensagem; tratar baixa confiança; adaptar a diretiva à tarefa sem conceder autoridade ao classificador; registrar execução/consumo/erro e medir resultados de tarefas comparáveis com e sem Jev. Nenhuma dessas correções foi implementada neste diagnóstico.
