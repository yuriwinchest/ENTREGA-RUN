# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando/autor/fase:** 2026-11-04 · Codex/Tony com subagentes Codex · Fase A; intervalo `a951d09..HEAD` deste marco; publicação autorizada pelo Yuri.
- **Pedido/arquivos:** ação dentro da lista, banco obrigatório e publicar; CreatableSelect/hook, store/rotas/conector Appwrite/testes, provisionador aditivo, Docker/CI/deploy e docs/opcoes-cadastro-global-2026-11-04.md.
- **Validação:** client 90/90, server 102/102; lint 0 erros/4 avisos anteriores, build e Bash sintaxe ok; UI desktop/mobile375, Enter/Escape/Cancelar e seleção anterior confirmados; DB fake com falha/retry/reidratação e extras sem saúde.
- **Riscos/pendências:** publicação ainda não executada neste commit; schema será preparado antes do switch com snapshot e --check. Safari/iPhone físico e homologação do PO pendentes.
- **Continuidade:** AI Memory indisponível nas ferramentas; sincronização pendente local. Catálogo Appwrite confirmado antes de sucesso; cache JSON recuperável; rollback conserva dados e schema aditivo.
- **Próximo:** publicar candidato pelo CI autorizado, acompanhar saúde/integridade e registrar SHA/run reais.

## Penúltima atualização


- **Quando/autor/fase:** 2026-11-04 · Codex/Tony, backend Kastiel e QA/Vitor por agentes Codex · Fase A; intervalo `2c06646..HEAD` deste marco.
- **Pedido/arquivos:** catálogo global por organização e criação manual; server registrationOptions/rotas/testes, client CreatableSelect/hook/API/OperacaoPage, CI e hash do backup.
- **Validação:** client 90/90; server 86/86; lint 0 erros (4 avisos existentes), build ok, Bash sintaxe e diff check ok; navegador sintético comprovou 7 campos, reuso, reabertura, erro, dedup e rede lenta.
- **Riscos/pendências:** Yuri rejeitou ação abaixo dos campos; próximo marco mover para dentro da lista. Appwrite herdado não espelha nacionalidade/customFields; JSON operacional preserva ambos.
- **Próximo:** ajuste visual solicitado, validar desktop/mobile e documentar deploy. Nenhum push main ou deploy autorizado/executado.


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

- 2026-11-04 · Codex/Tony · Catálogo no Appwrite e ação dentro da lista; publicação autorizada em andamento.
- 2026-11-03 · Claude Code · Novo atleta sem número obrigatório; excluir atleta na aba Atletas.
