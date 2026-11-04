# Registration options HTTP

GET /api/events/:eventId/registration-options → 200 {ok:true,options:{field:[label]},customFields:[key]}.
POST mesma rota + {field,value} → 201 novo ou 200 existente {ok:true,field,value,created,options}.
401 sem sessão; 403 papel/evento fora escopo; 404 evento ausente; 409 arquivado; 400 campo/valor inválido; 500 persistência indisponível.
Bearer auth existente. Scope deriva do evento inclusive para principal admin. Nenhuma rota recebe catálogo inteiro.
