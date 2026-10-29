# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem / fase:** 2026-10-28 · Claude Code (Opus 5.5) · Fase B; código `d72f6ba..07d9a90`.
- **Pedido:** Super admin clicar no Sub-admin, entrar no ambiente dele, ver/editar tudo e voltar ao próprio. Respostas do Yuri: só Sub-admin; ações ficam em nome do Sub-admin, sem trilha; ele não é avisado; sem limite além da sessão normal.
- **Entrega:** `POST /api/users/:id/entrar` (sessão como o Sub-admin com `impersonatedBy`; cai se quem visita perder o acesso); nome clicável e botão "Entrar no ambiente" em Usuários; faixa "Voltar ao meu ambiente" (`VisitBanner`, `visitSession.js`).
- **Validação:** servidor 59/59 (novo `entrarAmbiente.http.test.mjs`), client 86/86, build ok; navegador local: entrou no Carlos, viu só os 2 eventos e os usuários dele, recarregou com a faixa, voltou ao dono com a lista completa; celular ok.
- **Risco/próximo:** sem trilha de quem agiu na visita (decisão do Yuri). Yuri conferir em produção.

## Penúltima atualização

- **Quando / quem / fase:** 2026-10-28 · Claude Code (Opus 5.5) · Fase B; código `929043b..f1ddaaf`.
- **Pedido:** Yuri liberou completar a tela de Usuários ("pode fazer, você já sabe").
- **Entrega:** busca por nome/e-mail/evento em todas as abas (diz em qual aba está); "Cadastrado por" no cartão; resumo do Sub-admin com eventos, usuários e kits entregues (%); botão "Usuário para <Sub-admin>" cria perfil de evento num evento dele (entra na equipe). Cartão sem rolagem lateral no celular. Só client.
- **Validação:** client 84/84, lint/build ok; navegador local: Médica criada pela aba do Carlos ficou na equipe dele (conferido na API), busca acha em outra aba, celular sem estouro.
- **Próximo passo:** Yuri conferir em produção.

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

- 2026-10-28 · Claude Code · Super admin entra no ambiente do Sub-admin e volta.
- 2026-10-28 · Claude Code · Usuários: busca, cadastrado por, totais e usuário na aba do Sub-admin.
