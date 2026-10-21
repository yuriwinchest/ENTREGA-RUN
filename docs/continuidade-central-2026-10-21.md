# Continuidade da central — 2026-10-21

Autor real: Codex/Tony. Fase A. Registro explícito pedido por Yuri para outro LLM continuar sem reler toda a conversa.

## Primeiro passo

NÃO implementar na pasta original por engano. Checkout de trabalho das frentes: `D:/Projetos/Clientes/Entregas-run-import-fix`, branch `codex/substituir-planilha`, base `00017e9` (origin/main no início). Original `D:/Projetos/Clientes/Entregas-run` está em `codex/qr-emergencia-permanente`, com alterações documentais preexistentes preservadas. Conferir Git/status atuais antes de qualquer ação. Código das frentes ainda sem commit/push/deploy. Não resetar, limpar ou trocar branch sobrescrevendo mudanças.

## Coordenação autorizada por Yuri

Chat central `01a15fc3-461c-7550-8560-c025a0dcb61b` (Entregas-run — central de demandas). Para todos projetos, chat inicial é a central e demanda independente vai para chat próprio. Perguntas/autorização/conclusão devem vir para central. Preferência já salva em AI Memory global `_rules/chat-central-orquestrador-por-projeto.md` e nota local permitida. Acompanhamento ativo a cada5min `acompanhar-demandas-do-entregas-run`, silencioso sem mudança. Usar snapshots wait_threads/cursor, sem varrer conversas antigas.

## Frentes

1. Importação: chat `01a15fc9-bdbf-7052-9768-e81e91b1996a`, concluído localmente e parou edições. Escolha visual substituir/adicionar, contagens/confirmação, bloqueio após entrega, revisão capturada ao abrir modal e protegida no servidor/chunks/fallback. Relatório na worktree `docs/importacao-substituir-adicionar.md`. Reportou51 testes cliente/35 servidor e ensaios navegador APIisolada, lint/build aprovados. Não repetir testes já comprovados sem alteração.
2. Espelho: chat `01a15fcb-010b-78d0-bbf1-c3f95c7af5d1`, concluído localmente e parou edições. Imagens remotas na prévia, persistência após restart, status de salvamento real/errodisco, patch parcial entre abas, adaptação automática viewport/proporção sem polegadas. Relatório worktree `docs/espelho-imagens-responsivo.md`. Reportou58cliente/34servidor e navegadorEdge seis formatos/doiscontextos/mesmaorigem aprovados. Contagens são execuções distintas, não suíte conjunta final.
3. Alarme saúde: chat `01a15fd4-9972-72e3-bc23-7d038ea27e6b`, ativo implementando/testando. Sirene ambulância sintetizada local repetida; cores reais leveverde/moderadaâmbar/gravelaranja/críticavermelho, maior gravidade ainda não reconhecida. Assumir e silenciar faz transição EM_ATENDIMENTO e reconhecimento por ID atomicamente; silenciar específico não encerra atendimento. Yuri escolheu parar em TODAS as telas do evento. Nova ocorrência rearma. Pulsação lenta e reducedmotion; respeitar autoplay gesto inicial e limites navegador. Relatório previsto `docs/saude-alerta-persistente.md`.
4. Registro de atendimento: chat `01a15fd9-4404-77c2-82dd-0621824cccdf`, recém-criado. Yuri pediu registrar o que médico prescreveu/aplicou/fez e desfecho/destino ao encerrar. Pode ler/planejar agora; NÃO editar arquivos médicos até chatalarme concluir e ceder. Depois implementar sobre estado final. Seções propostas evolução/avaliação, condutas/procedimentos, prescrições/administrações, desfecho/destino; texto digitado por profissional, nenhuma sugestão automática de medicamento/dose. Salvar registro antes de encerrar e preservar rascunho em erro/polling; autoria/horário servidor e proteção evento, sem exposição pública/QR/Espelho. Relatório previsto `docs/saude-registro-atendimento.md`.

## Donos e pendências

Dois chats médicos compartilham MedicoPage.jsx/.css, medicoApi.js, server/medico.js e rotas médicas server.js: alterações devem ser sequenciais. Importação/Espelho já pararam. Não git add -A/commit global enquanto existir frente editando. Central integra HANDOFF/AI Memory, mantendo duas últimas e histórico integral, autores reais. Testes de dados fictícios isolados, sem dados pessoais das imagens enviadas. Sem autorização de produção desta conversa. Sem FaseC.

Próximo passo: acompanhar conclusão alarme, liberar registro, conferir relatórios e revisão conjunta do estado final, documentar evidências e apresentar candidata ao Yuri. Sem celular/TV físicos, CI remoto ou homologação PO dessas frentes até agora. Se limite de uso interromper agente, manter arquivos e retomar a partir deste documento + HANDOFF + relatório específico, não reconstruir tudo.
