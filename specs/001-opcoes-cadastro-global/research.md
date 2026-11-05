# Research

Decisão: persistência JSON no volume, compatível com fonte operacional existente; Appwrite continua espelhando cadastro padrão. Yuri reforçou banco obrigatório e autorizou publicar; provisionar apenas coleção privada e atributo opcional, com preparação aditiva verificada.
Alternativas rejeitadas: localStorage (não global/persistente servidor), extrair valores de todos atletas (privacidade e contaminação), texto livre sem cadastro de opção (não reusável).
Inventário: modalidades, categorias, equipes, kits, camisetas, nacionalidade e custom elegíveis em novo atleta/detalhe. Sexo, morador, PCD, status, perfis, filtros e mapeamento não são catálogos livres.
Ana/Kastiel e Crowley/Teclide/Vitor enviaram propostas a Ulisses e refinaram. Convergência: opções globais dentro do teamId do evento; kit só rótulo; salvar opção independente do atleta; não afirmar homologação.
Lacuna herdada corrigida: Appwrite passa a armazenar nacionalidade/customFields elegíveis em registration_fields, JSON opcional com limite global sem truncamento. Saúde e identificadores adicionais são excluídos. Campos padrão mantêm mapper existente.

Correção visual aceita para implementação: último item da lista abre diálogo compacto; Enter salva só a opção, Escape/Cancelar preservam cadastro pai e seleção anterior. UI usa portal e foco contido, compatível com os modais existentes.
