# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem / fase:** 2026-10-30 · Claude Code (Opus 5.5) · Fase B; código `f556d5d`.
- **Pedido:** Yuri: "não pode deixar duas pessoas usarem o mesmo número" — fechar as brechas que sobraram após a correção do nº 447.
- **Entrega:** servidor recusa (409) salvamento que cria nº repetido novo, nas rotas única e fatiada (`newNumberCollisions` em `server/athleteSync.js`); repetição antiga (os dois 447) não trava a operação. Importação ignora com aviso linha de nº repetido na planilha ou, em "Adicionar", já existente no evento.
- **Validação:** server 64/64 (unitário + HTTP: aba velha dando nº 5 a outro atleta → 409, nada gravado), client 87/87, build ok; navegador local: importação com 447/500/500/501 entrou 500 e 501 com 2 avisos; deploy run 41077679734 ok, health 200.
- **Risco/próximo:** aba com código antigo que tentar repetir nº recebe erro de sincronização genérico até recarregar. Continua: conferir com a operação os dois atletas com nº 447.

## Penúltima atualização

- **Quando / quem / fase:** 2026-10-30 · Claude Code (Opus 5.5) · Fase B; código `2b7378f..8bfdeef` + diagnóstico `43d3256..16e0a8f`.
- **Pedido:** deploy barrado por "Identidade duplicada entre atletas entregues"; Yuri autorizou leitura na VPS e pediu a causa antes de publicar.
- **Causa:** `event-1792586257737`: atleta manual criado às 13:23 com nº 447; às 16:03 outro, importado, associado pelo QR ao kit 447 (trava só barrava nº+chip iguais) e entregue; a entrega marcava todo atleta do mesmo nº (`matchesAthleteReference` casava ids diferentes pelo nº) e o manual virou cópia; o servidor preservou o manual. Nada perdido.
- **Entrega:** comparação por id; QR e cadastro manual recusam nº de outro atleta; entrega marca só o próprio; trava do snapshot aceita cópia idêntica; servidor descarta linhas que caem no mesmo registro. Workflow manual `diagnostico-duplicatas.yml` (só leitura, contêiner sem rede, log sem dado pessoal — repo é público).
- **Validação:** server 63/63, client 87/87, build ok; navegador local barrou associação e cadastro com nº 447 repetido; deploy run 41075411561 ok, health 200; diagnóstico pós-deploy: nenhuma duplicata, os dois atletas 447 intactos.
- **Risco/próximo:** **dois atletas reais com nº 447** no evento — operação conferir quem ficou com o kit 447 (cronometragem). Causa de o operador digitar 447 à mão não investigada.

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

- 2026-10-30 · Claude Code · Nº de peito único também no servidor e na importação.
- 2026-10-30 · Claude Code · Deploy destravado: causa do nº 447 duplicado corrigida (nº igual não junta atletas).
