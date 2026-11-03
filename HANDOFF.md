# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem / fase:** 2026-11-03 · Claude Code (Opus 5.5) · Fase B; código `99cfc2b`, publicado.
- **Pedido:** Yuri (fotos da tela): no NOVO ATLETA o número não deve ser obrigatório; na busca da aba Atletas, poder excluir o atleta.
- **Entrega:** número opcional (só o nome é exigido; nº repetido continua recusado). Botão de lixeira na coluna AÇÕES (supervisor/admin) → `DELETE /api/events/:id/athletes/:athleteId`: kit entregue recusa ("desfaça a entrega"); cadastro sem saúde vai para `data/clientes/atleta-excluido_*`; id fica em `deletedAthleteIds` para aba antiga não ressuscitar (merge em operação devolvia quem faltava). Doc no Appwrite fica (base de clientes).
- **Validação:** server 72/72 (teste novo `athleteDelete.http.test.mjs`, com reinício), client 82/82, lint sem erro, build ok. Navegador local com dados fictícios: entregue recusado, pendente saiu da tela e do servidor, atleta sem número salvo. Deploy run 41635253917 ok na 2ª tentativa (1ª: SSH da Actions à VPS com timeout no preflight, nada alterado); release `acd68dc39fd6` saudável, integridade preservada (3 eventos, 17.659 atletas, 1.718 entregas); health 200 nos dois domínios. Sem teste no celular.
- **Risco/próximo:** volta = `git revert 99cfc2b`. Yuri homologar o botão e o cadastro sem número.

## Penúltima atualização

- **Quando / quem / fase:** 2026-10-31 · Claude Code (Opus 5.5) · Fase A; código `dd1d596`, publicado.
- **Pedido:** Yuri: cada atleta fica no banco como base de clientes; excluir evento não pode apagar atleta nem contato ("Sim, corrigir lá"). Medição antes: 1.563 dos 2.411 atletas do Appwrite são de eventos apagados — não apagar nenhum.
- **Entrega:** `deleteEventFromAppwrite` apaga só o evento (atletas ficam). Na exclusão, `preserveDeletedEventAthletes` (`server/clientBase.js`) guarda cadastro + contato + campos não-saúde em `data/clientes/` antes de remover a planilha ativa; saúde e planilha bruta saem como antes. Arquivar igual. `data/clientes` entra no backup de dados do deploy.
- **Validação:** server 71/71 (3 testes novos; os 2 de exclusão falham no código antigo). Yuri: "Sim, publicar" → deploy run 41266986637 ok (validate/preflight/deploy), release `dd1d5962621d` saudável, integridade preservada (2 eventos, 16.850 atletas, 1.704 entregas); health 200 nos dois domínios. Exclusão real não testada em produção.
- **Risco/próximo:** volta = `git revert dd1d596` + push na `main` (arquivos em `data/clientes/` ficam). Fora do escopo: fundir duplicados, preencher contato antigo, apagar qualquer coisa — só com backup e novo "sim".

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

- 2026-11-03 · Claude Code · Novo atleta sem número obrigatório; excluir atleta na aba Atletas.
- 2026-10-31 · Claude Code · Excluir evento não apaga mais atleta nem contato (base de clientes).
