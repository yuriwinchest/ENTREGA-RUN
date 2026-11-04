# Feature Specification: Opções manuais de cadastro

**Feature Branch**: `codex/opcoes-cadastro-global`
**Created**: 2026-11-04
**Status**: Especificada; esclarecimentos respondidos pelo PO.
**Input**: Yuri solicita cadastro manual nas listas, com persistência e integração completa; confirmou Entregas-run, todos eventos e mesmos editores do cadastro.

## User Scenarios & Testing

### User Story 1 - Cadastrar opção no campo (Priority: P1)

Como editor de atleta, quero adicionar uma equipe, modalidade, categoria, kit, tamanho, nacionalidade ou opção personalizada elegível no formulário e salvar o atleta.

**Why this priority**: elimina a limitação do select e conserva o fluxo de cadastro.
**Independent Test**: criar equipe no Novo atleta, salvar e reabrir; repetir na edição e verificar tabela/exportação.
**Acceptance Scenarios**:
1. Ao cadastrar uma opção válida, ela é selecionada após confirmação da gravação.
2. Em falha de conexão/gravação, o texto é preservado e aparece erro sem anunciar sucesso.
3. Ao reabrir atleta salvo, o valor permanece e integra os mesmos processos das opções anteriores.

### User Story 2 - Reutilizar entre eventos (Priority: P1)

Como editor, quero reutilizar opções explicitamente cadastradas em todos os eventos da organização, inclusive após cancelar o atleta e reiniciar o serviço.

**Why this priority**: opções não devem ficar presas ao formulário/evento.
**Independent Test**: criar em A, consultar em B da mesma organização, reiniciar e consultar; outra organização não recebe o valor.
**Acceptance Scenarios**:
1. Cancelar o atleta depois de salvar uma opção não apaga a opção.
2. Duas sessões adicionam opções simultaneamente e ambas permanecem.
3. Caixa e espaços equivalentes reutilizam a primeira grafia cadastrada.

### User Story 3 - Preservar regras e acessos (Priority: P1)

Como responsável, quero manter permissões, status, identificadores, saúde e regras fechadas.

**Why this priority**: criação livre não pode mudar regras ou compartilhar dados sensíveis.
**Independent Test**: operador, evento alheio, enum técnico e campo de saúde são recusados.
**Acceptance Scenarios**:
1. Só quem pode editar cadastro e acessar o evento cria opções.
2. Campos personalizados devem existir no evento; saúde/PCD e identificadores não viram catálogo compartilhado.
3. Criar nome de kit não cria estoque, QR, chip ou conteúdo nem altera atletas anteriores.

### Edge Cases

Texto vazio, Unicode equivalente, controles, texto longo, catálogo indisponível/corrompido, duplicidade, evento inexistente/arquivado, custom ausente, duas abas e reinício.

## Requirements

### Functional Requirements

- **FR-001**: oferecer Adicionar opção em toda lista de cadastro elegível no novo atleta e edição.
- **FR-002**: persistir cada adição independentemente do atleta, compartilhando entre eventos da organização.
- **FR-003**: selecionar só após gravação confirmada; permitir cancelar e repetir em erro.
- **FR-004**: conservar o fluxo de gravação, tabela, exportação, entrega e sincronização existente.
- **FR-005**: deduplicar espaços/Unicode/caixa; preservar primeira grafia; não perder adições concorrentes.
- **FR-006**: verificar identidade, papel e evento no servidor; preservar isolamento administrativo.
- **FR-007**: excluir enums operacionais, saúde/PCD e identificadores da criação livre.
- **FR-008**: incluir catálogo no backup e entregar plano de publicação e rollback sem publicar.

### Key Entities

- Opção: campo, valor, organização, data e autor; independente de inscrição.
- Campo: padrão elegível ou chave personalizada existente não sensível.
- Atleta: recebe o valor selecionado no cadastro normal.

## Success Criteria

### Measurable Outcomes

- **SC-001**: cada lista elegível permite adicionar, selecionar, salvar e reabrir valor novo.
- **SC-002**: valor criado em A aparece em B do mesmo escopo e após reinício; zero exposição a outra organização nos testes.
- **SC-003**: duas adições simultâneas permanecem; duplicata equivalente produz uma opção.
- **SC-004**: acessos e valores inválidos são recusados; falha de gravação não anuncia sucesso.
- **SC-005**: plano permite validar e voltar o código preservando dados cadastrados.

## Assumptions and clarifications

Respostas do Yuri: Entregas-run; listas de cadastro abertas e regras fechadas; todos eventos; mesmos editores. A abrangência respeita a separação de organizações existente. Compartilham-se rótulos, sem inscrições ou estoque. Texto livre sem opções continua texto livre. Saúde/PCD e identificação não publicam valores no catálogo.
