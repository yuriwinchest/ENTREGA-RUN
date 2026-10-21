# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem:** 2026-10-21 · Claude Code (Opus 5.5) · Fase B (homologação do Yuri).
- **Pedido:** Espelho → Campos do Telão: os nomes dos campos apareciam cortados com "…"; ver o nome inteiro, mesmo que a tela cresça e precise rolar.
- **Entrega:** `client/src/components/EspelhoModal.css`: nome e descrição dos cartões e itens quebram linha em vez de cortar; cartões um pouco mais largos (230 px / 210 px mínimos); caixa de seleção e etiqueta alinhadas ao topo quando o texto ocupa duas linhas. Só CSS.
- **Validação real:** navegador local, aba Campos do Telão: 22 nomes, 0 cortados no computador e no celular (375 px), sem rolagem lateral, lista rola na vertical; teste de integridade do CSS ok; build ok.
- **Riscos / pendências:** nenhum novo; continua valendo conferir em Eventos se algum evento ficou "CARREGANDO..." (registro anterior).
- **Próximo passo:** Yuri conferir a aba Campos do Telão.

## Penúltima atualização

- **Quando / quem:** 2026-10-21 · Claude Code (Opus 5.5) · Fase B (homologação do Yuri).
- **Pedido:** painel médico sem o cartão grande de alerta: só o cartão da ocorrência piscando na cor da gravidade até tocarem nele para atender; som no volume máximo.
- **Entrega:** cartão sem reconhecimento pisca (1,6 s por ciclo, cor da gravidade, sem animação para quem pede movimento reduzido), com etiqueta "Toque para atender"; tocar no cartão assume (se aberta), silencia em todas as telas do evento e abre a ficha. Faixa grande removida. Sirene com onda quadrada e ganho 1 (era seno a 0,10). **Defeito grave achado e corrigido:** desde `663fd70` (hoje cedo), abrir `/operacao/<evento>` antes da lista de eventos carregar mandava o evento provisório "CARREGANDO..." inteiro ao servidor e **renomeava o evento real** (e podia trocar o status para EM OPERAÇÃO). Agora o client envia só contagens e o servidor ignora nome/status/data/local de um corpo "CARREGANDO...". Também: título da ficha médica ficava verde para qualquer gravidade (ordem do CSS). Arquivos: `client/src/components/MedicoPage.*`, `client/src/utils/medicoAlert.js`, `client/src/App.jsx`, `server/server.js` (PUT de evento), `server/medicoRegistro.http.test.mjs`.
- **Validação real:** servidor 39/39 (teste novo: corpo "CARREGANDO..." mantém nome e status, renomear de propósito continua funcionando), client 66/66, lint sem erro, build ok. Navegador local: reproduzido o nome "CARREGANDO..." gravado; com a correção, abrir a operação direto pelo endereço mantém nome e status; cartões piscam; tocar na #3 tirou o pisca só dela, virou Em atendimento e abriu a ficha; título Crítica vermelho.
- **Riscos / pendências:** eventos de produção podem ter sido renomeados para "CARREGANDO..." (ou ido para EM OPERAÇÃO) entre `663fd70` e este deploy: **Yuri conferir os nomes e status em Eventos e corrigir em Editar evento**. Volume final depende do volume do aparelho.
- **Próximo passo:** Yuri conferir nomes/status dos eventos e homologar o cartão piscando + som no celular/computador da equipe médica.

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

- 2026-10-21 · Claude Code · Espelho: nomes dos campos do telão inteiros (sem corte).
- 2026-10-21 · Claude Code · Painel médico: cartão piscando até atender, som no máximo; corrigido evento renomeado para "CARREGANDO...".
