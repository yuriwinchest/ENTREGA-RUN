# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. Ao encerrar, **sobrescreva "Última sessão"** e acrescente 1 linha no topo de "Últimas entregas".
> 3. Mantenha no máximo 8 linhas em "Últimas entregas"; a mais antiga vai para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última sessão

- **Quando / quem:** 2026-09-28 · Claude Code (Opus 5.5).
- **O que fez:** desligou o Jev em todos os agentes; enxugou este arquivo (71 mil → ~2 mil tokens) e moveu o histórico para `docs/handoff/`; regras de sessão por assunto no `AGENTS.md`.
- **Por quê:** medição real mostrou que o Jev só classifica (não desvia trabalho do modelo caro), custa ~1.100 tokens e ~1 s por pedido, sem economia; e o HANDOFF gigante era relido inteiro a cada sessão nova.
- **Próximo passo:** o Yuri apaga o usuário Felipe pela tela (Usuários → lixeira) após entrar de novo; próxima demanda em sessão nova.

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

- 2026-09-28 · Claude Code · Jev desligado; HANDOFF enxuto + arquivo em `docs/handoff/`.
- 2026-09-28 · Claude Code · Admin principal só por `ADMIN_EMAIL`; troca para o Agner via workflow (`313e3c6`).
- 2026-09-28 · Claude Code · "Retirado por" sozinho não exige salvar (`da1c244`); ficha abre no topo + SALVAR embaixo (`857e38c`).
- 2026-09-28 · Claude Code · Jev integrado ao Claude Code e correção do encerramento no Windows (`1908645`) — depois desligado por não gerar economia.
- 2026-09-28 · Claude Code · CSS quebrado acima de 768px (chave faltando), foto em produção (CSP `blob:`), câmera no "Retirado por" (`8fa7be0`).
- 2026-09-28 · Claude Code · Foto da retirada com exclusão automática e painel de entregas por dia (`cee82fe`).
- 2026-09-28 · Claude Code · Exportar planilha escolhendo colunas/ordem; leitor de QR sem travar a digitação.
- 2026-09-28 · Claude Code · Trava da ficha após associar kit, volta à busca após entregar, login em Eventos, correções de responsividade no iPhone.
