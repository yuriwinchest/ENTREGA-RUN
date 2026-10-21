# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem:** 2026-10-21 · Codex/Tony · Fase A, QR permanente e recuperação de endereço impresso.
- **Pedido:** Yuri aprovou vínculo permanente, reaproveitamento administrativo do QR antigo e proteção na exclusão, no Entregas-run.
- **Arquivos / entrega:** server/emergencyLinks.js, rotas/arquivo/exclusão em server.js, gate dataSnapshot; modal EmergencyLinksManager/EventoMedicoModal, aba Arquivados e restauração, APIs e proteção de página pública antiga. Corrigido isolamento Appwrite dos testes. Detalhes: [docs/qr-permanente.md](docs/qr-permanente.md).
- **Validação:** [verificado] servidor31/31; cliente45/45; lint sem erros(3avisos antigos); buildVite aprovado; navegador local com dados sintéticos comprovou vínculo e busca pelo endereço antigo; testeHTTP cobre reinício, permissões, revisão, arquivo/restauração, exclusão e ocorrência no destino correto. Não testado QR físico/celular.
- **Riscos / pendências:** branch local codex/qr-emergencia-permanente, sem push/deploy desta frente. Durante suíte inicial, flag externa desativada era ignorada; corrigido. Leitura posterior confirmou atualização do evento sintético preexistente event-sync-test no Appwrite; sem snapshot prévio, não se afirma reversão nem ausência absoluta de efeitos. Limites/evidências em docs. Reversão futura precisa preservar aliases e a regra de Arquivado. AI Memory sincronizado em decisoes/qr-emergencia-permanente-2026-10-21.md.
- **Próximo passo:** Yuri homologa recuperação do QR, nome/data/lista do destino, arquivo e exclusão; publicação requer autorização desta frente e plano compatível com os vínculos já utilizados.

## Penúltima atualização

- **Quando / quem:** 2026-10-21 · Codex/Tony · Fase A, integração da proteção de rotas com a emergência médica.
- **Pedido:** Yuri autorizou integrar o commit f63c339 do branch claude/cool-euler-3b3396 à implementação local da emergência médica e publicar após validação.
- **Arquivos / entrega:** candidato isolado codex/rotas-emergencia-medica; rotas de eventos/atletas exigem autenticação; server/deployCheck.js permite somente leituras locais do gate com token efêmero; cliente trata 401 encerrando sessão; CI inclui os testes de autenticação e os da emergência médica. Mudanças da emergência médica trazidas do checkout local; detalhes em docs/emergencia-medica.md.
- **Validação:** [verificado] server 26/26; client 33/33; lint sem erros (3 avisos preexistentes em `OperacaoPage.jsx`); build Vite aprovado; `bash -n scripts/deploy-vps.sh` aprovado; diff sem conflitos e sem erros de whitespace. Leitura GET de `/api/health` em produção respondeu 200 antes e depois do deploy. CI/CD `39528865715` passou: validação, preflight e deploy concluídos; healthcheck pós-deploy respondeu `ok: true`, `diskWriteError: null`. Não testado em celular.
- **Riscos / pendências:** tokens ausentes/expirados retornam ao login; dados de saúde e ocorrências continuam sujeitos à pendência de retenção LGPD já registrada. O workflow publicado usou snapshot, healthcheck e rollback automático; CI e deploy do commit `2a13ee0` concluídos. Permanecem tokens ausentes/expirados retornando ao login e a pendência de retenção LGPD.
- **Próximo passo:** criar commit integrado e publicar na main conforme autorização do Yuri; acompanhar validação/healthcheck e rollback do workflow.
## Estado atual

- **Candidato local:** [verificado 2026-10-21] QR permanente em codex/qr-emergencia-permanente; main remota permanece bcd61e9, sem publicação deste candidato.

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

- 2026-10-21 · Codex/Tony · QR permanente, reaproveitamento administrativo e arquivamento; implementação local validada, sem deploy.
- 2026-10-21 · Codex/Tony · Integração publicada em `2a13ee0`; CI/CD e healthcheck pós-deploy aprovados.
