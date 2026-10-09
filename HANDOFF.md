# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. Ao encerrar, **sobrescreva "Última sessão"** e acrescente 1 linha no topo de "Últimas entregas".
> 3. Mantenha no máximo 8 linhas em "Últimas entregas"; a mais antiga vai para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última sessão

- **Quando / quem:** 2026-10-09 · Antigravity (TONE).
- **O que fez:** Sincronização em tempo real das entregas e operadores no ambiente do Super Admin: (1) polling reativo de 5s em `syncEventsWithServer()` e na listagem de usuários com trava de aba oculta (`visibilityState`); (2) contagem dinâmica de entregas por usuário calculada na memória sem tocar `users.json`; (3) métrica real de operadores ativos no Dashboard geral e do evento (removido valor fixo '1'); (4) cabeçalho anti-cache (`no-store, no-cache`) em todas as rotas `/api` e nas requisições GET do cliente; (5) fallback inteligente para eventos `EM OPERAÇÃO` quando logado como Super Admin sem evento na URL.
- **Por quê:** O Super Admin não recebia atualizações das entregas que os operadores estavam realizando em tempo real no evento em andamento.
- **Validação real:** `node --test server/*.test.mjs` (15/15), `node --test client/src/utils/*.test.mjs` (38/38), lint client (0 erros), build client (1.53s). Teste novo `server/admin-users.test.mjs` valida anti-cache e contagem dinâmica de entregas em tempo real.
- **Risco:** Zero risco aos dados em produção; cálculo de entregas é feito em memória na leitura. Polling respeita `visibilityState` para evitar sobrecarga.
- **Próximo passo:** Yuri homologar no perfil de Super Admin acompanhando as entregas ao vivo.

## Estado atual (verificado em 2026-09-28)

- **Produção:** `https://app.entregasrun.com.br` (VPS, Docker `entregas-run-web`, porta local 3050). Deploy = push na `main` → GitHub Actions (`.github/workflows/deploy.yml`): validação, snapshot com hash, healthcheck e rollback automáticos. O Yuri autorizou push na `main` ao fim de cada ajuste validado.
- **Admin principal:** `agneraraujo@hotmail.com` (definido por `ADMIN_EMAIL` no `.env` da VPS; não pode ser removido/desativado). Trocar: workflow manual `set-admin-email.yml`.
- **Jev:** desligado (sem gancho em `.claude/settings.json` e `.agents/hooks.json`). Código mantido em `scripts/jev-*` e instalador `D:\Projetos\Clientes\INSTALAR-JEV-AQUI.ps1` para reativar se surgir uso que desvie trabalho do modelo caro.
- **Medição de tokens:** gancho `Stop` do Claude Code grava tokens por resposta em `.metrics/jev-claude-usage.jsonl` (local, não gasta tokens).
- **Fotos da retirada:** `data/fotos-retirada/` na VPS, fora do backup de deploy, apagadas 7 dias após a corrida.
- **Testes no CI:** client `node --test` (utils, inclui integridade de CSS) e server `node --test` (admin, sync, snapshot, fotos).

## Pendências abertas

- Yuri: apagar o usuário Felipe (`pacetime@entregas.com`) pela tela; confirmar login do Agner em produção.
- Backups em `/opt/entregas-run/backups` sem rotação (crescem a cada deploy) — tarefa separada criada, exige confirmação do PO.
- Fallback de senha de admin hardcoded em `server/server.js` (`ADMIN_PASSWORD`) — tarefa separada aberta em 28/09; conferir se foi concluída.
- Homologação no iPhone real: câmera/foto da retirada, zoom afastado em Eventos/Usuários, teclado com a barra inferior.

## Últimas entregas (mais recente primeiro)

- 2026-10-09 · Antigravity (TONE) · Atualizações em tempo real de entregas e operadores ativos para Super Admin (polling, anti-cache e métricas).
- 2026-10-09 · Claude Code · DESFAZER mantém chip de planilha já associada; só desassocia o que foi associado no sistema.
- 2026-10-07 · Claude Code · Volta à busca limpa após entregar em todo evento (não só com planilha de kits).
- 2026-10-07 · Claude Code · Espelho limpa (LIVRE) ao entregar o kit e só mostra o próximo ao abri-lo.
- 2026-09-28 · Claude Code · Jev desligado; HANDOFF enxuto + arquivo em `docs/handoff/`.
- 2026-09-28 · Claude Code · Admin principal só por `ADMIN_EMAIL`; troca para o Agner via workflow (`313e3c6`).
- 2026-09-28 · Claude Code · "Retirado por" sozinho não exige salvar (`da1c244`); ficha abre no topo + SALVAR embaixo (`857e38c`).
- 2026-09-28 · Claude Code · Jev integrado ao Claude Code e correção do encerramento no Windows (`1908645`) — depois desligado por não gerar economia.
