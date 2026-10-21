# QR de emergência permanente e recuperação de endereço impresso

Autor: Codex/Tony · 2026-10-21 · Fase A. Pedido aprovado por Yuri após proposta de vínculo permanente, reaproveitamento e proteção na exclusão. Implementação local; sem autorização específica de publicação desta frente.

## Comportamento e aceite

- Ao abrir Emergência médica, a aplicação registra um endereço permanente antes de liberar PNG/SVG. O endereço existente `/emergencia/<id>` continua válido; não depende do nome do evento.
- Super Admin abre **Reaproveitar QR Code já impresso**, informa o link/código, confere o endereço, escolhe um evento não arquivado e confirma nome/data/lista de atletas. Somente códigos conhecidos (registro ou exclusão antiga) são aceitos. Um código com destino ainda disponível não pode ser transferido para outro evento: primeiro arquivar ou excluir a origem.
- O vínculo é direto, sem cadeia de redirecionamentos. Todas as rotas públicas (evento, busca, ficha e ocorrência) resolvem o mesmo destino. O endereço impresso é mantido; nome/data exibidos pertencem ao destino.
- Busca/ficha/ocorrência enviam o evento que a pessoa conferiu na abertura. Se o QR mudou de destino, o servidor recusa com409 e a tela exige recarregar. Isso evita enviar uma ocorrência de uma página antiga para outra corrida.
- Nenhuma ficha, planilha ou ocorrência antiga é copiada na transferência. Importar e conferir a lista do novo evento continua obrigatório para o operador.
- **Arquivar e preservar dados** aparece na confirmação de exclusão. Arquivados ficam em aba própria, desativam a página pública e bloqueiam escrita de atletas/entregas. Médico autorizado pode consultar o histórico por ID original. Restaurar volta a Planejado, sem iniciar operação automaticamente.
- Exclusão definitiva exige confirmação explícita na UI e no servidor; falha no servidor mantém o evento na lista. A planilha local (com colunas de saúde) e o cache são removidos; as ocorrências/fotos seguem a limpeza existente. Requisições atrasadas de atletas para evento excluído são recusadas. Os vínculos permanecem reservados, sem dados médicos, para eventual recuperação.
- Ao restaurar uma origem cujo QR foi transferido, ela recebe outro endereço; não recupera o QR do novo evento. POST/sync recusam reutilizar IDs de eventos excluídos/reservados.

## Persistência, permissão e recuperação

`server/emergencyLinks.js` guarda `data/emergency_links.json` no volume existente, com substituição atômica, permissão0600, revisão por código e histórico de origem/destino/autor/data. O registro não guarda nomes de atletas, saúde, CPF ou telefone. Registro corrompido impede inicialização para evitar atribuição silenciosa de endereço.

Novos endpoints: POST `/api/events/:id/emergency-links` (Admin/Sub-Admin com acesso ao evento), GET `/api/emergency-links/preview`, PUT `/api/emergency-links/binding` e POST `/api/events/:id/archive` (somente Super Admin). A revisão esperada bloqueia confirmação baseada em vínculo antigo. Rotas médicas autenticadas continuam usando o evento original; não seguem aliases públicos.

O snapshot de dados existente já inclui o novo arquivo; o gate agora detecta perda/regressão do vínculo. Conservar o volume e o registro em qualquer atualização. Depois que houver transferência/arquivamento real, não publicar servidor antigo que ignore os vínculos e o estado Arquivado: isso quebra QR transferido e pode reabrir página arquivada. Reversão exige manter essas proteções ou indisponibilizar a emergência pública até reaplicar o código compatível. Não apagar o registro para voltar versão.

Catálogo local vazio (`events.json` contendo `[]`) passa a ser definitivo; não é substituído por fallback/espelho no reinício. Reidratação Appwrite automática fica restrita a máquina sem arquivo local. Isso evita ressuscitar eventos após excluir todos.

## Validações reais

- Servidor: `node --test` integral,31/31 aprovados (inclui integração HTTP isolada com reinício, evento excluído antes da feature, busca/ficha/ocorrência pelo endereço antigo, autorização, revisão, arquivo/restauração e limpeza médica).
- Cliente:45/45 testes em `src/utils/*.test.mjs`; lint sem erros, três avisos antigos em OperacaoPage; build Vite aprovado.
- Navegador local com usuário/eventos sintéticos e Appwrite desativado: login, modal, confirmação e vínculo de `preview-deleted`, abertura do mesmo endereço e busca do atleta42 no evento novo. Evidências locais em `scratch/qr-reutilizado-local.png` e `scratch/qr-antigo-evento-correto-local.png` (fora do Git). Servidor de teste encerrado.
- Não lido QR físico em celular; não publicado nem testado este código em produção. Homologação PO pendente.

## Achado e correção do isolamento dos testes

Na primeira execução integral, testes HTTP antigos tinham `APPWRITE_ENABLED=false`, mas o conector não respeitava a opção; o `.env` local podia habilitar chamadas externas. Houve reidratação externa e falha de fixture, em vez de um ambiente isolado. Corrigido o conector para respeitar `false`; testes de servidor também recebem chave vazia, catálogo próprio e teste que falha se a rede externa for usada pelo conector desativado. CI inclui essa regressão.

Conferência posterior **somente de leitura** no Appwrite identificou o registro sintético preexistente `event-sync-test`, criado em27/09, com metadados atualizados às03:00:28UTC desta execução. Na listagem consultada não havia evento criado no intervalo de teste; a consulta dos IDs sintéticos não encontrou atletas atualizados/criados desde02:50UTC. Não foi apagado ou restaurado registro remoto preexistente. Sem snapshot anterior desses metadados, não se afirma reversão nem ausência absoluta de outros efeitos; a evidência delimitada e os horários ficam registrados aqui.

## Próximo passo

Yuri homologa o fluxo, nome/data do destino e uma leitura física. Publicação, quando autorizada, deve preservar o novo registro, usar snapshot/healthcheck/rollback compatível e comparar o SHA exato. Não confundir este trabalho do Entregas-run com os ajustes já publicados do MeuPaceRun.
