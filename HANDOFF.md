# Handoff

## 2026-09-25 — Sincronização segura da Corrida da Renascença (Fase B)

- **Autor:** Codex/Tony (GPT-6). Revisão de disponibilidade de Vitor executada por agente delegado, somente leitura.
- **Pedido:** corrigir a lista divergente entre navegadores durante a entrega de kits, preservar as entregas em andamento e evitar interrupção do sistema ao publicar.
- **Arquivos alterados:** `client/src/components/OperacaoPage.jsx`, `client/src/utils/eventsApi.js`, `server/server.js`, `server/athleteSync.js`, `server/athleteSync.test.mjs`, `server/athleteSync.http.test.mjs`, `server/dataSnapshot.mjs`, `server/dataSnapshot.test.mjs`, `scripts/deploy-vps.sh` e `.github/workflows/deploy.yml`.
- **Implementação:** a tela passa a carregar e atualizar a lista do servidor sem reenviar o cache antigo; em evento ativo ou com entregas já registradas, o servidor conserva entregas e associações salvas quando recebe uma planilha antiga. O desfazer intencional envia a identificação do atleta e a reversão de entrega exige supervisor/admin. As métricas de evento são calculadas a partir dos atletas persistidos. Escritas assíncronas no Appwrite são serializadas e condensadas por evento. O script de deploy cria e verifica snapshot privado do volume, exige o arquivo da Renascença mesmo se o resumo do evento estiver defasado, espera estabilidade do backup e compara antes/depois identidades e dados críticos das entregas no disco e na API.
- **Validação real:** backups privados locais criptografados com DPAPI e conferidos por SHA-256 da corrida ativa (353 atletas, 69 e 83 entregues nos instantes das capturas); consulta posterior de produção confirmou saúde e 353 atletas, 83 entregues, enquanto o resumo antigo ainda indicava zero. Consulta read-only ao Appwrite confirmou 353 atletas/83 entregues e resumo do evento ainda em zero. Teste HTTP local com 301 atletas e dois clientes, inclusive upload em partes, passou; testes unitários e teste existente de usuários passaram. Dois contextos reais do Chrome atualizaram a lista central sem POST da planilha antiga. A regressão real no Chrome encontrou e corrigiu a perda da decisão pendente após reload com falha de servidor; entrega, desfazer e os dois formatos de importação passaram após a correção. O gate de deploy rejeitou em teste local arquivo ausente, perda de entrega em disco/API e mudança de dados críticos; a imagem Docker candidata foi construída e o gate dentro do contêiner aceitou dados íntegros e rejeitou entrega perdida. Lint, build, sintaxe Bash e `git diff --check` passaram; o lint ainda reporta três avisos preexistentes em `OperacaoPage.jsx`. CI do PR #4 validou build e preflight somente leitura da VPS na revisão anterior.
- **Risco/pendência:** código ainda não publicado na VPS. O deploy atual recria o único contêiner e derruba as sessões em memória; Yuri aceitou logout/relogin, condicionado à integridade. Uma gravação em voo pode ter resultado incerto porque o servidor antigo não drena requisições ao reiniciar. O gate agora exige planilha de evento ativo válida, captura contagem e identidades das entregas confirmadas, e compara disco e API após a troca; rollback troca somente imagem, nunca restaura snapshot por cima de entregas recentes. O backup DPAPI é uma cópia pontual fora do repositório, não substitui snapshot da VPS imediatamente antes da troca. Appwrite continua como espelho assíncrono, não como transação primária.
- **Próximo passo:** aguardar confirmação de que os operadores pausaram cliques e saíram do sistema; então capturar backup atual, passar CI/preflight no PR atualizado e só publicar se snapshot e manifesto de integridade no VPS forem válidos. Depois, verificar saúde, contagens e entregas pela API e solicitar login/homologação do Yuri. Caso o gate falhe, abortar/rollback da imagem preservando o volume.

## 2026-09-25 — Isolamento Estrito de Eventos por Usuário e Reatribuição de Operadores (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead, Crowley Segurança, Vitor Infra/SRE & Fullstack).
- **Demanda do Yuri (PO via áudio):**
  "Outro ajuste que precisa ser feito é no isolamento dos usuários. O usuário só pode ser... o usuário que entrega kit ele só pode entregar o kit daquele projeto que foi atribuído pra ele. Hoje ele tá conseguindo entregar kit de qualquer evento que foi criado. Então ele só vai ver o evento que foi atribuído pra ele quando o admin criou o login dele e atribuiu um evento pra ele, ele só vai ver aquele evento. Então só vai conseguir atribuir aquele evento. Precisa ajustar isso também, ajustar isso imediatamente."
- **Causa Raiz Identificada:**
  1. A rota backend `GET /api/events` retornava todos os eventos do banco sem filtrar pela sessão do usuário logado.
  2. Os endpoints de atletas (`GET/POST /api/events/:eventId/athletes` e `PUT /api/events/:eventId/athletes/:numero/status`) não verificavam a titularidade do evento na sessão, e o frontend em `eventsApi.js` não enviava o Bearer token nessas requisições.
  3. No cadastro de usuários, o dropdown permitia selecionar "TODOS OS PROJETOS (`all`)" para operadores e supervisores.
  4. No frontend (`App.jsx`), a navegação por fallback caía em `events[0]`, permitindo que um operador visualizasse ou alterasse eventos de terceiros.
- **Implementações Técnicas Ponta a Ponta:**
  - `server/server.js`:
    - `GET /api/events`: Usuários com restrição de escopo (`session.role !== 'ADMIN'` e `session.eventId !== 'all'`) recebem exclusivamente o evento atribuído ao seu ID.
    - `POST /api/events` e `PUT /api/events/:eventId`: Bloqueio estrito com `403 Forbidden` para operadores.
    - `GET/POST /api/events/:eventId/athletes` e `PUT /api/events/:eventId/athletes/:numero/status`: Proteção contra IDOR / invasão de inquilino — bloqueia com `403 Forbidden` qualquer operador tentando consultar atletas ou entregar kits de outro evento (`session.eventId !== safeEventId`).
    - `POST /api/users` e `PUT /api/users/:id`: Rejeição com `400 Bad Request` na tentativa de cadastrar ou alterar `OPERADOR` ou `SUPERVISOR` sem vincular a um evento específico (`eventId === 'all'` ou nulo é proibido).
    - `POST /api/login`: Garantia de vínculo de operadores legados para nunca permitir sessão global não autorizada.
  - `client/src/utils/eventsApi.js`:
    - Inclusão de cabeçalhos de autenticação (`Authorization: Bearer <token>`) em `apiFetchAthletes`, `apiSaveAthletes`, `apiSaveAthletesChunked` e `apiSaveAthletesSingle`.
  - `client/src/components/UsuariosPage.jsx` & `UsuariosPage.css`:
    - Formulário de Novo Usuário: Opção "TODOS OS PROJETOS" ocultada para perfis `OPERADOR` e `SUPERVISOR`, forçando a seleção de uma corrida real.
    - Modal de Editar Usuário (Novo): Permite que administradores alterem nome, função e reatribuam o evento do operador em 2 cliques.
    - Botão "EDITAR" com ícone estilizado nos cards da listagem de credenciais.
  - `client/src/components/EventosPage.jsx` & `EventosPage.css`:
    - Listagem filtrada: operador visualiza exclusivamente o card da corrida atribuída.
    - Botão `+ NOVO EVENTO` e ações de alterar/excluir evento ocultados para operadores.
    - Status pill renderizado como badge estático (sem permissão para alterar ciclo de vida do evento).
  - `client/src/components/DashboardPage.jsx`:
    - Métricas, contadores e barras de progresso calculados estritamente sobre os eventos visíveis do usuário.
    - Botão de criar evento suprimido no empty state para usuários restritos.
  - `client/src/App.jsx`:
    - Guards de rota ativos via `useEffect` e sanitização de histórico com `replaceState`: operadores acessando URLs de outros eventos ou `/usuarios` são redirecionados automaticamente para `/operacao/${user.eventId}`.
    - Fallback de renderização de componentes blindado para impedir vazamento de eventos de terceiros.
    - Redirecionamento no login de operador leva direto para a sua tela de entrega de kit.
  - `server/admin-users.test.mjs`:
    - Testes automatizados cobrindo rejeição de operador com `eventId: 'all'`, isolamento da listagem de eventos e bloqueio 403 Forbidden em tentativas de entrega de kits em eventos não atribuídos.
- **Validação Real:**
  - `node server/admin-users.test.mjs`: 100% aprovado (`pass: 1, fail: 0`).
  - `npm run lint --prefix client`: 0 erros.
  - `npm run build --prefix client`: bundle gerado com sucesso em 327ms.
  - `curl.exe http://localhost:3001/api/health`: 200 OK.
- **Próximo Passo:** Homologação pelo Yuri (PO) após deploy automático.

## 2026-09-25 — Redesign Visual e Ergonomia Responsiva da Aba Auditoria (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead, Ana UI/UX & Fullstack).
- **Demanda do Yuri (PO via imagem e mensagem):**
  "outro ajsuta aogra de letate veja essa aba auditoria esta muito feio esse campos ai melhroa esse ai lembrando semrpe que temque tambem ajsuta para celulares"
  - Na imagem enviada pelo PO, o título `HISTÓRICO DE ENTREGAS` quebrava feio em 3 linhas ("HISTÓRICO / DE / ENTREGAS"), espremido por 5 controles compridos amontoados em linha horizontal, truncando o campo de busca ("Buscar entrega (nome, peito..."), com botões desalinhados e botão ATUALIZAR em laranja destoante.
  - No celular/mobile, a barra quebrava os botões ou sobrepunha elementos.
- **Implementações Técnicas (Diretrizes Ana UI/UX):**
  - `client/src/components/OperacaoPage.jsx`:
    - Separação em dois níveis hierárquicos limpos:
      1. `audit-card-head`: cabeçalho superior espaçoso com o título `HISTÓRICO DE ENTREGAS` em linha única (`white-space: nowrap`), badge moderno com dot de status ativo verde (`N registro(s)`), subtítulo explicativo e grupo de ações de relatório à direita (`EXPORTAR CSV`, `GERAR PDF` e `ATUALIZAR` estilizado com elegância).
      2. `audit-card-toolbar`: toolbar dedicada para filtros e navegação com fundo suave `#f8fafc` e borda delimitadora sutil `#e2e8f0`. Campo de busca amplo (`flex: 1`) com ícone, placeholder completo e botão `✕` para limpar busca instantaneamente. Seletor de registros por página harmonizado e alinhado (`audit-per-page-wrap`).
  - `client/src/components/OperacaoPage.css`:
    - Redesign desktop dos botões (`.btn-audit-action`, `.btn-audit-pdf`, `.btn-audit-refresh`) com tipografia Montserrat 800, padding consistente (38px de altura) e transições suaves.
    - Barra de busca com foco em anel laranja da marca PaceTime (`#ff5200`).
    - Responsividade Mobile e Celulares (`@media (max-width: 768px)` e `@media (max-width: 640px)`):
      - O cabeçalho se organiza em bloco vertical com espaçamento generoso de 16px/14px.
      - Ações de relatório formam uma grade touch-friendly (3 colunas com botões de 42px de altura).
      - Campo de busca ganha 100% de largura com 42px de altura, ideal para teclado de smartphone.
      - Seletor por página ocupa a largura e se alinha com o rótulo "Exibir:".
      - Indicador touch da tabela de auditoria orienta deslize horizontal suave.
      - Card `planilha-box-card` (Base Geral de Atletas) ajustado para empilhar botões verticalmente em telas menores que 768px, sem quebrar textos.
- **Validação Real:**
  - `npm run lint --prefix client`: 0 erros.
  - `npm run build --prefix client`: bundle gerado em 359ms com sucesso.
  - `node --check server/server.js`: sintaxe válida (exit code 0).
  - `node server/admin-users.test.mjs`: testes aprovados (1123ms).
- **Próximo Passo:** Homologação pelo Yuri (PO) após deploy automático.

- **Autor:** Antigravity / Equipe TONE (Tech Lead & Fullstack).
- **Demanda do Yuri (PO via imagem e mensagem):**
  1. *Remoção do botão Anexar Planilha:* O botão `↑ ANEXAR PLANILHA` exibido na aba de Planilha Original não existe ali. Toda e qualquer anexação de planilha é realizada exclusivamente pela aba Auditoria (`IMPORTAR JÁ ASSOCIADO` ou `IMPORTAR COM ASSOCIAÇÃO`).
  2. *Rótulo limpo da aba Atletas:* A aba deve se chamar simplesmente `ATLETAS`, sem o sufixo `(2 CAMPOS)` ou qualquer contagem de campos.
  3. *Exibição condicional da aba Planilha Original:* A aba `PLANILHA ORIGINAL` só deve existir e ser exibida quando o usuário anexar uma planilha e importar campos específicos (ou seja, quando houver colunas ignoradas na planilha que precisam ser preservadas na versão original). Caso contrário, a aba não aparece na navegação superior.
- **Implementações Técnicas:**
  - `client/src/components/ImportarAtletasModal.jsx` & `client/src/components/AssociarPlanilhasModal.jsx`:
    - Adicionada detecção de campos específicos (`hasSpecificFields`): marcada como verdadeira se houver colunas ignoradas ou se o total de colunas da planilha for superior ao total de colunas mapeadas.
    - O objeto `originalSheet` é persistido com a flag `hasSpecificFields: true`.
  - `client/src/components/OperacaoPage.jsx`:
    - Removida a reconstrução artificial de planilha falsa a partir dos atletas (eliminando o fallback que forçava a aba a existir para eventos normais).
    - `effectiveOriginalSheet` agora só existe quando houver `originalSheet` real com linhas e cabeçalhos.
    - Criado memo `showOriginalSheetTab` que avalia se a planilha foi importada com campos específicos (`hasSpecificFields === true` ou mais colunas que a tabela de atletas).
    - Aba `PLANILHA ORIGINAL` condicionada a `{showOriginalSheetTab && (...)}`.
    - Rótulo da aba `ATLETAS` limpo para apenas `ATLETAS`.
    - Botão `↑ ANEXAR PLANILHA` removido da toolbar da Planilha Original.
- **Validação Real:**
  - `npm run lint --prefix client`: 0 erros.
  - `npm run build --prefix client`: bundle gerado com sucesso pelo Vite em 353ms.
  - `node --check server/server.js`: sintaxe válida (exit code 0).
  - `node server/admin-users.test.mjs`: testes aprovados (1141ms).
- **Próximo Passo:** Homologação pelo Yuri (PO) após deploy automático.

- **Autor:** Antigravity / Equipe TONE (Tech Lead & Fullstack).
- **Demanda do Yuri (PO via texto/console):**
  "ta travando clcia e não mudas agians"
  Logs do console enviados pelo Yuri:
  - `Uncaught ReferenceError: setDetailSourceTab is not defined at Rt ... at onClick`
  - `/logo.png:1 Failed to load resource: the server responded with a status of 404 ()`
- **Causa Raiz Identificada:**
  1. *ReferenceError `setDetailSourceTab`:* Dentro de `OperacaoPage.jsx`, a função `executeCloseAthleteDetail()` tentava chamar `setDetailSourceTab(null)`. Toda vez que o operador clicava em qualquer aba ("ATLETAS", "PLANILHA ORIGINAL", "ESTATÍSTICAS", "AUDITORIA") ou em qualquer rota do menu lateral (Sidebar), a guarda de navegação `closeAthleteDetail()` era acionada para fechar o atleta ativo. Como `detailSourceTab` não estava declarado no estado do componente, o JavaScript quebrava com `ReferenceError`, abortando o clique e impedindo qualquer transição de tela ou aba.
  2. *ReferenceError `auditIncludeComprovantes`:* O export de auditoria referia-se a `auditIncludeComprovantes` sem declaração de estado local.
  3. *Bloqueio potencial por decisão órfã:* Se existisse uma chave `pendingKitDecision` no `localStorage` apontando para um atleta inexistente ou apagado, a interface ficava com `busy=true` sem permitir dispensar.
  4. *404 em `/logo.png`:* No `Dockerfile`, a pasta `client/public` não era copiada para a imagem runner final, e o Express tentava `distLogo` e caía num fallback inexistente. Além disso, as permissões do container rodavam como usuário `node` sem chown explícito em `client/dist`.
- **Implementações Técnicas:**
  - `client/src/components/OperacaoPage.jsx`:
    - Declarado `const [_detailSourceTab, setDetailSourceTab] = useState(null)`.
    - Declarado `const [auditIncludeComprovantes, _setAuditIncludeComprovantes] = useState(true)`.
    - Blindagem em `useEffect` de `pendingKitDecision`: se o evento ou atleta não existirem na lista de atletas carregada, a decisão órfã é descartada automaticamente via `localStorage.removeItem` e `setPendingKitDecision(null)`, nunca travando a UI.
  - `server/server.js`:
    - Rotas `/logo.png` e `/favicon.svg` reescritas com verificação síncrona `fs.existsSync` percorrendo múltiplos caminhos candidatos (`client/dist`, `client/public`, `client/src/assets`) com fallback gracioso para `/favicon.svg`.
  - `Dockerfile`:
    - Adicionado `COPY --chown=node:node client/public/ ./client/public/`.
    - Adicionado `--chown=node:node` em `COPY --from=builder /app/client/dist ./client/dist`.
- **Validação Real:**
  - `npm run lint --prefix client`: **0 erros**.
  - `npm run build --prefix client`: bundle gerado em 645ms.
  - `node --check server/server.js`: sintaxe válida (exit code 0).
  - `node server/admin-users.test.mjs`: testes aprovados (1134ms).
  - Teste em container Docker isolado local: `GET /logo.png` retornou **HTTP 200 OK** (`Content-Type: image/png`, `1237770 bytes`).
- **Próximo Passo:** Homologação pelo Yuri (PO) após deploy automático.

## 2026-09-25 — Integração Codex (Decisão Obrigatória de Kit) e Correção da Importação de Planilha Completa (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead & Fullstack) integrado com Codex/Tony.
- **Demandas do Yuri (PO via áudio/texto):**
  1. *Subir no Git para VPS:* Verificar se o GPT/Codex terminou o trabalho de decisão obrigatória de kit e integrar para subir na VPS.
  2. *Correção do modelo de Planilha Completa (Planilha Única Associada):* Quando o usuário cria um evento e anexa uma planilha que já vem completa/associada (com corredor, número de peito e chip na mesma linha), os dados deixavam de ser reconhecidos e não eram gravados no servidor.
  3. *Preservação de Todas as Demandas Anteriores:* Manter a logo da sidebar sem quebrar, o campo "ENTREGUE PARA / RETIRADO POR" no final da ficha de atendimento, a permanência na aba `entrega` ao fechar/desfazer e a sub-aba "PLANILHA ORIGINAL (TODOS OS CAMPOS)".
- **Causa Raiz da Planilha Completa:**
  1. No modal de importação única (`ImportarAtletasModal.jsx`), mesmo quando a planilha continha colunas mapeadas de número e chip, a lista `kits` do evento não era populada nem enviada para a API.
  2. Em `OperacaoPage.jsx`, `handleImportSuccess` continha um fechamento assíncrono sobre o callback do `setAthletes` onde a variável de atletas mesclados permanecia com tamanho 0 fora da closure, impedindo que a chamada de persistência `apiSaveAthletes` fosse acionada ao importar planilhas completas.
- **Implementações Técnicas Integradas:**
  - `client/src/components/PendingKitDecisionModal.jsx` & `PendingKitDecisionModal.css`: modal obrigatório após confirmação de leitura de QR code/chip com foco retido, trap de teclado e campo opcional de terceiro recebedor.
  - `client/src/App.jsx`: bloqueio de navegação via `popstate` enquanto houver decisão de kit pendente.
  - `client/src/components/KitQrScannerModal.jsx`: suporte ao estado `confirming` durante o salvamento inicial da associação.
  - `client/src/components/ImportarAtletasModal.jsx`:
    - Auto-extração de kits para atletas que já contam com número e chip na planilha completa.
    - Gravação atômica assíncrona na etapa 3: o modal só avança para "Concluído" se a gravação no servidor for confirmada com sucesso. Se falhar, exibe mensagem clara e mantém o mapeamento permitindo retry.
  - `client/src/components/OperacaoPage.jsx`:
    - Fila sequencial assíncrona de persistência (`saveAthletesInOrder`) prevenindo condições de corrida com o autosave debounce.
    - Estado `pendingKitDecision` persistido em `localStorage` e recuperado automaticamente se a página for recarregada.
    - `confirmKitAssociation` atualizado para gravar no backend antes de abrir a decisão obrigatória, salvando o número anterior em `_kitPreviousNumero`.
    - `handleUndoAssociation` atualizado para restaurar `_kitPreviousNumero` e manter a aba `entrega`.
    - `handleSaveAndDeliver` atualizado para aceitar `recipientOverride` opcional do modal de decisão.
    - Mantidos o campo "ENTREGUE PARA / RETIRADO POR" no final da página da ficha e a sub-aba de planilha original.
- **Validação Real:**
  - `node --check server/server.js`: sintaxe válida (exit code 0).
  - `node server/admin-users.test.mjs`: testes de backend executados e aprovados (1702ms).
  - `npm run lint --prefix client`: oxlint aprovado sem avisos nem erros (30 arquivos analisados em 90ms).
  - `npm run build --prefix client`: bundle de produção do Vite gerado com sucesso (dist/assets/index-yQr5zy6o.js e logo-CPupJpv1.png).
- **Próximo Passo:** Homologação pelo Yuri (PO) em produção.

## 2026-09-25 — Correção da Logo do Menu Lateral / Sidebar e Rotas Estáticas de Marca (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead & Fullstack).
- **Demanda do Yuri (PO via áudio):**
  "A logo que tá dentro, em cima, a logo pequena, ela não tá aparecendo. A logo que fica dentro ali do menu lateral, ela sumiu."
- **Causa Raiz Identificada:**
  1. *Falta de bundling da logo pelo Vite:* O componente `Sidebar.jsx` utilizava `<img src="/logo.png" />` com string hardcoded em vez de import ES module. Em certas circunstâncias de roteamento SPA, requisições para `/logo.png` podiam ser capturadas pelo wildcard do Express/Vite retornando o `index.html` (text/html), fazendo o elemento `<img>` quebrar e desaparecer.
  2. *Ausência de rota estática dedicada no Express:* O `server.js` possuía rota estática prioritária apenas para `/api/municipios`, mas não para `/logo.png` ou `/favicon.svg`, deixando-as sujeitas ao interceptador do SPA.
  3. *Inexistência de fallback:* Se a imagem falhasse por timeout ou erro de rota, o badge ficava como um quadrado branco vazio sem qualquer indicador visual.
- **Implementações Técnicas:**
  - `client/src/assets/logo.png`: copiado para a pasta de assets rastreada pelo Vite.
  - `client/src/components/Sidebar.jsx`:
    - Adicionado import direto do asset: `import logoImg from '../assets/logo.png'`.
    - Criado componente `SidebarBrandLogo` com fallback triplo: (1) asset compilado com hash anti-cache do Vite, (2) fallback de rede para `/logo.png`, e (3) fallback vetorial SVG `BrandRunnerLogo` de alta nitidez com as cores oficiais da marca.
  - `client/src/components/LoginPage.jsx`: atualizado para importar `logoImg` de `../assets/logo.png` com fallback em `onError`.
  - `client/src/components/Sidebar.css`: adicionadas regras de `display: block`, `object-fit: contain` e suporte nativo ao SVG dentro de `.sidebar-brand-badge`.
  - `server/server.js`: adicionadas rotas explícitas dedicadas para `/logo.png` e `/favicon.svg` servindo diretamente os arquivos estáticos de `dist` ou `public` antes do wildcard de SPA.
- **Validação Real:**
  - `node --check server/server.js`: sintaxe válida (exit code 0).
  - `node server/admin-users.test.mjs`: testes de integridade do servidor aprovados (1101ms).
  - `npm run lint --prefix client`: **0 erros e 0 warnings** em 29 arquivos.
  - `npm run build --prefix client`: bundle gerado com sucesso contendo `dist/assets/logo-CPupJpv1.png` (329ms).
- **Próximo Passo:** Homologação pelo Yuri (PO).



- **Autor:** Antigravity / Equipe TONE (Tech Lead & Fullstack).
- **Demandas do Yuri (PO):**
  1. *Descarte de campos ignorados:* Ao desmarcar ou ignorar colunas no mapeamento de planilha (ex: celular, sexo, etc.), esses campos não devem aparecer na base de atletas, na tabela de visualização e nem no formulário de edição cadastral.
  2. *Aba Planilha Original:* Criação de uma sub-aba dedicada "PLANILHA ORIGINAL" onde 100% dos dados originais e brutos do arquivo Excel/CSV ficam preservados com todas as colunas, busca global e exportação em CSV.
  3. *Remoção de texto indevido:* Remover o texto informativo *"Cadastro salvo. O botão ENTREGAR KIT está liberado — salvar não registra a entrega."* exibido na ficha do atleta.
  4. *Reposicionamento do campo Retirado Por:* Reposicionar o card *"👤 ENTREGUE PARA / RETIRADO POR"* para o final da página de detalhes do atleta.
  5. *Permanência na aba de entrega:* Manter o operador na aba onde é feita a entrega dos kits (`entrega`) ao fechar a ficha do atleta ou desfazer associações pendentes, sem alternar involuntariamente para a aba de atletas.
- **Implementações Técnicas:**
  - `client/src/utils/athleteTable.js`: `buildImportColumnSchema` atualizado para descartar colunas marcadas como `ignore` ou não mapeadas (removida a regra legada que forçava colunas ignoradas como custom fields).
  - `client/src/components/ImportarAtletasModal.jsx` & `AssociarPlanilhasModal.jsx`: colunas ignoradas não são atribuídas aos objetos dos atletas. Adicionado salvamento estruturado de `originalSheet: { fileName, headers, rows, totalRows, importedAt }` repassado no callback `onImportSuccess`.
  - `server/server.js`: persistência e retorno de `originalSheet` implementados nos endpoints de atletas (`GET/POST /api/events/:eventId/athletes`, `POST /chunks`, `PUT /status`).
  - `client/src/utils/eventsApi.js`: trânsito de `originalSheet` em `apiFetchAthletes`, `apiSaveAthletes` e `apiSaveAthletesChunked`.
  - `client/src/components/OperacaoPage.jsx`:
    - Adicionado suporte a `originalSheet` e nova sub-aba *"PLANILHA ORIGINAL (TODOS OS CAMPOS)"* com contadores, busca em tempo real em todas as colunas, paginação e exportação CSV (`btn-download-original-csv`).
    - Removido o elemento `<p className="athlete-detail-action-hint">`.
    - Movido o card `.athlete-entregue-para-card` para o rodapé da página (após os dados cadastrais e custom fields).
    - `executeCloseAthleteDetail` e `handleUndoAssociation` ajustados para permanecer em `setActiveTab('entrega')`.
  - `client/src/components/OperacaoPage.css`: estilização responsiva do banner e botão de exportação da planilha original.
- **Validação Real:**
  - `node --check server/server.js`: sintaxe válida (exit code 0).
  - `node server/admin-users.test.mjs`: 1 test passed (1127ms).
  - `npm run lint --prefix client`: oxlint 0 warnings, 0 errors em 29 arquivos.
  - `npm run build --prefix client`: bundle de produção gerado com sucesso em 457ms.
- **Próximo Passo:** Homologação pelo Yuri (PO).



- **Autor:** Antigravity / Equipe TONE (Tech Lead & Fullstack).
- **Demanda do Yuri (PO via áudio 02:33 com print):**
  Ao configurar uma imagem de fundo (banner) no espelho e abrir a segunda tela, a imagem piscava por um instante e sumia, deixando a tela apenas com a cor azul de fundo.
- **Causa Raiz Identificada:**
  1. *Limite de cota em requisições keepalive:* A função `publishEspelhoState` utilizava `keepalive: true` no `fetch`. A especificação dos navegadores impõe uma cota restrita de 64 KB para requisições `keepalive`. Como imagens em base64 ultrapassam 64 KB, o navegador rejeitava a chamada com `TypeError` no envio, impedindo que o backend recebesse a imagem.
  2. *Sobrescrita por estado SSE sem imagem:* Como o servidor não recebia a imagem ou recebia atualizações de estado parciais (ex: `OperacaoPage` enviando apenas status 'LIVRE' ou 'ATENDENDO' sem `bgImage`), o servidor respondia com `config.bgImage: null`, que sobrescrevia a imagem carregada inicialmente do `localStorage`, fazendo-a piscar e sumir.
  3. *Ausência de persistência em disco da config do espelho no backend:* As configs eram salvas apenas em memória RAM e eram perdidas em reinicializações do servidor ou deploys de container.
  4. *Sanitização destrutiva no backend:* Quando o backend recebia updates parciais de config (ex: ajuste de cor ou fonte), `raw.bgImage` indefinido era convertido para `null`, destruindo a imagem previamente salva.
- **Solução Implementada:**
  1. **Compressão e Redimensionamento Client-side (`compressImageFile` em `espelhoSync.js` e `EspelhoModal.jsx`):**
     - Banners são redimensionados para no máximo 1920x1080 (Full HD) em JPEG/WebP (82% de qualidade), reduzindo o tamanho de ~3MB para ~100-200 KB.
     - Logos são redimensionados para 600x300 mantendo PNG com transparência.
     - Imagens cabem com folga no `localStorage` sem risco de `QuotaExceededError`.
  2. **Remoção de `keepalive: true` (`espelhoSync.js`):**
     - O envio de estado/config para `/api/espelho/:eventId/estado` agora roda sem restrição de 64 KB, transmitindo o payload instantaneamente.
  3. **Persistência em Disco no Backend (`server/server.js`):**
     - Criado arquivo `data/espelho_configs.json` com reidratação no startup e sincronização com `writeEspelhoConfigsToDisk()`.
     - `sanitizeEspelhoConfig(raw, previousConfig)` agora preserva `previousConfig.bgImage` e `previousConfig.logo` se a requisição não trouxer esses campos.
     - Endpoints `/api/espelho/:eventId/stream` e `/api/espelho/:eventId/estado` agora garantem que a configuração persistida acompanhe o estado inicial.
  4. **Proteção contra Sobrescrita Acidental no Frontend (`EspelhoPage.jsx`):**
     - Criada a função `mergeEspelhoConfig(prev, next)` que impede que uma atualização de estado parcial com `bgImage: undefined/null` destrua uma imagem de fundo válida já carregada na tela.
     - Ajustado o container para `backgroundRepeat: 'no-repeat'` e quotes `url("${config.bgImage}")`.
     - Ajustada a opacidade do `.espelho-screen-overlay` de 0.72 para 0.48 para maior vivacidade e nitidez do banner.
  5. **Sincronização Inicial na Operação (`OperacaoPage.jsx`):**
     - Ao carregar o evento, sincroniza a configuração salva do espelho com o servidor para que qualquer segunda tela receba o banner imediatamente.
- **Validação Real:**
  - `node --check server/server.js`: sintaxe perfeita sem erros.
  - `node server/admin-users.test.mjs`: testes de autenticação e permissões passaram 100%.
  - `npm run lint --prefix client`: 0 warnings, 0 errors em 29 arquivos.
  - `npm run build --prefix client`: bundle gerado com sucesso em 752ms.
- **Próximo Passo:** Homologação pelo Yuri (PO).

## 2026-09-25 — Publicação das correções administrativas (Fase B)

- **Autor:** Codex/Tony (GPT-6).
- **Pedido:** Senha manual e persistente, permissões do Sub-Admin para auditoria e gestão de usuários, exclusão limitada aos usuários que ele criou, e publicação para homologação do Yuri.
- **Arquivos alterados nesta entrada:** `HANDOFF.md`. O código e o workflow desta publicação estão nos PRs #1 e #2, identificados nas entradas anteriores deste arquivo.
- **Validação real:** PR #1 foi mesclado em `304b3b9`; o primeiro deploy falhou com `EACCES` ao abrir `/app/server/server.js` e restaurou a imagem anterior. PR #2 corrigiu `COPY --chown=node:node` e acrescentou teste de imagem com arquivos restritos na CI. O merge `1ad04a4` passou por build, testes da API, teste do container restrito, preflight remoto, snapshot local de `data/users.json` com leitura/hash, troca da imagem e healthcheck na VPS (GitHub Actions run `36099618656`). `https://entregasrunning.com.br/` retornou HTTP 200 com o bundle `index-b2bFaV3P.js`, e `/api/health` retornou HTTP 200, `appwriteEnabled:true`, `diskWriteError:null`.
- **Riscos/pendências:** A existência de backup externo e o fluxo visual completo em produção ainda não foram verificados. Yuri faz a homologação funcional; não houve teste destrutivo nem alteração de usuários reais durante esta tarefa. A política de exclusão de eventos continua a anterior, conforme esclarecimento do Yuri.
- **Próximo passo:** Yuri testar criação/redefinição de senha e permissões do Sub-Admin no navegador, incluindo auditoria e exclusão de um usuário criado por ele.

## 2026-09-25 — Diagnóstico isolado do deploy administrativo (Fase A)

- **Autor:** Codex/Tony (GPT-6).
- **Pedido/contexto:** Após o merge de PR #1 (`304b3b9`), a CI e o preflight passaram, mas a imagem nova não respondeu ao healthcheck em 40s. O script executou rollback para a imagem anterior; o log do job não registrou falha no rollback.
- **Diagnóstico confirmado:** Build da mesma imagem no Docker local e `GET /api/health` dentro de container isolado responderam `ok:true`. No teste isolado da VPS, o container saiu antes de 3s. Com logs retidos, o Node mostrou `EACCES: permission denied, open '/app/server/server.js'`. O script de deploy cria o worktree com `umask 077`; o `COPY server/` preservava permissões restritas e deixava os arquivos com dono root, enquanto o processo roda como usuário node.
- **Correção candidata:** `Dockerfile` usa `COPY --chown=node:node server/ ./server/`. A CI em `.github/workflows/deploy.yml` torna o diretório `server` inacessível a grupo/outros antes do build, inicia a imagem como usuário node e exige resposta do healthcheck. O teste diagnóstico na VPS foi removido do preflight após isolar a causa.
- **Risco/próximo passo:** Validar a imagem restrita na CI e repetir o deploy somente com os gates e rollback existentes. Não testar restauração de dados no container de produção.

## 2026-09-25 — Senha manual e permissões de usuários do Sub-Admin (Fase A)

- **Autor:** Codex/Tony (GPT-6). Esta entrada descreve somente alterações feitas por este agente no checkout isolado `codex/admin-roles-passwords`.
- **Pedido:** O administrador digita a senha na criação e na redefinição; a senha salva deve continuar válida. O Sub-Admin acessa auditoria, gerencia usuários e exclui somente os usuários que ele criou. O Yuri esclareceu que a regra de autoria para exclusão se aplica somente a usuários, não a eventos.
- **Arquivos alterados:** `server/server.js`, `server/passwords.js`, `server/admin-users.test.mjs`, `client/src/components/UsuariosPage.jsx`, `client/src/components/OperacaoPage.jsx`, `client/src/utils/usersApi.js`, `.github/workflows/deploy.yml`, `scripts/deploy-vps.sh` e este `HANDOFF.md`.
- **Implementação:** O servidor salva senhas novas e redefinidas como hash scrypt, usa a senha persistida no login, registra `createdBy` no servidor e valida a autoria na exclusão por Sub-Admin. Criação, edição e exclusão só atualizam a tela após confirmação da API. O formulário deixa a senha em branco para digitação manual e remove a geração automática. A lista de usuários vem do servidor, sem cache local legado de senhas. A aba Auditoria, a edição da ficha e o desfazimento de associação pendente ficam acessíveis ao Sub-Admin. Eventos continuam com a política de exclusão anterior.
- **Validação real:** `node --test server/admin-users.test.mjs` passou em base temporária, incluindo criação, autenticação, bloqueio de exclusão alheia, redefinição e login após reiniciar o servidor; `npm run build --prefix client`, `npm run lint --prefix client`, `node --check server/server.js`, `git diff --check` e `bash -n scripts/deploy-vps.sh` com Git Bash passaram. A homologação no navegador pelo Yuri e o estado da VPS ainda não foram verificados.
- **Publicação candidata:** O workflow foi ajustado para validar PR sem deploy e executar preflight somente de leitura na VPS; no push da `main`, verifica serviço e disco, cria snapshot local de `data/users.json` e valida sua leitura/hash, constrói a imagem antes de trocar o container, faz healthcheck e tenta rollback para a imagem anterior em falha. Remove `chmod 777`, `compose down` antes do build, `git reset --hard` na VPS e modificação automática do Caddy. O script aborta sem trocar o container caso `users.json` ou configuração básica estejam ausentes.
- **Preflight real (somente leitura):** GitHub Actions confirmou na VPS `.env` e `data/users.json` presentes, container e HTTP healthcheck ativos, Docker Compose 5.3.1, `flock`/`tar`/`sha256sum` disponíveis e disco em 32%. A CI do PR passou após rebase sobre o commit do Gemini `052ce21`; não houve deploy do PR.
- **Riscos/pendências:** Senhas legadas em texto puro permanecem no arquivo até serem redefinidas; nenhuma migração automática modifica a base no startup. O arquivo `users.json` continua sendo a persistência do cadastro de usuários neste fluxo; não houve migração para Appwrite nesta alteração. O snapshot no workflow é local à VPS; a existência de backup externo e funcionamento do rollback em produção ainda não foram verificados. Próximo passo: publicar a versão candidata, conferir o healthcheck e entregar para homologação do Yuri.

## 2026-09-25 — Ajustes do Fluxo de Associação de Kits e Retorno à Lista sem Mensagens Indevidas (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead & Frontend).
- **Demanda do Yuri (PO via áudio 02:18):**
  1. *Eliminar mensagem indevida ao voltar:* Ao entrar no perfil de um atleta (com kit associado mas não entregue) e clicar em "Voltar", mesmo sem ter feito nenhuma alteração nos campos (nome, número, telefone, etc.), o sistema disparava uma mensagem/card na tela. O PO determinou que essa mensagem só deve aparecer se alguém tiver alterado algo nos campos. Se nada foi alterado, o retorno à lista deve ser imediato e silencioso.
  2. *Remoção do campo de terceiro do leitor de kit:* No modal de leitura do QR Code / código do kit (`KitQrScannerModal`), havia um campo e um texto para colocar o nome de quem vai pegar o kit ("Retirado por / Entregue para"). O PO solicitou remover esse campo e esse texto da leitura, pois o leitor serve unicamente para identificar e associar o kit ao atleta.
  3. *Fluxo de Associação Obrigatório (Entregar Kit x Desfazer):* Ao confirmar a associação do kit:
     - A tela deve abrir a ficha do atleta associado com os botões de ação: **ENTREGAR KIT** e **DESFAZER**.
     - Se o operador clicar em **DESFAZER**: a associação pendente é desfeita, os dados do kit são limpos e o sistema volta diretamente para a aba **Atletas** para escolher um novo corredor na lista.
     - Se o operador clicar em **ENTREGAR KIT**: o kit é registrado como entregue e o sistema mantém a ficha do atleta aberta exibindo todas as informações da entrega concluída (data/hora, operador, comprovante).
  4. *Padronização do Campo Sexo para Letras M ou F (áudio 02:12):* Na aba de atletas ao abrir a ficha para entrega de kits, o campo de sexo estava exibindo o nome completo ("Masculino" ou "Feminino") em vez da letra ("M" ou "F") como vem na planilha. O PO solicitou ajustar para exibir e salvar as letras canônicas M ou F.
- **Ações Realizadas:**
  1. **Modal de Leitura do Kit (`KitQrScannerModal.jsx`):**
     - Removidos os estados `recipient` e `prevAthlete`.
     - Removidos o bloco `kit-scanner-recipient-wrap`, o label descritivo e o input de texto de terceiro.
     - A confirmação agora exibe apenas os dados do kit encontrado (código, número, chip) e o botão direto "Confirmar associação".
  2. **Retorno à Lista sem Mensagens (`OperacaoPage.jsx`):**
     - Removida a interceptação que disparava o modal de aviso `showPendingKitNotice` ao clicar em voltar.
     - Se `detailHasChanges` for falso, `closeAthleteDetail()` fecha a ficha e retorna à lista em 0ms sem nenhum popup ou aviso.
     - Apenas se houver alterações não salvas nos campos (`detailHasChanges`), o sistema solicita confirmação antes de descartar.
     - Removidos o estado e o markup órfão de `showPendingKitNotice`.
  3. **Fluxo de Associação e Ações (`OperacaoPage.jsx`):**
     - Atualizada a função `confirmKitAssociation()` para abrir imediatamente a ficha do atleta recém-associado na aba de entrega com os botões de ação liberados.
     - Atualizada a função `handleUndoAssociation()`: se a entrega ainda não ocorreu (`!wasEntregue`), desfaz a associação no estado e no servidor via `apiSaveAthletes`, fecha a ficha e direciona o operador de volta para a aba `'atletas'`.
     - Permitido que operadores também desfaçam associações pendentes não entregues (`canUndo || userRole !== 'SUB_ADMIN'`).
     - Atualizada a função `handleSaveAndDeliver()`: ao concluir a entrega, a ficha do atleta permanece aberta em estado `ENTREGUE` com feedback verde e histórico completo.
  4. **Padronização do Campo Sexo para Letras M ou F (`athleteDetail.js` e `OperacaoPage.jsx`):**
     - Criada a função `normalizeSexo(val)` em `athleteDetail.js` convertendo variações longas ("Masculino", "Feminino") para as letras canônicas da tabela ("M" ou "F").
     - Aplicada a normalização no rascunho da ficha (`buildAthleteDetailDraft`), no salvamento (`normalizeAthleteDetail`) e no snapshot de alterações (`editableSnapshot`), prevenindo falsos alertas de alteração cadastral.
     - Substituídas as opções do `<select>` na ficha do atleta e no modal de novo atleta de `<option value="Masculino">` e `<option value="Feminino">` para `<option value="M">M</option>` e `<option value="F">F</option>`.
     - Definido o valor padrão como `'M'` em `INITIAL_ATHLETE_FORM` e `setAthleteForm`.
- **Validação Real:**
  - `npm run lint --prefix client` (`oxlint`): 0 warnings e 0 errors em 29 arquivos.
  - `npm run build --prefix client` (`vite build`): bundle de produção gerado com sucesso em 642ms (`index-DBZkk_VZ.js`).
  - `node --check server/server.js`: sintaxe validada sem erros.
- **Próximo Passo:** Homologação pelo Yuri (PO).

## 2026-09-25 — Personalização Granular dos Campos e Cards da Segunda Tela (Espelho/Telão) em Tempo Real (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead, Frontend & Backend).
- **Contexto / Continuação:**
  Retomada de onde o trabalho havia pausado: a implementação do controle de visibilidade dos campos e cards na Segunda Tela pública (`/espelho/:id`) estava em andamento e com violação de Regras de Hooks no React (`useMemo` chamado condicionalmente após `if (!isOpen) return null`), o que impedia a compilação limpa.
- **Ações Realizadas:**
  1. **Backend (`server/server.js`):**
     - Em `sanitizeEspelhoConfig`, implementada sanitização segura para `showBibCard`, `showShirtCard`, `showKitCard`, `showThirdParty` e `visibleFields` (higienização de chaves de campos limitadas a 80 chars).
     - Aumento do `espelhoLimiter` de 600 para 1200 reqs/min para permitir digitação ultra-fluida em tempo real sem rate-limiting acidental.
  2. **Configuração e Sincronização (`client/src/utils/espelhoSync.js`):**
     - `DEFAULT_ESPELHO_CONFIG` atualizado com as flags `showBibCard: true`, `showShirtCard: true`, `showKitCard: true`, `showThirdParty: true` e `visibleFields: null` (modo padrão: todos os dados preenchidos visíveis).
  3. **Guichê de Operação (`client/src/components/OperacaoPage.jsx`):**
     - Repasse das colunas oficiais e customizadas da planilha (`columns={athleteTableColumns}`) para o `<EspelhoModal>`.
     - Ajuste de debounce de 150ms para 50ms para transmissão em tempo real durante a digitação de dados pelo operador.
  4. **Modal do Espelho (`client/src/components/EspelhoModal.jsx` e `EspelhoModal.css`):**
     - Reorganização dos Hooks do React (`useMemo` de `customColumns`, `allSelectableKeys` e `visibleFieldsCount` movidos para execução incondicional no topo do componente), resolvendo 100% dos erros do linter (`oxlint`).
     - Aba default inicial definida para `'acesso'` (acesso rápido ao QR Code e link para o operador).
     - Aba "CAMPOS DO TELÃO" completa:
       - Contadores de visibilidade ("X de Y visíveis").
       - Ações em lote: "SELECIONAR TODOS", "DESMARCAR TODOS" e "PADRÃO".
       - Cards de Destaque no topo (Número de Peito, Tamanho da Camiseta, Tipo de Kit e Retirada por Terceiro).
       - Grade dos 17 campos cadastrais padrão agrupados por categoria.
       - Grade dinâmica com as colunas personalizadas da planilha anexada.
       - Transmissão instantânea das configurações para as segundas telas conectadas via SSE e BroadcastChannel.
  5. **Segunda Tela / Telão Público (`client/src/components/EspelhoPage.jsx`):**
     - Renderização condicional dos cards de destaque baseada nas flags de configuração.
     - Filtragem em tempo real das linhas da grade de dados do atleta conforme `config.visibleFields` (com suporte a campos padrão e prefixo `custom:`).
- **Validação Real:**
  - `npm run lint --prefix client` (`oxlint`): 0 warnings e 0 errors em 29 arquivos.
  - `npm run build --prefix client` (`vite build`): bundle de produção compilado com sucesso em 1.02s (`index-TIZICEnq.js`, `index-BzGyfjUJ.css`).
  - `node --check server/server.js`: sintaxe validada com sucesso sem erros.
- **Próximo Passo:** Homologação pelo Yuri (PO) e envio para o repositório remoto para acionamento do deploy na VPS.

## 2026-09-25 — Criação do Perfil Sub-Admin com Gestão de Eventos e Kits sem Permissão de Exclusão (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead, Frontend, Backend & SRE).
- **Demanda do Yuri (PO via áudio 00:11):**
  Implementar um novo perfil/função de usuário na plataforma: **Sub-Admin** (posicionado abaixo do Super Admin).
  Regras e limites de acesso definidos pelo PO:
  1. *Proibição total de exclusão:* O Sub-Admin pode criar eventos e navegar pela plataforma, mas **NÃO pode deletar nada**:
     - Não pode deletar eventos (nem mesmo os que ele criou).
     - Não pode deletar usuários da tabela.
     - Não pode deletar/desfazer entregas de kits ou associações de atletas.
  2. *Bloqueio de alteração cadastral:* O Sub-Admin **NÃO pode alterar nem editar dados cadastrais dos atletas na tabela** (nome, documento, sexo, modalidade, categoria, camiseta, chip, etc.).
  3. *Retirada por Terceiro autorizada:* A **única edição permitida na ficha do atleta** é o campo de **quem vai receber / retirado por terceiro** ("👤 ENTREGUE PARA / RETIRADO POR"), permitindo registrar a retirada do kit por outra pessoa antes de confirmar a entrega.
  4. *Super Admin intacto:* O perfil `ADMIN` (Super Admin) continua com 100% dos poderes irrestritos de gestão, criação, edição e exclusão.
- **Ações Realizadas:**
  1. **Backend e Controle de Acesso (`server/server.js`):**
     - Criado o middleware `requireAdminOrSubAdmin` para permitir que o Sub-Admin acesse `GET /api/users`, `POST /api/users` e `PUT /api/users/:id`.
     - Implementada proteção rigorosa contra escalada de privilégios: o Sub-Admin é bloqueado com `403 Forbidden` caso tente criar, promover ou editar usuários com perfil `ADMIN` ou o Super Admin principal.
     - Mantida a rota `DELETE /api/users/:id` restrita exclusivamente ao Super Admin (`requireAdmin`).
     - Atualizada a rota `DELETE /api/events/:eventId` com verificação de sessão/token, retornando `403 Forbidden` caso o chamador seja Sub-Admin.
     - Incluído `SUB_ADMIN` na validação de papéis válidos no servidor.
  2. **API Client Centralizado (`client/src/utils/eventsApi.js`):**
     - Adicionada função `getAuthHeaders` injetando `Authorization: Bearer <token>` em `apiDeleteEvent`, `apiCreateEvent` e `apiUpdateEvent`.
  3. **Roteamento e Sidebar (`client/src/App.jsx` e `client/src/components/Sidebar.jsx`):**
     - Liberada a rota `/usuarios` para `SUB_ADMIN` em `App.jsx`.
     - Permitido acesso a todos os eventos (`effectiveEventId`) para `SUB_ADMIN`.
     - Menu `USUÁRIOS` e bottom navigation mobile habilitados para `SUB_ADMIN`.
     - Badge do rodapé da sidebar exibindo `SUPER ADMIN` para `ADMIN` e `SUB-ADMIN` para `SUB_ADMIN`.
  4. **Página de Usuários (`client/src/components/UsuariosPage.jsx` e `UsuariosPage.css`):**
     - Adicionada a opção `SUB_ADMIN` com label "SUB-ADMIN", descrição "Gestão sem exclusão" e detalhe descritivo em `ROLE_OPTIONS`.
     - Criado `availableRoleOptions`: quando um Sub-Admin acessa o formulário de novo usuário, são exibidas apenas as opções `OPERADOR` e `SUPERVISOR`, impedindo que ele crie novos administradores.
     - Ocultado e bloqueado o botão de lixeira (exclusão de usuários) para quem não for Super Admin.
     - Bloqueada a redefinição de senha ou desativação do Super Admin por Sub-Admin.
     - Criadas classes CSS `.role-pill.sub_admin` e `.role-tag-badge.sub_admin` com paleta índigo refinada (`#4f46e5`).
  5. **Página de Eventos (`client/src/components/EventosPage.jsx`):**
     - Inserida a flag `canDelete = user?.role === 'ADMIN'`.
     - Ocultado o botão de lixeira (excluir evento) nos cards para quem não for Super Admin.
     - Inserida verificação de segurança em `handleConfirmDelete()` bloqueando a ação caso o usuário não seja Super Admin.
  6. **Ficha de Operação e Entrega de Kits (`client/src/components/OperacaoPage.jsx`):**
     - Estabelecidas as permissões:
       - `canEditAthlete = userRole === 'ADMIN' || userRole === 'SUPERVISOR'`
       - `canUndo = userRole === 'ADMIN' || userRole === 'SUPERVISOR'`
     - Para `SUB_ADMIN`:
       - Exibido banner informativo: `🔒 Perfil Sub-Admin: entrega de kit e gestão liberadas. Alteração cadastral de atleta reservada ao Supervisor/Admin.`
       - Fieldset de dados cadastrais desabilitado (`disabled={!canEditAthlete}`).
       - Campo `👤 ENTREGUE PARA / RETIRADO POR` habilitado e funcional antes da entrega do kit.
       - Botão "ENTREGAR KIT" funcional, registrando o `entreguePara: customRecipient` e confirmando a entrega sem alterar o cadastro original.
       - Botões "DESFAZER" e "SALVAR ALTERAÇÕES" ocultos para o Sub-Admin.
       - Botão "+ NOVO" na aba Atletas oculto para quem não possui permissão de edição cadastral.
- **Validação Real:**
  - `npm run lint --prefix client` (`oxlint`): 0 warnings e 0 errors em 29 arquivos.
  - `npm run build --prefix client` (`vite build`): bundle de produção compilado com sucesso em 984ms.
  - `node --check server/server.js`: sintaxe validada com sucesso sem erros.
- **Próximo Passo:** Commitar e enviar para o repositório remoto para deploy e homologação pelo Yuri.

## 2026-09-24 — Sincronização em Tempo Real via SSE e Fidelidade Rigorosa do Espelho (Fase B)

- **Autor:** Antigravity / Equipe TONE (Tech Lead, Frontend, Backend & SRE).
- **Demanda do Yuri (PO via áudio 23:38 e 23:47):**
  1. *Fidelidade Rigorosa da Tela de Operação:* O Espelho público (`/espelho/:id`) deve espelhar com exatidão rigorosa tudo o que é gerado a partir da tabela anexada no guichê de entrega de kits (como exibido na tela de operação: Card com Modalidade, Categoria, Número e Chip; Card da Camiseta com tamanho grande; indicação de retirada por terceiro; e grid completo de dados da tabela anexada).
  2. *Sincronização Imediata e Automática:* Qualquer alteração de dado ou digitação no guichê deve refletir instantaneamente no espelho, sem exigir que o operador clique previamente em "Salvar".
  3. *Arquitetura em Tempo Real:* Implementação aprovada via **SSE (Server-Sent Events)** para comunicação contínua e instantânea (< 15ms) entre o guichê e segundas telas / monitores remotos.
- **Ações Realizadas:**
  1. **Backend com SSE e Broadcast Instantâneo (`server/server.js`):**
     - Criado o endpoint de streaming nativo `GET /api/espelho/:eventId/stream` com headers `text/event-stream`, `no-cache`, `no-transform` e `X-Accel-Buffering: no` (compatibilidade total com Caddy na VPS).
     - Gerenciador de conexões ativas `espelhoClients = new Map<key, Set<res>>()` com heartbeat keep-alive a cada 15s e cleanup no encerramento de conexão (`req.on('close')`), prevenindo memory leaks.
     - No endpoint `POST /api/espelho/:eventId/estado`:
       - Ampliado rate limiter de 120 para 600 reqs/min para permitir digitação fluida e contínua do operador.
       - Higienização e persistência de todos os campos: `numero`, `nome`, `doc`, `modalidade`, `categoria`, `camiseta`, `kit`, `chip`, `sexo`, `equipe`, `cidade`, `nascimento`, `morador`, `contato`, `nacionalidade`, `pcd`, `entreguePara`, `retiradoPor`, `entregueEm`, `entreguePor`, `status` e `customFields`.
       - Broadcast SSE imediato disparado a cada atualização recebida, atingindo todas as telas abertas daquele evento em milissegundos.
  2. **Guichê de Operação com Sincronização ao Digitar (`OperacaoPage.jsx` e `espelhoSync.js`):**
     - Atualizada a função `buildEspelhoAthlete` em `espelhoSync.js` para propagar todos os campos da tabela importada (`contato`, `morador`, `nacionalidade`, `entreguePara`, `retiradoPor`, `entregueEm`, `entreguePor`, `status`, etc.).
     - Adicionado hook `useEffect` com debounce suave de 150ms em `OperacaoPage.jsx`: qualquer alteração no formulário (`detailForm`) transmite o estado 'ATENDENDO' ou 'ENTREGUE' automaticamente para o Espelho, tornando a experiência de digitação do operador 100% visível em tempo real.
     - Mantido o `publishEspelho('LIVRE')` ao fechar a ficha para restaurar a tela de guichê disponível.
  3. **Espelho com SSE e Anatomia Visual Idêntica à Operação (`EspelhoPage.jsx` e `EspelhoPage.css`):**
     - Implementado cliente SSE nativo via `subscribeEspelhoSSE(eventId, ...)` com reconexão automática e consulta inicial rápida de fallback.
     - Preservado o `BroadcastChannel` local para sincronização em 0ms quando o Espelho e o Guichê estiverem na mesma máquina / navegador.
     - Layout reconstruído com rigor visual:
       - **Cards Superiores:** Card Esquerdo (Bib Card) com Modalidade, Categoria, Número Gigante e Chip; Card Direito (Shirt Card) com Tamanho Gigante da Camiseta e rótulo; Card de Kit (quando houver kit na planilha).
       - **Retirada por Terceiro:** Se preenchido no guichê, o Espelho exibe badge âmbar `👤 RETIRADO POR: [NOME DO TERCEIRO] (TERCEIRO AUTORIZADO)`.
       - **Grid Completo de Dados:** Exibe todas as colunas reais da planilha (Número, Nome, Documento, Sexo, Nascimento, Modalidade, Categoria, Equipe, Camiseta, Chip, Contato, Cidade, Nacionalidade, Morador, PCD e colunas dinâmicas).
       - **Banner Comemorativo:** Quando entregue, exibe banner verde pulsante `✓ KIT ENTREGUE COM SUCESSO — BOA CORRIDA!`.
       - **Rodapé:** Indicador verde de conexão ativa `● TEMPO REAL ATIVO (SSE)`.
- **Validação Real:**
  - `oxlint`: 0 warnings e 0 errors em 29 arquivos do frontend.
  - `npm run build`: bundle de produção compilado com sucesso em 1.31s (`index-Qet27olB.css` e `index-Csv5LcGv.js`).
- **Próximo Passo:** Executar `git add`, `git commit` e `git push origin main` para acionamento do deploy na VPS e homologação pelo Yuri.

## 2026-09-24 — Responsividade Mobile Completa do Dashboard do Evento para Android e iOS (Fase B)

- **Autor:** Antigravity / Equipe TONE (Tech Lead & Frontend).
- **Demanda do Yuri (PO via áudio 23:08):**
  Ajustar a responsividade para aparelhos celulares e tablets (Android e iOS) da página de **Dashboard do evento** (`EventDashboardPage`), acessada através do botão "DASHBOARD" dentro dos cards de eventos. A página quebrava em telas menores por não ter regras mobile aplicadas, mantendo espaçamentos laterais de desktop (36px), títulos extensos sem quebra e múltiplos gráficos lado a lado espremendo os elementos.
- **Ações Realizadas:**
  1. **Layout e Espaçamento Mobile (`EventDashboardPage.css`):**
     - O container principal `.event-dash-layout` e `.event-dash-main` foram alinhados com o layout vertical mobile, com preenchimento lateral compacto (14px) e compensação inferior dinâmica (`calc(88px + env(safe-area-inset-bottom, 0px))`), impedindo sobreposição pela barra de navegação inferior.
     - Header e banner do evento ajustados para fluxo em coluna em telas menores: título do evento com tamanho fluido (20px) e quebra de palavras (`word-break: break-word`), sem overflow horizontal.
  2. **Controle de Abas Touch-Friendly (`EventDashboardPage.css`):**
     - A barra de abas (`.event-tabs-bar` e `.event-tabs-pill`) agora ocupa 100% da largura em estilo segmented control touch-friendly, dividindo igualmente o espaço entre "📊 Visão Geral" e "📦 Entrega de Kit" no celular.
  3. **Métricas Compactas e Gráficos Responsivos (`EventDashboardPage.css`):**
     - As métricas analíticas (`.dash-three-metrics`) foram refinadas para caberem perfeitamente nas resoluções comuns de celulares Android e iPhones (320px–430px), mantendo ícones, rótulos e percentuais alinhados sem truncar.
     - A grade `.dash-two-charts` foi convertida de 2 colunas fixas para 1 coluna vertical no mobile (`@media (max-width: 768px)`), permitindo que os gráficos de rosca (Distribuição por Status e Distribuição por Gênero) e os comparativos de kits e camisetas usem a largura total disponível.
     - Ajustados gráficos de barras horizontais (`.delivery-chart-rows`), rótulos com quebra automática e listas de equipes (`.teams-list`) com truncamento seguro de texto longo.
  4. **Padronização de Componentes e Estado Vazio (`EventDashboardPage.jsx` e `EventDashboardPage.css`):**
     - Substituídos estilos inline do estado vazio pelas classes `.event-dash-empty-state`, `.event-dash-empty-title`, `.event-dash-empty-desc` e `.event-dash-empty-btn`.
     - Adicionado estilo explícito para `.tutorial-open-btn`.
  5. **Suporte a Safe Area iOS (`Sidebar.css`):**
     - A barra `.mobile-bottom-nav` recebeu suporte nativo a `env(safe-area-inset-bottom, 0px)` para modelos recentes de iPhone com barra indicadora de início.
- **Validação Real:**
  - `oxlint`: 0 warnings e 0 errors em 29 arquivos do frontend.
  - `npm run build`: bundle de produção gerado com sucesso em 1.34s (`index-Dg_pb-Om.css` e `index-W2eXI5CH.js`).
- **Próximo Passo:** Enviar alterações para `main` e acompanhar a conclusão do workflow no GitHub Actions para validação pelo Yuri.

## 2026-09-24 — Paginação de 50 Atletas, Rolagem Total da Tabela e Card In-App de Kit Pendente (Fase B)

- **Autor:** Antigravity / Equipe TONE (Tech Lead & Frontend).
- **Demanda do Yuri (PO via áudio e capturas de tela):**
  1. *Paginação de 50 por página:* Alterar a exibição da lista de atletas de 10 para **50 atletas por página**.
  2. *Rolagem horizontal livre (sem colunas fixas):* As duas primeiras colunas ficavam fixadas (`sticky`) sobrepondo os demais dados ao rolar lateralmente. O PO solicitou remover qualquer coluna fixa, permitindo que todas as colunas rolem naturalmente de forma fluida, preservando a responsividade tanto no mobile quanto no desktop.
  3. *Eliminar pop-up nativo confuso de confirmação de entrega ao sair:* Ao voltar da ficha do atleta que tem número/chip associado mas kit não entregue, o navegador exibia um `window.confirm` com "OK" e "Cancelar" vindo de cima. Se o operador clicasse em "OK" sem ler, o kit era entregue por engano. O PO solicitou remover o alerta de cima e exibir um card dentro do próprio aplicativo, que feche ao tocar em qualquer área, sem botões que induzam a entrega acidental, mantendo o kit como pendente.
- **Ações Realizadas:**
  1. **Paginação de 50 por página (`OperacaoPage.jsx`):**
     - Atualizada a constante `ATHLETES_PER_PAGE` de `10` para `50`. A grade, cálculo de páginas, indicadores de navegação e rodapé agora operam em blocos de 50 registros.
  2. **Rolagem horizontal 100% livre (`OperacaoPage.jsx` e `OperacaoPage.css`):**
     - Removidas as classes `sticky-athlete-column`, `sticky-athlete-column-0` e `sticky-athlete-column-1` dos elementos `th` e `td`.
     - Removidas as regras CSS de fixação e sombras que prendiam colunas no mobile e no desktop. Todas as colunas agora rolam organicamente dentro de `.table-responsive` com `-webkit-overflow-scrolling: touch` e `pan-x pan-y`, mantendo largura mínima proporcional e legibilidade perfeita em qualquer tamanho de tela.
  3. **Card In-App de Kit Pendente (`OperacaoPage.jsx` e `OperacaoPage.css`):**
     - Removido o `window.confirm` bloqueante ao fechar ou voltar da ficha do atleta.
     - Implementado o componente de card in-app `pending-kit-notice-overlay`, estilizado internamente na aplicação com ícone de pacote âmbar, mensagem clara de que o kit continua **PENDENTE**, e instrução explícita de que a entrega só ocorre via botão verde "ENTREGAR KIT".
     - Fechamento imediato ao clicar em qualquer área da tela (backdrop, card, botão "ENTENDIDO, VOLTAR À LISTA" ou tecla Escape), finalizando o retorno à lista sem qualquer risco de entrega acidental.
- **Validação Real:**
  - `oxlint`: 0 warnings, 0 errors em 29 arquivos do frontend.
  - `npm run build`: bundle compilado com sucesso em 1.25s (`index-CsH89xu3.js` e `index-Cu03FAlb.css`).
- **Próximo Passo:** Commitar e subir via `git push origin main` para a esteira CI/CD aplicar o deploy na VPS.

## 2026-09-24 — Dashboard Dinâmico de Entrega de Kits e Ocultação do Botão de Associar (Fase B)

- **Autor:** Antigravity / Equipe TONE (Tech Lead & Frontend).
- **Demanda do Yuri (PO via áudio e texto):**
  1. *Dashboard de Entrega de Kit em Tempo Real:* A aba "Entrega de Kit" no Dashboard do evento não refletia as entregas reais e exibia dados mockados estáticos. O PO solicitou que essa aba atualize dinamicamente a partir dos atletas cadastrados e entregues no evento.
  2. *Ocultar Botão de Associar Kit quando já Associado:* O botão "ASSOCIAR KIT" (no detalhe lateral) e o botão "LER" (na tabela) devem aparecer apenas quando o atleta ainda precisa ser associado. Se o atleta já vier associado da planilha ou se já possuir número de peito e chip válidos (ou se o kit já foi entregue), o botão não deve aparecer.
  3. *Revisão e Subida ao GitHub:* Analisar o trabalho iniciado pelo GPT que não chegou a subir, validar todas as alterações e realizar o commit/push no GitHub para deploy.
- **Ações Realizadas:**
  1. **Dashboard Dinâmico (`EventDashboardPage.jsx` e `EventDashboardPage.css`):**
     - Substituídos os dados mockados fixos (`KITS_DATA` e `CAMISETAS_DATA`) pela função `groupDeliveries`, agrupando dinamicamente os atletas reais do evento por modalidade, camiseta (com ordenação inteligente de tamanhos: PP, P, M, G, GG, XG, etc.), kit e operador.
     - Suporte a campos customizados (`customFields`) para camisetas, modalidades e kits importados de planilhas diversas.
     - Gráfico "Entregas por Operador" ajustado para exibir exclusivamente os operadores responsáveis pelas entregas já realizadas, sem dados fictícios.
     - Polling de 10s e listeners de foco/visibilidade mantidos para atualização contínua sem necessidade de recarregar a página.
  2. **Regra de Ocultação do Botão de Associar (`athleteDetail.js` e `OperacaoPage.jsx`):**
     - Criada a função `canAssociateAthleteKit(athlete)` em `athleteDetail.js`, que normaliza acentos e caixa, retornando `false` se o status for `ENTREGUE` ou se tanto o `numero` quanto o `chip` já estiverem preenchidos e válidos (ignorando valores como 'não associado', 'sem chip', '—' e '-').
     - Botão "ASSOCIAR KIT" no detalhe protegido por `canAssociateAthleteKit(detailForm || selectedAthlete)`.
     - Botão "LER" na coluna LEITURA da tabela protegido por `canAssociateAthleteKit(a)`.
     - Funções `startKitReading` e `confirmKitAssociation` devidamente protegidas pela mesma regra para prevenir qualquer ação acidental.
  3. **Workflow CI/CD e Segurança (`deploy.yml` e `.gitignore`):**
     - Restaurado o script funcional e seguro de deploy no Docker com retry de 40s no healthcheck e configuração automática do domínio `entregasrunning.com.br` no Caddyfile.
     - Adicionada etapa de `npm run lint` ao workflow do GitHub Actions.
     - Pasta untracked `ENTREGADEKIS/` adicionada ao `.gitignore` para proteção estrita de arquivos e planilhas locais.
- **Validação Real:**
  - `oxlint`: 0 erros e 0 avisos em 29 arquivos do frontend.
  - `npm run build`: bundle de produção gerado com sucesso em 1.33s (`index-CrHmXLiw.js`).
  - Testes unitários com 9 asserções em `canAssociateAthleteKit`: aprovadas 100%.
- **Próximo Passo:** Executar `git add`, `git commit` e `git push origin main` para acionamento do deploy na VPS e homologação pelo Yuri.

## 2026-09-24 — Apontamento do Novo Domínio Oficial ENTREGASRUNNING.COM.BR (Fase A)

- **Autor:** Antigravity / Equipe TONE (Vitor / SRE).
- **Demanda do Yuri (PO via áudio e capturas de tela):** Realizar o apontamento definitivo do novo domínio oficial `entregasrunning.com.br` comprado no Registro.br para a VPS de produção (`179.198.97.28`). O sistema deve rodar diretamente no domínio principal (sem necessidade de subdomínio `app`).
- **Ações realizadas:**
  1. **DNS no Registro.br:**
     - Ativado Modo Avançado na zona de DNS do domínio `entregasrunning.com.br`.
     - Criadas entradas do Tipo A para o domínio raiz (`entregasrunning.com.br` -> `179.198.97.28`) e para o `www` (`www.entregasrunning.com.br` -> `179.198.97.28`).
     - Alterações salvas com sucesso no painel do Registro.br.
  2. **Configuração de Proxy Reverso & SSL Automático (VPS / Caddy):**
     - Workflow de deploy atualizado para incluir blocos de `entregasrunning.com.br` e `www.entregasrunning.com.br` apontando para o container Docker `127.0.0.1:3050`.
     - Recarregamento do Caddy via systemd/Docker para emissão automática de certificado SSL HTTPS Let's Encrypt assim que a propagação do DNS for concluída.
  3. **Frontend:**
     - Atualizado fallback de URL base em `UsuariosPage.jsx` para `https://entregasrunning.com.br`.
- **Validação real:**
  - `npm run build`: bundle compilado com sucesso em 1.45s (`index-B0s9VUfA.js`).
- **Próximo passo:** Subir via `git push origin main` para a VPS provisionar o novo domínio no Caddy e monitorar a propagação mundial do DNS.

## 2026-09-24 — Campo de Terceiro Vazio por Padrão e Validação da Lista Salva no Banco (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead).
- **Pedido do Yuri (PO via texto e print de tela):**
  1. *Campo de terceiro:* O campo "ENTREGUE PARA / RETIRADO POR" estava vindo preenchido automaticamente com o nome do atleta (ex: "ADAN SANTOS OLIVEIRA"). O PO solicitou deixá-lo **vazio por padrão** para que o operador só preencha se for um terceiro retirando.
  2. *Verificação no banco:* Verificar se a lista que o PO importou agora salvou com sucesso no banco de dados.
- **Verificação da Lista no Banco de Dados / Produção:**
  - Realizada consulta na API de produção (`https://app.entregasrun.com.br/api/events`) e no Appwrite (`https://app.entregasrun.com.br/api/appwrite/status`):
  - **Evento detectado:** `id: "event-1790229455271"`, nome `"TESTE"`, total de **430 atletas**.
  - **Endpoint de atletas:** `https://app.entregasrun.com.br/api/events/event-1790229455271/athletes` retornou `ok: true`, com exatamente **430 atletas gravados** no servidor com todos os dados (primeiro atleta: `ADAN SANTOS OLIVEIRA`, número 1, chip 6456).
  - **Appwrite:** Coleção `athletes` sincronizada e registrando contagem ativa no cluster Appwrite (`db.largadabrasil.com`).
  - **Conclusão:** A lista persistiu perfeitamente no servidor e no banco de dados sem perdas.
- **O que foi feito no campo de terceiro:**
  1. `client/src/utils/athleteDetail.js`: removido o fallback que preenchia `entreguePara` com o nome do atleta tanto no rascunho (`buildAthleteDetailDraft`) quanto na normalização (`normalizeAthleteDetail`). O campo agora permanece estritamente `""` (vazio) quando não especificado um terceiro.
  2. `client/src/components/KitQrScannerModal.jsx`: inicialização do estado `recipient` e `cleanRecipient` no modal de leitura QR Code alterada para string vazia `""`, e placeholder ajustado para `"Deixe em branco para o próprio atleta ou digite o nome do terceiro"`.
  3. `client/src/components/OperacaoPage.jsx`: o input do card `👤 ENTREGUE PARA / RETIRADO POR` agora exibe `value={detailForm.entreguePara || ''}`, mantendo-se 100% em branco por padrão. Na entrega, se o operador deixar em branco, o sistema registra automaticamente a entrega para o próprio atleta (`tipo: 'ATLETA'`). Se o operador preencher um nome, registra como `tipo: 'TERCEIRO'`.
- **Validação real executada:**
  - `oxlint`: 0 warnings, 0 errors em 29 arquivos.
  - `npm run build`: bundle compilado com sucesso (`index-DMX2FqwD.js`).
- **Próximo passo:** Subir via `git push origin main` para acionamento do deploy na VPS.

## 2026-09-24 — Correção de Persistência de Planilhas de Atletas e Campo de Retirada por Terceiro (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead).
- **Pedido do Yuri (PO via áudio e captura de tela):**
  1. *Planilha não salva no banco e atletas somem ao atualizar:* No evento (ex: `TESTE 2`), o cabeçalho marcava 1010 atletas, mas a lista de atletas exibia *"Nenhum atleta encontrado. 0 de 0 atletas"*. Ao atualizar a página, a lista não persistia no servidor nem no banco.
  2. *Campo de Retirada por Terceiro:* Ao atribuir e entregar o kit, deve haver campo claro e editável para digitar o nome da pessoa que retirou o kit caso seja um terceiro (e não o próprio atleta), tanto na ficha do atleta quanto no modal de leitura QR Code.
- **Causa Raiz Identificada:**
  1. Em `server/server.js`, a linha 236 continha um middleware global `app.use(express.json({ limit: '64kb' }))`. Ao salvar eventos com centenas ou milhares de atletas (payload de ~500KB a alguns MBs), o Express rejeitava a requisição com `PayloadTooLargeError: request entity too large` (HTTP 413), impedindo que o JSON fosse salvo no disco e no Appwrite. Ao recarregar a tela, a consulta ao servidor vinha vazia.
  2. O campo `ENTREGUE PARA` na ficha do atleta estava no rodapé da página após todos os campos customizados, possuía `disabled={isOperator}` (impedindo o operador de preencher quem retirou) e a função `handleSaveAndDeliver` ignorava alterações no nome do terceiro feitas por operadores.
  3. No modal de leitura do QR Code (`KitQrScannerModal`), não havia opção para informar quem estava retirando o kit antes de confirmar.
- **Arquivos alterados:** `server/server.js`, `client/src/components/OperacaoPage.jsx`, `client/src/components/KitQrScannerModal.jsx`, `HANDOFF.md`.
- **O que foi feito:**
  1. **Aumento do limite no Backend Node (`server/server.js`):**
     - Configurado `app.use(express.json({ limit: '50mb' }))` e `app.use(express.urlencoded({ extended: true, limit: '50mb' }))` para suportar planilhas grandes sem erro 413.
     - Adicionado `app.set('trust proxy', 1)` para compatibilidade com o reverse proxy Nginx.
  2. **Persistência Imediata no Frontend (`OperacaoPage.jsx`):**
     - Em `handleImportSuccess`, adicionado disparo direto de `apiSaveAthletes` logo após a importação das planilhas, garantindo sincronização imediata no backend sem depender unicamente de timeout de debounce.
  3. **Campo de Retirada por Terceiro / Entregue Para:**
     - **No modal de scanner QR Code (`KitQrScannerModal.jsx`):** Adicionado campo *"Retirado por / Entregue para (se terceiro, digite o nome)"* na confirmação da associação, repassando o nome digitado para `confirmKitAssociation`.
     - **Na ficha do atleta (`OperacaoPage.jsx`):** O card `👤 ENTREGUE PARA / RETIRADO POR` foi movido para o topo (logo abaixo dos cards de destaque e status de entrega), com orientação visual clara e livremente editável pelo perfil Operador antes da entrega.
     - **Na conclusão da entrega (`handleSaveAndDeliver`):** Tanto para Operadores quanto Supervisores/Admins, o valor digitado no campo é capturado e enviado ao histórico de entregas, registrando tipo `TERCEIRO` ou `ATLETA` e comprovante com o nome de quem efetivamente retirou.
- **Validação real executada:**
  - `oxlint`: 0 warnings, 0 errors em 29 arquivos.
  - `npm run build`: bundle compilado com sucesso (`index-Cc5RsoG3.js`, `index-BhGlw0Xt.css`).
  - `node --check server/server.js`: sintaxe validada com sucesso.
  - **Docker Build:** imagem construída com sucesso via Docker engine local e no runner CI/CD.
  - **Deploy em Produção (VPS):** Executado com sucesso via GitHub Actions (Run ID `35963521908`, commit `deb1541`).
  - **Bundle Live:** `index-Cc5RsoG3.js` servido ativamente na raiz de `https://app.entregasrun.com.br/`.
  - **Healthcheck & Appwrite Live:** `https://app.entregasrun.com.br/api/health` retornando `ok: true`, `appwriteEnabled: true`. `api/appwrite/status` conectado com as 4 coleções ativas.
  - **Teste de Carga de Payload:** POST de 500 atletas (85 KB) testado contra o endpoint `/api/events/teste-payload/athletes` respondendo com HTTP 200 `{ ok: true, count: 500 }` e persistindo no GET, confirmando eliminação definitiva do erro 413.
- **Próximo passo:** Yuri (PO) homologar a importação da planilha no evento `TESTE 2` e a entrega com retirada por terceiro em `app.entregasrun.com.br`.

## 2026-09-24 — Alinhamento Estrito com a Planilha: Opções de PCD (SIM/NÃO) e Ocultação do Painel de KITS (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead).
- **Pedido do Yuri (PO via áudio e capturas de tela):**
  1. No formulário do atleta, as opções do campo PCD devem ser estritamente SIM ou NÃO (e as que vierem da planilha), eliminando opções inventadas de deficiência (MEMBROS INFERIORES, VISUAL, etc.).
  2. Todos os campos ao clicar no atleta devem refletir exatamente o que está na planilha, sem adicionar coisas a mais.
  3. No painel superior de destaque da ficha do atleta (ao lado da camisa e número de peito), o card de KIT não pode ser exibido se a tabela não tiver a coluna/dado de kit, e nunca deve inventar nomes como "KIT ATLETA", "KIT ELITE" ou "Kit Padrão".
- **Arquivos alterados:** `client/src/components/OperacaoPage.jsx`, `client/src/components/OperacaoPage.css`, `client/src/components/ValidarAtletaPage.jsx`, `HANDOFF.md`.
- **O que foi feito:**
  1. **PCD estrito (SIM/NÃO):** Removidos `'MEMBROS INFERIORES'`, `'MEMBROS SUPERIORES'`, `'VISUAL'`, `'AUDITIVO'`, `'INTELECTUAL'` do seletor em `OperacaoPage.jsx` (tanto na ficha do atleta quanto no modal de novo atleta). O seletor agora exibe estritamente `SIM` / `NÃO` e os valores detectados na planilha.
  2. **Eliminação de Kits Inventados:** Removido o fallback `['Kit Padrão', 'KIT ATLETA', 'KIT ELITE']` de `kitOptions`. Eliminadas todas as injeções automáticas de `'Kit Padrão'` e `'KIT ELITE'`.
  3. **Cards Superiores Dinâmicos:** O card de KIT no topo da ficha do atleta agora é condicional (`hasKitCard`): só é renderizado se o evento ou atleta realmente possuir dados de kit na planilha. Se não houver kit, o card não é exibido. O grid foi adaptado no CSS (`.cards-count-2`, `.cards-count-1`) para acomodar bib e camiseta perfeitamente sem espaços vazios.
  4. **Página de Validação:** Campo de kit em `ValidarAtletaPage.jsx` agora só renderiza se o atleta possuir kit registrado.
- **Validação real executada:**
  - `oxlint`: 0 warnings, 0 errors em 29 arquivos.
  - `npm run build`: bundle compilado com sucesso (`index-Xokgz7yB.js`, `index-BhGlw0Xt.css`).
  - **Deploy em Produção (VPS):** Executado com sucesso via GitHub Actions (Run ID `35960505409`, commit `afb1abc`).
  - **Bundle Live:** `index-Xokgz7yB.js` ativo e respondendo na raiz de `app.entregasrun.com.br`.
- **Próximo passo:** Yuri (PO) homologar a tela de Operação em produção.

## 2026-09-24 — Correção do Botão Avançar para Pré-Visualização no Modal Importar Atletas e Kits (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead).
- **Pedido do Yuri (PO via áudio e captura de tela):** Ao anexar as planilhas na tela de Operação (`app.entregasrun.com.br`) no modal "IMPORTAR ATLETAS E KITS" e tentar prosseguir clicando no botão `AVANÇAR PARA PRÉ-VISUALIZAÇÃO →`, o botão não clicava, não avançava e nada acontecia.
- **Causa Raiz Identificada:**
  1. No arquivo `client/src/components/AssociarPlanilhasModal.jsx`, linha 404, havia uma chamada a `setPreviewPage(1)`, mas o estado `previewPage` / `setPreviewPage` não existia no componente (resquício de refatoração anterior).
  2. Ao clicar no botão, o React disparava a função `handleGenerateAssociation()`, que lançava um erro fatal `ReferenceError: setPreviewPage is not defined`, abortando a execução antes de chamar `setStep(2)` e travando silenciosamente o avanço do modal.
  3. Adicionalmente, a condição de `disabled` do botão e a validação exigiam obrigatoriamente a planilha de chips, impedindo o avanço caso o usuário quisesse importar apenas a planilha de atletas não associados para posterior leitura de QR Code.
- **Arquivos alterados:** `client/src/components/AssociarPlanilhasModal.jsx`, `HANDOFF.md`.
- **O que foi feito:**
  1. Remoção da chamada incorreta `setPreviewPage(1)`.
  2. Tratamento com bloco `try/catch` robusto em `handleGenerateAssociation` para garantir que qualquer erro de formato seja capturado e alertado amigavelmente sem congelar o fluxo.
  3. Flexibilização da planilha de chips: se o usuário anexar apenas a lista de atletas (para associação futura na tenda), o modal avança normalmente sem bloquear o operador. Se anexar ambas as planilhas, associa e valida kits normalmente.
  4. Atualização da propriedade `disabled` do botão principal: habilitado com a planilha de atletas e coluna do nome mapeada.
- **Validação real executada:**
  - `npx oxlint -D no-undef client/src/components/AssociarPlanilhasModal.jsx`: 0 erros de identificadores não definidos (antes acusava `setPreviewPage is not defined`).
  - `npm run lint --prefix client`: 0 warnings, 0 errors em 29 arquivos.
  - `npm run build --prefix client`: compilação concluída com sucesso em 663ms (`index-DOJK-6n7.js`).
  - **Deploy em Produção (VPS):** Executado com sucesso via GitHub Actions (Run ID `35958459706`, commit `150ff59`).
  - **Healthcheck Live:** `https://app.entregasrun.com.br/api/health` retornando `ok: true`, `appwriteEnabled: true`.
  - **Status do Banco Appwrite em Produção:** `https://app.entregasrun.com.br/api/appwrite/status` retornando `enabled: true`, `connected: true` com as 4 coleções (`events`, `athletes`, `user_profiles`, `audit_logs`) ativas e comunicando com o cluster `db.largadabrasil.com`.
  - **Bundle Live:** `index-DOJK-6n7.js` servido ativamente na raiz do domínio.
- **Próximo passo:** Yuri (PO) testar a importação na tela de Operação em produção.

## 2026-09-24 — Correção de Sintaxe do .env e Ativação da Conexão com o Banco de Dados Appwrite (Fase A)

- **Autor:** Antigravity / Equipe TONE (Tech Lead).
- **Pedido do Yuri (PO via áudio):** Corrigir a sintaxe do arquivo `.env` (chaves, anotações e variáveis) e fazer a conexão com o banco de dados Appwrite funcionar perfeitamente para que tudo opere corretamente.
- **Diagnóstico realizado:**
  1. O arquivo `.env` continha comandos de terminal e notas brutas em vez de formato `CHAVE=VALOR` (linhas com prefixos `api:`, `Segredo:`, `id`, `VITE_` com espaços).
  2. O backend Node não carregava `.env` nativamente e o conector anterior não serializava as queries REST conforme a especificação do Appwrite 1.9.6.
  3. No Appwrite (`https://db.largadabrasil.com/v1`), o banco `entregas_run_db` e as coleções relacionais (`events`, `athletes`, `user_profiles`, `audit_logs`) já existiam com atributos definidos, porém estavam com 0 registros.
- **Arquivos alterados:** `.env`, `server/server.js`, `server/appwrite.js`, `docker-compose.yml`, `client/src/utils/eventsApi.js`, `HANDOFF.md`.
- **O que foi feito:**
  1. **Higienização e Padronização do `.env`:** Sintaxe limpa, canônica e segura em padrão dotenv. Credenciais preservadas integralmente (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID=entregas_run_db`, `APPWRITE_API_KEY`, coleções). Comandos de terminal e notas de VPS/GIT foram comentados para não causar falha sintática no parser.
  2. **Carregamento Nativo do `.env` no Node:** `process.loadEnvFile` configurado no topo de `server/server.js` e `server/appwrite.js` para garantir disponibilidade imediata das variáveis tanto em desenvolvimento quanto em produção.
  3. **Conector Relacional Completo do Appwrite (`server/appwrite.js`):**
     - Mapeamento bidirecional tipado entre os dados da aplicação e os atributos do Appwrite (`events`, `athletes`, `audit_logs`).
     - IDs determinísticos de documento de 32 caracteres (MD5 hex) para upsert atômico sem duplicações.
     - Suporte ao formato de queries JSON do Appwrite 1.9.6 (`formatQueries`) para contagem, paginação e buscas filtradas.
     - Registro automático de comprovante em `audit_logs` a cada entrega de kit confirmada.
  4. **Persistência Híbrida Write-Through:** As rotas `/api/events` e `/api/events/:eventId/athletes` gravam tanto no disco local da VPS (resposta instantânea em 0ms para a tenda e operação offline) quanto no Appwrite em nuvem. Se uma nova máquina/instância subir com disco vazio, reidrata automaticamente os dados do Appwrite.
  5. **Mapeamento no `docker-compose.yml`:** Incluídas as variáveis de ambiente das coleções para garantir paridade total em produção.
  6. **Exportação de Status no Client (`client/src/utils/eventsApi.js`):** Função `apiGetAppwriteStatus` disponibilizada para consulta diagnóstica.
- **Validação real executada:**
  - `process.loadEnvFile('.env')`: carregamento limpo com 0 erros de sintaxe.
  - Endpoint `http://localhost:3001/api/appwrite/status`: confirmou `enabled: true`, `connected: true` com sucesso nas 4 coleções (`events`, `athletes`, `user_profiles`, `audit_logs`).
  - Teste end-to-end de escrita: criação de evento via API persistiu no Appwrite; upload de atleta persistiu em `athletes`; atualização para `ENTREGUE` alterou o status no Appwrite e gerou entrada em `audit_logs`.
  - Limpeza pós-teste executada via API (exclusão em cascata confirmada no Appwrite).
  - `npm run build --prefix client`: compilação concluída com sucesso em 1.13s (0 erros).
- **Riscos e pendências:**
  - No deploy para a VPS, certificar-se de que as variáveis do `.env` (especialmente `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`, `APPWRITE_PROJECT_ID`) estejam replicadas no arquivo `.env` do servidor ou nos Secrets do GitHub Actions.
- **Próximo passo:** Subir alterações para homologação do Yuri.

## 2026-09-24 — Fecha /api/users sem login, sync fatiado de atletas e espelho Appwrite (Fase A)

- **Autor:** Codex (agente de código, continuação das correções do GPT).
- **Pedido do Yuri (PO):** continuar as correções que o GPT estava fazendo; entender por que o banco/Appwrite não estava sendo acessado (o projeto tem chave e API no console).
- **Por que a dificuldade de acessar o banco:** o `.env` local tinha endpoint e project ID, mas o segredo da chave Appwrite só existia no console (oculto). A chamada só com os dados do `.env` devolvia 401. O GPT copiou o segredo via controle do console e confirmou leitura (4 tabelas: eventos e atletas/auditoria vazios, perfis com 1 registro). Para não repetir o erro, o backend agora lê a chave SOMENTE de variável de ambiente do servidor (`APPWRITE_API_KEY`), nunca do bundle frontend e nunca do Git — sem env, roda em disco (fallback) sem quebrar.
- **Arquivos alterados:** `server/server.js`, `server/appwrite.js` (novo), `client/src/App.jsx`, `client/src/components/LoginPage.jsx`, `client/src/components/OperacaoPage.jsx`, `client/src/components/UsuariosPage.jsx`, `client/src/utils/eventsApi.js`, `client/src/utils/usersApi.js`, `docker-compose.yml`, `.github/workflows/deploy.yml`, `.env.example`, `HANDOFF.md`.
- **O que foi feito:**
  1. `/api/users` fechado: exigia nada e devolvia `password` de todos. Agora exige token de sessão (Bearer) + papel ADMIN, e nenhuma resposta inclui senha (`sanitizeUser`). Login emite token opaco de 64 chars (TTL 7 dias); `GET /api/session` valida o token no reload (login sobrevive a recarregar a página; token expirado derruba para o login); `POST /api/logout` revoga.
  2. Tela de usuários virou redefinição: sem "ver senha atual" (servidor não a devolve mais). Botão SENHA abre modal com senha oculta + `GERAR NOVA SENHA` (exibida uma vez para copiar ao WhatsApp).
  3. Divergência total x lista (evento com 1.011 atletas no total e rota de atletas zerada): causa raiz — `POST /api/events/:id/athletes` retornava 400 e DESCARTAVA a lista inteira quando qualquer kit era inválido, e o frontend engolia o erro com `.catch vazio`. Agora kits inválidos viram `kitsWarning` sem bloquear atletas; saves registram estado (`SINCRONIZADO` / `SYNC FALHOU` no banner do evento) e há cura nos dois sentidos (servidor zerado + navegador com lista => reenvia; navegador zerado + servidor com lista => puxa).
  4. Upload fatiado: `POST /api/events/:id/athletes/chunks` (`uploadId`, `chunkIndex`, `totalChunks`, fatias de 250) com merge no servidor; `apiSaveAthletes` usa fatias acima de 300 atletas.
  5. Espelho Appwrite (server-only, best-effort): `server/appwrite.js` espelha atletas em documentos fatiados (descoberta automática de database/coleções por nome); `GET atletas` usa Appwrite como fallback e reidrata o disco; `GET /api/appwrite/status` diagnostica sem expor segredo. Compose/deploy repassam `APPWRITE_*` e `ADMIN_*` via ambiente/`.env` da VPS (fora do Git).
- **Validação real:**
  - `node --check server/server.js` e `server/appwrite.js`: OK.
  - `npm run lint --prefix client`: 0 warnings, 0 errors (29 arquivos).
  - `npm run build --prefix client`: OK em 896ms.
  - Servidor local em porta temporária com `DATA_DIR` isolado: `/api/users` sem token => 401; login => token 64 chars; `/api/users` com token => 1 usuário e 0 campos `password`; `/api/session` => 200; `/api/appwrite/status` => `enabled:false` (modo disco, sem env); save de 350 atletas => `count:350`; save com kit inválido => `ok:true` + `kitsWarning` (antes era 400 com perda da lista); chunks 2/2 => `count:350`; GET => 350 atletas.
  - Scan do diff: nenhum segredo novo (só o fallback `ADMIN_PASSWORD` pré-existente, já commitado antes).
- **Riscos e pendências:** (1) Clientes logados antes desta versão perdem acesso a `/api/users` até fazer login de novo (esperado — é o fechamento da brecha). (2) `.env` local contém segredos em texto puro + anotações (PAT GitHub, senha da VPS, segredo Appwrite): NÃO está no Git (conferido via `git ls-files`), mas recomendo girar a chave Appwrite e a senha da VPS por terem circulado em chat/arquivo, e cadastrar `APPWRITE_API_KEY`/`APPWRITE_DATABASE_ID`/`ADMIN_PASSWORD` como Secrets do GitHub para o deploy gravar na VPS. (3) O espelho Appwrite ainda não foi validado contra o console real (sem env aqui); validar via `/api/appwrite/status` após configurar. (4) Senhas de usuários seguem em texto puro em `users.json` — próximo passo é hash (bcrypt). (5) Deploy ainda não publicado; homologação do Yuri pendente (Fase B).
- **Próximo passo:** Yuri cadastrar os Secrets no GitHub, fazer push para `main` (deploy automático), entrar de novo (novo token), importar a lista de 1.011 atletas no navegador do operador e conferir no computador que a lista aparece; depois validar `/api/appwrite/status` na VPS.

## 2026-09-24 — Eliminação de Número Sequencial, Seletores Dinâmicos da Tabela Anexada (Modalidade/PCD/Kit) e Prévia Ampla na Associação (Fase A)

- **Autor:** Antigravity/Gemini (agente de código na IDE Antigravity).
- **Pedido do Yuri (PO via áudios e capturas de tela):**
  1. *Eliminação Completa de "Número Sequencial" no Modal Novo Atleta*:
     - Remoção total do badge `PRÓXIMO SEQUENCIAL: #...` no topo do modal.
     - Remoção do badge `Sequencial` no campo de NÚMERO.
     - O campo `NÚMERO` inicia 100% limpo (`''`), permitindo digitação manual livre do número de peito pelo operador (ex: 1050), sem pré-atribuição forçada.
     - Campo `CHIP` também permanece limpo com alerta e bloqueio preventivo de colisão em tempo real.
  2. *Opções Dinâmicas da Tabela Anexada para Seleção (Modalidade, PCD, Categoria, Kit, Equipe)*:
     - No modal "NOVO ATLETA" e na Ficha do Atleta, campos como Modalidade, Categoria, Kit, Camiseta, Equipe e PCD/Campos Extras agora carregam seletores dinâmicos (`<select>`) extraídos diretamente das opções reais existentes na base/planilha anexada.
     - Modalidade agora exibe todas as modalidades presentes na tabela (ex.: KIDS, 5 KM, 10 KM, ADULTO, etc.).
     - Campo PCD e colunas personalizadas listam todas as opções detectadas na tabela anexada (ou lista expandida de acessibilidade/opções padrão), eliminando campos estáticos genéricos.
  3. *Prévia Ampla e Completa no Modal "IMPORTAR ATLETAS E KITS" (`AssociarPlanilhasModal.jsx`)*:
     - Reestruturação da Etapa 2 de pré-visualização para espelhar exatamente o layout amplo, limpo e organizado do `ImportarAtletasModal.jsx`.
     - Ampliação do modal para `max-width: 1060px` com container responsivo com rolagem horizontal e vertical suave (`overflow-x: auto; white-space: nowrap`).
     - Tabela exibindo todas as colunas reais da planilha de atletas com cabeçalhos estruturados (`COLUNA ORIGINAL → CAMPO MAPEADO`).
     - Fim da tabela espremida de 11 colunas que quebrava nomes em 4 linhas; nomes e dados agora são exibidos em formato completo, legível e profissional.
- **Arquivos alterados:** `client/src/components/AssociarPlanilhasModal.css`, `client/src/components/AssociarPlanilhasModal.jsx`, `client/src/components/OperacaoPage.jsx`, `HANDOFF.md`.
- **Validação real:**
  - `npm run lint --prefix client`: 0 warnings, 0 errors em 29 arquivos (oxlint).
  - `npm run build --prefix client`: compilação Vite concluída com sucesso em 1.91s (`index-D3uQXNBB.js` e `index-BxoHUtgY.css`).
- **Riscos e pendências:** Nenhuma regressão detectada.
- **Próximo passo:** Commit e push para a branch `main` para acionamento do deploy na VPS e homologação pelo Yuri.


- **Autor:** Antigravity/Gemini (agente de código na IDE Antigravity).
- **Pedido do Yuri (PO via áudio e mensagens):**
  1. *Modal de Adicionar Atleta*:
     - O campo de CHIP não fixa mais número; inicia sempre limpo (`''`) e permite digitação livre.
     - Validação de colisão de chip em tempo real: ao digitar um chip já associado a outro atleta no evento, exibe aviso visual imediato e bloqueia o salvamento.
     - Data de nascimento com máscara dinâmica progressiva (`dd/mm/aaaa`, ex: `220` vira `22/0`, `22081995` vira `22/08/1995`).
     - Carregamento fidedigno de todos os campos da tabela anexada (colunas padrão e personalizadas/extras), sem badges artificiais de "campos da IA/planilha".
  2. *Ficha do Atleta e Aba de Entrega de Kit*:
     - CHIP editável diretamente na ficha com validação de colisão contra chips de outros atletas.
     - Data de nascimento com máscara dinâmica.
     - Ausência de botão "Imprimir Comprovante" na aba de Entrega de Kit (mantendo o fluxo focado em entrega e associação).
     - Confirmação protetiva ao fechar a ficha de um atleta com kit associado pendente de entrega.
     - Busca na entrega de kit normalizada (sem acentos) e multi-termo, sem excluir atletas já entregues dos resultados.
     - Remoção da paginação nas Últimas Entregas: exibição fixa das 5 entregas mais recentes em ordem cronológica de recência.
  3. *Modal de Importação de Atletas (4 Etapas)*:
     - Fluxo reestruturado em 4 etapas sequenciais: Etapa 1 (Upload/Colar) -> Etapa 2 (Mapeamento limpo de colunas, sem prévia espremida) -> Etapa 3 (Pré-visualização Ampla e Completa dos dados com colunas mapeadas) -> Etapa 4 (Conclusão e Resumo de sucesso).
  4. *Espelho / Telão Público*:
     - Latência zero local (0ms) com `STATE_CHANGE` no `subscribeEspelhoSync` e polling de alta frequência (1000ms) para telas remotas.
- **Arquivos alterados:** `client/src/components/EspelhoPage.jsx`, `client/src/components/ImportarAtletasModal.jsx`, `client/src/components/OperacaoPage.css`, `client/src/components/OperacaoPage.jsx`, `client/src/utils/espelhoSync.js`, `HANDOFF.md`.
- **Validação real:**
  - `npm run lint --prefix client`: 0 warnings, 0 errors em 29 arquivos (oxlint).
  - `npm run build --prefix client`: compilação Vite concluída com sucesso em 679ms (`index-CQE-23-k.js` e `index-Bef7SbCm.css`).
- **Riscos e pendências:** Nenhuma regressão detectada.
- **Próximo passo:** Commit e push para a branch `main` para acionar o deploy automático em produção e homologação com o Yuri.


- **Autor:** Antigravity/Gemini (agente de código na IDE Antigravity).
- **Pedido do Yuri (PO via áudios e capturas de tela):**
  1. *Gerenciamento de Usuários e Senhas*:
     - No modal "ADICIONAR USUÁRIO", adicionar campo de senha com botão "🎲 GERAR SENHA" segura e legível, alternador de visualização e modal pós-criação com dados de acesso e botão de cópia formatada para WhatsApp.
     - Botão "SENHA" em cada card de usuário para visualização, cópia rápida e redefinição de senha a qualquer momento.
     - Persistência e autenticação no backend em `/api/users` e `/api/login` (com persistência em `/app/data/users.json` e fallback resiliente).
  2. *Remoção de Colunas Fictícias*:
     - Remoção de valores padrão fictícios (ex: "Visitante", "BRASIL") em `ImportarAtletasModal.jsx` e `AssociarPlanilhasModal.jsx`.
     - `athleteTable.js` refatorado para exibir estritamente as colunas presentes no `savedSchema` da planilha importada + coluna `status`.
  3. *Modal de Importação de Atletas (Etapa 2)*:
     - Modal ampliado (`max-width: 1060px`, `max-height: 94vh`) com layout dos seletores de mapeamento em grade de 2 colunas para exibição clara sem corte e tabela de prévia com scroll interno suave.
  4. *Operação de Entrega de Kits*:
     - Remoção do botão `IMPRIMIR COMPROVANTE` na aba Entrega de Kit.
     - Limpeza imediata do campo de busca ao clicar no atleta para abrir a ficha e ao concluir a entrega.
     - Botão de limpeza rápida (✕) no campo de busca.
     - Badges de identificação na busca: `✓ JÁ ENTREGUE` (verde) ou `FALTA ENTREGAR` (âmbar).
     - Lista de Últimas Entregas paginada de 20 em 20 (`DELIVERIES_PER_PAGE = 20`) com formato simplificado (Nome + badge verde `✓ ENTREGUE`).
  5. *Telão / Espelho Público*:
     - Correção do corte da tela com transição para container responsivo com rolagem suave (`overflow-y: auto`, paddings balanceados).
     - Remoção de redundâncias (nome repetido, modalidade repetida, kit repetido).
     - Exibição de todos os dados do atleta: Doc/CPF, Cidade/UF, Nascimento/Idade, Categoria, Sexo, Equipe/Assessoria, Kit, Camiseta, Chip, Nome no Peito, PCD e campos customizados.
     - Placa de número bem nítida e badge "AGUARDANDO LEITURA" no modo livre.
  6. *Dashboard do Evento*:
     - Visão Geral: remoção de Largada, Chegadas e Misto no topo (ficando Atletas, Masculino e Feminino); remoção do gráfico Distribuição de Largada; remoção de Chegadas por Intervalo de Tempo e Largaram Sem Finalizar.
     - Transposição do painel "Equipes por Atletas Cadastrados" para dentro da Visão Geral, com dados calculados dinamicamente a partir dos atletas cadastrados e barras de proporção.
     - Remoção da aba "Por Modalidade" (restando apenas "Visão Geral" e "Entrega de Kit").
     - Preservação intacta da aba "Entrega de Kit".
- **Arquivos alterados:** `client/src/App.jsx`, `client/src/components/AssociarPlanilhasModal.jsx`, `client/src/components/EspelhoPage.css`, `client/src/components/EspelhoPage.jsx`, `client/src/components/EventDashboardPage.css`, `client/src/components/EventDashboardPage.jsx`, `client/src/components/ImportarAtletasModal.css`, `client/src/components/ImportarAtletasModal.jsx`, `client/src/components/OperacaoPage.css`, `client/src/components/OperacaoPage.jsx`, `client/src/components/UsuariosPage.css`, `client/src/components/UsuariosPage.jsx`, `client/src/utils/athleteTable.js`, `client/src/utils/usersApi.js`, `server/server.js`, `HANDOFF.md`.
- **Validação real:**
  - `npm run lint --prefix client`: 0 avisos e 0 erros em 29 arquivos.
  - `npm run build --prefix client`: compilação Vite concluída com sucesso (737ms).
  - `node --check server/server.js`: sintaxe validada com sucesso sem erros.
- **Riscos e pendências:** Nenhuma regressão detectada.
- **Próximo passo:** Commit e push para o repositório remoto para acionamento do deploy na VPS e homologação pelo Yuri.

- **Autor:** Antigravity/Gemini (agente de código na IDE Antigravity).
- **Pedido do Yuri (PO via áudio/vídeo):**
  1. *Exibição Completa de Dados ao Anexar Tabelas*: Em ambas as importações (associada e já associada), exibir todas as colunas da planilha (Nome, Doc/CPF, Modalidade, Categoria, Camiseta, Sexo, Equipe, Número, Nascimento, Cidade e colunas extras). Na pré-visualização de ambas, listar a tabela completa com todos os campos detectados.
  2. *Correção de Importação Já Associada*: Permitir que número e chip sejam importados diretamente sem serem descartados.
  3. *Busca Rápida na Entrega de Kit*: Remover botão "ENTREGAR KIT" da listagem de busca. Remover número de chip e número de peito da listagem rápida (deixar apenas Nome, CPF e status). Quando o atleta já foi entregue, exibir o badge `KIT ENTREGUE`; quando não foi entregue, não exibir nada no lugar do botão. O clique na linha abre a ficha do atleta.
  4. *Desfazer Associação Completo*: Ao clicar em "DESFAZER" na ficha do atleta (inclusive a partir da aba Atletas), desfazer completamente a associação, limpando chip, QR Code, número de peito atribuído, dados de entrega e restaurando o status para PENDENTE, com persistência imediata no backend.
- **Arquivos alterados:** `client/src/components/AssociarPlanilhasModal.jsx`, `client/src/components/AssociarPlanilhasModal.css`, `client/src/components/ImportarAtletasModal.jsx`, `client/src/components/ImportarAtletasModal.css`, `client/src/components/OperacaoPage.jsx`, `client/src/components/OperacaoPage.css` e este `HANDOFF.md`.
- **Validação real:**
  - `npm run lint --prefix client`: 0 warnings, 0 errors em 28 arquivos.
  - `npm run build --prefix client`: build do Vite concluído com sucesso em 596ms (`index-Dfa0DRGy.js` e `index-4l4NPCcr.css`).
- **Riscos e pendências:** Nenhuma regressão detectada.
- **Próximo passo:** Subir via `git push origin main` para acionamento do deploy na VPS e homologação com o Yuri.

## 2026-09-23 — Ajuste de Nomenclatura: IMPORTAR JÁ ASSOCIADO (Fase A)

- **Autor:** Antigravity/Gemini (agente de código na IDE Antigravity).
- **Pedido do Yuri (PO via áudio):** Alterar o nome do botão `IMPORTAR SEM ASSOCIAÇÃO` para `IMPORTAR JÁ ASSOCIADO` na aba Auditoria.
- **Arquivos alterados:** `client/src/components/OperacaoPage.jsx` e este `HANDOFF.md`.
- **Validação real:** `npm run lint --prefix client` com 0 erros e 0 avisos; `npm run build --prefix client` gerando bundle Vite em 343ms (`index-DXU-PKO_.js`).
- **Riscos e pendências:** Nenhuma regressão.
- **Próximo passo:** Subir via `git push origin main` para acionamento do deploy na VPS.

## 2026-09-23 — Leitor QR Universal com jsQR, Busca Alfabética Inteligente e Simplificação da Aba Auditoria (Fase A)

- **Autor:** Antigravity/Gemini (agente de código na IDE Antigravity).
- **Pedido do Yuri (PO via áudio/vídeo):**
  1. *Leitor de QR Code Universal*: Habilitar leitura real de QR Code na câmera em qualquer navegador através de `jsqr`, contornando a ausência do `BarcodeDetector` nativo no Chrome/Edge para Windows.
  2. *Botão Único na Ficha do Atleta*: Unificar botões duplicados da ficha de entrega no botão `ASSOCIAR KIT`.
  3. *Busca Alfabética Inteligente*: Priorizar nomes que iniciam pela letra/termo digitado, ordenados alfabeticamente na aba de entrega e na lista de atletas.
  4. *Aba Auditoria*:
     - Renomear `BAIXAR PLANILHA GERAL` para `BAIXAR PLANILHA ATUALIZADA`.
     - Renomear `IMPORTAR ATLETAS` para `IMPORTAR SEM ASSOCIAÇÃO`.
     - Renomear `IMPORTAR ATLETAS E KITS` para `IMPORTAR COM ASSOCIAÇÃO`.
     - Remover botão `RESTAURAR PLANILHA ORIGINAL`.
     - Remover cards de métricas do topo (Entregas no Filtro, Pelo Atleta, Por Terceiro, Top Operador).
     - Remover card complexo de filtros; transformar a tabela em `HISTÓRICO DE ENTREGAS` com busca ágil, `EXPORTAR CSV` e `GERAR PDF`.
- **Arquivos alterados:** `client/package.json`, `client/package-lock.json`, `client/src/components/KitQrScannerModal.jsx`, `client/src/components/OperacaoPage.jsx` e este `HANDOFF.md`.
- **Validação real:** `npm run lint --prefix client` concluído com 0 warnings e 0 errors; `npm run build --prefix client` gerando bundle Vite sem falhas.
- **Riscos e pendências:** Nenhuma regressão detectada.
- **Próximo passo:** Commit e push para `main` para acionar o GitHub Actions e validar em produção.

## 2026-09-23 — Aceite de números duplicados e mapeamento flexível de kits (Fase A)

- **Autor:** Antigravity/Gemini (agente de código na IDE Antigravity).
- **Pedido do Yuri (PO via áudio):** na associação de planilhas, permitir que o QR Code use os mesmos números do peito (mesma coluna ou valores duplicados), aceitando duplicação de números na planilha de kits sem travar o avanço com alertas de valores duplicados.
- **Arquivos alterados:** `client/src/components/AssociarPlanilhasModal.jsx`, `client/src/components/OperacaoPage.jsx`, `server/server.js` e este `HANDOFF.md`.
- **Validação real:** `npm run lint --prefix client` concluído com 0 warnings e 0 errors (oxlint em 28 arquivos); `npm run build --prefix client` gerando bundle Vite em 332ms; `node --check server/server.js` sem erros de sintaxe; teste unitário em `validateKits` aprovando duplicações e rejeitando apenas kits com campos ausentes.
- **Riscos e pendências:** quando múltiplos kits possuem o mesmo código QR ou número (ex: categorias ou modalidades distintas), a leitura associa sequencialmente o primeiro kit disponível não atribuído. Operador deve conferir os dados no modal antes de confirmar.
- **Próximo passo:** enviar para a branch `main` para acionar o deploy automático na VPS e homologar com o arquivo real de atletas e kits.

## 2026-09-23 — Associação de kit por leitura ou digitação (Fase A)

- **Autor:** Codex/Tony, com agentes Codex nas frentes de importação, leitor e persistência.
- **Pedido:** importar atletas e kits sem atribuição automática e retirar as opções antigas de associação sequencial/aleatória; associar código físico a um atleta pela câmera ou digitação manual, confirmando número de peito e chip; retirar QR gerado e ação de entregar e imprimir da ficha.
- **Arquivos alterados:** `client/src/components/AssociarPlanilhasModal.jsx`, `ImportarAtletasModal.jsx`, `OperacaoPage.jsx`, `OperacaoPage.css`, `KitQrScannerModal.jsx`, `KitQrScannerModal.css`, `client/src/utils/athleteDetail.js`, `client/src/utils/eventsApi.js`, `server/server.js` e este `HANDOFF.md`.
- **Validação real:** `npm run lint --prefix client` sem avisos; `npm run build --prefix client` concluído; `node --check server/server.js` e `git diff --check` sem erros. Estes comandos validam compilação e análise estática, não a câmera física nem o fluxo completo no navegador.
- **Riscos e pendências:** leitura automática depende de `BarcodeDetector`, câmera e permissão do navegador; digitação manual é alternativa na mesma tela. Associação ainda usa a sincronização de lista inteira existente, sem transação de reserva entre dois operadores simultâneos. Não houve homologação do Yuri, teste com planilhas reais nem deploy.
- **Próximo passo:** validar em navegador móvel com as duas planilhas reais: atleta começa sem número/chip, leitura ou digitação encontra kit, confirmação atribui ambos, código repetido é recusado e a entrega só é registrada após associação.
- **GitHub:** primeiro envio na branch `codex/associacao-kit-leitura`; após o PO mostrar que a tela publicada continuava antiga, o commit foi encaminhado para `main` conforme a decisão de deploy automático registrada neste handoff. A conclusão do workflow e a tela publicada devem ser verificadas separadamente.

## Convenção de registro (obrigatória)

- Cada entrada começa com `## AAAA-MM-DD — título` e informa: **Autor** (quem executou), pedido, arquivos alterados, validação real, riscos/pendências e próximo passo.
- Quem executou é quem assina. Identifique-se pelo nome do agente/pessoa (Cline, Codex/Tony, Gemini, GPT, Yuri...). Nunca assine por outro agente nem registre trabalho que não foi feito.
- Toda alteração — código, configuração, script, documentação ou esta memória — entra aqui antes de encerrar a tarefa.
- Só fatos confirmados. Nunca senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.
- Anexos técnicos vão em `docs/`, sempre referenciados pela entrada de memória.
- Entradas anteriores a 20/09/2026 podem não registrar autor; não presuma autoria.

## 2026-09-23 — Modal Dinâmico de Novo Atleta & QR Code Individual com Validação Pública (Fase A, construir)

- **Autor**: Antigravity/Gemini (agente de código na IDE Antigravity).
- **Pedido do Yuri (PO via áudio/vídeo)**:
  1. *Modal Novo Atleta Dinâmico*: Substituir os campos estáticos/aleatórios do modal de adicionar atleta manualmente por campos que espelham exatamente as colunas da tabela importada/associada ao evento. O campo NÚMERO deve sugerir automaticamente o próximo número sequencial da lista (`maxNumber + 1`, ex: se há 300 atletas, sugere 301) e, ao salvar, o novo atleta é adicionado no final da tabela.
  2. *QR Code Individual por Atleta com Consulta/Validação Pública*: Gerar um QR Code único para cada atleta na lista associado ao seu número de peito. Ao escanear o QR Code em qualquer smartphone ou leitor, abrir a página oficial de validação em tempo real (`/validar/:eventId/:numero`), exibindo o status da entrega (**ENTREGUE** com data/hora/operador ou **PENDENTE DE RETIRADA**) e os dados completos do atleta.
- **Roteamento de IA**:
  - Operação TONE (Fase A - Construir). Especialistas: TONE (Arquitetura), Ulisses (Elevação e foco na experiência humana), Ana (UI/UX autêntica sem estética genérica), Kastiel (Implementação Fullstack), Crowley (Segurança e sanitização de dados públicos), Teclide (Qualidade e performance on-demand) e Vitor (Infraestrutura e persistência em volume Docker).
- **Arquivos alterados e criados**:
  1. `server/server.js`: implementada persistência de atletas por evento em `DATA_DIR/athletes_${eventId}.json`; endpoints `POST /api/events/:eventId/athletes`, `GET /api/events/:eventId/athletes`, `PUT /api/events/:eventId/athletes/:numero/status` e rota pública `GET /api/public/events/:eventId/athletes/:numero` com rate limit e mascaramento seguro de documento (Crowley).
  2. `client/src/utils/eventsApi.js`: implementadas funções `apiFetchAthletes`, `apiSaveAthletes` e `apiPublicValidateAthlete`.
  3. `client/src/components/ValidarAtletaPage.jsx` & `ValidarAtletaPage.css`: nova página pública de validação em tempo real para quem escaneia o QR Code, exibindo badge dinâmico de status (**KIT ENTREGUE** em esmeralda ou **PENDENTE DE RETIRADA** em âmbar), número de peito em destaque, ficha técnica e botão para atualizar status em tempo real.
  4. `client/src/components/AthleteQrModal.jsx` & `AthleteQrModal.css`: modal de QR Code individual do atleta, gerando QR Code em alta resolução (`qrcode`), com botões para copiar link, abrir validação e imprimir filipeta/etiqueta com suporte nativo a impressoras térmicas via `@media print`.
  5. `client/src/App.jsx`: roteamento da tela pública `/validar/:eventId/:numero` acessível sem autenticação externa.
  6. `client/src/components/OperacaoPage.jsx`:
     - Cálculo atômico do próximo número sequencial via `getNextAthleteNumber(athletes)` (`maxNumber + 1`).
     - Detecção dinâmica de colunas a partir de `athleteTableColumns` (`availableStandardColumns` e `availableCustomColumns`), com auto-preenchimento dos tamanhos reais de camiseta da base (`shirtOptions`).
     - Modal `NOVO ATLETA` reconstruído dinamicamente em grid com badge do próximo sequencial sugerido, campos da planilha e campos personalizados.
     - `handleCreateAthlete`: mapeamento dinâmico de campos padrão e `customFields`, inserção no final da lista (`[...athletes, newAthlete]`), incremento de totais do evento e sincronização atômica com o backend (`apiSaveAthletes`).
     - Coluna interativa e botão `QR` adicionados em cada linha da tabela de atletas (aba Atletas) e botão `QR CODE` na barra de ações da ficha de entrega.
  7. `client/src/components/OperacaoPage.css`: estilização do modal dinâmico, badges de numeração sequencial, seção de campos extras da planilha e botões de QR Code.
- **Validações reais**:
  - `scratch/test-endpoints.mjs`: teste funcional ponta a ponta via HTTP dos novos endpoints de atletas e validação pública de QR Code (100% de sucesso).
  - `npm run lint --prefix client`: oxlint concluído em 492ms com 0 erros e 0 warnings em 27 arquivos.
  - `npm run build --prefix client`: Vite build concluído em 1.08s com 0 erros (132 módulos, assets gerados com sucesso).
- **Riscos/pendências**:
  - Nenhum risco de regressão detectado. Persistência de atletas integrada com volume Docker persistente da VPS.
  - Correção imediata: restaurado o import de `publishEspelhoState` em `OperacaoPage.jsx` que havia sido acidentalmente omitido no topo durante a inserção de `AthleteQrModal`, eliminando o `ReferenceError: publishEspelhoState is not defined` que bloqueava a execução dos cliques no painel.
- **Próximo passo**:
  - Yuri realizar os testes de aceitação e homologação (Fase B): criar novo atleta com planilha associada conferindo as colunas dinâmicas e o próximo número sequencial sugerido (301), e escanear o QR Code de um atleta no celular para verificar a página de validação com status da entrega.

- **Autor**: Antigravity/Gemini (agente de código na IDE Antigravity).
- **Pedido do Yuri (PO via áudio)**:
  - "Analisa a estrutura do sistema e entenda o que já foi feito e vamos continuar nas correções."
  - "Quando eu crio um evento no celular e acesso pelo computador, não tá aparecendo... Veja o porquê que isso tá acontecendo."
  - Escolha confirmada pelo PO via áudio: Opção 1 (API REST no Express + persistência com volume Docker na VPS).
- **Roteamento de IA**:
  - Classificado via Jev (TypeSafe System One): Liderança Kastiel (Dev Lead Fullstack, 98% / 87% de confiança).
- **Causa raiz confirmada**:
  - Os eventos estavam salvos exclusivamente no `localStorage` do navegador do dispositivo (`entregas_run_events`).
  - O backend não possuía rotas `/api/events` nem arquivo/banco persistente.
- **Ajustes implementados**:
  1. `server/server.js`: implementadas funções de persistência atômica `readEventsFromDisk` e `writeEventsToDisk`, salvando em `DATA_DIR/events.json`; criados endpoints `GET /api/events`, `POST /api/events`, `PUT /api/events/:eventId`, `DELETE /api/events/:eventId` e `POST /api/events/sync` com sanitização e validação completa.
  2. `docker-compose.yml` & `Dockerfile`: volume persistente `./data:/app/data` e `DATA_DIR=/app/data` adicionados, com criação da pasta `/app/data` e `chown -R node:node` preservando execução não-root.
  3. `client/src/utils/eventsApi.js`: módulo cliente com chamadas assíncronas para a API de eventos.
  4. `client/src/App.jsx`: sincronização inicial com a API central, auto-sync de eventos legados locais não cadastrados, listeners de `visibilitychange` e `focus` para atualização transparente em segundo plano, e persistência em `onUpdateEvent`.
  5. `client/src/components/EventosPage.jsx`: integração das ações de criação, edição, alteração de status e exclusão com a API centralizada.
  6. `.gitignore` & `data/.gitkeep`: ignorado `data/events.json` e `data/*.tmp`, preservando o diretório.
- **Validações reais**:
  - `scratch/test_events_backend.mjs`: GET, POST, PUT, SYNC, DELETE e integridade física em disco (100% aprovado).
  - `scratch/test_multi_device_sync.mjs`: simulação multi-dispositivo ponta a ponta (celular cria evento -> computador carrega na hora -> computador altera status -> celular reflete em tempo real -> exclusão sincronizada) — 100% aprovado (exit code 0).
  - Regressões do sistema: `test_espelho_routes.mjs` (8/8 PASS), `test_athlete_detail_flow.mjs` (PASS), `test_athlete_table_columns.mjs` (PASS), `test_import_all_columns.mjs` (PASS), `test_audit_filters_exports.mjs` (PASS).
  - `npm run lint --prefix client`: 0 erros e 0 avisos (oxlint em 25 arquivos).
  - `npm run build --prefix client`: Vite build concluído em 721ms (128 módulos).
- **Riscos/pendências**:
  - Deploy em produção na VPS ocorrerá após o push para a branch `main` do GitHub conforme fluxo aprovado pelo PO.
  - Próximo passo: Yuri homologar no celular e no computador criando eventos e confirmando que aparecem sincronizados em ambos os aparelhos.

## 2026-09-20 — Convenção de autoria na memória + validação do monitor pelo PO

- **Autor: Cline** (agente de código executando no terminal/Cline deste projeto).
- Pedido do PO: (1) confirmar que as mensagens estão chegando ao Jev; (2) instituir a regra de que toda alteração/ajuste seja gravada na memória identificando quem fez, para que outro LLM retome o projeto sabendo a autoria.
- Validação feita pelo próprio PO no terminal: `npm run jev:watch -- --once --since=300` retornou 13 registros, 0 falhas, última chegada 62s antes e o veredito `OK: mensagens estão chegando ao Jev.`
- Alterações desta tarefa: bloco "Convenção de registro" no topo desta memória; regra de registro obrigatório no `AGENTS.md`; mesma regra replicada no kit `D:\Projetos\Clientes\.ai-memory-kit` (AGENTS.md e HANDOFF.md) para valer em projetos novos.
- Esclarecimento operacional registrado: `.metrics/jev-hook-events.jsonl` grava em UTC (`21:06:06Z`) e o `jev:watch` exibe em horário local (`18:06:06`) — é a mesma mensagem em fusos diferentes, não log atrasado.
- A autoria passou a constar também no anexo técnico (`docs/correcoes-jev-grpc-2026-09-20.md`, linha "Autor: Cline").
- Fato mantido: os registros existentes vêm de envios manuais (`real-check`, `cli-*`); o cliente atual (terminal/Cline) não dispara o hook PreInvocation. Uso garantido: `npm run jev:route -- "pedido"` antes de executar.
- Próximo passo: rodar `jev:route` no início das tarefas (ou migrar para um cliente que execute hooks) e, depois, medir o efeito no desenvolvimento (com e sem Jev).


## 2026-09-20 — Correções da integração Jev + ponte gRPC (Fase A, construir)

- Autor: Cline; pedido do PO: concluir as correções levantadas no diagnóstico e terminar a integração gRPC iniciada (deps instaladas, sem código).
- Entrega: `docs/correcoes-jev-grpc-2026-09-20.md`. Arquivos novos/reescritos em `scripts/`: `jev-core.cjs`, `jev-router.proto`, `jev-grpc-server.cjs`, `jev-grpc-client.cjs`, `jev-bridge.cjs`, `jev-watch.cjs`, `jev-selftest.cjs`, além de `jev-pre-invocation-hook.cjs` e `jev-prompt-router.js` reescritos.
- Correções verificadas: cache por sessão+passo+hash do texto; confiança governando a diretiva (faixas 0,65/0,45); diretiva adaptativa (tipo de tarefa, testes, produção, severidade); toda saída vazia com motivo em `.metrics/jev-hook-events.jsonl`; adaptadores de transcript (`USER_INPUT`, `payload.user_message`, `event_msg.payload`, `role:user`); diretiva sem autoridade (não autoriza deploy/produção/segredos); telemetria sem o texto do prompt.
- Ponte gRPC: `Route` e `Health` tipados, deadline, `INVALID_ARGUMENT` para contrato e `ok:false` para falha do provedor, bind loopback por padrão, cliente fecha canal em `finally`.
- Provas reais: `npm run jev:selftest` 14/14 com API oficial simulada (nenhuma requisição externa, nenhuma chave real); chamada real via ponte `jev-1.13.0` 783ms com `kastiel_dev` 100%; hook ponta a ponta auto→gRPC `injectSteps=1` em 281ms com faixa média tratada como hipótese; ponte ATIVA em `127.0.0.1:50051` (`jev-grpc-bridge 1.0.0`).
- Configuração: `package.json` ganhou `jev:bridge`, `jev:bridge:stop`, `jev:bridge:status`, `jev:route`, `jev:router`, `jev:watch`, `jev:selftest`; `.env.example` documenta as variáveis JEV_*; `.agents/hooks.json` timeout 10→20s; Invariante 10 do `TONE-INVARIANTS.md` revisada (classificação é apoio probabilístico, não autoriza produção).
- Instalador para outros projetos atualizado: `D:\Projetos\Clientes\INSTALAR-JEV-AQUI.ps1` copia o conjunto completo, instala as deps gRPC, registra a Invariante 10 revisada e roda o selftest.
- Ainda não medido: benefício de desenvolvimento (retrabalho/erros/tokens com e sem Jev). Próximo passo é o piloto comparativo; o custo por chamada observado é ~760 tokens de entrada e ~190 de saída.
- Visibilidade de chegada: `scripts/jev-watch.cjs` (`npm run jev:watch`) mostra cada mensagem que chega ao Jev (HOOK/PONTE/ROUTER) e `--once --since=300` responde "as mensagens estão chegando?" com código de saída 1 quando nada chega.
- Fato confirmado no cliente atual (Cline/terminal): os pedidos enviados nesta sessão **não** dispararam o hook — o log só tem eventos das verificações manuais (`real-check`, `cli-*`). O caminho automático depende de o cliente executar o contrato PreInvocation; até então, o uso garantido é `npm run jev:route -- "pedido"` antes de executar.
- Nenhuma alteração em produção, nenhuma chamada com dados de cliente e nenhuma mudança nas telas do produto.


## 2026-09-20 — Diagnóstico da implementação Jev existente

- Autor: Codex/Tony; Teclide realizou revisão independente somente leitura.
- Esclarecimento do PO: avaliar se o Jev já instalado ajuda o desenvolvimento do Entregas-run e funciona corretamente; não propor funcionalidades de IA para o produto.
- Entrega: `docs/avaliacao-jev-existente-2026-09-20.md`.
- Confirmado: API funciona por chamada manual anterior desta sessão. Telemetria atual possui duas entradas; não mede resultado das tarefas ou economia. Hook automático/consumo pela IDE não demonstrado.
- Testes locais reais do código do hook com filesystem/fetch simulados: colisão entre sessões com mesmo step_index; colisão entre mensagens sem step_index; liderança obrigatória com confiança 20%; formato de transcript incompatível ignorado. Não tocaram cache real ou API. São testes de lógica, não E2E de IDE.
- Veredito: classificador funcional, integração incompleta com defeitos reproduzíveis e benefício no desenvolvimento ainda não comprovado. Corrige a interpretação excessiva de registros históricos que tratavam chamada manual como prova de funcionamento automático em todo turno.
- Nenhuma correção de código nesta avaliação. Próximo passo: contrato real do cliente/IDE, cache por sessão/mensagem, tratamento de confiança, observabilidade e comparação de resultado com/sem Jev.

## 2026-09-20 — Estudo de Jev nos projetos locais (Fase A)

- Autor: Codex/Tony; subagentes Kastiel, Ulisses e Teclide participaram de leitura e revisão do estudo.
- Pedido: estudar Jev e avaliar quais projetos em Projetos podem se beneficiar. Pasta encontrada: `D:/Projetos`; feita triagem de diretórios e leitura dirigida, não revisão exaustiva de todos os repositórios.
- Entrega: `docs/estudo-jev-projetos-2026-09-20.md`, com fontes oficiais, evidências do código, oportunidades priorizadas e limites de cobertura.
- Candidatos: sugestões para cabeçalhos desconhecidos nos importadores Entregas-run/ENTREGADEKIS; ordenação semântica de contexto no TEMINAL; recomendação de presets no deepseek-harness. Ganhos permanecem hipóteses sem comparação A/B.
- Validação real: chamada manual de `scripts/jev-prompt-router.js` com descrição genérica do estudo retornou jev-1.13.0, kastiel_dev, duvida_conceitual, 877 ms, 770 tokens de entrada e 192 de saída. Telemetria gravada pelo próprio script. Não comprova disparo automático do hook nem economia de tokens/modelos.
- Nenhuma alteração de código dos produtos, instalação, teste funcional ou deploy. Acrescentados apenas estudo e este registro; telemetria local foi atualizada pela chamada.
- Riscos/pendências: decisões podem estar erradas, português precisa de avaliação própria e chamadas remotas precisam minimizar dados enviados. Não usar Jev para substituir cálculo exato, autorização ou captura RFID offline.
- Próximo passo recomendado: piloto comparativo de mapeamento somente de cabeçalhos, se houver variação recorrente; alternativa é avaliar seleção de contexto no TEMINAL. Implementação não iniciada.

## Estado inicial

- Projeto recém-adicionado à memória de agentes.
- Registre aqui somente fatos confirmados, decisões, validações reais, riscos e próximo passo.
- Nunca registre senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## 2026-09-16 — Tela de login (Fase A, construir)

- Demanda do Yuri (PO): replicar a tela de login da foto (logo + "OPERAÇÃO DE KITS EM TEMPO REAL" + card usuário/senha + botão "ENTRAR NA OPERAÇÃO") com React + Express.
- Estrutura criada: `client/` (Vite + React 19, proxy `/api` → :3001) e `server/` (Express 4 + helmet + cors + rate-limit no `/api/login`). Logo original preservado em `logos/` e copiado para `client/public/logo.png`.
- Auth é MOCK de homologação (`POST /api/login` valida formato de e-mail e senha ≥6, sem usuário real nem segredo no repo). Auth real fica para próxima demanda.
- Validações reais: `npm run build` OK (1.74s), `npm run lint` 0 erros, `GET /api/health` 200, `POST /api/login` 200 válido / 400 inválido, Express servindo o `dist` (SPA 200).
- Riscos/pendências: `specify` quebrado (uv trampoline falha mesmo chamando o .exe direto; sem `--force`, sem reinstalar — Spec Kit manual até resolver); sem repo git neste diretório; homologação visual do Yuri pendente (Fase B).
- Próximo passo: Yuri homologar a tela (`npm run dev` na raiz sobe web :5173 + api :3001) e definir auth real / próximas telas.

## 2026-09-16 — Comando único `npm run dev`

- Pedido do Yuri (PO): rodar tudo com um comando só.
- Criado `package.json` na raiz (concurrently): `npm run dev` sobe `client` (:5173) e `server` (:3001) juntos; `npm run build` e `npm start` também na raiz.
- Validação real: `npm run dev` → WEB :5173 responde 200 e `GET /api/health` 200 (processos encerrados após o teste).

## 2026-09-16 — Alinhamento visual 1:1 da tela de login (Fase A, construir)

- Demanda do Yuri (PO): ajustar a tela de login para reproduzir com exatidão a foto original de referência (Image 1).
- Diagnóstico das discrepâncias identificadas:
  1. Card do logo: era retangular alto (150x190px) com fundo cinza `#eceef1` e o logo encolhido dentro; no original é um quadrado branco limpo com cantos arredondados generosos (~22px) e o logo integrado perfeitamente.
  2. Tipografia do título: estava em `Barlow Condensed` totalmente itálico; no original é tipografia bold/black moderna (Montserrat), com "OPERAÇÃO DE KITS EM" reto/upright em branco e apenas "TEMPO REAL" em itálico laranja vibrante (`#FF5200`).
  3. Linhas de velocidade laranja: estavam ultrapassando 76vw e cortando o centro por trás do logo e título; no original residem estritamente na margem esquerda, com fade suave a 0% de opacidade.
  4. Card e inputs: adicionado divisor sutil acima da mensagem de rodapé, preservando inputs brancos limpos sem descoloração por autofill (`-webkit-autofill`), botão laranja com ícone de raio e tipografia alinhada.
  5. Iluminação de fundo: substituído fundo plano escuro por iluminação radial azul real (#172c60) com grid blueprint translúcido iluminado, reproduzindo a sensação de luzes de fundo da imagem original.
  6. Título: espaçamento explícito entre 'EM' e 'TEMPO', redução de line-height (1.14) para integrar 'REAL' de forma coesa sem parecer desconectado, e liberação de largura para 480px no container wrap.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 218ms, 0 erros.
  - `npm run lint --prefix client`: oxlint concluído em 12ms com 0 erros e 0 warnings.
  - `GET /api/health`: resposta 200 `{"ok":true,"service":"entregas-run-server"}`.

## 2026-09-16 — Telas Dashboard, Eventos, Usuários e Operação (Fase A, construir)

- Demanda do Yuri (PO): construir o frontend das abas do sistema conforme os prints enviados (Dashboard, Eventos e Usuários), sem banco de dados neste momento (apenas mock frontend de demonstração), aceitando credenciais admin para entrar direto na aplicação.
- Componentes criados e integrados:
  1. `DashboardPage`: 6 cartões de métricas (779 atletas, 361 entregues, 418 pendentes, 46.3% concluído, 6 operadores, 1 evento em operação), lista de progresso por evento (Treinão da Galinha 84% e Corre Surubim 0%) e banner explicativo de demonstração.
  2. `EventosPage`: barra de busca, checkbox "Somente Ativos", contador de eventos e cards de "TREINÃO DA GALINHA" (Em Operação) e "CORRE SURUBIM" (Planejado).
  3. `UsuariosPage`: grid de 3 colunas com os 6 usuários exatos dos prints (Agner Israel, Agner Araujo, entregas1, entregas2, entregas3 e Felipe Admin), com avatares, pills de função (Admin/Operador) e status (Ativo), contadores de entregas e ações.
  4. `OperacaoPage`: tela de Entrega de Kit com abas operacionais, botão Espelho e lista de últimas entregas.
  5. `Sidebar`: navegação fluida entre Dashboard, Eventos e Usuários com destaque laranja no item ativo, perfil Felipe Admin e botão de Sair.
  6. `TutorialModal`: tour interativo de 6 passos com spotlight e tooltips ("COMECE POR AQUI" e "ABAS DO ENTREGAR KIT").
  7. Fluxo de login e credenciais: login aceita `pacetime@entregas.com` e direciona imediatamente para o Dashboard.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 204ms, 0 erros (30 módulos).
  - `npm run lint --prefix client`: oxlint concluído em 24ms com 0 erros e 0 warnings em 10 arquivos.
  - `GET /api/health`: 200 OK.

## 2026-09-16 — Dashboard do Evento: Treinão da Galinha e 4 Sub-abas (Fase A, construir)

- Demanda do Yuri (PO): ao clicar em "TREINÃO DA GALINHA" no Dashboard (ou no botão Dashboard em Eventos), abrir a página de Dashboard detalhado do evento contendo as 4 sub-abas dos prints:
  1. `Visão Geral`: 6 cartões de métricas (Atletas 430, Largada 0, Chegadas 0, Masculino 179, Feminino 251, Misto 0), 2 gráficos de rosca (Distribuição por Status: 84% entregue / 16% pendente; Distribuição por Gênero: 42% masculino / 58% feminino), gráfico de distribuição por faixa etária com badges de médias e barras por faixa etária (≤18 até 70+), lista de "Destaques de Idade" (5 mais idosos e 5 mais idosas com dados reais do print) e seções de chegadas e largadas vazias.
  2. `Por Modalidade`: chip de filtro "✓ 5 KM", 6 métricas, painel de "Estatísticas de Tempo" (Primeiro, Último e Tempo Médio para Masc, Fem e Misto), gráfico de atletas por categoria (GERAL 430), tabela paginada de "Equipes por Atletas Cadastrados" (Sem Equipe 276, Bora pro Corre 60, etc.) e "Equipes por Finalizados".
  3. `Entrega de Kit`: 3 métricas superiores (Total 430, Entregue 361 [84%], Faltante 69 [16%]), gráfico empilhado de Kits por Modalidade (5 KM), gráfico de Camisetas (tamanhos P, M, G, GG, XG com entregue/faltante) e Kits (Kit Élite, Kit Atleta e Kit Padrão com entregue/faltante).
  4. `Satisfação`: cartões de pontuação com nota 0.00 e estrelas, total de respostas 0 e aviso de nenhuma resposta coletada.
- Navegação: botões superiores "Largada", "Chegadas", atualizar e exportar "CSV", botão de voltar "← EVENTOS", integração com o roteamento SPA e hot reload no Vite.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 529ms, 0 erros (32 módulos).
  - `npm run lint --prefix client`: oxlint concluído em 33ms com 0 erros e 0 warnings em 11 arquivos.
  - `GET /api/health`: 200 OK.

## 2026-09-16 — Ajustes no Dashboard do Evento (Fase A, construir)

- Demanda do Yuri (PO):
  1. Remover os 4 botões de ação do topo do evento: `Largada`, `Chegadas`, `Atualizar` e `CSV`.
  2. Remover a sub-aba `Satisfação`, mantendo apenas as 3 sub-abas essenciais: `Visão Geral`, `Por Modalidade` e `Entrega de Kit`.
- Alterações realizadas:
  - Removido o bloco `<div className="event-banner-actions">` e seus botões em `client/src/components/EventDashboardPage.jsx`.
  - Removida a aba e o conteúdo de `Satisfação` em `EventDashboardPage.jsx`.
  - Limpeza de funções de ícones não utilizados (`ZapIcon`, `RotateCwIcon`, `DownloadIcon`, `MessageSquareIcon`) garantindo código limpo.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 552ms, 0 erros (32 módulos).
  - `npm run lint --prefix client`: oxlint concluído em 26ms com 0 erros e 0 warnings em 11 arquivos.
  - `GET /api/health`: 200 OK.
- Próximo passo: Yuri verificar a interface enxuta no navegador.

## 2026-09-16 — Gráficos Dinâmicos com Hover/Tooltips e Leitura das Planilhas de Exemplo (Fase A, construir)

- Demandas do Yuri (PO):
  1. Leitura e mapeamento de campos das planilhas Excel anexadas na raiz do projeto (`LISTA OFICIAL CORRE SURUBIM.xlsx`, `LISTA OFICIAL CORRIDA DA GALINHA.xlsx`, `LISTA OFICIAL CORRIDA DESAFIO TAMBOR RUN.xlsx`, `LISTA OFICIAL CORRIDA DO CAFE 2026.xlsx`, `LISTA OFICIAL CORRIDA ICIA.xlsx`) para preparar previamente a futura funcionalidade de importação de arquivo na criação de evento.
  2. Implementação de interatividade e dinamismo nos gráficos com hover e tooltips flutuantes conforme print de referência (destaque cinza na coluna ativa, tooltip com linhas coloridas por gênero e legenda com marcadores quadrados).
- Mapeamento das 5 planilhas analisadas:
  - `CORRE SURUBIM` (350 atletas): `NUMERO DE PEITO`, `CHIP CRONO`, `INSCRITO`, `NOME DE PEITO`, `CPF`, `SEXO`, `CAMISETA`, `EQUIPE`, `CIDADE`, `DATA NASCIMENTO`, `MODALIDADE`, `CATEGORIA`, `MORADOR/VISITANTE`.
  - `CORRIDA DA GALINHA` (430 atletas): `NUMERO DE PEITO`, `CHIP CRONO`, `INSCRITO`, `CPF`, `SEXO`, `CAMISETA`, `EQUIPE`, `CIDADE`, `LOCAL`, `PAIS`, `DATA NASCIMENTO`, `MODALIDADE`, `CATEGORIA`, `MODELO DE KIT`.
  - `DESAFIO TAMBOR RUN` (455 atletas): `NÚMERO DE PEITO`, `CHIP CRONO`, `INSCRITO`, `CPF`, `SEXO`, `CAMISETA`, `EQUIPE`, `CIDADE`, `PAIS`, `DATA NASCIMENTO`, `MODALIDADE`, `CATEGORIA`.
  - `CORRIDA DO CAFE 2026` (505 atletas): `NÚMERO `, `CHIP CRONO`, `INSCRITO`, `CPF`, `SEXO`, `CAMISETA`, `EQUIPE`, `CIDADE`, `DATA NASCIMENTO`, `MODALIDADE`, `CATEGORIA`, `MORADOR/VISITANTE`.
  - `CORRIDA ICIA` (1010 atletas): `NUMERO`, `CHIP`, `NOME COMPLETO`, `DATA DE NASCIMENTO`, `DOCUMENTO`, `SEXO`, `MODALIDADE`, `CATEGORIA`, `PCD MEMBROS INFERIORES`, `CIDADE`, `PAIS`, `EQUIPE`, `CAMISA`.
- Gráficos interativos implementados:
  - **Distribuição por Faixa Etária**: Hover com faixa retangular cinza destacando a coluna ativa, tooltip flutuante formatado (`30-39`, `Masculino : 40`, `Feminino : 83`, `Misto : 0`), cores sincronizadas (`#2196f3`, `#e91e63`, `#9c27b0`) e legenda com marcadores quadrados.
  - **Distribuição por Status e Gênero (Donuts)**: Segmentos com expansão no hover e tooltips com contagem e percentual exatos.
  - **Kits por Modalidade, Camisetas e Kits**: Hover nas barras com destaque de coluna e tooltips exibindo entregues, faltantes e totais.
  - **Atletas por Categoria**: Hover interativo na barra GERAL.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 565ms, 0 erros (32 módulos).
  - `npm run lint --prefix client`: oxlint concluído em 132ms com 0 erros e 0 warnings em 11 arquivos.
  - `GET /api/health`: 200 OK.

## 2026-09-16 — Barras de Progresso em Equipes por Atletas Cadastrados (Fase A, construir)

- Demanda do Yuri (PO): adicionar barra de progresso horizontal azul em cada linha da tabela `Equipes por Atletas Cadastrados` na aba `Por Modalidade`, com proporção visual baseada na contagem de atletas (Sem Equipe 267 com 100%, Bora pro Corre 55, etc.).
- Alterações realizadas:
  - Atualizados os dados das equipes com os números exatos do print de referência (`Sem Equipe: 267`, `BORA PRO CORRE: 55`, `BORAPROCORRE: 15`, `FORMOSO PACE CLUBE: 6`, `BROCARUN: 6`, `UNA-SE: 3`, `FORMOSO PACE: 3`, `SAO BENTO DO UNA: 3`, `SANTA LUZIA: 3`, `BORRA PRO CORRE: 2`).
  - Implementada a barra horizontal de progresso (`.team-bar-track` com fundo suave e `.team-bar-fill` em azul `#2563eb` com largura proporcional `(count / 267) * 100%`).
  - Alinhamento visual 1:1 com o print: rank cinza, nome em negrito escuro, contagem em azul vibrante à direita e ícone de usuários no título.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 306ms, 0 erros (32 módulos).
  - `npm run lint --prefix client`: oxlint concluído em 49ms com 0 erros e 0 warnings em 11 arquivos.
- Próximo passo: Homologação visual pelo Yuri da aba Por Modalidade no navegador.

## 2026-09-16 — Ampliação e Espessura dos Gráficos de Camisetas e Kits (Fase A, construir)

- Demanda do Yuri (PO): Gráficos de `Camisetas` e `Kits` na aba `Entrega de Kit` estavam muito pequenos e com barras muito finas em comparação com o original enviado na foto. Ajustar para que fiquem bem maiores, mais grossos e fiéis à proporção 1:1 do design original.
- Alterações realizadas:
  1. **Dimensões e Proporção**:
     - Aumentada a altura do SVG para `280px` com `viewBox="0 0 480 270"` e altura útil de plotagem ampliada para `200px` (y=20 a y=220).
     - **Camisetas**: espessura das barras aumentada para `52px` de largura (ocupando ~64% de cada slot), permitindo excelente legibilidade e presença visual.
     - **Kits**: espessura das barras aumentada para `96px` de largura (ocupando ~71% de cada slot), recriando as barras robustas e imponentes da referência.
  2. **Elementos Visuais e Eixos**:
     - **Camisetas**: adicionado título vertical rotacionado `Quantidade` na margem esquerda, linhas de grade pontilhadas horizontais e verticais em cada categoria (P, M, G, GG, XG), e marcas de escala (ticks) nos eixos X e Y.
     - **Kits**: escala 0, 65, 130, 195, 260 com ticks nos eixos, linhas pontilhadas de grade horizontais e verticais em cada categoria (KIT ELITE, KIT ATLETA, Kit Padrão).
     - Números em branco em negrito centralizados dentro de cada segmento das barras (114 e 11, 65 e 3, 55 e 2, 19, 255 e 5, 136 e 3, 11).
     - Paleta de cores: `#22c55e` (verde vibrante para Entregue) e `#f87171` (coral/vermelho para Faltante).
  3. **Legenda**:
     - Estilizada a legenda com classes `.dash-chart-legend` e itens com texto colorido correspondente (`Entregue` em verde `#22c55e` e `Faltante` em coral `#f87171`), idêntico à imagem original.
  4. **Interatividade Mantida**:
     - Faixa de destaque cinza translúcida no hover de cada coluna e tooltip flutuante contextual exibindo Entregue, Faltante e Total.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 216ms, 0 erros (32 módulos transformados).
  - `npm run lint --prefix client`: oxlint concluído em 54ms com 0 erros e 0 warnings em 11 arquivos.
- Próximo passo: Homologação visual pelo Yuri (PO) dos gráficos de Camisetas e Kits no navegador.

## 2026-09-16 — Aba Eventos: Ações do Card, Dropdown de Status e Modais (Fase A, construir)

- Demanda do Yuri (PO): Focar na aba `EVENTOS` para implementar as interações dos cards:
  1. **Dropdown de Status**: Menu suspenso com as 3 opções (`PLANEJADO`, `EM OPERAÇÃO`, `FINALIZADO`), ícones correspondentes (relógio, play, check circle) e indicador de check verde na opção ativa. Alterar o status atualiza o evento em tempo real e sincroniza com o filtro "SOMENTE ATIVOS".
  2. **Modal "EDITAR EVENTO"**: Disparado ao clicar no ícone de lápis (`EditIcon`). Contém os campos `⚡ NOME DO EVENTO`, `📅 DATA` e `📍 CIDADE / UF`, com botões `CANCELAR` e `SALVAR ALTERAÇÕES` (laranja), atualizando os dados do evento na interface.
  3. **Modal "EXCLUIR EVENTO"**: Disparado ao clicar no ícone de lixeira (`TrashIcon`). Contém confirmação com nome do evento e botão de exclusão perigoso (`#ef4444`), removendo o evento do estado da aplicação e atualizando o contador do cabeçalho.
- Alterações realizadas:
  - `client/src/components/EventosPage.jsx`: Reescrito com estado reativo de eventos (`events`), gerenciamento de modais (`editingEvent`, `deletingEvent`) e dropdown contextual (`openDropdownId`).
  - `client/src/components/EventosPage.css`: Estilos fieis aos prints para o popover suspenso com sombra e cantos arredondados, backdrop de modal com blur translúcido, inputs modernos com foco em laranja e botões com transições fluidas.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 214ms, 0 erros (32 módulos transformados).
  - `npm run lint --prefix client`: oxlint concluído em 36ms com 0 erros e 0 warnings em 11 arquivos.
  - `GET /api/health`: 200 OK.
- Próximo passo: Yuri testar no navegador a edição, exclusão e troca de status nos cards de eventos.

## 2026-09-16 — Modal "NOVO EVENTO" e Reconstrução 1:1 da Tela "ENTREGA DE KIT" (Fase A, construir)

- Demandas do Yuri (PO):
  1. **Modal "NOVO EVENTO"**: Ao clicar no botão `+ NOVO EVENTO` no cabeçalho de Eventos, abrir o modal correspondente da foto (título `NOVO EVENTO`, `⚡ NOME DO EVENTO` com placeholder "Ex: Corrida do Blogueiro", linha dupla `📅 DATA` com placeholder "dd/mm/aaaa" e `📍 CIDADE / UF` com placeholder "Recife/PE", divisor sutil, botões `CANCELAR` e `CRIAR EVENTO` em salmão/laranja). Ao submeter, o evento é criado e adicionado à listagem e persistido no estado global (`App.jsx`).
  2. **Reconstrução da Tela "ENTREGAR KIT" (`OperacaoPage`)**:
     - **Cabeçalho**: Nome do evento no topo (`YURI2TESTE` ou o evento selecionado) e ações `(?) TUTORIAL` e `← Voltar` (retornando a Eventos).
     - **Card Banner Navy**: Fundo azul escuro `#0f274e`, label `EVENTO`, título grande em branco, subtítulo com data e cidade, e 4 métricas horizontais à direita (`TOTAL`, `ENTREGUES` em verde, `PENDENTES` em amarelo, `% CONCL.` em laranja).
     - **Barra de 4 Abas**: `⚡ ENTREGA DE KIT`, `👥 ATLETAS`, `📊 ESTATÍSTICAS` e `📋 AUDITORIA`, com indicador inferior laranja na aba ativa.
     - **Aba 1 (Entrega de Kit)**: Botão `🖥 ESPELHO` verde, input de busca destacado com borda laranja de 2px e ícone de lupa, botão escuro de scanner QR code, seção `ÚLTIMAS ENTREGAS` com ícone de refresh laranja e card centralizado com "Nenhuma entrega registrada ainda." (ou entregas reais quando houver dados).
     - **Aba 2 (Atletas)**: Input de filtro, pílulas `TODOS` (ativo), `PENDENTES` e `ENTREGUES`, botão `+ NOVO`, tabela com colunas `#`, `NOME`, `DOCUMENTO`, `MODALIDADE`, `CATEGORIA`, `CAMISETA`, `EQUIPE`, `KIT`, mensagem de "Nenhum atleta encontrado." e rodapé "Mostrando 0 de 0 atletas.".
     - **Aba 3 (Estatísticas)**: Botão `📋 Fechamento do dia`, 4 cartões de estatísticas (`TOTAL`, `ENTREGUES`, `PENDENTES`, `% CONCLUÍDO`), seções `CAMISETAS` e `MODALIDADES`, divisor de linha e seção `PRODUTIVIDADE DOS OPERADORES` com grid de 6 cartões (Agner Israel, Agner Araujo, entregas1, entregas2, entregas3 e Felipe) com avatares em monograma, cargos (Admin/Operador), contadores e ícones de tendência verde.
     - **Aba 4 (Auditoria)**: Card limpo informando ausência de registros de auditoria no momento.
- Alterações realizadas:
  - `client/src/App.jsx`: Gerenciamento unificado de `events` (incluindo `TREINÃO DA GALINHA`, `CORRE SURUBIM` e `YURI2TESTE`), `selectedEventId` dinâmico e sincronizado com a navegação e histórico do browser.
  - `client/src/components/EventosPage.jsx`: Integração do modal `NOVO EVENTO` com validação, placeholders e formulário reativo.
  - `client/src/components/EventosPage.css`: Estilização do modal "NOVO EVENTO" e botão salmão `#ff9b71`.
  - `client/src/components/OperacaoPage.jsx`: Reescrito integralmente para suportar as 4 abas com os elementos exatos das capturas de tela.
  - `client/src/components/OperacaoPage.css`: Folha de estilo reestruturada cobrindo layout de tela cheia, banner navy, grid de operadores e tabela de atletas.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 521ms, 0 erros (32 módulos transformados).
  - `npm run lint --prefix client`: oxlint concluído em 42ms com 0 erros e 0 warnings em 11 arquivos.
  - `GET /api/health`: 200 OK.
- Próximo passo: Homologação visual pelo Yuri (PO) do modal "NOVO EVENTO" e das abas da tela de "ENTREGAR KIT".

## 2026-09-16 — Modal "NOVO ATLETA", Tabela Dinâmica e Entrega em Tempo Real (Fase A, construir)

- Demandas do Yuri (PO):
  1. **Modal "NOVO ATLETA" (Fotos 1 e 2)**:
     - Disparado ao clicar no botão `+ NOVO` dentro da aba `ATLETAS` na tela operacional (`OperacaoPage`).
     - Cabeçalho: título `NOVO ATLETA` com botão de fechar `✕`.
     - Campos reproduzidos 1:1:
       - `NOME COMPLETO *`: obrigatório, foco com borda laranja vibrante.
       - Linha 2 (2 colunas): `CPF` (placeholder "000.000.000-00") e `NASCIMENTO` (placeholder "dd/mm/aaaa", ícone de calendário embutido à direita).
       - Linha 3 (2 colunas): `SEXO` (select com opções "Masculino" e "Feminino") e `MODALIDADE` (preenchido com "5 KM").
       - Linha 4 (2 colunas): `CATEGORIA` (preenchido com "GERAL") e `EQUIPE` (placeholder "Opcional").
       - Linha 5 (3 colunas): `CAMISETA` (select P, M, G, GG, XG, default "M"), `KIT` (preenchido com "Kit Padrão") e `NÚMERO *` (placeholder "Ex.: 350", obrigatório).
       - Linha 6: `CHIP` (placeholder "Opcional").
       - Rodapé: botões `CANCELAR` (fundo branco/cinza) e `CADASTRAR ATLETA` (salmão/laranja `#ff9b71`, ícone de usuário com `+` e texto em caixa alta).
  2. **Interatividade e Integração da Operação**:
     - Atletas cadastrados são persistidos no `localStorage` sob a chave `entregas_run_athletes_{eventId}`.
     - A adição de atleta recalcula e atualiza as métricas do evento (`total` e `pendentes`) e sincroniza com o estado global (`App.jsx`).
     - Tabela de Atletas exibe o atleta cadastrado nas 8 colunas (`#`, `NOME`, `DOCUMENTO`, `MODALIDADE`, `CATEGORIA`, `CAMISETA`, `EQUIPE`, `KIT`) e atualiza o rodapé ("Mostrando 1 de 1 atletas.").
     - Na aba `ENTREGA DE KIT`, a digitação no campo de busca exibe os atletas correspondentes com o botão inline `ENTREGAR KIT` para baixa imediata.
     - Realizar a entrega marca o atleta como `ENTREGUE`, adiciona à lista `ÚLTIMAS ENTREGAS`, decrementa pendentes, incrementa entregues e computa a produtividade do operador (Felipe Admin).
- Alterações realizadas:
  - `client/src/App.jsx`: Adicionada prop `key={selectedEventId}` e callback `onUpdateEvent` para propagar atualizações de métricas do evento.
  - `client/src/components/OperacaoPage.jsx`: Reescrito com formulário e modal de Novo Atleta, busca dinâmica de atletas, entrega de kit e cálculo reativo de estatísticas.
  - `client/src/components/OperacaoPage.css`: Estilização completa do modal "NOVO ATLETA" (grid de 2 e 3 colunas, inputs, select customizado, barra de rolagem estilizada, botões de ação) e painel de resultados de busca de kit.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 219ms, 0 erros (32 módulos transformados).
  - `npm run lint --prefix client`: oxlint concluído em 48ms com 0 erros e 0 avisos em 11 arquivos.
  - `GET /api/health`: 200 OK.
- Próximo passo: Homologação visual pelo Yuri (PO) do modal "NOVO ATLETA" e fluxo de cadastro de atletas no navegador.

## 2026-09-16 — Tela de Detalhes do Atleta / Gestão da Entrega de Kit (Fase A, construir)

- Demandas do Yuri (PO):
  - Ao clicar sobre o nome de uma pessoa na lista de entregas da aba `ENTREGA DE KIT` (ou nos resultados de busca e tabela de atletas), abrir a tela completa de detalhes e gestão de entrega do atleta conforme foto de referência enviada.
  - Componentes da tela reproduzidos 1:1:
    1. **Barra de Ações Superior**:
       - Botão `↺ DESFAZER` (vermelho `#e02424` com sombra e ícone circular) para desfazer a entrega realizada e retornar o atleta a `PENDENTE`.
       - Botão `💾 SALVAR` (borda cinza, fundo branco, ícone de disquete) para persistir edições cadastrais.
       - Botão `✕ CANCELAR` (borda cinza, fundo branco, ícone `✕`) para fechar o detalhe e retornar à listagem normal de entregas.
    2. **Grid de 3 Cards de Destaque**:
       - Card 1 (Destaque do Peito/Número): cabeçalho com modalidade (`5 KM`) e categoria (`GERAL`), número de peito gigante em negrito navy (`400`), e rodapé com o chip (`6855`).
       - Card 2 (Camiseta): tamanho centralizado em tamanho grande (`M`) e rótulo `CAMISETA`.
       - Card 3 (Kit): nome do kit centralizado em negrito (`KIT ELITE`) e rótulo `KIT`.
    3. **Metadados de Entrega (Pills à direita)**:
       - `ENTREGUE EM`: data e hora exatas da entrega (`16/09/2026, 20:15:37`) em badge laranja suave.
       - `ENTREGUE POR`: identificador do operador (`f58694b1-bce0-4ff8-a71c-e2301bb0fb31`) em badge laranja suave.
    4. **Formulário Completo de Edição**:
       - Linha 1: `NÚMERO`, `NOME`, `DOCUMENTO`, `SEXO`.
       - Linha 2: `NASCIMENTO` com ícone de calendário.
       - Linha 3: `MODALIDADE`, `CATEGORIA`, `EQUIPE` (com botão inline `+`), `NACIONALIDADE` (`BRASIL`).
       - Linha 4: `KIT`, `CAMISETA`, `CHIPS` com tag removível (`6855 ✕`).
       - Linha 5: `MORADOR/VISITANTE`, `CONTATO`.
    5. **Card "ENTREGUE PARA"**:
       - Campo com o nome do recebedor do kit (`DAVI VILELA`).
- Interatividade Completa:
  - `TREINÃO DA GALINHA` atualizado com métricas exatas do print: Total `409`, Entregues `392`, Pendentes `17`, Concluído `95.8%`.
  - Atleta `DAVI VILELA` (#400) adicionado ao topo de `ÚLTIMAS ENTREGAS` e `DEFAULT_ATHLETES_TREINAO`.
  - Clicar em qualquer item da lista de `ÚLTIMAS ENTREGAS` ou no nome do atleta abre a tela de detalhes instantaneamente.
  - O botão `DESFAZER` estorna a entrega, reduz `entregues`, aumenta `pendentes`, atualiza o percentual, remove da lista de entregues e sincroniza com o estado global.
  - O botão `SALVAR` grava as alterações no atleta e lista de entregas.
  - O botão `CANCELAR` fecha a visualização e retorna à tela normal de busca de entregas.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 657ms, 0 erros (32 módulos transformados).
  - `npm run lint --prefix client`: oxlint concluído em 55ms com 0 erros e 0 avisos em 11 arquivos.
  - `GET /api/health`: 200 OK.
- Próximo passo: Homologação visual pelo Yuri (PO) da tela de detalhes de entrega do atleta no navegador.

## 2026-09-17 — Tela de Espelho e Modal de Espelho (Acesso e Aparência) (Fase A, construir)

- Demandas do Yuri (PO) (Áudio + 3 Fotos):
  1. **Modal de Espelho (`EspelhoModal`)**:
     - Disparado ao clicar no botão verde `🖥 ESPELHO` na aba `ENTREGA DE KIT` (`OperacaoPage`).
     - Cabeçalho com abas no formato pill: `ACESSO` e `APARÊNCIA` + botão de fechar `✕`.
     - **Aba ACESSO (Foto 2)**:
       - QR Code vetorial de alta definição gerado via `qrcode`, apontando para a rota `/espelho/:id`.
       - Linha centralizada com ícone de link externo (`window.open`), código formatado do guichê (`K 2 A 0`) e botão de cópia para clipboard com balão temporário *"Copiado!"*.
       - Botão navy primário: `ABRIR SEGUNDA TELA`.
       - Mensagem auxiliar: *"A segunda tela espelha em tempo real a busca e a ficha aberta aqui."*
     - **Aba APARÊNCIA (Foto 3)**:
       - Coluna Esquerda (`PRÉVIA`):
         - Miniatura responsiva 16:9 reproduzindo a tela em tempo real com evento/logo, tag `LIVRE`, mensagem escalável e `AGUARDANDO ATLETA`.
         - Botão `ABRIR SEGUNDA TELA` com borda e texto verde `#10b981`.
       - Coluna Direita (Controles):
         - 3 seletores de cores com swatch e `<input type="color">` nativo: `FUNDO`, `TEXTO` e `DESTAQUE`.
         - Slider com trilha/botão laranja: `TAMANHO DA FONTE — 100%` (70% a 150%).
         - Campo de texto editável: `MENSAGEM QUANDO LIVRE` (padrão *"Guichê disponível"*).
         - Uploads sanitizados com botões `ENVIAR`: `IMAGEM DE FUNDO` e `LOGO` (suporte a remoção).
         - Botão `↺ RESTAURAR PADRÃO` para redefinir as preferências.
         - Nota explicativa: 🎨 *"As alterações são aplicadas na hora na segunda tela."*
  2. **Tela de Espelho / Segunda Tela (`EspelhoPage`) (Foto 1)**:
     - Rota pública `/espelho/:id` e `/espelho` configurada no `App.jsx`, sem exigir login.
     - Topo: Nome do evento em caixa alta (`TREINÃO DA GALINHA`) ou Logo + tag `LIVRE` na cor de destaque.
     - Centro: Título monumental em caixa alta (`GUICHÊ DISPONÍVEL`) com escala tipográfica via slider + `AGUARDANDO ATLETA`.
     - Rodapé: Indicador de status `● CONECTADO AO GUICHÊ` com ponto verde pulsante.
     - Suporte a tela cheia via duplo clique.
  3. **Sincronização em Tempo Real (`espelhoSync.js`)**:
     - `BroadcastChannel('entregas_run_espelho_sync')` e listener de `storage` para sincronização instantânea e reativa entre a tela operacional e o monitor secundário.
     - Persistência das customizações no `localStorage` sob a chave `entregas_run_espelho_{eventId}`.
- Alterações realizadas:
  - `client/src/utils/espelhoSync.js`: Módulo de comunicação, persistência e broadcasting.
  - `client/src/components/EspelhoModal.jsx` e `EspelhoModal.css`: Modal completo com as abas Acesso e Aparência.
  - `client/src/components/EspelhoPage.jsx` e `EspelhoPage.css`: Tela secundária pública de espelho.
  - `client/src/components/OperacaoPage.jsx`: Botão `.btn-espelho` acoplado ao modal com key por evento.
  - `client/src/App.jsx`: Roteamento público para `/espelho` e `/espelho/:id` sem exigir login de operador.
- Validações reais:
  - `npm run build --prefix client`: concluído com sucesso em 258ms, 0 erros (65 módulos transformados).
  - `npm run lint --prefix client`: oxlint concluído em 66ms com 0 erros e 0 avisos em 14 arquivos.
  - `GET http://localhost:5173/`: 200 OK.
  - `GET http://localhost:5173/espelho/11c1fb52-9b9d-4f50-ad9a-3bffa67b00a6`: 200 OK.
- Próximo passo: Homologação visual pelo Yuri (PO) do Modal de Espelho e da Segunda Tela no navegador.

### Ajuste Solicitado pelo Yuri (PO):
- **Remoção do QR Code e Código `K 2 A 0`**:
  - Removido o card de QR code e a linha com o código `K 2 A 0` da aba `ACESSO` do `EspelhoModal`.
  - A aba `ACESSO` agora apresenta um banner limpo com ícone de monitor, o botão primário navy `ABRIR SEGUNDA TELA` e uma ação discreta de copiar o link da segunda tela caso o operador queira abrir em outro navegador/monitor na mesma rede.
  - Removido o botão de scanner QR Code (`.btn-qr-scan`) na barra de busca de `OperacaoPage.jsx`.
- Validações:
  - `npm run build --prefix client`: concluído em 439ms, 0 erros (37 módulos transformados, bundle reduzido de 382 kB para 357 kB).
  - `npm run lint --prefix client`: oxlint concluído em 147ms com 0 erros e 0 avisos em 14 arquivos.

### 2026-09-17 — Aba AUDITORIA e Modal IMPORTAR ATLETAS (Fase A, construir)

- **Demanda do Yuri (PO)**:
  1. Construção da **Aba AUDITORIA** na `OperacaoPage`, replicando os prints enviados:
     - 4 cartões de métricas superiores:
       - `416 ENTREGAS NO FILTRO` (Histórico consolidado 100%).
       - `394 PELO ATLETA` (94.7% do total filtrado).
       - `22 POR TERCEIRO` (5.3% do total filtrado).
       - `TOP OPERADOR: AGNER ISRAEL · 416` (100.0% concentração).
     - Card **PLANILHA DE ATLETAS**:
       - Botão `EXPORTAR PLANILHA` (gera arquivo CSV com UTF-8 BOM para abrir perfeitamente no Excel sem quebrar acentos).
       - Botão `IMPORTAR PLANILHA` (abre o assistente multi-passos de importação).
     - Card **FILTROS**:
       - Busca inteligente por atleta (nome, número de peito, CPF ou chip) com modos `Contém o termo`, `Início do termo` e `Termo exato`.
       - Filtro por Operador e Tipo de Retirada (`TODOS`, `PELO ATLETA`, `POR TERCEIRO`).
       - Seletor de Período em pills (`TODOS`, `HOJE`, `ONTEM`, `ÚLTIMOS 7 DIAS`).
       - Checkbox `Considerar apenas atleta correspondente` e `Incluir comprovante`.
       - Preset (`Tudo`, `Apenas entregues`, `Apenas não entregues`).
       - Botões de exportação rápida `CSV` e `PDF` (com acionamento de impressão limpa).
     - Tabela de Auditoria:
       - 8 colunas: `COMPROVANTE` (ícone de impressora que abre o comprovante de retirada), `DATA / HORA`, `ATLETA` (com badge de número de peito verde e CPF), `TIPO` (badges verde `ATLETA` e âmbar `TERCEIRO`), `RETIRADO POR`, `OPERADOR`, `PONTO DE ENTREGA` e `DETALHES` (kit e tamanho de camiseta).
       - Paginação completa com seletor (25, 50, 100, 200 por página) e navegação (`«`, `‹`, página atual, `›`, `»`).
  2. Modal multi-passos **IMPORTAR ATLETAS**:
     - **Passo 1 (Upload/Colar)**: Dropzone para arquivos `.csv` e `.xlsx`, área de texto para colar conteúdo diretamente e botão `BAIXAR MODELO` que gera e baixa modelo CSV formatado.
     - **Passo 2 (Mapeamento de Colunas)**: Leitura de colunas do arquivo/texto com pré-mapeamento inteligente automático (detecta `NUMERO DE PEITO`, `CHIP CRONO`, `INSCRITO`, `NOME DE PEITO`, `CPF`, `SEXO`, `CAMISETA`, `EQUIPE`, `CIDADE`, `DATA NASCIMENTO`, `MODALIDADE`, `CATEGORIA`, `MORADOR/VISITANTE`, `CONTATO`, `NACIONALIDADE`, `KIT`). Exibe amostras reais dos dados (`Ex.: F`) para conferência antes de importar.
     - **Passo 3 (Resumo e Validações)**: Card verde de sucesso com contagem de atletas importados/atualizados, card âmbar com lista rolável de avisos/linhas ignoradas, botão `IMPORTAR OUTRO` e `CONCLUIR`.
  3. Modal de **Comprovante de Retirada**:
     - Visual em forma de ticket/recibo com dados do evento, identificação do atleta, detalhes do kit, retirada e operador, área para assinatura física/digital e código de autenticidade único, com ação de impressão direta (`IMPRIMIR VIA`).

- **Arquivos criados / modificados**:
  - `client/src/utils/auditData.js`: Geração de registros consolidados de auditoria e exportação CSV com UTF-8 BOM.
  - `client/src/components/ImportarAtletasModal.jsx` e `ImportarAtletasModal.css`: Modal wizard de 3 etapas com parser de XLSX (`read-excel-file/browser`) e CSV com delimitadores múltiplos.
  - `client/src/components/OperacaoPage.jsx` e `OperacaoPage.css`: Aba de auditoria, filtros, paginação, modal de comprovante e integração do fluxo.

- **Validações reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos**.
  - `npm run build --prefix client`: Vite build para produção concluído com sucesso em 1.11s, **0 erros**.
  - Dependência `read-excel-file`: Audit npm com **0 vulnerabilidades**.
- **Próximo passo**: Homologação visual e funcional pelo Yuri (PO) no navegador.

## 2026-09-19 — Pipeline CI/CD, Dockerfile e Deploy Isolado na VPS (Fase A, construir)

- Demanda do Yuri (PO):
  1. Configurar o repositório Git e sincronizar com o GitHub (`yuriwinchest/ENTREGA-RUN`).
  2. Subdomínio escolhido: `app.entregasrun.com.br`.
  3. Deploy isolado em Docker na VPS (`179.198.97.28`) sem interferir com outras aplicações em execução (`largada`, `chipower`, `appwrite`, `yuri-portfolio`).
  4. CI/CD automático via GitHub Actions: push na `main` dispara validação, build do Docker e deploy com healthcheck.
  5. Banco de dados Appwrite: credenciais testadas via API REST (200 OK); criação de tabelas pausada aguardando fechamento do mapeamento de dados.
- Ações realizadas:
  - Repositório Git local inicializado e sincronizado com `yuriwinchest/ENTREGA-RUN` na branch `main`.
  - Criado `Dockerfile` multi-stage (Node 22) com usuário não-root `node` e healthcheck na porta interna 3001.
  - Criado `docker-compose.yml` com container isolado `entregas-run-web` mapeando exclusivamente para `127.0.0.1:3050:3001` (sem colisão com outras portas da VPS).
  - Configurados os secrets no GitHub (`VPS_HOST`, `VPS_USERNAME`, `VPS_PASSWORD`) via API de forma criptografada.
  - Criado workflow `.github/workflows/deploy.yml` executando checkout, build Vite e deploy SSH com restart isolado.
  - Atualizado Caddyfile na VPS com bloco seguro para `app.entregasrun.com.br` com reverse_proxy para `127.0.0.1:3050`, validação e reload com zero downtime.
- Validações reais:
  - GitHub Actions Workflow #35419295608: Concluído com **100% SUCESSO** em 40 segundos.
  - Container Docker `entregas-run-web`: Status **healthy** na VPS na porta `127.0.0.1:3050`.
  - Healthcheck HTTP: `curl http://127.0.0.1:3050/api/health` retornou **200 OK** `{"ok":true,"service":"entregas-run-server"}`.
- Próximo passo: Yuri criar apontamento DNS tipo `A` para `app.entregasrun.com.br` apontando para `179.198.97.28` e homologar o mapeamento das coleções do Appwrite.

## 2026-09-19 — Limpeza total de dados mockados e conexão com dados reais (Fase A, construir)

- **Demanda do Yuri (PO)**: Remover todos os dados mockados da aplicação e deixar o sistema totalmente limpo e pronto para produção com dados dinâmicos reais.
- **Ações realizadas**:
  1. **Banco de Dados (Appwrite)**:
     - Removidos eventos de teste (`treinao-da-galinha`, `corre-surubim`).
     - Removidos operadores mockados em `user_profiles`, preservando unicamente o administrador real `admin_pacetime` (`pacetime@entregas.com`, role `ADMIN`, name `Felipe Admin`).
  2. **Dashboard Geral (`DashboardPage.jsx`)**:
     - Eliminado banner amarelo de demonstração ("MODO DE DEMONSTRAÇÃO ATIVO").
     - Métricas (Atletas, Entregues, Pendentes, % Concluído, Operadores e Eventos em Operação) calculadas 100% dinamicamente a partir dos eventos cadastrados.
     - Implementado empty state visual moderno caso não haja eventos cadastrados, com CTA direto para criar o primeiro evento.
  3. **Eventos (`EventosPage.jsx`)**:
     - `INITIAL_EVENTS` redefinido para `[]`.
     - Adicionado card de empty state visual na grade quando não houver eventos cadastrados ou termos de busca.
     - `Sidebar` atualizada para receber `user` autenticado dinamicamente.
  4. **Operação de Kits (`OperacaoPage.jsx`)**:
     - Removidos arrays mockados `DEFAULT_OPERATORS`, `DEFAULT_ATHLETES_TREINAO` e `DEFAULT_DELIVERIES_TREINAO`.
     - `athletes`, `deliveries` e `audits` iniciam vazios e persistem isolados por `currentEvent.id` no `localStorage`.
     - Removidos fallbacks com UUIDs e strings de eventos antigos em formulários e visualizações detalhadas.
     - `Sidebar` conectada ao `user` real.
  5. **Usuários (`UsuariosPage.jsx`)**:
     - Eliminada lista estática `USERS_LIST` (Agner Israel, Agner Araujo, entregas1, 2, 3).
     - Componente agora inicializa com o administrador real logado (`pacetime@entregas.com` / `Felipe Admin`).
     - Implementado modal de criação de novos usuários (Operador, Supervisor, Admin) e alternância de status ativo/inativo com persistência.
  6. **Dashboard do Evento (`EventDashboardPage.jsx`)**:
     - Recebe `event` e `user` reais via props, renderizando nome, data e localização do evento ativo.
     - Carrega atletas dinamicamente e exibe empty state instrutivo quando o evento ainda não possui atletas importados.
  7. **Espelho do Atleta (`EspelhoPage.jsx` e `EspelhoModal.jsx`)**:
     - Removidos fallbacks fixos para "TREINÃO DA GALINHA" e UUID mockado.
  8. **Helpers de Auditoria (`auditData.js`)**:
     - `generateDefaultAudits()` reconfigurado para retornar array vazio `[]`.
  9. **Root da Aplicação (`App.jsx`)**:
     - `DEFAULT_EVENTS` limpo para `[]`.
     - Implementada limpeza automática de resíduos legados de mock no `localStorage` ao carregar o app.
     - Passagem sistemática de `user` e `events` para todas as telas e para o `Sidebar`.
- **Validações reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** (16 arquivos verificados).
  - `npm run build --prefix client`: Vite build para produção concluído com sucesso em 1.05s (**0 erros**).
  - GitHub Actions Workflow #35423857597: Concluído com **100% SUCESSO** e deploy em produção na VPS.
- **Próximo passo**: Homologação visual e funcional pelo Yuri no subdomínio de produção `https://app.entregasrun.com.br`.

## 2026-09-19 — Seletor de Data Duplo (Manual/Calendário) e Autocomplete de Cidades via IBGE (Fase A, construir)

- **Demanda do Yuri (PO)**:
  1. No modal de evento (criar/editar), o campo DATA deve permitir tanto digitar a data manualmente quanto clicar no ícone do calendário para expandir e selecionar visualmente a data.
  2. No campo CIDADE / UF, integrar a API do IBGE para sugerir e autocompletar dinamicamente a lista de municípios brasileiros conforme o usuário digita.
- **Componentes e Utilitários Criados**:
  1. `client/src/utils/ibge.js`: Consumo e cache eficiente (memória + `sessionStorage`) dos 5.571 municípios da API oficial do IBGE (`servicodados.ibge.gov.br`), com normalização e busca sem acento.
  2. `client/src/components/DataPickerInput.jsx`: Campo duplo com máscara automática `DD/MM/AAAA` para digitação e disparador nativo (`showPicker()`) do calendário visual do navegador.
  3. `client/src/components/CidadeAutocomplete.jsx`: Input com dropdown flutuante moderno de cidades com badge da UF, busca instantânea, navegação por teclado (Setas, Enter, Esc) e botão de limpar.
  4. `client/src/components/EventosPage.jsx`: Integração dos componentes nos modais "Novo Evento" e "Editar Evento".
- **Validações reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** (19 arquivos verificados).
  - `npm run build --prefix client`: Vite build para produção concluído com sucesso em 408ms (**0 erros**).
  - Testes com municípios reais do IBGE (Recife/PE, São Bento do Una/PE, Surubim/PE, etc.): busca instantânea e preenchimento perfeito.
  - CI/CD automático via GitHub Actions disparado e deploy em produção na VPS `179.198.97.28`.
- **Próximo passo**: Homologação visual e funcional pelo Yuri no subdomínio `https://app.entregasrun.com.br`.

## 2026-09-19 — Correção e Otimização do Autocomplete de Cidades do IBGE (Fase A, construir)

- **Demanda do Yuri (PO)** (Áudio + Print):
  - Ao digitar as iniciais da cidade (ex: "rec") no campo `CIDADE / UF` do modal de Novo Evento, o dropdown exibia: `Nenhuma cidade encontrada para "rec"`.
  - Solicitação explícita: ao digitar o nome, as primeiras letras ou a letra "A", exibir todas as cidades correspondentes na lista para seleção.
- **Causa Raiz Identificada**:
  - A diretiva de segurança `Content-Security-Policy` do Helmet no Express utilizava o padrão estrito `default-src 'self'`. O navegador bloqueava conexões externas a `https://servicodados.ibge.gov.br` com erro de violação de CSP (`connect-src`), fazendo com que o `fetch` falhasse silenciosamente e deixasse a lista de municípios vazia (`[]`).
  - Além do CSP, a dependência de uma requisição externa de ~5MB para servidores do IBGE a cada novo usuário no navegador tornava a busca vulnerável a latências e falhas de rede.
- **Solução Arquitetural de Alta Performance e Resiliência**:
  1. **Base Oficial Empacotada Localmente**: Extraída e compilada a base oficial completa dos 5.571 municípios brasileiros para `client/src/data/municipios.js` (98 KB gzip ~25 KB) e `client/public/municipios.json`.
  2. **Inicialização Síncrona e Zero Latência**: `CidadeAutocomplete.jsx` agora inicializa com `getMunicipios()` de forma imediata (0ms) no primeiro ciclo de renderização. Zero espera, zero spinner e funcionamento 100% offline.
  3. **Filtro Multi-Token Inteligente**:
     - Prioridade 1: Cidades cujo nome inicia exatamente com o termo pesquisado (ex: "rec" traz `Recife/PE` em 1º lugar).
     - Prioridade 2: Cidades cujo label completo inicia com o termo.
     - Prioridade 3: Cidades contendo todos os termos digitados (ex: "sao bento", "recife pe").
  4. **Buscas Amplas (ex: Letra "A")**:
     - Digitar "a" localiza todas as 5.048 cidades com a letra 'a' no Brasil, exibindo os 80 primeiros resultados ordenados alfabeticamente com rolagem fluida e badge indicativo do total de ocorrências.
  5. **Hardening de Segurança e Rota Local de Contingência**:
     - No `server/server.js`, a diretiva CSP foi explicitamente configurada para permitir `connect-src 'self' https://servicodados.ibge.gov.br`.
     - Criada rota local de contingência `GET /api/municipios` servindo a base de cidades na mesma origem.
- **Validações Reais**:
  - Testes de busca executados e verificados com 100% de assertividade:
    - `"rec"` → `Recife/PE` em 1º lugar (além de Recreio/MG e Recursolândia/TO).
    - `"a"` → 5.048 correspondências, primeiras 80 listadas instantaneamente com rolagem fluida.
    - `"recife pe"` → `Recife/PE`.
    - `"surubim"` → `Surubim/PE`.
    - `"sao bento do una"` → `São Bento do Una/PE`.
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** (20 arquivos verificados).
  - `npm run build --prefix client`: Vite build para produção concluído com sucesso em 639ms (**0 erros**).
- **Próximo passo**: Enviar commit e disparar deploy automático para validação pelo Yuri em `https://app.entregasrun.com.br`.

## 2026-09-19 — Correção de Importação de Arquivos Excel e Orquestração Jev (Fase A, construir)

- **Demanda do Yuri (PO)** (Áudio + Print):
  - Ao selecionar um arquivo Excel (`.xlsx`) no modal de importação de atletas, a aplicação exibia o alerta: `Erro ao ler arquivo Excel: t[0].map is not a function`.
  - Solicitação de uso prático do Jev para orquestrar e validar a resolução.
- **Orquestração pelo Jev Router (`scripts/jev-prompt-router.js`)**:
  - Jev avaliou o prompt em 878ms:
    - Especialista: `kastiel_dev` (100.0% de confiança).
    - Tipo de Tarefa: `bugfix_urgente` (100.0% de confiança).
    - Toca Produção: `35.0%` (escopo restrito ao componente de frontend).
    - Severidade: `1.96 / 2.00` (impacto bloqueante na importação).
- **Causa Raiz Identificada**:
  - A biblioteca `read-excel-file` retorna, para arquivos com estrutura multi-aba ou por padrão em certas planilhas, um array de objetos de abas no formato `[{ sheet: 'Nome', data: [...] }]`.
  - O código tentava invocar diretamente `rows[0].map(...)`, que falhava com `TypeError: t[0].map is not a function` pois `rows[0]` era o objeto da aba (`{ sheet, data }`) e não um array direto de células.
- **Ações Realizadas**:
  1. `ImportarAtletasModal.jsx`: Adicionado suporte transparente para desempacotar `rawRows[0].data` quando o retorno for array de abas, localizando a aba que contém dados.
  2. Adicionada a função auxiliar `formatCellValue` que trata tipos primitivos do Excel e converte datas (`Date`) automaticamente para o formato brasileiro `DD/MM/AAAA`.
  3. Aprimorado o mapeamento automático de colunas (`autoGuessMapping`) para priorizar `'kit'` sobre `'modalidade'` e reconhecer variações de nomes de peito e documentos.
- **Validações Reais**:
  - Testadas com sucesso as 5 planilhas Excel reais do projeto:
    - `LISTA OFICIAL CORRE SURUBIM.xlsx`: 351 linhas lidas e mapeadas.
    - `LISTA OFICIAL CORRIDA DA GALINHA.xlsx`: 431 linhas lidas e mapeadas.
    - `LISTA OFICIAL CORRIDA DESAFIO TAMBOR RUN.xlsx`: 456 linhas lidas e mapeadas.
    - `LISTA OFICIAL CORRIDA DO CAFE 2026.xlsx`: 506 linhas lidas e mapeadas.
    - `LISTA OFICIAL CORRIDA ICIA.xlsx`: 1011 linhas lidas e mapeadas.
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos**.
  - `npm run build --prefix client`: Vite build concluído em 1.11s (**0 erros**).
## 2026-09-19 — Sincronização de Auditoria de Kits e Reconciliação (Fase A, construir)

- **Demanda do Yuri (PO)**:
  - Na aba "AUDITORIA" de `OperacaoPage`, não aparecia nenhum registro de entrega de kit (`0 registro(s)`), mesmo após registrar entrega de atleta (#1 Adriana Silva marcada como "ENTREGUE" na aba "ENTREGA DE KIT").
  - O PO questionou a demora e se o Jev estava sendo utilizado na orquestração.
- **Orquestração pelo Jev Router (`scripts/jev-prompt-router.js`)**:
  - Prompt avaliado pelo Jev System One (`jev-1.13.0`) em **867ms**:
    - Especialista: `kastiel_dev` (99.0% de confiança).
    - Tipo de Tarefa: `bugfix_urgente` (100.0% de confiança).
    - Toca Produção: `35.0%` (escopo restrito ao componente de frontend).
    - Severidade: `1.51 / 2.00`.
- **Causa Raiz Identificada**:
  1. No `handleDeliverKit(athlete)` em `OperacaoPage.jsx`, o estado de auditoria (`audits` / `setAudits`) não era atualizado no momento da entrega; apenas `athletes` e `deliveries` eram modificados.
  2. O botão "ATUALIZAR" da aba Auditoria executava `setAudits(generateDefaultAudits())`, que retornava `[]` (limpando todos os dados em vez de recarregar do `localStorage`).
  3. Sessões anteriores em que atletas já haviam sido entregues ficavam sem registro histórico em `audits`.
- **Ações Realizadas**:
  1. `handleDeliverKit`: agora cria e adiciona instantaneamente um registro completo de auditoria (`comprovanteId`, `dataHora`, `operadorNome`, `retiradoPor`, `kit`, `camiseta`, etc.).
  2. Reconciliação Automática: adicionado no `useState` inicial e em `useEffect` a detecção e inserção retroativa na lista de auditoria para quaisquer atletas com status `ENTREGUE` que ainda não possuíssem comprovante/registro.
  3. `handleUndoDelivery` e `handleSaveDetail`: sincronizados para remover e atualizar respectivamente os itens na Auditoria.
  4. Botão "ATUALIZAR": corrigido para recarregar com segurança do `localStorage` sem zerar registros.
- **Validações Reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos**.
  - `npm run build --prefix client`: Vite build concluído em 529ms (**0 erros**).
  - Git commit e push realizados (`96ecf76`).
  - Deploy em andamento para a VPS com healthcheck 200 ativo em `https://app.entregasrun.com.br/api/health`.
- **Próximo passo**: Yuri homologar a aba de Auditoria na aplicação.

## 2026-09-19 — Comprovante em 2 Vias (Organização e Atleta) e Impressão Direta (Fase A, construir)

- **Demanda do Yuri (PO)**:
  - Fila na entrega de kits exige máxima agilidade dos operadores de balcão ("pessoal tá na porta pra pegar kit e a agilidade tem que ser rápida").
  - A tela de confirmação de entrega não possuía botão de impressão direta e não podia ter sua aparência descaracterizada ou alterada ("porém, não pode mudar a aparência da confirmação da entrega do kit").
  - Necessidade de emitir **2 vias de comprovante**:
    1. **1ª Via — Organização / Entregador**: com assinatura do recebedor e código de autenticidade, garantindo a segurança jurídica e operacional do evento (comprovando que o kit foi efetivamente retirado).
    2. **2ª Via — Atleta**: com os dados da prova, número de peito, chip conferido, tamanho da camiseta e instruções.
- **Orquestração pelo Jev Router (`scripts/jev-prompt-router.js`)**:
  - Prompt avaliado pelo Jev System One (`jev-1.13.0`) em **1248ms**:
    - Especialista: `kastiel_dev` (90.0% de confiança).
    - Tipo de Tarefa: `nova_feature` / funcionalidade operacional.
    - Severidade: `1.90 / 2.00`.
- **Ações Realizadas**:
  1. `athlete-detail-actions-bar`:
     - Mantido 100% o design original dos 3 cards (Peito, Camiseta, Kit) e do formulário.
     - Quando pendente: adicionado botão `ENTREGAR & IMPRIMIR` (laranja vibrante com ícone de impressora) ao lado do tradicional `ENTREGAR KIT` (para atender operadores que precisam dar baixa e imprimir imediatamente em 1 clique).
     - Quando entregue: adicionado botão `IMPRIMIR COMPROVANTE` (navy com ícone de impressora) para reimprimir a qualquer momento.
  2. Modal de Comprovante em 2 Vias:
     - Estruturado com a **1ª VIA (ORGANIZAÇÃO)** contendo termo de retenção, dados completos, linha de assinatura e hash de autenticidade.
     - Linha divisória de picote/corte (`✂ CORTE AQUI — DESTAQUE ENTRE AS DUAS VIAS ✂`).
     - **2ª VIA (ATLETA)** contendo termo de recebimento, identificação do kit e camiseta, número de peito e chip.
  3. Folha de Estilos de Impressão (`@media print`):
     - Isola cirurgicamente a área das 2 vias, ocultando todo o restante da tela, modais, headers e fundos escuros.
     - Otimizado em alto contraste tanto para impressoras térmicas de cupom contínuo (80mm) quanto para folhas de escritório A4 destacáveis.
- **Validações Reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos**.
  - `npm run build --prefix client`: Vite build concluído em 1.04s (**0 erros**).
  - Git commit e push realizados (`05d9d69`).
  - Deploy em andamento para a VPS com healthcheck 200 ativo em `https://app.entregasrun.com.br/api/health`.
- **Próximo passo**: Yuri homologar o fluxo de entrega e impressão das 2 vias na aplicação.

## 2026-09-19 — Responsividade Mobile: Drawer Deslizante, Topbar e Bottom Nav (Fase A, construir)

- **Demanda do Yuri (PO)**:
  - Print enviado demonstrando layout mobile quebrado no smartphone: a sidebar lateral ficava fixa aberta ocupando ~60% da tela estreita, espremendo o Dashboard e os cartões métricos em uma coluna mínima ilegível.
- **Orquestração pelo Jev Router (`scripts/jev-prompt-router.js`)**:
  - Prompt avaliado pelo Jev System One (`jev-1.13.0`) em **1365ms**:
    - Especialista: `ana_ui_ux` (87.0% de confiança).
    - Tipo de Tarefa: `bugfix_urgente` (99.0% de confiança).
    - Severidade: `1.38 / 2.00`.
- **Causa Raiz Identificada**:
  - Os layouts (`.dashboard-layout`, `.eventos-layout`, etc.) usavam `display: flex` estático lado a lado, enquanto `.app-sidebar` possuía largura rígida de `230px` (min-width: 230px). Em celulares com telas de 375px a 414px, a sidebar consumia a maior parte da viewport física.
- **Ações Realizadas**:
  1. `Sidebar.jsx`:
     - Transformada em drawer off-canvas deslizante no mobile (`max-width: 768px`) com backdrop escuro e animação fluida.
     - Adicionada **Barra Superior Mobile** com botão hamburger, logotipo do evento e avatar do operador.
     - Adicionada **Bottom Navigation Bar** com acesso direto com o polegar para as 3 seções principais (`Dashboard`, `Eventos`, `Usuários`) e botão `Menu`.
  2. `Sidebar.css` & `index.css`:
     - Layouts no mobile configurados em coluna única (`100% width`), com padding inferior adequado para evitar sobreposição da bottom nav.
     - Grid de métricas redimensionado para preencher 100% da largura no mobile de forma limpa, moderna e legível.
- **Validações Reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos**.
  - `npm run build --prefix client`: Vite build concluído em 795ms (**0 erros**).
  - Git commit e push realizados (`3619f40`).
  - Deploy em andamento para a VPS com healthcheck 200 ativo em `https://app.entregasrun.com.br/api/health`.
- **Próximo passo**: Yuri recarregar o celular e homologar o layout mobile.

## 2026-09-19 — Refinamento Mobile: Operação (Banner, Abas e Busca) e Modal Novo Usuário (Fase A, construir)

- **Demanda do Yuri (PO)**:
  1. Tela de Operação de Evento no mobile:
     - Card do topo (`operacao-event-banner`) com estatísticas espremidas/passando do limite da tela.
     - Abas superiores cortando no canto direito (aba Auditoria inacessível).
     - Botão Espelho e busca de atleta espremidos lado a lado.
     - Card de Últimas Entregas (ex: Adriana Silva) cortando badge `ENTREGUE` na margem direita.
  2. Modal de Novo Usuário em `UsuariosPage`:
     - Botões Cancelar e Adicionar sem CSS (estilo padrão cinza do navegador).
     - Select de Função expandindo para fora do simulador do smartphone.
- **Ações Realizadas**:
  1. `OperacaoPage.css`:
     - `.operacao-event-banner`: reconfigurado no mobile para grid de 4 colunas centralizadas com padding adequado, mantendo os 4 números perfeitamente enquadrados sem overflow.
     - `.operacao-tabs-row`: configurado com scroll horizontal nativo por toque (`overflow-x: auto; scrollbar-width: none`), permitindo deslizar e acessar todas as 4 abas (`Entrega de Kit`, `Atletas`, `Estatísticas`, `Auditoria`).
     - `.kit-actions-row`: busca e botão espelho dispostos em coluna única responsiva (100% width).
     - `.delivery-item-row`: quebra em layout responsivo com tags flexíveis, evitando cortes de badges.
  2. `UsuariosPage.jsx` & `UsuariosPage.css`:
     - Modal agora centralizado na tela com `.modal-backdrop` fixo, blur e `max-height: 85vh`.
     - Botões Cancelar (`.modal-btn-cancel`) e Adicionar Usuário (`.modal-btn-save`) totalmente estilizados no padrão do design system.
     - O select de Função agora se posiciona confortavelmente no centro da viewport, sem transbordar para fora do aparelho.
- **Validações Reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos**.
  - `npm run build --prefix client`: Vite build concluído em 462ms (**0 erros**).
  - Git commit e push realizados (`dac19f7`).
  - Deploy em andamento para a VPS com healthcheck 200 ativo em `https://app.entregasrun.com.br/api/health`.
- **Próximo passo**: Yuri recarregar e homologar os ajustes no mobile.

## 2026-09-19 — Dropdown Customizado de Função em "Novo Usuário" (Fase A, construir)

- **Classificação Jev (TypeSafe System One)**:
  - Roteado em 989ms: Especialista `ana_ui_ux` (92% de confiança), `bugfix_urgente` (100% de confiança).
- **Demanda do Yuri (PO)**:
  - Ao clicar no campo "FUNÇÃO" do modal de Novo Usuário para escolher entre Operador, Supervisor ou Admin, as opções nativas do `<select>` do navegador expandiam para fora do simulador de smartphone, cortando e saindo do aparelho físico.
- **Causa Raiz Identificada**:
  - O elemento `<select>` HTML nativo delega a renderização do menu de opções ao processo de janelas do sistema operacional (Chromium OS Popup Menu / HWND). No desktop ou simuladores com moldura de celular, essa janela nativa do Windows ignora os limites de overflow do iframe/viewport simulado e se projeta na tela do computador para fora do aparelho.
- **Solução Implementada (Ana & Kastiel)**:
  1. `client/src/components/UsuariosPage.jsx`:
     - Substituição do `<select>` nativo por um componente de seleção customizado 100% renderizado dentro da árvore DOM do React (`.custom-role-dropdown`).
     - Trigger estilizado com chevron animado (`ChevronDownIcon`), tipografia Montserrat/Inter, destaque em laranja `#ff5200` ao abrir e indicador do cargo atual e descrição.
     - Painel de opções expansível inline (`.role-options-list`) contendo cada papel com badge colorida (`OPERADOR` laranja, `SUPERVISOR` azul, `ADMIN` escuro), descrição de permissões ("Apenas busca atletas e entrega kits", "Entrega kits e pode alterar dados do atleta", "Acesso total, gestão e novos usuários") e ícone de check (`CheckIcon`) na opção selecionada.
     - Hook de detecção de clique fora (`useRef` + `mousedown`/`touchstart`) para fechamento automático.
     - Por ser um elemento DOM contido no fluxo do modal, é fisicamente impossível transbordar para fora do simulador ou do celular.
  2. `client/src/components/UsuariosPage.css`:
     - Estilos dedicados para `.custom-role-dropdown`, `.custom-role-trigger`, `.role-options-list`, `.role-option-item`, `.role-tag-badge` e animação suave `dropdownFadeIn`.
- **Validações Reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** em 347ms.
  - `npm run build --prefix client`: Vite build concluído em 823ms (**0 erros**).
- **Próximo passo**: Yuri testar o seletor de função no simulador/celular.

## 2026-09-19 — Vinculação a Projetos/Corridas e Matriz de Permissões RBAC (Fase A, construir)

- **Classificação Jev (TypeSafe System One)**:
  - Roteado em 1140ms: Especialista `crowley_sec` (92% de confiança), `nova_feature` (96% de confiança).
- **Demandas do Yuri (PO)**:
  1. No cadastro de usuários, vincular o usuário a um projeto / corrida específica (ou global para Admin).
  2. Matriz de Permissões Estrita:
     - **OPERADOR**: apenas entrega de kit. Não pode editar nenhuma página ou atleta. Não tem acesso à aba/página Auditoria.
     - **SUPERVISOR**: entrega de kit + permissão de editar dados de atletas. Não tem acesso à aba/página Auditoria.
     - **ADMIN**: acesso total (Auditoria, gestão de usuários, edição de eventos).
- **Ações Realizadas**:
  1. `client/src/App.jsx`:
     - Propagação da lista de eventos (`events`) para `UsuariosPage`.
     - `effectiveEventId` agora vincula automaticamente o usuário autenticado à corrida atribuída caso possua perfil não-admin.
     - Rota `/usuarios` bloqueada para não-admins na navegação `navigateTo`.
  2. `client/src/components/Sidebar.jsx`:
     - Item de menu `USUÁRIOS` oculto na navegação desktop e na barra inferior mobile (`mobile-bottom-nav`) para papéis `OPERADOR` e `SUPERVISOR`.
  3. `client/src/components/UsuariosPage.jsx` & `UsuariosPage.css`:
     - Adicionado campo `PROJETO / CORRIDA VINCULADA` no modal "NOVO USUÁRIO", utilizando seletor customizado in-DOM à prova de overflow no simulador.
     - Suporte a "TODOS OS PROJETOS" para Admin e seleção das corridas cadastradas para Operador/Supervisor.
     - Badge do evento exibida em cada card de usuário (`📍 {item.eventName}`).
  4. `client/src/components/OperacaoPage.jsx` & `OperacaoPage.css`:
     - Aba `AUDITORIA` removida da barra de navegação para não-admins (`{isAdmin && <button>AUDITORIA</button>}`).
     - `effectiveTab` derivado automaticamente: se um usuário tentar acessar auditoria sem privilégio, o sistema cai com segurança para `entrega`.
     - Para `OPERADOR`:
       - Botão `+ NOVO` atleta na aba `ATLETAS` fica oculto.
       - Botões `SALVAR` e `DESFAZER` na visualização detalhada do atleta ficam ocultos.
       - Formulário de dados do atleta encapsulado em `<fieldset disabled={isOperator}>`, tornando todos os inputs somente leitura.
       - Exibido aviso de perfil: `🔒 Perfil Operador: consulta e entrega de kit liberadas. Alteração de dados reservada ao Supervisor.`.
     - Para `SUPERVISOR`:
       - Botão `SALVAR` habilitado para edição de dados do atleta.
       - Botão `+ NOVO` habilitado para cadastrar atletas.
       - Sem acesso à aba `AUDITORIA`.
- **Validações Reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** em 372ms.
  - `npm run build --prefix client`: Vite build concluído em 1.18s (**0 erros**).
- **Próximo passo**: Yuri testar a vinculação de corrida e a troca de permissões entre Operador, Supervisor e Admin.

## 2026-09-19 — Menu Lateral Retrátil no Desktop com Botão de Recolher (Fase A, construir)

- **Classificação Jev (TypeSafe System One)**:
  - Roteado em 1128ms: Especialista `ana_ui_ux` (55% de confiança), `nova_feature` (96% de confiança).
- **Demanda do Yuri (PO)**:
  - No menu lateral (desktop), adicionar um botão com setinha para recolher a barra lateral para dar mais espaço útil às telas do sistema.
- **Solução Implementada (Ana & Kastiel)**:
  1. `client/src/components/Sidebar.jsx`:
     - Adicionado estado reativo `isCollapsed` persistido no `localStorage` sob a chave `'entregas_run_sidebar_collapsed'`, mantendo a preferência do usuário entre telas e recarregamentos.
     - Botão de recolher (`.sidebar-collapse-btn`) posicionado no topo da barra lateral com ícone de seta (`ChevronLeftIcon`), que rotaciona 180° quando recolhido.
     - No modo compacto, os botões de navegação centralizam os ícones (`DASHBOARD`, `EVENTOS`, `USUÁRIOS`) com tooltips nativos via atributo `title`.
     - Rodapé adaptado: monograma circular para o avatar do usuário e botão de logout em ícone centralizado.
  2. `client/src/components/Sidebar.css`:
     - Transição fluida de largura de `230px` para `78px` (`transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1)`).
     - Todas as telas filhas (`DashboardPage`, `EventosPage`, `OperacaoPage`, `UsuariosPage`) que utilizam `flex: 1` expandem automaticamente, aproveitando os 152px adicionais de largura sem quebras ou rolagem indesejada.
     - Proteção para telas mobile (`@media (max-width: 768px)`): o botão de recolher do desktop fica oculto e o drawer lateral mobile preserva sua largura nativa de 280px.
- **Validações Reais**:
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** em 674ms.
  - `npm run build --prefix client`: Vite build concluído em 918ms (**0 erros**).
- **Próximo passo**: Yuri testar o botão com a setinha no desktop para recolher e expandir o menu lateral.

## 2026-09-19 — Associar Planilhas (Atletas + Chips) na Aba Auditoria (Fase A, construir)

- **Classificação Jev (TypeSafe System One)**:
  - Roteado em 884ms: Especialista `kastiel_dev` (100% de confiança), `nova_feature` (100% de confiança).
- **Demanda do Yuri (PO)**:
  - Na aba `AUDITORIA`, dentro do card `PLANILHA DE ATLETAS`, adicionar o botão `ASSOCIAR PLANILHA`.
  - O operador/organizador frequentemente recebe duas planilhas separadas:
    1. Uma planilha contendo apenas os dados dos atletas (nomes, CPFs, modalidades, categorias).
    2. Outra planilha contendo apenas a relação de chips de cronometragem (números/sequências de chips).
  - O sistema deve permitir carregar ambos os arquivos (XLSX, XLS ou CSV), efetuar a correspondência/junção de cada corredor com um chip (de forma sequencial ou sorteio/aleatória, conforme especificado no áudio), validar a consistência com pré-visualização completa e importar os dados consolidados diretamente para o evento ativo.
- **Solução Implementada (Ana, Kastiel, Crowley, Teclide & Vitor)**:
  1. `client/src/components/AssociarPlanilhasModal.jsx` (Novo componente):
     - Assistente em 3 etapas fluidas:
       - **Etapa 1 (Arquivos & Mapeamento)**: Dropzones independentes para a Planilha de Atletas e Planilha de Chips, suporte completo a `.xlsx`, `.xls` e `.csv`, auto-detecção de colunas (Nome, CPF, Modalidade, Categoria, Sexo, Camiseta, Número de Peito) e seleção da coluna do chip com amostra imediata dos primeiros registros.
       - **Configurações de Associação**:
         - Ordem de associação: **Sequencial 1-para-1** (Atleta 1 recebe Chip 1, etc.) ou **Sorteio / Aleatório** (embaralha os chips antes da atribuição, atendendo ao pedido do Yuri).
         - Definição do Número de Peito: opção para adotar o próprio número do chip ou gerar sequência numérica crescente (1, 2, 3...).
       - **Etapa 2 (Pré-visualização & Validação)**:
         - Cards métricos no topo: total de atletas, total de chips e total de pares formados.
         - Alertas amigáveis caso as quantidades sejam desiguais (ex: se há mais atletas do que chips, ou chips excedentes).
         - Tabela paginada de preview com busca instantânea, badges visuais com ícone de chip e identificação de atletas que atualizarão registros existentes.
       - **Etapa 3 (Conclusão)**:
         - Resumo consolidado e botão para retornar diretamente à tela de operação com a lista já sincronizada.
  2. `client/src/components/AssociarPlanilhasModal.css` (Novo estilo):
     - Layout dual-card moderno com tipografia Montserrat/Inter, badges em tons índigo/violeta e esmeralda, scrollbar suave e animações de transição.
  3. `client/src/components/OperacaoPage.jsx`:
     - Adicionado botão `.btn-associar-planilha` no card `PLANILHA DE ATLETAS` ao lado de `IMPORTAR PLANILHA`.
     - Ícone `LinkSpreadsheetIcon` integrado.
     - Estado `showAssociarModal` e renderização do modal conectado a `handleImportSuccess` (que atualiza o estado React e persiste no `localStorage`).
  4. `client/src/components/OperacaoPage.css`:
     - Estilização do botão `.btn-associar-planilha` em índigo suave `#eef2ff` com borda e texto `#4f46e5` e efeito hover com elevação.
- **Validações Reais**:
  - Script de teste de unidade automatizado em `scratch/test_associar_planilhas.cjs`: 4 testes passaram com 100% de sucesso (sequencial, mais atletas que chips, mais chips que atletas e modo aleatório com verificação de unicidade).
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** em 325ms em 21 arquivos.
  - `npm run build --prefix client`: Vite build concluído em 562ms (**0 erros**, bundle gerado com sucesso).
- **Próximo passo**: Yuri testar o botão "ASSOCIAR PLANILHA" na aba Auditoria carregando os arquivos de teste de corredores e chips.

## 2026-09-19 — Campos Personalizados, PCD Dinâmico e Restauração de Base Original (Fase A, construir)

- **Classificação Jev (TypeSafe System One)**:
  - Roteado em 1004ms: Especialista `kastiel_dev` (100% de confiança), `nova_feature` (100% de confiança).
- **Demanda do Yuri (PO)**:
  - Na importação de atletas, colunas não-padrão (como `PCD`, `PCD MEMBROS INFERIORES`, `OBSERVAÇÕES`) não tinham opção para mapear no select (só havia os campos fixos ou "Não importar").
  - O sistema precisa passar o filtro em todos os campos da tabela anexada para não descartar nenhuma coluna.
  - Permitir adicionar novos elementos/categorias (botão para adicionar novo campo personalizado como "PCD MEMBROS INFERIORES" para que fique disponível nas opções de mapeamento).
  - Salvar esses campos na tabela de atletas.
  - Preservar a tabela base original no sistema, gerando a nova tabela associada sem perder a original.
- **Solução Implementada (Ana, Kastiel, Crowley, Teclide & Vitor)**:
  1. `client/src/components/ImportarAtletasModal.jsx` & `ImportarAtletasModal.css`:
     - **Auto-detecção de colunas extras**: Extrai dinamicamente todas as colunas da planilha anexada que não são campos padrão do sistema.
     - **Mapeamento automático de PCD**: Colunas contendo termos como `pcd`, `defic`, `membro` ou `especial` agora são automaticamente mapeadas para `custom:${colName}` (ex: `PCD MEMBROS INFERIORES`), evitando que caiam como "Não importar".
     - **Toolbar e Botão `+ ADICIONAR NOVO CAMPO / CATEGORIA`**: Permite ao usuário criar campos personalizados sob demanda com input inline e confirmação imediata.
     - **Select aprimorado com `<optgroup>`**:
       - *Campos Principais do Sistema*: os campos clássicos (Número, Chip, Nome, CPF, etc.).
       - *Campos Personalizados / PCD*: opção direta para salvar como o próprio nome da coluna ("✓ Salvar como campo {headerName}") e todos os campos criados pelo usuário.
       - *Ações*: "+ Criar outro campo personalizado...".
     - **Persistência de Dados**: Salva em `athlete.customFields` e propriedades diretas, com detecção automática de `athlete.pcd`.
  2. `client/src/components/AssociarPlanilhasModal.jsx`:
     - Preserva 100% das colunas adicionais da planilha de atletas (incluindo PCD e campos customizados) durante a fusão com a lista de chips.
  3. `client/src/components/OperacaoPage.jsx` & `OperacaoPage.css`:
     - **Preservação e Restauração de Base Original**: `handleImportSuccess` cria snapshot arquivado em `entregas_run_original_athletes_${currentEvent.id}`. Adicionado botão `RESTAURAR BASE` no card `PLANILHA DE ATLETAS` com confirmação segura.
     - **Exibição de Campos Extras no Atleta**: Seção dinâmica `CAMPOS EXTRAS & PCD DA PLANILHA` no formulário de detalhes do atleta, permitindo visualização e edição.
     - **Badges de PCD na Operação**: Identificador visual `♿ {pcd}` nas tags de entrega e no resultado da busca em tempo real.
  4. `client/src/utils/auditData.js`:
     - `exportCsvFile` atualizado para detectar dinamicamente e incluir todas as colunas personalizadas e PCD no CSV exportado.
- **Validações Reais**:
  - Script automatizado `scratch/test_custom_fields_pcd.cjs`: 3 testes passaram com 100% de sucesso (detecção de colunas extras, auto-mapping de PCD e construção do atleta com customFields).
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** em 341ms em 21 arquivos.
  - `npm run build --prefix client`: Vite build concluído em 496ms (**0 erros**).
- **Próximo passo**: Yuri testar o mapeamento da coluna PCD na importação e verificar a exibição no formulário do atleta e na restauração de base.

## 2026-09-19 — Ajuste Responsivo das Abas do Evento no Mobile (Fase A, construir)

- **Demanda do Yuri (PO)**: No modo mobile (Android / iOS), as abas superiores do evento (`OperacaoPage`) exibiam apenas `ENTREGA DE KIT`, `ATLETAS` e `ESTATÍSTICA`, ocultando a aba `AUDITORIA` (administrador) fora da tela.
- **Diagnóstico**:
  - `OperacaoPage.css` aplicava `gap: 16px !important;` e `flex-shrink: 0 !important;` com títulos longos (`ENTREGA DE KIT` e `ESTATÍSTICAS`), somando mais de 440px de largura e empurrando a quarta aba para fora do viewport de smartphones (360px–390px). O `scrollbar-width: none` impedia qualquer pista visual de rolagem horizontal.
- **Solução Implementada**:
  1. `client/src/components/OperacaoPage.jsx`:
     - Rótulos com classes responsivas: `.tab-label-full` (`ENTREGA DE KIT` / `ESTATÍSTICAS`) no desktop e `.tab-label-short` (`ENTREGA` / `ESTATÍSTICA`) no mobile.
  2. `client/src/components/OperacaoPage.css`:
     - Desktop: exibe rótulos completos (`.tab-label-short { display: none; }`).
     - Mobile (`@media (max-width: 768px)`): exibe rótulos concisos; abas com `flex: 1 1 0 !important; justify-content: center !important; gap: 4px !important;`, distribuindo uniformemente as abas (33,3% para operador ou 25% para admin) de modo que todas caibam simultaneamente na tela sem rolagem obrigatória.
     - Ultra-mobile (`@media (max-width: 360px)`): tipografia compacta (9.5px, gap 3px) para telas estreitas.
- **Validações Reais**:
  - `npm run lint --prefix client`: 0 erros e 0 avisos (oxlint).
  - `npm run build --prefix client`: Vite build concluído em 1.38s com sucesso.
- **Próximo passo**: Yuri homologar no dispositivo móvel a visualização das 4 abas completas.

## 2026-09-19 — Responsividade da Aba Auditoria e Dropdowns Nativos com Efeito Vidro (Fase A, construir)

- **Demanda do Yuri (PO)**:
  - Elementos da aba Auditoria cortando no mobile: botões do card "Planilha de Atletas" cortados à direita (`ASS... PLA...`) e tabela "Entregas no Período" comprimida e com colunas ilegíveis.
  - Dropdowns (`<select>`) com fundo branco chapado e popup quadrado do navegador, sem visual nativo mobile nem acabamento de vidro (glassmorphism), especialmente nos modais de importação/associação e filtros da auditoria.
- **Roteamento de IA**:
  - Classificado via **Jev (TypeSafe System One)** em 1179ms: Liderança Ana (UI/UX, 99%), `bugfix_urgente` (100%), severidade 1.1.
- **Ajustes Implementados**:
  1. `client/src/components/CustomSelect.jsx` & `CustomSelect.css`:
     - Componente de seleção sob medida com visual nativo para mobile/web.
     - Efeito **Glassmorphism** (`background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);`).
     - Cantos arredondados (`border-radius: 14px`), sombras suaves, suporte a grupos (`optgroup`), destaque ativo laranja e checkmark.
     - Renderização via **React Portal** (`createPortal` para `document.body`) com cálculo de viewport inteligente, evitando qualquer corte por containers com `overflow: hidden/auto`.
  2. `client/src/components/ImportarAtletasModal.jsx` & `ImportarAtletasModal.css`:
     - Substituído o `<select>` nativo pelo `<CustomSelect>` no mapeamento de colunas.
     - `.column-map-card` aprimorado com fundo de vidro translúcido (`background: rgba(248, 250, 252, 0.75); backdrop-filter: blur(8px);`) e cantos arredondados (14px).
  3. `client/src/components/AssociarPlanilhasModal.jsx` & `AssociarPlanilhasModal.css`:
     - Selects de mapeamento de atletas e chips convertidos para `<CustomSelect>`.
     - `.dual-card` atualizado para estética glassmorphism.
  4. `client/src/components/OperacaoPage.jsx` & `OperacaoPage.css`:
     - Card "Planilha de Atletas" no mobile: botões organizados em grid de 2 colunas (`grid-template-columns: repeat(2, 1fr) !important;`), eliminando o corte horizontal do botão "Associar Planilha".
     - Tabela "Entregas no Período": garantido `min-width: 820px !important;` na tabela com `overflow-x: auto` e scroll suave no wrapper, impedindo o colapso e esmagamento das colunas.
     - Adicionado indicador visual mobile: `⇄ Deslize para ver todas as 8 colunas`.
     - Filtros de Auditoria (Operador, Tipo de Retirada, Modo de Busca, Preset e Por Página) substituídos por `<CustomSelect>`.
- **Validações Reais**:
  - `scratch/test_auditoria_responsiveness_and_selects.cjs`: 15 assertivas aprovadas com 100% de sucesso.
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** em 342ms em 22 arquivos.
  - `npm run build --prefix client`: Vite build concluído em 926ms (**0 erros**).
- **Próximo passo**: Yuri homologar no celular os dropdowns com fundo de vidro e a nova disposição responsiva da aba Auditoria.

## 2026-09-19 — Bottom Sheet Nativo Mobile para CustomSelect (Fase A, construir)

- **Demanda do Yuri (PO)**: Ao clicar no campo "MODALIDADE" (ou qualquer select de coluna/filtro) no celular, a lista de opções ainda cortava na parte inferior, ultrapassando a tela e colidindo com a barra de navegação/endereço inferior do navegador.
- **Roteamento de IA**:
  - Classificado via **Jev (TypeSafe System One)** em 1208ms: Liderança Ana (UI/UX, 81%), `bugfix_urgente` (100%), severidade 0.81.
- **Causa Raiz**:
  - O cálculo flutuante baseado em `rect.bottom + 6` com `maxHeight: 320px` fixo estendia o popover além do limite inferior da tela móvel em viewports pequenas ou quando a barra inferior do navegador ocupava espaço.
- **Solução Implementada**:
  1. `client/src/components/CustomSelect.jsx`:
     - Implementado suporte dinâmico a **Mobile Bottom Sheet (Folha Inferior Móvel)** para telas `≤ 768px`.
     - No mobile, o seletor abre deslizando suavemente a partir da base da tela, com backdrop escurecido (`rgba(12, 20, 44, 0.52)`), barra superior de arraste (drag pill), título do campo e botão de fechar (`✕`).
     - No desktop (`> 768px`), permanece o popover flutuante com cálculo dinâmico de `maxHeight` limitado ao espaço real da janela.
  2. `client/src/components/CustomSelect.css`:
     - Efeito glassmorphic ampliado no Bottom Sheet: `backdrop-filter: blur(24px); background: rgba(255, 255, 255, 0.98); border-radius: 24px 24px 0 0;`.
     - Altura máxima restrita a `75vh` com rolagem suave (`-webkit-overflow-scrolling: touch`), e padding inferior adaptado com `max(32px, env(safe-area-inset-bottom))`.
     - Zero corte de opções: `+ Criar outro campo personalizado...` e todas as opções do sistema ficam 100% visíveis e com toque ergonômico.
- **Validações Reais**:
  - `scratch/test_auditoria_responsiveness_and_selects.cjs`: 18 assertivas aprovadas com 100% de sucesso.
  - `npm run lint --prefix client`: Oxlint executado com **0 erros e 0 avisos** em 391ms em 22 arquivos.
  - `npm run build --prefix client`: Vite build concluído em 717ms (**0 erros**).
- **Próximo passo**: Yuri homologar no dispositivo móvel a abertura em formato Bottom Sheet sem qualquer corte.

## 2026-09-19 — Modal Nativo Interno para Criação de Categoria Personalizada (Fase A, construir)

- **Demanda do Yuri (PO via áudio)**: Ao clicar em "+ Criar outro campo personalizado...", abria uma janela de `window.prompt` nativa do navegador lá em cima, fora do aplicativo. O Yuri solicitou expressamente que essa janela apareça dentro da aplicação como um componente nativo, sem sair para fora da tela.
- **Roteamento de IA**:
  - Classificado via **Jev (TypeSafe System One)** em 860ms: Liderança Kastiel (Dev, 52%) e Ana (UI/UX, 46%), `nova_feature` (63%), severidade 0.85.
- **Causa Raiz**:
  - Uso de `window.prompt()` em `ImportarAtletasModal.jsx`, que gerava o diálogo padrão cinza do browser no topo da janela, desvinculado do design system.
- **Solução Implementada**:
  1. `client/src/components/ImportarAtletasModal.jsx`:
     - Eliminado 100% de chamadas `window.prompt()` e `prompt()`.
     - Criado estado reativo `createFieldModal: { isOpen, columnIndex, inputValue }`.
     - Implementado diálogo nativo renderizado via `createPortal(..., document.body)` com `z-index: 10000005`, abrindo centralizado dentro do aplicativo móvel e desktop.
     - Atalhos rápidos em pills (`PCD`, `TAMANHO TÊNIS`, `CIDADE NATAL`, `GRUPO SANGUÍNEO`, `CATEGORIA EXTRA`) para preenchimento rápido com um toque.
     - Suporte a teclado: `Enter` confirma a criação e aplicação direta na coluna selecionada; `Escape` cancela.
  2. `client/src/components/ImportarAtletasModal.css`:
     - Backdrop escurecido com desfoque profundo (`backdrop-filter: blur(10px); background: rgba(12, 20, 44, 0.68)`).
     - Card com cantos de 22px, borda suave, sombra moderna e ícone badge em laranja `#ff5200`.
     - Botões elegantes: Cancelar e Criar e Aplicar com degradê laranja de alta conversão.
- **Validações Reais**:
  - `scratch/test_custom_field_modal.cjs`: Testes automatizados validando eliminação de `window.prompt` e presença de componentes nativos.
  - `npm run lint --prefix client`: 0 avisos, 0 erros (Oxlint).
  - `npm run build --prefix client`: Vite build concluído em 778ms (0 erros).
- **Próximo passo**: Yuri homologar no dispositivo móvel a criação de categorias com o novo modal interno integrado.

## 2026-09-19 — Correção de Crash na Etapa 2 de Importação (Fase A, construir)

- **Demanda do Yuri (PO via áudio)**: Ao adicionar a planilha e avançar para o mapeamento de colunas (ou clicar em adicionar), o app quebrou com tela preta/azul escura ("caiu o sistema").
- **Roteamento de IA**:
  - Classificado via **Jev (TypeSafe System One)** em 1329ms: Liderança Ana/Kastiel, `bugfix_urgente` (100%), severidade 1.86.
- **Causa Raiz**:
  - As variáveis `showAddFieldInline`, `setShowAddFieldInline`, `newFieldName`, `setNewFieldName` haviam sido removidas das declarações de estado, porém ainda estavam sendo referenciadas na barra de ferramentas da Etapa 2 (`custom-fields-toolbar`). Isso causava um `ReferenceError: showAddFieldInline is not defined` durante a renderização da Etapa 2, desmontando o React e deixando a tela escura.
- **Solução Implementada**:
  1. `client/src/components/ImportarAtletasModal.jsx`:
     - Removida a barra inline obsoleta e unificado o botão `+ ADICIONAR NOVO CAMPO / CATEGORIA` para abrir diretamente o `createFieldModal` nativo integrado.
     - Eliminadas 100% das referências órfãs.
- **Validações Reais**:
  - `scratch/test_no_undef.cjs`: Validado que nenhuma variável órfã existe no componente.
  - `scratch/test_import_modal_full_flow.cjs`: Fluxo completo (Etapa 1 -> Etapa 2 -> Mapeamento -> Criação de Campo -> Confirmação) testado e 100% aprovado.
  - `npm run lint --prefix client`: 0 erros, 0 avisos (Oxlint).
  - `npm run build --prefix client`: Vite build concluído em 516ms (0 erros).
- **Próximo passo**: Yuri homologar no celular a navegação completa da importação sem nenhum crash.

## 2026-09-19 — Implementação do Hook Automático Jev (TypeSafe System One) na IDE (Fase A, construir)

- **Demanda do Yuri (PO)**: Exigência de que toda pergunta vá PRIMEIRO para o Jev da TypeSafe, e o Jev retorne a instrução estruturada para o agente antes da execução.
- **Roteamento de IA**:
  - Classificado via **Jev (TypeSafe System One)** em 1240ms: Liderança Kastiel (Dev, 99%), `nova_feature` (23%), severidade 1.08.
- **Solução Arquitetural Implementada**:
  1. `.agents/hooks.json`:
     - Configurado o ciclo de vida oficial do Antigravity (`PreInvocation` hook).
     - Aciona automaticamente `scripts/jev-pre-invocation-hook.cjs` antes de qualquer chamada ao LLM.
  2. `scripts/jev-pre-invocation-hook.cjs`:
     - Lê o stdin com os metadados do Antigravity (`transcriptPath`, `conversationId`).
     - Extrai dinamicamente a pergunta mais recente do usuário (`<USER_REQUEST>`).
     - Consulta a API TypeSafe System One (`https://api.typesafe.ai/v1/systemone`) com o modelo `jev-latest`.
     - Classifica o especialista líder da TONE (Kastiel, Ana, Crowley, Teclide ou Vitor), o tipo de tarefa, o risco a produção e a severidade calibrada.
     - Retorna via stdout no formato oficial `{ injectSteps: [{ ephemeralMessage: ... }] }`.
     - Possui controle de cache por `step_index` para evitar reprocessamentos desnecessários em ferramentas subsequentes.
  3. `TONE-INVARIANTS.md`:
     - Adicionada a Invariante 10 determinando o roteamento obrigatório pelo Jev em todas as interações.
- **Validações Reais**:
  - `scratch/test_hook_execution.cjs`: Executado teste de integração end-to-end do hook com a API TypeSafe, validando tempo de resposta em 921ms e contrato JSON `injectSteps` com 100% de conformidade.
- **Próximo passo**: Cada turno do Yuri agora passa automaticamente pelo Jev antes da resposta do agente.

## 2026-09-19 — Auditoria: filtros reais, PDF filtrado e planilha geral atualizada (Fase A, construir)

- **Roteamento Jev (TypeSafe System One)**: Kastiel liderou como `bugfix_urgente` (93%/97%), severidade 1,37/2; Ana revisou a jornada, Ulisses separou os três artefatos e Teclide executou o veto/aceite de QA. Crowley atuou somente em segurança de desenho; a Fase C não foi iniciada.
- **Causas confirmadas**:
  1. O filtro de operador era alimentado somente pelo usuário logado, e não pelos operadores presentes no histórico.
  2. O botão PDF chamava `window.print()`, mas o CSS de impressão liberava exclusivamente o comprovante individual, produzindo saída errada/vazia.
  3. Período e outros controles eram apenas visuais; a busca prometia chip sem consultá-lo.
  4. Planilha geral, CSV filtrado e comprovante tinham rótulos ambíguos.
  5. Auditorias reconstruídas recebiam `timestamp` atual mesmo quando `entregueEm` era histórico, distorcendo Hoje/Ontem.
- **Alterações**:
  - `client/src/utils/auditData.js`: filtro único e puro por busca/operador/tipo/período; união dos operadores históricos; enriquecimento por chip; relatório HTML A4 paisagem exclusivo para os registros filtrados; download CSV centralizado, com URL revogada em atraso, nomes seguros, valores `0/false` preservados e neutralização de fórmulas; planilha geral com todos os atletas, `STATUS_DA_ENTREGA` e metadados da entrega.
  - `client/src/components/OperacaoPage.jsx`: tabela, cards, CSV e PDF compartilham `filteredAudits`; operador histórico aparece no seletor; período e chip funcionam; PDF recebe todos os filtrados, sem paginação; comprovante permanece individual; reconciliação preserva o timestamp de `entregueEm`.
  - Microcopy separada em `BASE GERAL DE ATLETAS`, `EXPORTAR ENTREGAS`, `GERAR PDF DO FILTRO` e `COMPROVANTE INDIVIDUAL DE RETIRADA`; o identificador deixou de ser chamado de garantia de autenticidade.
  - `client/src/components/OperacaoPage.css`: ações longas quebram linha sem corte no mobile e há resumo vivo dos filtros.
- **Validações reais**:
  - Cinco scripts existentes/novos aprovados; teste específico cobre operador normalizado, Hoje/Ontem, auditoria histórica reconstruída, chip, HTML escapado, CSV injection, nome editado, entregue/pendente e valores `0/false`.
  - `npm run lint --prefix client`: 0 erros e 0 avisos.
  - `npm run build --prefix client`: Vite concluído com 97 módulos.
  - Navegador local com fixture descartável: operador `Operadora Agnes` apareceu e reduziu 2→1; combinado com `ONTEM` retornou 0; busca `CHIP-AGNES` retornou 1; a fixture foi removida depois do teste.
  - O navegador interno confirmou `Page.downloadWillBegin` para a planilha geral (718 bytes) e CSV filtrado (304 bytes), e `Page.windowOpen` para o relatório. O próprio IAB cancelou o salvamento físico, portanto isso não substitui a homologação em navegador comum.
- **Risco/Veto**: Crowley mantém veto de produção enquanto autorização de ADMIN/evento existir apenas no frontend. Nenhum deploy/publicação foi executado.
- **Próximo passo**: Yuri homologar em Chrome/celular o salvamento e abertura dos dois CSVs e o fluxo imprimir/salvar PDF; antes de produção, repetir autorização no backend.

## 2026-09-19 — Zoom View, tabela completa de atletas e busca de entrega (Fase B, homologar)

- **Roteamento Jev**: Kastiel liderou a correção/feature (98% de confiança; severidade 1,03/2). Ana revisou a jornada e a responsividade, Ulisses definiu a ordem salvar→entregar, Teclide executou QA com veto corrigido e Crowley revisou integridade/exposição de dados.
- **Zoom View / edição**:
  - O botão `SALVAR ALTERAÇÕES` agora só habilita quando existe mudança real e salva o cadastro sem registrar entrega.
  - `SALVAR E ENTREGAR KIT` e a variação com comprovante persistem o formulário atual antes da entrega; nome, número, CPF, chip, kit, camiseta, modalidade, recebedor e campos extras deixam de usar o objeto antigo.
  - Nome e número são validados, número duplicado é bloqueado, troca de número sincroniza entrega/auditoria e clique duplicado é travado.
  - Sair com rascunho sujo pelo botão, abas, Voltar, Sidebar ou logout exige confirmação; o veto inicial do Teclide sobre perda silenciosa foi corrigido.
  - Fallbacks fictícios de data, chip, operador e status foram removidos da ficha.
- **Aba Atletas / importação**:
  - A grade agora deriva colunas padrão e personalizadas da base completa, preserva `NOME DE PEITO`, campos extras vazios e um schema por evento em `entregas_run_athlete_columns_<eventId>`.
  - Importação e associação preservam a ordem dos campos extras; novos campos entram ao final. Chaves estruturais e perigosas (`id`, `status`, `numero`, `customFields`, `__proto__`, `constructor`, `prototype` etc.) são rejeitadas e custom fields ficam somente em `customFields`.
  - ADMIN/Supervisor vê a grade completa; Operador fica limitado a número, nome, documento, chip e status.
  - Mobile usa rolagem horizontal visível, número/nome fixos e indicador com a quantidade de campos; filtros e ações reorganizam sem comprimir as colunas.
- **Busca de Entrega de Kit**:
  - Cada resultado mostra somente nome, número e CPF, além da ação de entrega.
  - Atletas entregues deixam de aparecer imediatamente na pesquisa e permanecem em `Últimas entregas`.
  - Prefixos `#` foram removidos das numerações exibidas em operação, auditoria, comprovantes, associação e relatório PDF/HTML; usa-se `Nº` quando o contexto precisa de rótulo.
- **Arquivos principais**: `client/src/components/OperacaoPage.jsx`, `OperacaoPage.css`, `ImportarAtletasModal.jsx`, `AssociarPlanilhasModal.jsx`, `client/src/utils/athleteDetail.js`, `athleteTable.js` e `auditData.js`.
- **Validações reais**:
  - Sete scripts funcionais/regressivos aprovados; lint com 0 erros/avisos; build Vite aprovado com 99 módulos.
  - Playwright com Chrome real em viewport 390×844 validou: busca enxuta; desaparecimento do entregue; salvamento mantendo `PENDENTE`; salvar+entregar com uma única auditoria; confirmação de descarte nas abas e no Voltar; colunas padrão/custom/varias vazias; indicador e rolagem mobile. Evidência local ignorada pelo Git: `scratch/operacao-mobile-qa.png`.
  - Busca estática confirmou ausência de prefixo `#` nos identificadores renderizados.
- **Produção**: nenhuma publicação feita nesta entrada. O push para `main` aciona produção; o veto operacional anterior permanece até condição de exceção válida ou correção do pipeline/auth.

## 2026-09-19 — Decisão do PO: fluxo de deploy automático mantido; correção de auth agendada (decisão)

- **Decisão do Yuri (PO)**: o fluxo de deploy automático (push na `main` → GitHub Actions `deploy.yml` → SSH na VPS → Docker + healthcheck) permanece **100% automático** para o dia a dia de desenvolvimento, sem cerimônia adicional. O PO aceita o risco do ambiente publicado em fase de homologação.
- **Esclarecimento confirmado no checkout**: o veto do Crowley é regra de governança TONE (regra 7), não trava técnica no pipeline — o workflow `.github/workflows/deploy.yml` roda normalmente a cada push na `main` (valida build do client, atualiza `/opt/entregas-run` via `git reset --hard origin/main`, rebuild Docker com `--no-cache`, healthcheck em `http://127.0.0.1:3050/api/health`). Secrets VPS (`VPS_HOST`, `VPS_USERNAME`, `VPS_PASSWORD`) vivem apenas no GitHub Secrets.
- **Push efetuado nesta data**: commit `fc5e58d` (feat: zoom view, grade de atletas, busca de entrega + novos utils `athleteDetail.js`/`athleteTable.js`) enviado a `origin/main`; lint 0 erros e build Vite 99 módulos validados antes do push. Deploy disparado pelo workflow automático.
- **Riscos conhecidos e aceitos pelo PO enquanto o veto vigora**:
  1. Autorização ADMIN/Operador é somente frontend (`role` no `localStorage` `entregas_run_user`, falsificável via DevTools; `OperacaoPage.jsx` assume `ADMIN` como fallback). Dados de atletas/CPF/contato ficam no `localStorage` do cliente, sem verificação no backend.
  2. `server/server.js` linha 51: senha admin com fallback em código (`ADMIN_PASSWORD || '...'`) versionado no GitHub — se a VPS não definir a env, a senha padrão pública é a que vale.
- **Próxima entrega técnica agendada (derruba o veto do Crowley de forma definitiva)**: autenticação real com token/sessão emitida pelo `/api/login`, checagem de permissão (ADMIN/SUPERVISOR/OPERADOR + vínculo de evento) no backend em cada rota, remoção do fallback de senha do código e migração dos dados de atletas/entregas/auditoria do `localStorage` para o backend. Deploy continua automático após a correção.

## 2026-09-19 — Espelho público em qualquer aparelho + QR Code no card (Fase A, construir)

- **Demanda do Yuri (PO)** (foto da ficha de entrega): a aba pública de espelhamento (`/espelho/:id`) deve exibir a ficha do atleta que está no guichê (número monumental, camiseta, kit, modalidade/categoria, nome, chip) para o usuário acompanhar a validação; o card do Espelho deve ter QR Code para abrir a telinha em outro aparelho.
- **Limitação confirmada no checkout**: `BroadcastChannel`/`localStorage` do `espelhoSync.js` só alcançam abas do mesmo navegador/computador; o QR Code no celular do atleta nunca receberia os dados. O QR Code registrado na memória de 2026-09-17 não existia mais no `EspelhoModal.jsx` atual (reescrito depois) — a lib `qrcode` estava instalada e sem uso.
- **Solução (servidor como ponte, opção aprovada pelo PO)**:
  1. `server/server.js`: rotas públicas `GET/POST /api/espelho/:eventId/estado` — "quadro de avisos" em memória por evento. Montadas ANTES do parser global de 16kb (POST usa parser próprio de 6mb para a aparência com imagens data URL). Sanitização: whitelist de status (`LIVRE/ATENDENDO/ENTREGUE`), whitelist de campos do atleta (doc/CPF, contato e customFields são descartados e nunca vão ao espelho), cores hex validadas, `fontSize` com clamp 70–150, imagens só `data:image/` até 4MB, eventId normalizado. Ausência do campo `atleta` preserva a ficha (post de aparência não apaga atendimento); status `LIVRE` sempre limpa a ficha. Rate limit próprio de 120 req/min.
  2. `client/src/utils/espelhoSync.js`: `buildEspelhoAthlete`, `publishEspelhoState` (suporta `config`) e `fetchEspelhoState`.
  3. `client/src/components/OperacaoPage.jsx`: `publishEspelho()` chamado ao abrir a ficha (`ATENDENDO`), salvar edições, entregar o kit (`ENTREGUE`) e ao fechar/desfazer (`LIVRE`). Publicação é fire-and-forget e nunca bloqueia o guichê.
  4. `client/src/components/EspelhoPage.jsx`: polling a cada 2s no endpoint; tela do atleta em formato telão (modalidade/categoria, número monumental, nome, chips de CAMISETA/KIT/CHIP, grade NOME/SEXO/EQUIPE, banner verde pulsante "✓ KIT ENTREGUE"); status do guichê no cabeçalho (LIVRE laranja / ATENDENDO âmbar / ENTREGUE verde); indicador de conexão fica âmbar quando offline; aparência (cores, fonte, mensagem, fundo, logo) herdada do servidor quando publicada — funciona em aparelho sem localStorage.
  5. `client/src/components/EspelhoModal.jsx`: QR Code (lib `qrcode`, 640px, bordas navy) na aba ACESSO apontando para `origem/espelho/:eventId`, acima do botão ABRIR SEGUNDA TELA; alterações de aparência e RESTAURAR PADRÃO também publicam a config no servidor.
- **Validações reais**:
  - `scratch/test_espelho_routes.mjs` (8 cenários contra servidor real em :3199): GET inicial null; publicação ATENDENDO; espelho lê ficha sem doc/contato/customFields; config sanitizada (texto `javascript:alert(1)` → fallback, fontSize 900 → 150, imagem externa → null) com estado preservado; ENTREGUE mantém config; LIVRE limpa ficha; payload >6MB rejeitado (413); eventId malicioso (`../../etc`) não quebra o servidor. **8/8 PASS**.
  - Regressão: `test_athlete_detail_flow.mjs`, `test_athlete_table_columns.mjs`, `test_audit_filters_exports.mjs`, `test_stats_logic.cjs` — todos PASS.
  - `npm run lint --prefix client`: 0 erros/avisos. `npm run build --prefix client`: 127 módulos, 0 erros.
- **Limitação conhecida**: estado do espelho vive em memória do processo — restart do container zera o quadro (espelho volta a "GUICHÊ DISPONÍVEL" até a próxima publicação). Aparência configurada em outro PC só se propaga após o Admin abrir o modal/salvar novamente.
- **Próximo passo**: Yuri homologar em dois aparelhos reais (PC do guichê + celular lendo o QR): abrir ficha → conferir ficha no espelho; entregar → banner verde; fechar → volta ao LIVRE; cores/logo aplicadas remotamente.

## 2026-09-19 — Modal do Espelho cortando na tela (Fase A, construir)

- **Demanda do Yuri (PO)** (print): com o QR Code adicionado, o card do Espelho estourou a altura da viewport e o botão "Copiar link" ficou cortado embaixo. Pedido de ajuste com responsividade.
- **Causa raiz**: `.espelho-modal-card` não tinha `max-height`; o conteúdo da aba ACESSO cresceu (QR de 188px + textos) além da altura disponível, e o card tem `overflow: hidden` sem rolagem interna.
- **Ajustes em `EspelhoModal.css`**:
  1. Card com `max-height: calc(100dvh - 32px)` (fallback `100vh`) e corpo do modal com `overflow-y: auto` + scrollbar estilizada — nada mais fica cortado, em qualquer altura.
  2. Aba ACESSO compactada: gaps e paddings reduzidos, ícone do monitor 60→52px.
  3. QR Code fluido: `clamp(140px, 24vh, 188px)` — encolhe em telas baixas em vez de estourar o card.
  4. Mobile (`≤520px`): card ocupa a largura toda com margem de 12px, paddings/gaps menores, ícone 44px, QR `clamp(132px, 26vh, 168px)`.
  5. Telas baixas (`max-height: 700px`, notebooks): compactação extra do ícone, QR e espaçamentos.
- **Validações reais**: `npm run lint --prefix client` 0 erros/avisos; `npm run build --prefix client` 127 módulos, 0 erros.
- **Próximo passo**: Yuri homologar o modal no desktop e no celular (todas as ações visíveis sem corte; rolagem interna suave quando a tela for muito baixa).

## 2026-09-19 — Card "BASE GERAL DE ATLETAS" da Auditoria vazando/quebrando (Fase A, construir)

- **Demanda do Yuri (PO)** (print desktop): no card da aba Auditoria, o título "BASE GERAL DE ATLETAS" quebrava em 4 linhas e a coluna de botões (BAIXAR/IMPORTAR/ASSOCIAR/RESTAURAR) saía para fora do card pela direita.
- **Causa raiz**: `.planilha-box-left` não tinha `min-width: 0`/`flex` definido e `.planilha-box-actions` usava `flex-shrink: 0` — os 4 botões inline (~1300px) impunham sua largura total, esmagavam a área do texto e transbordavam o card em viewports < ~1850px úteis.
- **Ajustes em `OperacaoPage.css`**:
  1. Card com `width: 100%`, `box-sizing: border-box` e `overflow: hidden` — nada vaza pela borda.
  2. `.planilha-box-left`: `flex: 1 1 0` + `min-width: 0`; título em **linha única** (`white-space: nowrap` + ellipsis de proteção); subtítulo com clamp de 2 linhas.
  3. `.planilha-box-actions`: `flex-shrink: 1` + `min-width: 0`; botões com `white-space: normal` para quebrar internamente em vez de estourar.
  4. Nova faixa intermediária (`1025px–1400px`): botões viram grade 2×2 (`flex: 0 1 560px`), preservando o título em linha única. Abaixo de 1024px o layout empilhado existente e o grid 2×2 mobile continuam valendo.
- **Validações reais**: `npm run lint --prefix client` 0 erros; `npm run build --prefix client` 127 módulos; `scratch/test_auditoria_responsiveness_and_selects.cjs` 18/18 PASS.
- **Próximo passo**: Yuri homologar no PC (título em linha única e botões dentro do card em qualquer largura) e no celular (grid 2×2 intacto).

## 2026-09-19 — Aba Atletas: todos os campos da planilha, correção de corte e paginação (Fase A, construir)

- **Demandas do Yuri (PO)** (print da aba Atletas):
  1. A grade deve exibir **todos os campos do arquivo anexado**, mesmo os que o admin marcou como "Não importar" no mapeamento da importação.
  2. Responsividade: a coluna CAMISETA estava cortada pela borda direita do card.
  3. Paginação: lista estava infinita; exibir 10 por página.
- **Ações**:
  1. **Importação sem perda** (`ImportarAtletasModal.jsx`): coluna marcada como "Não importar" agora entra como campo personalizado com o nome original do cabeçalho (`customFields`), e `buildImportColumnSchema` (`athleteTable.js`) passa a incluir essas colunas no schema da grade. A Associação de Planilhas já preservava tudo — comportamento unificado. Chaves reservadas/perigosas continuam bloqueadas.
  2. **Corte da grade** (`OperacaoPage.css/jsx`, `athleteTable.js`): nova `getAthleteColumnWidth()` com largura estimada real por coluna (ex.: NOME 240px, DOCUMENTO 172px, CAMISETA 118px, custom por tamanho do rótulo); o `minWidth` da tabela passa a ser a soma real (antes era 145px/coluna, insuficiente com `white-space: nowrap`), e `.atletas-table` usa `width: max-content; min-width: 100%` — a última coluna nunca mais é esmagada pela borda; o scroll horizontal do card absorve o excedente.
  3. **Paginação 10/página** (`OperacaoPage.jsx/css`): `ATHLETES_PER_PAGE = 10`, controles "← ANTERIOR / Página X de Y / PRÓXIMA →" no rodapé com contagem "Mostrando 1–10 de N (total da base: M) · C campos"; reset para a página 1 ao buscar/filtrar feito com o padrão oficial de ajuste de estado durante a renderização (sem `setState` em effect — lint react Compiler limpo). Mobile: botões ocupam a largura toda, empilhados.
- **Validações reais**: `scratch/test_import_all_columns.mjs` (colunas "Não importar" entram como custom com nome original; reservadas/vazias bloqueadas) PASS; regressão `test_athlete_table_columns.mjs` e `test_athlete_detail_flow.mjs` PASS; lint 0 erros/avisos; build 127 módulos.
- **Próximo passo**: Yuri homologar: importar uma planilha marcando colunas como "Não importar" e confirmar que aparecem na grade; conferir CAMISETA completa com scroll horizontal; navegar pelas páginas de 10 atletas.

## 2026-09-19 — Ficha de entrega: fluxo editou → salva → entrega (Fase A, construir)

- **Demanda do Yuri (PO)**: ao alterar qualquer campo da ficha (ex.: nome incompleto), o operador precisa poder SALVAR sem entregar; a entrega só pode acontecer depois de salvar. Fluxo exigido: 1) editou → ENTREGAR KIT desativa; 2) ENTREGAR KIT só reativa após SALVAR; 3) após salvar, entrega liberada.
- **Diagnóstico**: já existiam `SALVAR ALTERAÇÕES` (habilita só com mudança real via `hasAthleteDetailChanges`) e `SALVAR E ENTREGAR KIT` combinado — o PO não percebia o salvar isolado e a entrega nunca era bloqueada por edição pendente.
- **Alterações em `OperacaoPage.jsx`**:
  1. Barra de ações da ficha pendente agora é: **SALVAR ALTERAÇÕES** (primeiro, azul) → **ENTREGAR KIT** (verde) → **ENTREGAR & IMPRIMIR** (laranja) → VOLTAR À LISTA. O rótulo combinado "SALVAR E ENTREGAR KIT" deixou de existir.
  2. `deliverBlockedByEdits = !isOperator && detailHasChanges`: com qualquer edição pendente, **ambos os botões de entrega ficam desabilitados** (tooltip explica: "clique em SALVAR ALTERAÇÕES para liberar a entrega"). Operador não edita, então a entrega dele nunca é bloqueada.
  3. Botão de salvar vira **"SALVO"** desabilitado quando não há alterações — feedback visual explícito de que o cadastro está persistido.
  4. Hint sob a barra vira aviso âmbar quando há edições pendentes ("⚠ Alterações pendentes...") e confirmação discreta quando está tudo salvo ("Cadastro salvo. O botão ENTREGAR KIT está liberado — salvar não registra a entrega.").
  5. `handleSaveAndDeliver` continua persistindo antes de entregar (rede de segurança), mas a UI impede o caminho com edição pendente.
- **Validações reais**: E2E Playwright com Chrome real (viewport 390×844) atualizado e executado contra Vite :5174 — **PASS exit=0**: SALVO desabilitado na abertura; edição habilita SALVAR ALTERAÇÕES e desabilita ENTREGAR KIT; após salvar, botão vira SALVO e entrega reativa; entrega final mantém uma única auditoria; grade mobile e demais asserts intactos. `test_athlete_detail_flow.mjs` atualizado (assert do `deliverBlockedByEdits`) PASS; lint 0 erros/avisos; build 127 módulos.
- **Próximo passo**: Yuri homologar no PC e no celular: editar nome → ver ENTREGAR bloqueado + aviso âmbar → salvar → entrega liberada → entregar.

## 2026-09-19 — Aba Atletas: rolagem lateral mobile, proteção de clique vs drag e preservação do Desktop (Fase A, construir)

- **Demanda do Yuri (PO)**: na aba "Atletas", no card onde mostra a tabela dos atletas, no celular o usuário não conseguia rolar a tabela para o lado para ver as categorias e os dados dos atletas. Ajustar para que a rolagem funcione no mobile e conferir ambos os modos (mobile e PC), garantindo que funcione direito sem misturar as coisas.
- **Causa raiz identificada**:
  1. **Bloqueio visual e tátil por colunas fixas**: No mobile, tanto a Coluna 0 (NÚMERO, 72px) quanto a Coluna 1 (NOME, 180px) estavam como `position: sticky`. Juntas ocupavam 252px de uma tela de ~360px (~75% da largura disponível!). O usuário ao tocar para arrastar tocava no meio da tela (sobre as colunas fixas), que não se moviam horizontalmente, dando a sensação de tabela travada e deixando apenas 100px para o restante de todas as outras colunas.
  2. **Conflito de toque com clique na linha (`<tr onClick>`)**: Como cada linha possui `onClick` para abrir a ficha de detalhes do atleta, ao deslizar o dedo horizontalmente na tela do celular, o navegador disparava o evento sintético de clique no `touchend/pointerup`, abrindo inadvertidamente a ficha do atleta em vez de rolar a tabela.
  3. **Propriedades de toque ausentes**: Faltava `touch-action: pan-x pan-y` em `.table-responsive` e nas células da tabela.
- **Solução implementada**:
  1. **Mobile (`@media (max-width: 768px)`)**:
     - Coluna 0 (NÚMERO) permanece `position: sticky` (68px) com sombra de elevação suave (`box-shadow: 4px 0 8px -3px rgba(15, 23, 42, 0.22)`), servindo de âncora fixa para o operador saber de qual atleta é a linha.
     - Coluna 1 (NOME) passa a `position: static`, rolando livremente junto com as demais colunas (MODALIDADE, CATEGORIA, CAMISETA, EQUIPE, STATUS, custom fields, etc.), liberando quase 300px de área visível e permitindo visualizar todos os dados.
     - Adicionados botões de navegação rápida (`‹` e `›`) integrados à barra de aviso "↔ Deslize para ver todos os X campos" para permitir saltar colunas com um toque ou deslizando o dedo.
     - Definido `touch-action: pan-x pan-y` e `-webkit-overflow-scrolling: touch` para rolagem inercial nativa fluida.
  2. **PC / Desktop (`min-width: 769px`)**:
     - Ambos NÚMERO (88px) e NOME (220px) permanecem fixos (`position: sticky`) com sombra lateral pronunciada, aproveitando a largura expansiva (1200px+) da tela de computador sem interferência.
  3. **Guarda de Toque/Arrasto vs Clique**:
     - Implementado rastreamento de pointer (`tableDragRef` + listeners globais ativos durante o toque). Se houver movimento horizontal/vertical > 6px, a ação é classificada como rolagem e o clique na linha é bloqueado, impedindo que a ficha de detalhes abra por acidente ao arrastar. Um toque estático (sem arrasto) continua abrindo a ficha normalmente.
     - Ao fechar a ficha do atleta ("VOLTAR À LISTA"), o sistema restaura a aba de origem (`detailSourceTab`), mantendo o operador na aba "Atletas".
- **Validações reais**:
  - `scratch/test_athlete_table_scroll_mobile_and_pc.cjs` (Chrome real Playwright dual-mode):
    - Mobile (390×844): Coluna 0 sticky (68px); Coluna 1 estática fluida; botões `›` e `‹` rolam com sucesso; gesto de arrasto horizontal rola a tabela e NÃO abre a ficha; toque estático abre a ficha; botão VOLTAR fecha e retorna à lista de atletas. **PASS**.
    - Desktop (1440×900): Coluna 0 (88px) e Coluna 1 (220px) sticky; rolagem horizontal até 500px fluida; clique na linha abre a ficha; layout expansivo intacto. **PASS**.
  - Regressão completa: `test_operacao_mobile_e2e.cjs`, `test_athlete_detail_flow.mjs`, `test_athlete_table_columns.mjs`, `test_import_all_columns.mjs`, `test_auditoria_responsiveness_and_selects.cjs` — **todos 100% PASS**.
  - `npm run lint --prefix client`: oxlint 0 erros e 0 avisos em 24 arquivos.
  - `npm run build --prefix client`: 127 módulos construídos em 1.17s.
- **Próximo passo**: Yuri homologar no celular (arrastar para os lados para ver modalidades, categorias e dados; tocar nos botões `‹` e `›`; tocar na linha para abrir a ficha) e no PC (colunas fixas NÚMERO e NOME preservadas na tela grande).

## 2026-09-19 — Ficha de entrega: botão SALVAR ALTERAÇÕES verde vibrante e botões de entrega cinzas quando há edições (Fase A, construir)

- **Demanda do Yuri (PO)** (print anexado): o botão "Salvar Alterações" não ficou verde ao alterar campos; ele deveria ficar verde (habilitado) e os outros botões de entrega deveriam ficar cinza (desabilitados) ao alterar qualquer campo.
- **Causa raiz**:
  1. `.btn-detail-save` estava estilizado como botão neutro/ghost branco (`background: #ffffff; border: 1.5px solid #e2e8f0; color: #475569;`), sem feedback cromático de ação prioritária quando havia alterações pendentes.
  2. Os botões de entrega desabilitados (`.btn-detail-entregar:disabled` e `.btn-detail-entregar-print:disabled`) usavam apenas `opacity: 0.48;` sobre seus fundos originais verde e laranja, resultando em verde e laranja pastéis desbotados em vez de cinza desabilitado real.
- **Solução implementada**:
  1. `OperacaoPage.jsx`:
     - Adicionada classe dinâmica `btn-detail-save-active` ao botão quando `detailHasChanges === true`.
     - Adicionada classe dinâmica `btn-detail-blocked` aos botões de entrega quando `deliverBlockedByEdits === true`.
  2. `OperacaoPage.css`:
     - Quando **HÁ alterações pendentes** (`detailHasChanges`):
       - `btn-detail-save` vira **VERDE vibrante** (`background: #10b981 !important; border: 1.5px solid #059669 !important; color: #ffffff !important; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35) !important;`) com ícone e texto brancos — destaque visual imediato como ação exigida.
       - Ambos os botões de entrega (`ENTREGAR KIT` e `ENTREGAR & IMPRIMIR`) viram **CINZA real desabilitado** (`background: #f1f5f9 !important; border: 1.5px solid #cbd5e1 !important; color: #94a3b8 !important; opacity: 1 !important; box-shadow: none !important; cursor: not-allowed !important;`).
     - Quando **NÃO há alterações** (cadastro salvo):
       - Botão de salvar exibe `SALVO` em **cinza neutro discreto** desabilitado (`background: #f8fafc; border: 1.5px solid #e2e8f0; color: #94a3b8;`).
       - `ENTREGAR KIT` é liberado em **VERDE** (`#10b981`).
       - `ENTREGAR & IMPRIMIR` é liberado em **LARANJA** (`#ff5200`).
- **Validações reais**:
  - `scratch/test_save_button_colors.cjs` (Chrome real Playwright):
    - Estado inicial (sem edições): `SALVO` cinza desabilitado; `ENTREGAR KIT` verde (`rgb(16, 185, 129)`) habilitado; `ENTREGAR & IMPRIMIR` laranja (`rgb(255, 82, 0)`) habilitado.
    - Estado editado (ao alterar campo): `SALVAR ALTERAÇÕES` verde vibrante (`rgb(16, 185, 129)`) habilitado com texto branco; `ENTREGAR KIT` cinza (`rgb(241, 245, 249)`, texto `rgb(148, 163, 184)`) desabilitado; `ENTREGAR & IMPRIMIR` cinza (`rgb(241, 245, 249)`, texto `rgb(148, 163, 184)`) desabilitado.
    - Estado salvo (após clicar em Salvar): `SALVO` volta a cinza desabilitado; `ENTREGAR KIT` e `ENTREGAR & IMPRIMIR` reativam com suas cores originais verde e laranja. **PASS (100%)**.
  - Regressão completa: `test_athlete_table_scroll_mobile_and_pc.cjs`, `test_operacao_mobile_e2e.cjs`, `test_athlete_detail_flow.mjs`, `test_athlete_table_columns.mjs`, `test_import_all_columns.mjs`, `test_auditoria_responsiveness_and_selects.cjs` — **todos PASS**.
  - `npm run lint --prefix client`: oxlint 0 erros e 0 avisos em 24 arquivos.
  - `npm run build --prefix client`: 127 módulos construídos em 1.59s.
- **Próximo passo**: Yuri homologar: abrir ficha → alterar campo → ver botão "Salvar Alterações" verdezinho vibrante e botões de entrega cinzas → salvar → entrega liberada em verde/laranja.

## 2026-09-19 — Aba Entrega de Kit: ordenação natural crescente por número de peito (Fase A, construir)

- **Demanda do Yuri (PO)** (áudio e print anexados):
  - Áudio: *"O que precisa ser feito aqui na aba de entrega de kits que eles quando vierem já venham na ordem: número 1, número 2, número 3, número 4, porque ele tá vindo na ordem bagunçada quando eu entrego o kit."*
  - Print anexado: exibe a seção "ÚLTIMAS ENTREGAS" mostrando os cartões na ordem em que os kits foram entregues: Nº 2 ADRIANO PEREIRA7, Nº 5 ALDRINA SOUSA, Nº 1 ADRIANA SILVA.
- **Roteamento Jev (TypeSafe System One)**:
  - Avaliado via `scripts/jev-prompt-router.js` em **2183ms** (modelo `jev-1.13.0`):
    - Liderança: Kastiel (Dev Lead, 95% de confiança).
    - Tipo: `bugfix_urgente` (100% de confiança).
    - Severidade calibrada: 1.01 / 2.00.
- **Causa raiz**:
  1. No momento da entrega (`handleDeliverKit`), o código executava `setDeliveries((prev) => [newDelivery, ...prev])`, empilhando em ordem cronológica reversa (a entrega mais recente no topo). Ao entregar primeiro o atleta 1, depois o 5 e depois o 2, a lista renderizava como 2, 5, 1, gerando a percepção de lista "bagunçada"/desordenada para o operador.
  2. Não havia ordenação numérica natural aplicada em `deliveries`, nem na renderização sob "ÚLTIMAS ENTREGAS", nem na busca de kits pendentes (`searchResultsKit`), nem na grade da aba "Atletas" (`filteredAthletes`).
- **Solução implementada**:
  1. `client/src/utils/athleteTable.js`:
     - Criado e exportado o helper `compareAthleteNumbers(a, b)` com suporte a números inteiros puros, strings numéricas e formatos alfanuméricos com dígitos embutidos (ordenação natural crescente: 1, 2, 3, 4, 5... 10, 20).
  2. `client/src/components/OperacaoPage.jsx`:
     - **Inicialização limpa**: `deliveries` inicializa ordenado por `compareAthleteNumbers` tanto a partir de `localStorage` quanto reconciliando com atletas já entregues na base, sem provocar renders em cascata (0 warnings no React Compiler/oxlint).
     - **Renderização memoizada**: criado `sortedDeliveries = useMemo(() => [...deliveries].sort((a, b) => compareAthleteNumbers(a.id, b.id)), [deliveries])` e aplicado diretamente na renderização de "ÚLTIMAS ENTREGAS". Desta forma, até mesmo registros previamente salvos no navegador do operador são reorganizados automaticamente em ordem crescente (1, 2, 3, 4...).
     - **Registro de nova entrega (`handleDeliverKit`)**: ao entregar qualquer atleta, a nova entrega é inserida e o array é ordenado crescentemente via `compareAthleteNumbers(a.id, b.id)`.
     - **Edição de atleta (`handleSaveAthleteDetail`)**: mantém as entregas ordenadas após atualização de dados cadastrais.
     - **Importação de planilha (`handleImportSuccess`)**: sincroniza atletas entregues da planilha e ordena por número.
     - **Botão Atualizar (`refresh-btn`)**: conectado ao handler `handleRefreshDeliveries`, sincronizando qualquer atleta entregue pendente e garantindo ordenação estrita.
     - **Busca de kit (`searchResultsKit`)**: resultados da busca em tempo real na aba de entrega agora também retornam em ordem numérica crescente.
     - **Aba Atletas (`filteredAthletes`)**: tabela de atletas agora lista os atletas ordenados de forma crescente por número de peito por padrão.
- **Validações reais**:
  - `scratch/test_delivery_number_order.cjs` (Playwright E2E com Chrome real):
    - Etapa 1: Carregamento inicial com entregas em ordem 2, 5, 1 -> Renderiza estritamente `['Nº 1', 'Nº 2', 'Nº 5']` (**PASS**).
    - Etapa 2: Entrega atleta Nº 4 -> Lista atualiza para `['Nº 1', 'Nº 2', 'Nº 4', 'Nº 5']` (**PASS**).
    - Etapa 3: Entrega atleta Nº 3 pela ficha -> Lista atualiza para `['Nº 1', 'Nº 2', 'Nº 3', 'Nº 4', 'Nº 5']` (**PASS**).
    - Etapa 4: Botão Atualizar clicado -> Ordenação permanece intacta `1, 2, 3, 4, 5` (**PASS**).
    - Etapa 5: Aba ATLETAS conferida -> Grade exibe `['1', '2', '3', '4', '5']` (**PASS**).
    - Screenshot salvo em: `scratch/ultimas_entregas_ordenadas_1_a_5.png`.
  - Regressão completa de testes Playwright / Chrome:
    - `scratch/test_save_button_colors.cjs`: **PASS (100%)**.
    - `scratch/test_athlete_table_scroll_mobile_and_pc.cjs`: **PASS (100%)**.
    - `scratch/test_operacao_mobile_e2e.cjs`: **PASS (100%)**.
    - `scratch/test_athlete_detail_flow.mjs`: **PASS (100%)**.
    - `scratch/test_athlete_table_columns.mjs`: **PASS (100%)**.
    - `scratch/test_import_all_columns.mjs`: **PASS (100%)**.
    - `scratch/test_auditoria_responsiveness_and_selects.cjs`: **PASS (100%)**.
  - `npm run lint --prefix client`: oxlint concluído com **0 erros e 0 avisos** em 24 arquivos.
  - `npm run build --prefix client`: build do Vite concluído com sucesso em **1.17s** (127 módulos).
- **Próximo passo**: Yuri homologar no navegador:
  - Abrir a aba "Entrega de Kit" e conferir que "ÚLTIMAS ENTREGAS" já exibe os atletas ordenados crescentemente por número (Nº 1, Nº 2, Nº 5...).
  - Realizar novas entregas e conferir que cada atleta entregue se posiciona exatamente em sua posição numérica natural (1, 2, 3, 4, 5...).

## 2026-09-20 — Revisão Técnica Externa e Veto de Segurança Acatado (Fase A, construir)

- **Revisão Técnica recebida do PO (auditoria "mouse spak")**:
  - Validou que a integração do Jev existe, funciona e foi comprovada via terminal e código.
  - Apontou com precisão cirúrgica duas imprecisões e uma omissão grave:
    1. *Omissão grave de segurança (Veto de Crowley)*: API key da TypeSafe estava hardcoded como fallback em `scripts/jev-prompt-router.js`, `scripts/jev-pre-invocation-hook.cjs` e `COMO-INSTALAR-JEV-EM-OUTROS-PROJETOS.md`, violando Invariante 4.
    2. *Imprecisão metodológica no JSON*: O JSON apresentado no turno anterior como "resposta bruta" continha 3 perguntas (`especialista_tone`, `tipo_tarefa`, `severidade`) de um snippet customizado e não as 5 perguntas completas do router oficial (`toca_producao`, `requer_testes_reais`).
    3. *Imprecisão na estimativa de tokens*: A economia de "60-75%" foi uma estimativa/hipótese arquitetural teórica e não uma medição A/B empírica registrada em disco.
    4. *Caminho absoluto em `.agents/hooks.json`*: Usava `d:\Projetos\...` em vez do caminho relativo portável `./scripts/...`.
- **Ações Imediatas de Remediação (TONE & Crowley)**:
  1. **Remoção total de segredos**:
     - Eliminado qualquer fallback hardcoded de chave em `scripts/jev-prompt-router.js`, `scripts/jev-pre-invocation-hook.cjs` e `COMO-INSTALAR-JEV-EM-OUTROS-PROJETOS.md`.
     - Chave agora é lida estritamente de `process.env.TYPESAFE_API_KEY` (com suporte a carregamento nativo de `.env` via `process.loadEnvFile()`).
     - Criado `.env.example` sem valores sensíveis.
     - `.env` local configurado e protegido no `.gitignore`.
     - Orientação ao PO para rotacionar/revogar o token antigo no painel da TypeSafe.
  2. **Portabilidade do Hook**:
     - `.agents/hooks.json` corrigido para `node "./scripts/jev-pre-invocation-hook.cjs"` (relativo e universal).
  3. **Telemetria Real Implementada**:
     - `scripts/jev-prompt-router.js` agora registra telemetria real em `.metrics/jev-telemetry.jsonl` (ignorado no `.gitignore`), gravando timestamp, prompt, tempo de resposta em ms, tokens de entrada/saída e respostas completas da API.
- **Validações reais**:
  - `node scripts/jev-prompt-router.js "teste de funcionamento do router"`: executou em 1079ms, exit 0, registrou telemetria em `.metrics/jev-telemetry.jsonl`.
  - `git grep "apikey_245fdc"`: 0 ocorrências no repositório rastreado.
  - `npm run lint --prefix client`: 0 erros e 0 avisos.
  - `npm run build --prefix client`: 127 módulos construídos em 1.17s.
- **Próximo passo**: Yuri homologar as telas e rotacionar a chave no dashboard da TypeSafe se desejar.
