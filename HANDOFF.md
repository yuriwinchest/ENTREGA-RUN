# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem:** 2026-10-21 · Antigravity (TONE) · Fase A (Construção).
- **Pedido:** Correção de tela branca ("fundo branco") ao clicar em "ENTREGAR KITS" em eventos com atletas na página `/operacao/:eventId`.
- **Diagnóstico e Causa Raiz:** No carregamento de eventos com atletas cujos dados continham campos numéricos (como tamanho de camiseta `14` ou modalidade `5`, comuns em planilhas Excel reais), o hook `useMemo` de `camisetaStats` e `modalidadeStats` em `OperacaoPage.jsx` tentava chamar `.trim()` diretamente em valores numéricos (`(14).trim()`), disparando `TypeError: ...trim is not a function`. Como a árvore de componentes não possuía um React `ErrorBoundary`, o erro não tratado forçava o desmonte total do `#root`, resultando em tela totalmente branca. Adicionalmente, quando o ID do evento era acessado antes do término do sync da lista no `App.jsx`, a página não dispunha de fallback resiliente.
- **Arquivos / entrega:** `client/src/components/OperacaoPage.jsx` (coerção segura de `camiseta`, `modalidade`, `nome`, `entreguePara`, `operadores` para `String` antes de `.trim()` e ordenação), `client/src/utils/athleteTable.js` (inclusão de `idade` em `STANDARD_COLUMNS` e `COLUMN_WIDTHS`), `client/src/components/ErrorBoundary.jsx` (novo componente de captura de erro resiliente com interface temática Entregas RUN e botões de recarga e retorno), `client/src/App.jsx` (integração do `ErrorBoundary` e fallback seguro para eventos em carregamento).
- **Validação:** [verificado] Reprodução com Chrome Headless CDP (`test_local_repro.mjs`): comprovada a falha inicial (`ROOT HTML LENGTH: 0`) e confirmada a renderização completa após a correção (`ROOT HTML LENGTH: 10591`). Suite de testes do client: 41/41 aprovados; suite do server: 27/27 aprovados; linter `oxlint` 0 erros; build Vite concluído com sucesso.
- **Riscos / pendências:** Nenhum. A renderização agora é defensiva contra qualquer tipo primitivo vindo de planilhas importadas ou APIs.
- **Próximo passo:** Subir para produção e Yuri homologar a navegação em `/operacao/:eventId`.

## Penúltima atualização

- **Quando / quem:** 2026-10-21 · Antigravity (TONE) · Fase A (Construção).
- **Pedido:** Cálculo automático e exibição da idade do atleta no módulo de emergência médica (busca por nome/peito/CPF, card da ficha e painel do médico). Se houver coluna de idade na planilha, utilizá-la; caso contrário, calcular automaticamente a partir da data de nascimento (`nascimento`), cobrindo formatos variados, anos bissextos e datas futuras. Preservar isolamento multi-agente e subir para produção.
- **Arquivos / entrega:** `server/medico.js` e `client/src/utils/medico.js` (helpers `calculateAge` e `formatAge`), `server/server.js` (`idade` e `idadeTexto` em `/busca`, `/atleta/:ref` e `/ocorrencias`), `client/src/components/EmergenciaPage.jsx` (busca pública e cabeçalho da ficha com idade), `client/src/components/MedicoPage.jsx` e `MedicoPage.css` (card da fila, subtítulo e lista de informações médicas com idade explícita e data de nascimento), `client/src/components/ImportarAtletasModal.jsx` (reconhecimento do campo `idade`), testes unitários e de integração `client/src/utils/medico.test.mjs`, `server/medico.test.mjs`, `server/medico.http.test.mjs`. Trabalho executado em git worktree isolado (`Entregas-run-idade`) para evitar colisões com Codex.
- **Validação:** [verificado] client 34/34 (`node --test client/src/utils/*.test.mjs`); server 27/27 (`node --test server/*.test.mjs`); lint 0 erros (`npx oxlint`); build Vite aprovado (`npm run build`); `bash -n scripts/deploy-vps.sh` aprovado. Testes cobrem cálculo de idade, anos bissextos, datas futuras, fallbacks e contratos HTTP.
- **Riscos / pendências:** Nenhum risco de colisão com o branch ativo do Codex. Data de nascimento exata permanece protegida fora da API pública.
- **Próximo passo:** Yuri homologar visual e cálculo da idade em produção.

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

- 2026-10-21 · Antigravity (TONE) · Correção de tela branca na Operação ao abrir evento (coerção segura de tipos numéricos e ErrorBoundary).
- 2026-10-21 · Antigravity (TONE) · Cálculo automático e exibição da idade do corredor na busca, ficha e painel médico.
