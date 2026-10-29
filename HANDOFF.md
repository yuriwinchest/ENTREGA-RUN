# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem / fase:** 2026-10-28 · Claude Code (Opus 5.5) · Fase B; código `2a4363d..e699d91`.
- **Pedido:** dono quer criar outro Super admin com login próprio (sem emprestar o dele), que suspenda, troque senha e exclua qualquer usuário.
- **Entrega:** Super admin = ADMIN com `superAdmin` (só o dono cria, opção SUPER ADMIN na tela). Acesso total como o dono; gerencia todos, inclusive outro Super admin; a conta dona (ADMIN_EMAIL) só o próprio dono altera. Sessão/login expõem `isOwner`.
- **Validação:** servidor 58/58 (novo `superAdmin.http.test.mjs`), client 79/79, lint/build ok; navegador local: dono criou Super admin pela tela; logado como ele, vê tudo e tem botões em todos, menos no dono.
- **Próximo passo:** Yuri criar o Super admin real em Usuários e entregar o login a quem vai administrar.

## Penúltima atualização

- **Quando / quem / fase:** 2026-10-28 · Claude Code (Opus 5.5) · Fase B; código `d1749fb..33934ec`.
- **Pedido:** tela de perfis confusa. Modelo do Yuri: Super admin = só a conta dona (não se cria pela tela); Sub-admin faz tudo, mas só nos eventos dele e dos usuários dele; "Gerente de evento" desnecessário.
- **Entrega:** criação mostra Sub-admin (topo), Operador, Supervisor e Médico, com texto explicando Super admin × Sub-admin; "Gerente de evento"/"Admin do principal" só aparecem na edição de quem já os tem. Só client (`UsuariosPage`).
- **Validação:** client 79/79, lint/build ok; navegador local no celular: lista e texto conferidos.
- **Próximo passo:** Yuri criar um Sub-admin e entrar com ele para conferir que só vê os próprios eventos.

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

- 2026-10-28 · Claude Code · Dono cria Super admins com login próprio e acesso total.
- 2026-10-28 · Claude Code · Perfis simplificados: Super admin (dono) e Sub-admin; "Gerente de evento" sai da criação.
