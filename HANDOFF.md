# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem:** 2026-10-21 · Codex/Tony · Fase A, integração da proteção de rotas com a emergência médica.
- **Pedido:** Yuri autorizou integrar o commit f63c339 do branch claude/cool-euler-3b3396 à implementação local da emergência médica e publicar após validação.
- **Arquivos / entrega:** candidato isolado codex/rotas-emergencia-medica; rotas de eventos/atletas exigem autenticação; server/deployCheck.js permite somente leituras locais do gate com token efêmero; cliente trata 401 encerrando sessão; CI inclui os testes de autenticação e os da emergência médica. Mudanças da emergência médica trazidas do checkout local; detalhes em docs/emergencia-medica.md.
- **Validação:** [verificado] server 26/26; client 33/33; lint sem erros (3 avisos preexistentes em `OperacaoPage.jsx`); build Vite aprovado; `bash -n scripts/deploy-vps.sh` aprovado; diff sem conflitos e sem erros de whitespace. Leitura GET de `/api/health` em produção respondeu 200. Não testado em celular.
- **Riscos / pendências:** tokens ausentes/expirados retornam ao login; dados de saúde e ocorrências continuam sujeitos à pendência de retenção LGPD já registrada. Push para main aciona deploy; o script confere saúde, disco, snapshots e rollback automático. CI e deploy ainda pendentes.
- **Próximo passo:** criar commit integrado e publicar na main conforme autorização do Yuri; acompanhar validação/healthcheck e rollback do workflow.
## Penúltima atualização

- **Quando / quem:** 2026-10-20 · Claude Code (Opus 5.5), sessão delegada pela sessão orquestradora — Fase A, etapa 1 redefinida pelo Yuri.
- **Pedido:** dados de saúde vêm da planilha de inscrição (outro sistema), não de formulário: na importação, seção "Saúde" para marcar colunas de saúde e quais aparecem na página pública; escolha salva por evento e mantida ao reimportar; página pública mostra nome, peito, modalidade e as colunas públicas embaixo dos campos da ocorrência; CPF, telefone, e-mail, endereço e nascimento nunca públicos; Médico vê todas.
- **Arquivos:** removidos o montador de perguntas, `FichaMedicaPage` e as rotas `/api/public/ficha-medica`. `server/medico.js` reescrito (colunas de saúde, regra de identificação, ocorrências); `server/server.js` (`healthFields` em `saveAthletesForEvent`, POST de atletas e chunks, GET de atletas; validação pública do kit e espelho escondem colunas de saúde); `ImportarAtletasModal` (seção Saúde; "contato de emergência" deixa de sobrescrever o telefone); `OperacaoPage` e `eventsApi` (levam e trazem `healthFields`); `EmergenciaPage`, `MedicoPage`, `EventoMedicoModal` (QR + resumo). Detalhes: [`docs/emergencia-medica.md`](docs/emergencia-medica.md).
- **Validação real:** server 25/25 (fluxo HTTP: escolha salva e mantida no autosave, telefone forçado a privado, kit e espelho sem saúde, página pública sem CPF/telefone/coluna privada, médico com todas, vínculo da ocorrência sobrevive à reimportação); client 33/33; lint sem erro; build ok. Navegador local com planilha fictícia de 10 colunas: marcar 5 colunas (contato de emergência bloqueado como "só no painel"), importar, reimportar com marcações pré-selecionadas, página pública no celular (3 colunas públicas embaixo, Enviar fixo no rodapé), ocorrência nº 1, painel do médico com as 5 colunas.
- **Riscos / pendências:** sem deploy (aguarda validação do candidato); as rotas de eventos/atletas agora exigem login; retenção LGPD a definir; alerta sonoro não ouvido de fato; QR impresso não lido por celular real.
- **Próximo passo:** Yuri homologa e autoriza o push; testar com a planilha real do sistema de inscrição.

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
- AI Memory fora do ar em 2026-10-20 (ECONNREFUSED): sincronizar o registro da emergência médica quando voltar.
- Emergência médica: definir retenção (LGPD) de dados de saúde e ocorrências; rotação de backups agora também protege dado de saúde.
- Homologação no iPhone real: câmera/foto da retirada, zoom afastado em Eventos/Usuários, teclado com a barra inferior.

## Últimas entregas (mais recente primeiro; anteriores em `docs/handoff/2026-10.md`)

- 2026-10-21 · Codex/Tony · Integração da proteção de rotas com a emergência médica; validação pendente.
- 2026-10-20 · Claude Code · Emergência médica: colunas de saúde na importação, página pública via QR do peito, perfil MEDICO com fila (local, sem deploy).
