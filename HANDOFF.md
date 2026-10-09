# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. Ao encerrar, **sobrescreva "Última sessão"** e acrescente 1 linha no topo de "Últimas entregas".
> 3. Mantenha no máximo 8 linhas em "Últimas entregas"; a mais antiga vai para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última sessão

- **Quando / quem:** 2026-10-09 · Claude Code (Opus 5.5).
- **O que fez:** DESFAZER de uma entrega agora respeita a origem da associação — planilha importada já associada desfaz só a entrega e mantém número/chip/QR; associação feita no sistema (duas planilhas + leitura do QR, marca `_kitPreviousNumero`) desfaz entrega e associação. Após desfazer, volta para a busca com aviso. DESFAZER não aparece em atleta de planilha já associada ainda não entregue (apagaria dados da planilha). Regra em `client/src/utils/athleteDetail.js` (`undoDeliveryChanges`, `wasAssociatedInApp`) + testes.
- **Por quê:** o DESFAZER apagava sempre chip/QR, inclusive de planilhas importadas já associadas.
- **Validação real:** servidor local: atleta de planilha associada → entregar → desfazer → servidor `PENDENTE`, nº 95, chip 7791, QR mantidos; atleta de duas planilhas → associar Q300 → entregar → desfazer → servidor `PENDENTE` sem nº/chip/QR; ambos voltaram à busca. `node --test` 38/38, lint 0, build ok.
- **Risco:** atleta associado no sistema antes de 25/09/2026 (sem a marca) seria tratado como planilha associada no DESFAZER.
- **Próximo passo:** Yuri homologar os dois cenários.

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

- 2026-10-09 · Claude Code · DESFAZER mantém chip de planilha já associada; só desassocia o que foi associado no sistema.
- 2026-10-07 · Claude Code · Volta à busca limpa após entregar em todo evento (não só com planilha de kits).
- 2026-10-07 · Claude Code · Espelho limpa (LIVRE) ao entregar o kit e só mostra o próximo ao abri-lo.
- 2026-09-28 · Claude Code · Jev desligado; HANDOFF enxuto + arquivo em `docs/handoff/`.
- 2026-09-28 · Claude Code · Admin principal só por `ADMIN_EMAIL`; troca para o Agner via workflow (`313e3c6`).
- 2026-09-28 · Claude Code · "Retirado por" sozinho não exige salvar (`da1c244`); ficha abre no topo + SALVAR embaixo (`857e38c`).
- 2026-09-28 · Claude Code · Jev integrado ao Claude Code e correção do encerramento no Windows (`1908645`) — depois desligado por não gerar economia.
- 2026-09-28 · Claude Code · CSS quebrado acima de 768px (chave faltando), foto em produção (CSP `blob:`), câmera no "Retirado por" (`8fa7be0`).
