# Tasks: Opções manuais de cadastro

Input: spec.md, plan.md, research.md, data-model.md, contracts/ e quickstart.md.

## Phase 1: Setup
- [x] T001 Preservar checkout e preparar worktree codex/opcoes-cadastro-global.
- [x] T002 Preparar .specify e constituição sem sobrescrever AGENTS.md.
- [x] T003 Esclarecer escopo e registrar specs/001-opcoes-cadastro-global/spec.md e plano.

## Phase 2: Foundation
- [ ] T004 Implementar store normalizado/atômico em server/registrationOptions.js.
- [ ] T005 [P] Implementar cliente API e merge em client/src/utils/registrationOptions*.js.

## Phase 3: US1 — criação no campo
- [ ] T006 [US1] Criar componente inline acessível client/src/components/CreatableSelect.jsx e CSS.
- [ ] T007 [US1] Integrar listas padrão e custom elegíveis em client/src/components/OperacaoPage.jsx.
- [ ] T008 [US1] Verificar persistência atleta/tabela e payload Appwrite padrão em server/registrationOptions.http.test.mjs.

## Phase 4: US2 — reuso e persistência
- [ ] T009 [US2] Conectar GET/POST server/server.js ao catálogo por organização.
- [ ] T010 [US2] Implementar refresh do catálogo em client/src/hooks/useRegistrationOptions.js.
- [ ] T011 [US2] Testar dedup, concorrência, falha e reinício em server/registrationOptions*.test.mjs.

## Phase 5: US3 — fronteiras
- [ ] T012 [US3] Validar roles/schema/saúde/enums/escopo no servidor.
- [ ] T013 [US3] Testar autorização, isolamento e rejeições em server/registrationOptions.http.test.mjs.

## Phase 6: validação e entrega
- [ ] T014 [P] Cobrir merge client em client/src/utils/registrationOptions.test.mjs.
- [ ] T015 [P] Incluir testes CI e hash catálogo em .github/workflows/deploy.yml e scripts/deploy-vps.sh.
- [ ] T016 Executar suítes, lint/build e navegador sintético; registrar evidências em docs/opcoes-cadastro-global-2026-11-04.md.
- [ ] T017 Atualizar HANDOFF.md/AI Memory e commitar marcos; preparar publicação posterior sem deploy.

## Dependencies and strategy

T001–T003 → T004/T005 → T006/T009 → T007/T010/T012 → validações → T016/T017.
Root faz frontend; Kastiel backend; Teclide testes e Vitor preparação de deploy em arquivos separados. Cada história tem teste independente no spec. Checklist de especificação 6/6 concluído; nenhum hook de extensão instalado. MVP é equipe no novo atleta, seguido da mesma integração para edição e demais campos antes da entrega completa.
