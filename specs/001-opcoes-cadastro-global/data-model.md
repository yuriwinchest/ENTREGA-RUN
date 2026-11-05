# Data model

Appwrite registration_options: documento determinístico por [scope, field, valor normalizado], com scope_id256, field160, value128 e created_at datetime. Coleção sem permissões de cliente, documentSecurity true, índice scope_id. A primeira grafia no banco prevalece em conflito. Consulta paginada e filtrada por organização.
registration_options.json: cache operacional versionado por escopo; merge append-only atômico em lote. Não contém inscrições. Pode ser reidratado do banco; falha de banco não confirma inclusão local.
Campos padrão: equipe128, modalidade64, categoria64, kit64, camiseta32, nacionalidade64. Custom: custom:<chave estável> existente e elegível, opção nova até128 caracteres, sem saúde/PCD/identificação.
Athletes.registration_fields: string JSON opcional até16384, guarda nacionalidade e customFields elegíveis. Valores importados legados não são truncados para o limite de rótulo novo. Ausência do atributo no payload legado preserva extras existentes no PATCH. O fluxo operacional local conserva os demais dados como antes.
Sem exclusão/renomeação de opções ou regravação de atletas ao criar uma opção.
