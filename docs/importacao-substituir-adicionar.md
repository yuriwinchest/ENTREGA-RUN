# Importação: substituir a lista ou adicionar atletas

- Data: 2026-10-21. Fase A — candidata à homologação do Yuri.
- Autor desta retomada: Codex/Tony, chat de importação. Backend recebido já implementado por subagente Codex da central; revisado e testado nesta retomada.
- Coordenação: chat central `01a15fc3-461c-7550-8560-c025a0dcb61b`.
- Checkout exclusivo: `D:/Projetos/Clientes/Entregas-run-import-fix`, branch `codex/substituir-planilha`, base informada/verificada no diff `origin/main` (`00017e9`).
- Sem commit, push ou deploy nesta retomada. HANDOFF e AI Memory serão integrados pela central, conforme orientação expressa; este é o registro próprio da frente.

## Comportamento entregue

1. Na prévia de uma importação em evento com atletas, nenhuma opção começa selecionada. O usuário escolhe **Substituir a lista atual** ou **Adicionar atletas**.
2. São exibidos quantidade atual, atletas válidos, linhas ignoradas sem nome e total previsto. Sem linha válida, a importação fica desabilitada.
3. Substituir exige confirmação explícita da remoção da lista e associações anteriores. Voltar ao mapeamento invalida essa confirmação.
4. Com qualquer atleta ENTREGUE, substituir fica desabilitado. O servidor também rejeita a operação, inclusive quando a entrega ocorre entre duas fatias de um upload.
5. Adicionar mantém atletas, entregas, kits, colunas e marcações de saúde existentes, incorporando os novos dados. Reenviar uma planilha pode duplicar atletas; o aviso fica visível junto da opção.
6. O estado da operação e os caches derivados da importação só são trocados depois do sucesso da persistência. Falha mantém a prévia aberta, mostra a mensagem do servidor e não dispara autosave da lista rejeitada.
7. Listas acima de 300 atletas usam chunks. Intenção e revisão seguem em todas as fatias; o fallback HTTP 404 para POST único mantém a revisão capturada.
8. Substituir incrementa `listRevision`. Gravações de uma geração anterior recebem 409, impedindo que abas antigas restaurem atletas removidos. Adicionar preserva a geração e combina os dados com a lista atual do servidor.

## Correção encontrada no navegador

O mapa de revisões da API é atualizado pelo polling. Usar sua revisão corrente somente no clique permitia que uma confirmação antiga passasse a valer para uma lista substituída em outra sessão.

A central autorizou ampliar pontualmente o escopo de OperacaoPage para passar a revisão ao modal. O modal captura essa revisão ao abrir e a envia explicitamente ao callback. Polling posterior não renova a intenção antiga. Após conflito, é necessário recarregar/reabrir e confirmar sobre a lista atual. IMPORTAR OUTRO renova a captura para a geração já salva.

## Arquivos desta frente

- `client/src/components/ImportarAtletasModal.jsx` — escolha, contagens, confirmação, bloqueio de entregas e revisão capturada.
- `client/src/components/ImportarAtletasModal.css` — opções visuais e disposição em uma coluna em telas estreitas.
- `client/src/components/OperacaoPage.jsx` — import necessário, handleImportSuccess e prop de revisão no modal. Alterações da frente Espelho foram preservadas.
- `client/src/utils/eventsApi.js` — mapa/getter de revisão, intenção/revisão nos uploads e mensagens de erro.
- `server/server.js` — somente região de atletas nesta frente: revisão persistida, validação das duas intenções e proteção de entregas em POST/chunks.
- `server/athleteSync.http.test.mjs` — clientes de teste existentes passam a carregar a revisão ao gravar após importação.
- `server/athleteImport.http.test.mjs` — integração HTTP real e teste do transporte do cliente com fetch controlado.
- `.github/workflows/deploy.yml` — novo arquivo de testes incluído no comando explícito do servidor, preservando os testes anteriores.
- Este documento e as quatro imagens abaixo.

O callback compartilhado com AssociarPlanilhasModal continua aceitando opções sem importMode e devolvendo booleano. Essa tela não foi modificada; seu fluxo completo de duas planilhas não foi exercitado no navegador nesta retomada.

## Validação real

- Cliente: `node --test src/utils/*.test.mjs` — **51/51** aprovados.
- Servidor: `node --test *.test.mjs` — **35/35** aprovados na execução final. Inclui um teste Espelho acrescentado simultaneamente por outra frente; não é atribuído à importação.
- Testes focados: `node --test athleteImport.http.test.mjs` — **2/2** aprovados.
- `npm run lint` — sem erros, três avisos preexistentes de fallback em spread em OperacaoPage.
- `npm run build` — aprovado após a captura da revisão no modal.
- `git diff --check` — aprovado; Git avisa normalização futura LF/CRLF em arquivos do servidor.

O HTTP real usa diretório temporário, Appwrite desabilitado e servidor local efêmero. Cobre substituir em evento EM OPERAÇÃO, remoção das associações antigas, metadados, persistência da revisão, rejeição de escrita antiga, adição em evento finalizado, 301 atletas em duas fatias, troca concorrente da lista, entrega concorrente e adição preservando ENTREGUE.

O teste do cliente cobre revisão e modo nas duas fatias, atualização após sucesso, revisão explícita apesar de polling e fallback 404 mantendo a geração original enquanto uma leitura concorrente atualiza o mapa. Erro 409 retorna false e comunica a mensagem pelo callback.

### Navegador com API real isolada

Ensaio no navegador integrado, OperacaoPage real, API local nas portas 5179/3181, usuários e atletas fictícios; nenhuma chamada ao serviço de produção ou Appwrite. A página auxiliar montou a operação autenticada para isolar o fluxo solicitado. Resultado observado:

1. Dois atletas antigos + CSV de três linhas, duas com nome: prévia mostra 2 válidos/1 ignorada; importar sem opção fica desabilitado.
2. Substituir selecionado ainda exige checkbox; confirmado, a API grava apenas os dois novos. A linha sem nome aparece no aviso final e os antigos deixam a tabela.
3. Adicionar outro atleta resulta em três, preservando os dois anteriores.
4. Outra sessão substitui a lista, o polling a carrega e a confirmação antiga recebe erro de revisão. Fechando o modal, a tabela contém somente a lista da outra sessão, sem o atleta da tentativa rejeitada. A persistência foi conferida também por GET autenticado. A ausência de atualização do cache na falha foi conferida no fluxo do código; não houve inspeção direta do armazenamento do navegador.
5. Uma entrega fictícia é registrada pela API; após recarregar, substituir aparece bloqueado. Adicionar continua disponível e salva um novo atleta: resultado **2 no total / 1 entregue / 1 pendente**.

Os arquivos auxiliares de montagem/configuração do ensaio foram removidos ao finalizar; as capturas contêm somente dados fictícios.

## Evidências visuais

- [Prévia e confirmação](importacao-substituir-preview.png) — captura antes do refinamento final do texto de contagens, mesma escolha/checkbox.
- [Conflito entre sessões](importacao-conflito.png).
- [Substituição bloqueada por entrega](importacao-protecao-entregas.png).
- [Adição preservando entrega](importacao-resultado-local.png).

## Riscos, limites e próximo passo

- A API cliente e o servidor devem integrar a mesma entrega: após uma substituição, cliente antigo sem revisão passa a receber conflito até atualizar.
- Adição não elimina duplicatas por nome/CPF. Essa política não foi ampliada nesta demanda.
- Importação grande foi validada por HTTP e teste do cliente; o navegador usou CSV pequeno. Não foi repetido upload XLSX nem o fluxo de associação de duas planilhas.
- Layout estreito possui regra CSS, mas esta frente não realizou homologação em celular físico.
- Produção, CI remoto e homologação funcional do PO não foram executados nesta frente. Fase C não foi iniciada.
- Próximo passo: central integrar a continuidade e revisar o diff conjunto antes de entregar a candidata ao Yuri; publicação continua dependendo da autorização aplicável.
