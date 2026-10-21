# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. Ao encerrar: a "Última atualização" vira "Penúltima"; a penúltima anterior vai inteira para `docs/handoff/AAAA-MM.md` (regra do Yuri, 2026-10-12).
> 3. "Últimas entregas" com no máximo 2 linhas; as mais antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem:** 2026-10-20 · Claude Code (Opus 5.5), sessão lateral pedida pela sessão da emergência médica · Fase A (Crowley: veto de risco pontual).
- **Pedido:** fechar as rotas que só checavam permissão `if (session && ...)` e deixavam passar sem token — `GET /api/events/:id/athletes` devolvia CPF, telefone e nascimento de todos os inscritos a quem soubesse o id do evento.
- **Mapa [verificado]:** o app manda `Authorization` em todas (`client/src/utils/eventsApi.js`), exceto `apiSyncEvents`, sem chamador desde `2f6f08c` (25/09); `PUT .../athletes/:numero/status` não é chamado pelo app. O gate de deploy (`dataSnapshot.mjs verify-api`) lia `/api/events` e `/athletes` **sem token** — fechar sem tratar isso reprovaria todo deploy.
- **O que mudou:** `server/server.js` — `requireAuth` em `GET/POST /api/events`, `PUT/DELETE /api/events/:id` (o DELETE também passava sem token), `POST /api/events/sync` (operador 403), `GET/POST .../athletes`, `.../athletes/chunks`, `PUT .../athletes/:numero/status`. Gate: `server/deployCheck.js` gera token aleatório a cada boot no tmpdir do container (fora do volume/backup); só vale em GET, do loopback, nas duas rotas de leitura. Client: `apiSyncEvents` com token; 401 nessas rotas → volta ao login; usuário em cache **sem token** (aparelho logado antes das sessões) → login; deslogado não consulta `/api/events`.
- **Não mudou:** `/api/public/*`, `/api/espelho/*`, `/api/health`, `/api/login`, `/api/session`, `/api/municipios`, `/api/appwrite/status`.
- **Validação real:** teste novo `server/routesAuth.http.test.mjs` (sem token e token falso → 401 nas 9 rotas; admin → 200/201; públicas abertas; token do gate só lê) — falha contra o `server.js` antigo e passa no novo; server 18/18, client 38/38, lint exit 0 (3 avisos antigos em `OperacaoPage.jsx`), build ok. Não testado em produção nem no celular.
- **Riscos:** quem estiver com token vencido/revogado ou sem token cai no login (antes operava anônimo). Uma entrega feita no instante do 401 não chega ao servidor (a tela já mostrava erro de sincronização). Espelho público sem login mostra o nome do evento pelo estado do espelho, não mais pela lista de eventos.
- **Próximo passo:** Yuri autorizar o push; depois do deploy, conferir no log do Actions a linha "API manteve todos os eventos" e fazer uma entrega real logado.

## Penúltima atualização

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

## Últimas entregas (mais recente primeiro; anteriores em `docs/handoff/2026-10.md`)

- 2026-10-20 · Claude Code · Rotas de eventos/atletas exigem login; gate de deploy lê com token do boot.
- 2026-10-09 · Claude Code · Incidente: sessões persistentes (deploy não desloga) e atualização de 5 s → 10 s / só admin.
