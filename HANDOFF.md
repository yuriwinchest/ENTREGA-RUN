# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem:** 2026-10-21 · Claude Code (Opus 5.5) · Fase A. Continuação da central depois do limite de uso do Codex/Tony.
- **Pedido:** Yuri pediu para continuar o que o GPT deixou pela metade (`docs/continuidade-central-2026-10-21.md`): fechar o alarme e implementar o registro de atendimento (prescrições, aplicações, condutas e desfecho/destino ao encerrar).
- **Arquivos / entrega:** pasta de trabalho `D:/Projetos/Clientes/Entregas-run-import-fix`, branch `codex/substituir-planilha` (base = `main` publicada `00017e9`), **sem commit**. Alarme: só conferido, documentado em `docs/saude-alerta-persistente.md`, e testes no CI. Registro: `server/medico.js`, `server/server.js` (`POST …/registros`, desfecho obrigatório ao encerrar), `client/src/components/MedicoPage.*`, `client/src/utils/medico.js` e `medicoApi.js`, testes `server/medicoRegistro.http.test.mjs` e `client/src/utils/medico.test.mjs`. Relatório: `docs/saude-registro-atendimento.md`. `deploy.yml` passa a rodar `medicoAlert`, `espelhoSync`, `medicoAlert.http`, `medicoRegistro.http` e `espelho.http`.
- **Validação real:** na pasta de trabalho, com as quatro frentes juntas: servidor 39/39, client 65/65, lint sem erro, build ok, `bash -n` do deploy ok. Navegador local isolado: alarme com maior gravidade, assumir e silenciar, registro com autor/hora do servidor, rascunho mantido após atualização de 10 s, encerramento barrado sem hospital, encerrar, reabrir e encerrar de novo, celular 375 px. Um defeito achado e corrigido (mensagem de erro antiga ficava na tela).
- **Riscos / pendências:** sem commit/push/deploy (as quatro frentes juntas precisam do OK do Yuri). Som real em celular/TV e Espelho em TV física não testados. Retenção LGPD de registros clínicos a definir.
- **Próximo passo:** Yuri autoriza commit + push da `codex/substituir-planilha` na `main` (deploy pelo CI) e homologa importação, Espelho, alarme e registro.

## Penúltima atualização

- **Quando / quem:** 2026-10-21 · Codex/Tony · Fase A, continuidade entre modelos.
- **Pedido:** Acrescentar registro de atendimento/prescrições/aplicações e encerramento com desfecho/destino; Yuri pediu memória para outro LLM continuar se limite de uso terminar.
- **Arquivos / entrega:** `docs/continuidade-central-2026-10-21.md` nesta pasta aponta checkout correto, quatro chats, donos, validações e próximos passos. Chat novo `01a15fd9-4404-77c2-82dd-0621824cccdf`; registro aguarda fim das edições do alarme para evitar colisão. Trabalho em `D:/Projetos/Clientes/Entregas-run-import-fix`, branch `codex/substituir-planilha`.
- **Validação real:** Chat criado/ativo e monitor atualizado para quatro frentes. Importação/Espelho concluídos localmente conforme relatórios; alarme em testes; registro clínico ainda não implementado. Nenhuma afirmação de testes novos desta frente.
- **Riscos / pendências:** Não editar painel/store médico simultaneamente nos dois chats. Sem commit/push/deploy/homologação das novas frentes. Dados pessoais das imagens não foram copiados para documentação.
- **Próximo passo:** Chat do alarme concluir/ceder arquivos; chat registro implementar e testar; central consolidar continuidade, evidências e pendências.

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

- 2026-10-21 · Claude Code · Alarme documentado + registro de atendimento e desfecho no painel médico (local, sem commit).
- 2026-10-21 · Codex/Tony · Continuidade da central documentada para outro LLM; importação/Espelho concluídos localmente.
