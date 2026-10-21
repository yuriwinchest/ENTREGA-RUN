# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem:** 2026-10-21 · Codex/Tony (implementação e navegador), Teclide/Codex (testes), Ulisses/Codex (revisão de premissas) · Fase B.
- **Pedido:** Corrigir erro ao clicar em Entregar kits em um evento; foto do console enviada pelo Yuri confirmou QuotaExceededError na chave de cache de kits.
- **Causa:** O efeito que gravava kits no localStorage não tratava a exceção de quota; o ErrorBoundary substituía a operação pela tela de erro.
- **Arquivos:** client/src/components/OperacaoPage.jsx; client/src/utils/kitCache.js; client/src/utils/kitCache.test.mjs; .github/workflows/deploy.yml; HANDOFF.md; docs/handoff/2026-10.md.
- **Entrega:** Cache de kits passa a ser opcional e protegido contra falha de armazenamento; servidor continua sendo fonte de dados. Nenhum cache, sessão, entrega ou atleta é apagado. Correção isolada em codex/corrigir-entregar-kits, baseada na main 663fd70.
- **Validação real:** Cliente 49/49; lint sem erros (3 avisos preexistentes); build aprovado; git diff --check aprovado. Navegador local com API sintética e QuotaExceededError simulado reproduziu a mesma tela antes e abriu operação, busca e ficha após a correção. Evidência local: scratch/entrega-quota-corrigida.png.
- **Riscos / pendências:** Sem push/deploy nesta entrega; publicação e homologação do evento real pendentes. Sem cache novo de kits enquanto o navegador estiver sem espaço; leitura/salvamento no servidor preservados. Falha distinta de avatar investigada foi retirada do escopo após a foto confirmar a causa.
- **Próximo passo:** Autorizar publicação pelo pipeline com healthcheck e rollback; Yuri homologar o evento afetado.

## Penúltima atualização

- **Quando / quem:** 2026-10-21 · Antigravity (TONE) · Fase A (Construção).
- **Pedido:** Correção de tela branca ("fundo branco") ao clicar em "ENTREGAR KITS" em eventos com atletas na página `/operacao/:eventId`.
- **Diagnóstico e Causa Raiz:** No carregamento de eventos com atletas cujos dados continham campos numéricos (como tamanho de camiseta `14` ou modalidade `5`, comuns em planilhas Excel reais), o hook `useMemo` de `camisetaStats` e `modalidadeStats` em `OperacaoPage.jsx` tentava chamar `.trim()` diretamente em valores numéricos (`(14).trim()`), disparando `TypeError: ...trim is not a function`. Como a árvore de componentes não possuía um React `ErrorBoundary`, o erro não tratado forçava o desmonte total do `#root`, resultando em tela totalmente branca. Adicionalmente, quando o ID do evento era acessado antes do término do sync da lista no `App.jsx`, a página não dispunha de fallback resiliente.
- **Arquivos / entrega:** `client/src/components/OperacaoPage.jsx` (coerção segura de `camiseta`, `modalidade`, `nome`, `entreguePara`, `operadores` para `String` antes de `.trim()` e ordenação), `client/src/utils/athleteTable.js` (inclusão de `idade` em `STANDARD_COLUMNS` e `COLUMN_WIDTHS`), `client/src/components/ErrorBoundary.jsx` (novo componente de captura de erro resiliente com interface temática Entregas RUN e botões de recarga e retorno), `client/src/App.jsx` (integração do `ErrorBoundary` e fallback seguro para eventos em carregamento).
- **Validação:** [verificado] Reprodução com Chrome Headless CDP (`test_local_repro.mjs`): comprovada a falha inicial (`ROOT HTML LENGTH: 0`) e confirmada a renderização completa após a correção (`ROOT HTML LENGTH: 10591`). Suite de testes do client: 41/41 aprovados; suite do server: 27/27 aprovados; linter `oxlint` 0 erros; build Vite concluído com sucesso.
- **Riscos / pendências:** Nenhum. A renderização agora é defensiva contra qualquer tipo primitivo vindo de planilhas importadas ou APIs.
- **Próximo passo:** Subir para produção e Yuri homologar a navegação em `/operacao/:eventId`.

## Estado atual (verificado em 2026-09-28)

- **Produção:** `https://app.entregasrun.com.br` e `https://entregasrunning.com.br` (VPS, Docker `entregas-run-web`, porta local 3050). Deploy = push na `main` → GitHub Actions (`.github/workflows/deploy.yml`): validação, snapshot com hash, healthcheck e rollback automáticos. O Yuri autorizou push na `main` ao fim de cada ajuste validado.
- **Admin principal:** `agneraraujo@hotmail.com` (definido por `ADMIN_EMAIL` no `.env` da VPS; não pode ser removido/desativado). Trocar: workflow manual `set-admin-email.yml`.
- **Jev:** desligado (sem gancho em `.claude/settings.json` e `.agents/hooks.json`). Código mantido em `scripts/jev-*` e instalador `D:\Projetos\Clientes\INSTALAR-JEV-AQUI.ps1` para reativar se surgir uso que desvie trabalho do modelo caro.
- **Medição de tokens:** gancho `Stop` do Claude Code grava tokens por resposta em `.metrics/jev-claude-usage.jsonl` (local, não gasta tokens).
- **Fotos da retirada:** `data/fotos-retirada/` na VPS, fora do backup de deploy, apagadas 7 dias após a corrida.
- **Testes no CI:** client `node --test` (utils, inclui integridade de CSS) e server `node --test` (admin, sync, snapshot, fotos).

## Pendências abertas

- Yuri: apagar o usuário Felipe (`pacetime@entregas.com`) pela tela; confirmar login do Agner em produção.
- Backups em `/opt/entregas-run/backups` sem rotação (crescem a cada deploy) — tarefa separada criada, exige confirmação do PO.
- Fallback de senha de admin hardcoded em `server/server.js` (`ADMIN_PASSWORD`) — tarefa separada aberta em 28/09; conferir se foi concluída.
- AI Memory fora do ar em 2026-10-20 (ECONNREFUSED): sincronizar o registro da emergência médica quando voltar.
- Emergência médica: definir retenção (LGPD) de dados de saúde e ocorrências; rotação de backups agora também protege dado de saúde.
- Homologação no iPhone real: câmera/foto da retirada, zoom afastado em Eventos/Usuários, teclado com a barra inferior.

## Últimas entregas (mais recente primeiro; anteriores em `docs/handoff/2026-10.md`)

- 2026-10-21 · Codex/Tony · Corrigida quebra ao abrir Entregar kits por quota de cache esgotada; 49 testes e navegador local aprovados, publicação pendente.
- 2026-10-21 · Antigravity (TONE) · Correção de tela branca na Operação ao abrir evento (coerção segura de tipos numéricos e ErrorBoundary).
