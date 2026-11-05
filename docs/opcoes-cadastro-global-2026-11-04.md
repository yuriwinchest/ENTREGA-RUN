# Opções manuais de cadastro — 2026-11-04

Autor: Codex/Tony, com subagentes Codex nos mandatos de Ana/Kastiel, Crowley/Teclide/Vitor e revisão de Ulisses. Fase A. Branch: codex/opcoes-cadastro-global, baseada em origin/main 5ef586d. Yuri autorizou a publicação após os testes e reiterou “continua e publica”.

## Comportamento entregue

A ação “+ Adicionar opção…” fica no último item da própria lista. O formulário não recebe botões abaixo dos campos. Selecionar a ação abre um diálogo compacto com o nome da opção, Salvar e Cancelar. O sentinela nunca vira valor do atleta. Escape/Cancelar preservam seleção e formulário pai; Enter salva somente a opção. Enquanto a confirmação está pendente, cadastro/salvamento/entrega ficam protegidos contra corrida.

Abrangência: equipe, modalidade, categoria, kit, camiseta, nacionalidade e campos personalizados elegíveis, tanto no novo atleta quanto na ficha. A apresentação continua obedecendo às colunas reais do evento. Sexo, morador, status, permissões, identificadores, PCD e saúde mantêm suas regras fechadas. Filtros/mapeamentos não são catálogos de cadastro. Kit novo é um rótulo; não cria estoque, chip ou QR.

As opções são reutilizadas em todos os eventos da organização do evento. O servidor deriva o escopo; nem o principal escolhe escopo pelo corpo da requisição. Valores antigos dos atletas não são publicados automaticamente no catálogo. Cancelar o atleta não desfaz uma opção já cadastrada.

## Banco e integração

Appwrite: coleção privada registration_options, documentos com identidade determinística por escopo/campo/valor normalizado. A criação exige confirmação remota quando a integração está habilitada; falha retorna erro e preserva o texto. Conflito 409 recupera a primeira grafia; consultas são paginadas e filtradas por escopo.

JSON data/registration_options.json é cache operacional com escrita atômica e merge append-only. O catálogo é recuperável pelo banco. Se banco gravar e cache falhar, a resposta é 503 e a repetição recupera o mesmo documento, sem duplicar. Modo local explícito é usado apenas nos ensaios sem Appwrite; publicação exige conexão e schema pronto.

O atleta segue apiSaveAthletes → armazenamento operacional → mirrorAthletesToAppwrite. Equipe, modalidade, categoria, kit e camiseta mantêm seus campos existentes. Nacionalidade e customFields elegíveis passam também pelo atributo JSON opcional registration_fields, sem truncamento do JSON. Saúde e identificadores adicionais ficam fora desse novo atributo; controles dependem do schema, healthFields e bloqueios conhecidos. Escritas legadas que omitem extras não apagam os extras remotos.

## Evidências locais

- Cliente: 90/90 testes; lint 0 erros, 4 avisos existentes; build Vite aprovado.
- Servidor: 102/102 testes na versão final, incluindo 30 casos do catálogo/Appwrite/provisionamento; nenhuma falha ou teste ignorado.
- UI Chrome local com dados fictícios: criação/seleção em 7 campos, tabela, reabertura, reuso em segundo evento, cancelamento preservando opções, dedup, erro de validação e bloqueio durante rede lenta. Ajuste final: ação interna, Escape/Cancelar/Enter isolados e modal 375 px (343 px de largura, sem exceder viewport).
- Script deploy: Bash -n e git diff --check aprovados. Nenhum teste funcional criou atleta/opção fictícia em produção.
- Capturas: docs/evidencias/opcoes-cadastro-formulario-2026-11-04.jpg e opcoes-cadastro-modal-mobile-2026-11-04.jpg. Não substituem validação em Safari/iPhone físico ou homologação do Yuri.

## Plano de publicação em cinco linhas

1. Muda o acesso à criação e o catálogo persistente, mais o espelhamento de extras; preserva inscrições, entregas, papéis e isolamento existentes.
2. Valida testes/client/server/lint/build, imagem non-root e preflight com saúde/disco/memória antes da mudança.
3. Faz snapshot privado de usuários/eventos/atletas/cache com hash e manifesto; captura metadata de schema Appwrite sem documentos ou segredos.
4. Provisiona somente coleção/atributos/índice ausentes via candidata isolada --apply; --check exige available e ACL privada antes do switch. Incompatibilidade aborta, versão anterior segue atendendo.
5. Uma troca de imagem; healthcheck e integridade antes de encerrar. Falha depois do switch restaura imagem anterior, mantendo volume e schema aditivo. Janela estimada depende do CI/build e disponibilidade do Appwrite; sem parada de banco ou host.

O rollback não remove coleção/atributo nem restaura snapshot sobre entregas mais recentes. Em recuperação de dados, diagnosticar e obter plano específico; backup não é restaurado automaticamente. O script de deploy usa lock e respeita o serviço compartilhado da VPS.

## Continuidade

AI Memory não está disponível nas ferramentas na etapa final; sincronização pendente registrada localmente, sem afirmar gravação. Fonte operacional de continuidade: HANDOFF.md e este relatório. Publicação registrada abaixo com o resultado real do GitHub Actions.

## Publicação confirmada

- Produto: commits 2c06646 (Spec Kit), a951d09 (fluxo funcional) e c1e29a2e4270accb2392099aec5573be828c17e6 (interface final + banco + deploy).
- GitHub Actions: https://github.com/yuriwinchest/ENTREGA-RUN/actions/runs/41948089271 — validate, preflight e deploy concluídos com sucesso.
- Concluído em 2026-11-04 às 22:24 (America/Sao_Paulo). Imagem release-c1e29a2e4270 saudável na primeira tentativa.
- Snapshots privados conferidos por hash. Schema Appwrite: coleção registration_options privada, atributos scope_id/field/value/created_at, índice scope_id e athletes.registration_fields criados; --check terminou sem issues antes do switch.
- Integridade confirmada no disco e na API: 3 eventos, 17.666 atletas, 2.113 entregas preservados. Não houve rollback nem inserção de dados fictícios em produção.
- Verificação externa após deploy: HTTP 200 nos healthchecks dos dois domínios, Appwrite habilitado e diskWriteError null; catálogo sem sessão responde 401. HTML de produção serve index-CkZcu0yz.js com ação interna e diálogo da versão candidata.
- Vitor revisou preparação/isolamento/rollback sem veto ao desenho; teste do escopo principal usa identificador não vazio __principal__ no banco. Suítes finais e CI/preflight passaram; publicação autorizada pelo PO.
- Próximo: Yuri homologar pelo fluxo real. Safari/iPhone físico continuam sem teste; AI Memory indisponível nas ferramentas, sincronização pendente.
