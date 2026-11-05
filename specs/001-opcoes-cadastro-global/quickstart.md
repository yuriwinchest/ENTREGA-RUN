# Quickstart e aceite

Usar DATA_DIR temporário, APPWRITE_ENABLED=false, admin sintético, dois eventos da mesma organização e outro isolado. Nunca montar data real.
1. Novo atleta → equipe → abrir lista → último item Adicionar opção → nome → Salvar opção: seleciona após confirmação.
2. Salvar atleta, verificar tabela, reabrir e exportar; repetir na edição com categoria/modalidade/kit/camiseta/nacionalidade/custom não sensível.
3. Abrir segundo evento: opção disponível. Cancelar atleta, reiniciar serviço: catálogo permanece.
4. Duplicata com espaços/caixa não duplica. Operador e outra organização não criam/acessam; enums/saúde recusados.
5. Simular erro: texto fica para repetir; sem seleção/sucesso falso. Conferir teclado, Escape e largura375px.
6. node --test nas suítes client/server; lint/build; bash -n script deploy. Appwrite falso para confirmar payload de equipe/modalidade/categoria/kit/camiseta.
Publicação posterior: ver docs/opcoes-cadastro-global-2026-11-04.md após implementação. Yuri homologa.

Validação banco: servidor Appwrite fake recebe catálogo, confirma criação antes de sucesso,409 reutiliza primeiro rótulo;205 registros recuperam todas páginas. Remover cache sintético e reiniciar recupera catálogo. Extras do atleta retornam do banco sem saúde. Deploy autorizado somente após testes finais, snapshot e check schema.
