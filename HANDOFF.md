# Handoff — Entregas-run

> **Regras (todos os agentes: Claude Code, Codex/ChatGPT, Antigravity, Cline, Gemini):**
> 1. Uma sessão nova por assunto. Leia só este arquivo; não releia o histórico inteiro.
> 2. A cada ajuste: o registro atual de "Última atualização" desce para "Penúltima atualização"; o que era penúltimo vai inteiro para `docs/handoff/AAAA-MM.md` (decisão do PO de 2026-10-12, ver `AGENTS.md`).
> 3. "Últimas entregas" com no máximo 2 linhas; as antigas vão para `docs/handoff/` (arquivo do mês).
> 4. Detalhe técnico longo vai para `docs/` e aqui fica só o link. Limite deste arquivo: 150 linhas.
> 5. Histórico completo até 28/09/2026: `docs/handoff/arquivo-ate-2026-09-28.md` — abrir só quando precisar de um fato antigo.
> 6. Nunca registrar senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Última atualização

- **Quando / quem:** 2026-10-21 · Codex/Tony · Fase B. Vitor/Codex revisou infraestrutura; Teclide/Codex validou servidor.
- **Pedido:** Publicar QR permanente/reaproveitamento e correção do cache no Edge; Yuri autorizou “pode subir então”.
- **Arquivos / entrega:** main publicada em 00017e9bb2743f16183e79c91e08d004d650cdf0. Integração preserva idade e ErrorBoundary existentes; inclui QR, arquivamento, quota e trava temporária de publicação. Evidências em docs/publicacao-qr-2026-10-21.md na worktree D:/Projetos/Clientes/Entregas-run-kit-fix e no branch codex/corrigir-entregar-kits.
- **Validação real:** cliente 51/51, servidor 32/32; lint/build/bash aprovados; GitHub Actions 39653204756 success em validate/preflight/deploy. Snapshot/hash e manifesto confirmaram preservação de 2 eventos, 15781 atletas e 703 entregas. Dois domínios com saúde ok; site serve index-DrnrMiYs.js com interface de reaproveitamento.
- **Riscos / pendências:** Nenhum QR real transferido pelo agente. Homologação de Edge e leitura física pendente de Yuri. Após novos vínculos/arquivamentos, rollback só com versão compatível; registro permanente não pode ser apagado.
- **Próximo passo:** Yuri atualizar página e usar Emergência médica → Reaproveitar QR Code já impresso no evento novo, conferir link antigo/destino/data/lista e vincular.

## Penúltima atualização

- **Quando / quem:** 2026-10-21 · Codex/Tony · Fase B; subagentes Codex Vitor (SRE) e Teclide (QA).
- **Pedido:** Yuri autorizou “pode subir então” para QR permanente/reaproveitamento e correção de quota do Edge.
- **Alterações:** Integração de eddb0d3 e 41930c7 sobre main 663fd70, preservando idade, ErrorBoundary e ajustes de deploy. Registro/transferência de QR, arquivar/restaurar, cache opcional e testes integrados. Scripts de deploy e rotas de vínculo/arquivo receberam trava temporária para impedir novos estados durante a verificação inicial da publicação. Detalhes e arquivos: docs/qr-permanente.md e diff do merge.
- **Validação real:** cliente 51/51; servidor 32/32; integração HTTP do bloqueio503 aprovada (saúde/lista continuam200); lint sem erros (3 avisos antigos), build e bash -n aprovados. Vitor retirou veto após revisão da proteção do rollback inicial.
- **Riscos / pendências:** publicação pelo pipeline e verificação externa ainda em acompanhamento nesta entrada. QR físico e aceite do evento real dependem de Yuri. Após uso de vínculos/arquivo, rollback exige versão compatível; não apagar registro nem sobrescrever entregas com backup antigo.
- **Próximo passo:** push autorizado na main, acompanhar CI/preflight/snapshot/healthcheck e registrar o resultado confirmado.

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

- 2026-10-21 · Codex/Tony · QR permanente e quota Edge publicados em 00017e9; pipeline e saúde aprovados, dados preservados.
- 2026-10-21 · Codex/Tony · QR permanente e quota Edge integrados e validados; publicação autorizada em acompanhamento.
