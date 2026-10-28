# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem / fase:** 2026-10-28 · Codex/Tony (UI, QA/segurança e Ulisses em subagentes) · Fase A; commits `67352ed..d93859b`.
- **Pedido / entrega:** administrador secundário isolado; `TEAM_ADMIN`, equipe/autoria no servidor, principal global e legado no principal; rotas, sessões e cache protegidos. Arquivos e decisões: `docs/admin-equipes-2026-10-28.md`.
- **Validação real:** servidor 49/49, client 70/70, lint exit 0 (4 avisos existentes), build final e diff check ok; navegador sintético confirma principal global, Alfa isolada e URL Beta recusada.
- **Riscos / pendências:** schema Appwrite legado não guarda equipe; eventos de equipe persistem no volume, sem espelhar metadados. Recuperação exige backup local completo; rollback antigo perde isolamento. Sem deploy.
- **Continuidade:** AI Memory gravado em `decisoes/admin-equipes-2026-10-28.md`; evidência visual em `docs/evidencias/admin-equipe-alfa-2026-10-28.png`.
- **Próximo passo:** Yuri homologar candidato na branch `codex/admin-equipes`; publicação depende de autorização e plano operacional. Fase C não iniciada.

## Penúltima atualização

- **Quando / quem:** 2026-10-21 · Claude Code (Opus 5.5) · Fase B (homologação do Yuri).
- **Pedido:** Espelho → Campos do Telão: os nomes dos campos apareciam cortados com "…"; ver o nome inteiro, mesmo que a tela cresça e precise rolar.
- **Entrega:** `client/src/components/EspelhoModal.css`: nome e descrição dos cartões e itens quebram linha em vez de cortar; cartões um pouco mais largos (230 px / 210 px mínimos); caixa de seleção e etiqueta alinhadas ao topo quando o texto ocupa duas linhas. Só CSS.
- **Validação real:** navegador local, aba Campos do Telão: 22 nomes, 0 cortados no computador e no celular (375 px), sem rolagem lateral, lista rola na vertical; teste de integridade do CSS ok; build ok.
- **Riscos / pendências:** nenhum novo; continua valendo conferir em Eventos se algum evento ficou "CARREGANDO..." (registro anterior).
- **Próximo passo:** Yuri conferir a aba Campos do Telão.

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

- 2026-10-28 · Codex/Tony · Equipes administrativas isoladas; candidato local `d93859b`, sem deploy.
- 2026-10-21 · Claude Code · Espelho: nomes dos campos do telão inteiros (sem corte).
