# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. Ao encerrar, **sobrescreva "Última sessão"** e acrescente 1 linha no topo de "Últimas entregas".
> 3. Mantenha no máximo 8 linhas em "Últimas entregas"; a mais antiga vai para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última sessão

- **Quando / quem:** 2026-10-09 · Claude Code (Opus 5.5) — incidente "site caindo" durante a Corrida Corredores de Gravata.
- **Diagnóstico [verificado]:** VPS (2 vCPU, compartilhada) com CPU 88–92 % às 12h17–12h48; o Gemini (commits `1249e83`, `7a008a8`) reduziu a atualização automática de 10 s para 5 s nas telas de operação e criou consultas a cada 5 s em **todos** os aparelhos; cada deploy recriava o container e deslogava todos (sessões só em memória). Sem perda de dados (integridade do deploy: 12.901 atletas, 567 entregas).
- **O que fez:** sessões persistentes em `data/sessions.json` (só hash do token, fora do backup) — deploy não desloga mais; atualização volta a 10 s; a consulta geral de eventos só roda para admin/sub-admin. Recursos do Gemini para o admin (contagem por operador) mantidos.
- **Validação real:** login → restart do servidor (SIGTERM) → mesma sessão 200, token falso 401, token ausente do arquivo; `node --test` client 38/38, server 17/17; lint 0; build ok.
- **Próximo passo:** este deploy desloga uma última vez; os próximos não. Acompanhar CPU da VPS no próximo pico.

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

- 2026-10-09 · Claude Code · Incidente: sessões persistentes (deploy não desloga) e atualização de 5 s → 10 s / só admin.
- 2026-10-09 · Antigravity (TONE) · Atualizações em tempo real de entregas e operadores ativos para Super Admin (polling, anti-cache e métricas).
- 2026-10-09 · Claude Code · DESFAZER mantém chip de planilha já associada; só desassocia o que foi associado no sistema.
- 2026-10-07 · Claude Code · Volta à busca limpa após entregar em todo evento (não só com planilha de kits).
- 2026-10-07 · Claude Code · Espelho limpa (LIVRE) ao entregar o kit e só mostra o próximo ao abri-lo.
- 2026-09-28 · Claude Code · Jev desligado; HANDOFF enxuto + arquivo em `docs/handoff/`.
- 2026-09-28 · Claude Code · Admin principal só por `ADMIN_EMAIL`; troca para o Agner via workflow (`313e3c6`).
- 2026-09-28 · Claude Code · "Retirado por" sozinho não exige salvar (`da1c244`); ficha abre no topo + SALVAR embaixo (`857e38c`).
