# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem / fase:** 2026-10-30 · Claude Code (Opus 5.5) · Fase B; código `2b7378f..8bfdeef` + diagnóstico `43d3256..16e0a8f`.
- **Pedido:** deploy barrado por "Identidade duplicada entre atletas entregues"; Yuri autorizou leitura na VPS e pediu a causa antes de publicar.
- **Causa:** `event-1792586257737`: atleta manual criado às 13:23 com nº 447; às 16:03 outro, importado, associado pelo QR ao kit 447 (trava só barrava nº+chip iguais) e entregue; a entrega marcava todo atleta do mesmo nº (`matchesAthleteReference` casava ids diferentes pelo nº) e o manual virou cópia; o servidor preservou o manual. Nada perdido.
- **Entrega:** comparação por id; QR e cadastro manual recusam nº de outro atleta; entrega marca só o próprio; trava do snapshot aceita cópia idêntica; servidor descarta linhas que caem no mesmo registro. Workflow manual `diagnostico-duplicatas.yml` (só leitura, contêiner sem rede, log sem dado pessoal — repo é público).
- **Validação:** server 63/63, client 87/87, build ok; navegador local barrou associação e cadastro com nº 447 repetido; deploy run 41075411561 ok, health 200; diagnóstico pós-deploy: nenhuma duplicata, os dois atletas 447 intactos.
- **Risco/próximo:** **dois atletas reais com nº 447** no evento — operação conferir quem ficou com o kit 447 (cronometragem). Causa de o operador digitar 447 à mão não investigada.

## Penúltima atualização

- **Quando / quem / fase:** 2026-10-30 · Claude Code (Opus 5.5) · Fase B; código `91b4673`.
- **Pedido:** kit entregue com camisa errada (G → GG): dava para mudar a camisa, mas não havia botão para salvar; e na entrega também precisa salvar.
- **Entrega:** ficha com kit já entregue ganha SALVAR ALTERAÇÕES (topo e rodapé). O servidor descartava toda alteração de atleta entregue (proteção contra aba antiga); agora aceita quando o client manda `editAthleteId` e o papel é Admin/Sub-admin/Supervisor, mantendo status, data e operador da entrega. Antes da entrega o botão já existia (inalterado).
- **Validação:** servidor 60/60 (teste novo em `athleteSync.test.mjs`), client 86/86, lint sem erro, build ok; navegador local: atleta entregue G → M, salvou, arquivo do servidor com camisa nova e entrega intacta.
- **Risco/próximo:** publicado em 30/10 (run 41075411561, junto com a correção do nº 447). Operador não vê o botão (campos travados para ele, como antes). Yuri conferir trocando a camisa de um kit entregue.

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

- 2026-10-30 · Claude Code · Deploy destravado: causa do nº 447 duplicado corrigida (nº igual não junta atletas).
- 2026-10-30 · Claude Code · Entrega: salvar troca de camisa/cadastro com kit já entregue.
