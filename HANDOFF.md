# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem / fase:** 2026-10-28 · Claude Code (Opus 5.5) · Fase B; código `c78e7ff..b52d18d`.
- **Pedido / causa:** sub-admin continuava vendo tudo. O isolamento existia só no perfil novo (TEAM_ADMIN); SUB-ADMIN/ADMIN antigos com "todos os projetos" seguiam globais e não havia conversão.
- **Entrega:** `POST /api/users/:id/isolar` (só principal) converte o antigo em Sub-admin isolado com os eventos marcados (e usuários deles/criados por ele); tela: "SUB-ADMIN" = isolado, "GERENTE DE EVENTO" = sub-admin de um evento, antigos marcados "VÊ TUDO" com botão ISOLAR.
- **Validação real:** servidor 51/51 (novo `subadminIsolar.http.test.mjs`), client 75/75, lint/build ok; navegador local: antigo via 3 eventos → isolado pela tela com 2 → vê 2 e seus usuários; principal segue com 3.
- **Próximo passo:** Yuri, em Usuários, clicar ISOLAR COMO SUB-ADMIN em cada sub-admin antigo e marcar os eventos dele.

## Penúltima atualização

- **Quando / quem / fase:** 2026-10-28 · Codex/Tony, com UI, QA/Crowley e Ulisses/Vitor em subagentes · Fase A/B; código `67352ed..fbc795d`.
- **Pedido / entrega:** Yuri autorizou publicar equipes e corrigir Usuários do sub-admin; redirecionamento indevido reproduzido/corrigido, recarga entre abas estabilizada, gate de equipes e rollback compatível. Detalhes: `docs/publicacao-admin-equipes-2026-10-28.md`.
- **Validação real:** servidor 50/50, client 75/75, lint exit0 (4 avisos existentes), build/sintaxe bash/diff ok; navegador local reproduziu falha antiga e Usuários estável no candidato, com evidência sintética.
- **Publicação:** runtime `fbc795d`, Actions `40789978678` success; dois domínios HTTP200 com bundle `index-Dl7Ksvzp.js`; snapshots/hash e manifesto/API preservaram 1 evento, 16.481 atletas e 865 entregas.
- **Riscos / continuidade:** backup completo no volume obrigatório para equipes; Appwrite legado sem vínculo. Gate impede equipes durante validação, rollback antigo vetado se houver equipes; AI Memory atualizado em `decisoes/admin-equipes-2026-10-28.md`.
- **Próximo passo:** Yuri conferir Usuários com sub-admin real e homologar administradores de equipe; sem teste destrutivo/cadastro real em produção; Fase C não iniciada.

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

- 2026-10-28 · Claude Code · Sub-admin antigo pode ser isolado pela tela; perfis renomeados (Sub-admin / Gerente de evento).
- 2026-10-28 · Codex/Tony · Administradores de equipe isolados publicados (`d93859b..fbc795d`).
