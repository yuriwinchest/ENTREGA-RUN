# Research

Decisão: persistência JSON no volume, compatível com fonte operacional existente; Appwrite continua espelhando cadastro padrão. Não provisionar coleção nem alterar produção.
Alternativas rejeitadas: localStorage (não global/persistente servidor), extrair valores de todos atletas (privacidade e contaminação), texto livre sem cadastro de opção (não reusável).
Inventário: modalidades, categorias, equipes, kits, camisetas, nacionalidade e custom elegíveis em novo atleta/detalhe. Sexo, morador, PCD, status, perfis, filtros e mapeamento não são catálogos livres.
Ana/Kastiel e Crowley/Teclide/Vitor enviaram propostas a Ulisses e refinaram. Convergência: opções globais dentro do teamId do evento; kit só rótulo; salvar opção independente do atleta; não afirmar homologação.
Limite herdado: Appwrite não armazena nacionalidade/customFields; cadastro operacional preserva ambos em JSON. Campos padrão equipe/modalidade/categoria/kit/camiseta já têm mapper remoto.
