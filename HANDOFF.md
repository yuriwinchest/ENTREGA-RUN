# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem / fase:** 2026-10-31 · Claude Code (Opus 5.5) · Fase B; código `7483e4b`.
- **Pedido:** Yuri avaliando trocar a VPS por uma maior/mais barata; pediu medir a VPS antes. A medição mostrou o espelho Appwrite regravando o evento inteiro a cada entrega; Yuri: "Sim, corrigir".
- **Diagnóstico [verificado, MCP Hostinger, só leitura]:** KVM 2 (2 vCPU/8 GB/100 GB, Campinas), mensal R$ 141,98, renova 14/11. RAM ~5 GB, dos quais ~3,5 GB são o Appwrite (32 contêineres; MongoDB 1,9 GB); disco 39 GB. Logs de 30/10 19h51–23h06: ~800 atletas regravados a cada ~30 s sem parar.
- **Entrega:** `persistAthletesToAppwrite` guarda o último conteúdo gravado por documento e envia só o que mudou; falha volta no próximo envio; `updateAthleteStatusInAppwrite` e exclusão do evento invalidam o registro. Reinício do servidor → primeiro envio completo.
- **Validação:** server 68/68 (4 testes novos em `appwriteMirror.test.mjs`, falham no código antigo); deploy run 41166763024 ok, health 200, contêiner `release-7483e4b16599` saudável; efeito real só medível no próximo evento (madrugada sem uso).
- **Risco/próximo:** medir CPU no próximo evento antes de decidir a VPS; se KVM 2 bastar, Yuri avaliar ciclo anual (R$ 599,88 no 1º ano). Compra é do Yuri.

## Penúltima atualização

- **Quando / quem / fase:** 2026-10-30 · Claude Code (Opus 5.5) · Fase B; código `f556d5d`.
- **Pedido:** Yuri: "não pode deixar duas pessoas usarem o mesmo número" — fechar as brechas que sobraram após a correção do nº 447.
- **Entrega:** servidor recusa (409) salvamento que cria nº repetido novo, nas rotas única e fatiada (`newNumberCollisions` em `server/athleteSync.js`); repetição antiga (os dois 447) não trava a operação. Importação ignora com aviso linha de nº repetido na planilha ou, em "Adicionar", já existente no evento.
- **Validação:** server 64/64 (unitário + HTTP: aba velha dando nº 5 a outro atleta → 409, nada gravado), client 87/87, build ok; navegador local: importação com 447/500/500/501 entrou 500 e 501 com 2 avisos; deploy run 41077679734 ok, health 200.
- **Risco/próximo:** aba com código antigo que tentar repetir nº recebe erro de sincronização genérico até recarregar. Continua: conferir com a operação os dois atletas com nº 447.

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

- 2026-10-31 · Claude Code · Espelho Appwrite envia só os atletas alterados (antes regravava o evento inteiro a cada entrega).
- 2026-10-30 · Claude Code · Nº de peito único também no servidor e na importação.
