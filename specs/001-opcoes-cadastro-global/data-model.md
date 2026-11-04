# Data model

registration_options.json: versão do formato + escopos de organização + campos + opções. Cada opção conserva label canônica, identidade normalizada, data e autor. Escopo deriva de teamOf(event), nunca do body.
Campo padrão: equipe128, modalidade64, categoria64, kit64, camiseta32, nacionalidade64 caracteres.
Custom: custom:<chave estável>, somente elegível no evento, sem saúde/PCD/identidade; até128 caracteres.
Sem exclusão/renomeação; escrita atômica com temporário/rename. Evento/atleta existentes não são regravados ao criar opção.
