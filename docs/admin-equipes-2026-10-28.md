# Administradores de equipe — candidato local

Data: 2026-10-28. Fase A. Autor: Codex/Tony; subagentes internos UI, segurança/QA e Ulisses.
Base: `origin/main` em `67352ed`. Implementação: `67352ed..d93859b`, branch `codex/admin-equipes`.

## Pedido e critérios

O principal cria administradores secundários. Cada secundário administra projetos próprios e de seus usuários, sem acessar outras equipes ou o acervo principal. Usuários menores conservam os limites de seu perfil e evento. O principal mantém a visão global.

- [x] Nova função `TEAM_ADMIN`, exibida como ADMIN DE EQUIPE, criada somente pelo principal real (`ADMIN_EMAIL`).
- [x] Equipe estável (`teamId`) e autoria atribuídas no servidor; corpo de requisição não define posse.
- [x] Equipes novas começam vazias. Usuários/projetos existentes sem equipe ficam no âmbito principal.
- [x] `ADMIN` legado é ADMIN DO PRINCIPAL: administra o acervo principal, sem acesso às equipes novas ou controle do principal.
- [x] Projetos criados pelos perfis subordinados que já podem criá-los herdam a equipe; operadores e médicos não ganham criação.
- [x] Listas, métricas, sincronização, usuários, atletas, fotos, médico e escrita do Espelho respeitam equipe/evento.
- [x] Cache privado é limpo na troca de identidade/equipe; operação só monta após validar a lista autorizada no servidor.
- [x] Desativar líder suspende sessões e login de toda equipe. Reativação exige novo login. Líder não é excluído para não abandonar dados.

## Plano executado e decisões

1. Inspecionar estado Git, instruções e acesso atual; criar worktree isolado da base atualizada, preservando arquivos sujos do checkout original.
2. Ulisses revisar a separação entre autoria e autorização; Crowley/Teclide revisar rotas e testes; Ana implementar UI junto da mudança de servidor.
3. Concentrar comparação de equipe e autorização em `server/teamAccess.js`; validar também IDs canônicos antes dos handlers.
4. Testar duas equipes, acervo legado, principal, sessões persistentes, falsificação de posse e acessos por ID.
5. Construir client, conferir navegador com dados sintéticos e registrar candidato em Git para homologação do PO.

Transferência entre equipes e conversão de usuários existentes em administradores de equipe ficam fora desta entrega. O principal pode cadastrar um usuário inferior em evento de equipe pela API: ele herda a equipe do evento; a tela de criação comum do principal oferece seu próprio acervo. Na edição, o principal pode administrar os subordinados de qualquer equipe e selecionar eventos daquela equipe.

QR público de emergência, validação pública e leitura pública do telão conservam seus contratos públicos. A escrita do Espelho agora exige sessão. Transferir QR existente fica exclusivamente com o principal. Administrador de equipe emite QR do próprio evento, arquiva/restaura e exclui seu evento com a confirmação existente de invalidação do QR.

## Persistência e limite do conector remoto

O volume persistente do servidor guarda `users.json` e `events.json` com os vínculos de equipe, além dos arquivos de atletas e sessões. Nenhum dado real foi migrado ou alterado nesta sessão.

O schema legado do espelhamento opcional Appwrite não representa a equipe do evento. Para evitar que um evento de equipe retorne como evento principal numa reidratação remota, `mirrorEventToAppwrite` não envia metadados de eventos de equipe. O espelhamento de atletas segue o comportamento existente. A cópia remota isoladamente **não restaura a estrutura das equipes**; sua recuperação exige o volume/backup local completo. Evoluir esse conector exige schema com vínculo de equipe e validação de recuperação, em demanda específica. Nenhum schema ou serviço remoto foi alterado.

## Validação real

- `node --test server/*.test.mjs`: **49/49**, inclusive 10 testes da nova suíte HTTP (contando o pai).
- `node --test client/src/utils/*.test.mjs`: **70/70**.
- `npm run lint --prefix client`: exit 0, quatro avisos existentes; `npm run build --prefix client`: passou após os ajustes finais.
- `git diff --check`: passou.
- HTTP: duas equipes isoladas; principal global; legado restrito; CRUD próprio autorizado; tentativas cruzadas negadas em edição/exclusão/arquivo/QR/atletas/chunks/fotos/operadores/médico/Espelho; sync rejeita lote alheio antes de gravar; homônimos não misturam contagens; reinício mantém vínculos e tokens; desativação revoga acesso.
- Navegador local com banco sintético: principal vê três projetos; novo perfil aparece no cadastro e independe de projeto anterior; Alfa vê apenas seu projeto; URL direta da operação Beta mostra “Projeto indisponível para seu acesso”. Evidência: `docs/evidencias/admin-equipe-alfa-2026-10-28.png`.

## Operação e próximo passo

STATUS: candidato local validado; não integrado à main nem publicado. RISCO: rollback para servidor anterior às equipes ignora o isolamento novo. PLANO: homologar antes de autorizar publicação; nunca liberar dados de equipes com código anterior que desconhece `teamId`.

Antes de publicar: snapshot completo do volume e revisão operacional do deploy. Para voltar após uso real: suspender acessos de equipes e restaurar código+dados compatíveis; não voltar apenas a imagem mantendo sessões/equipes ativas. Não foi executado deploy, mudança na VPS ou teste de recuperação em produção.

Homologação do Yuri: criar dois administradores de equipe, criar projetos/usuários em cada um e conferir os perfis inferiores. Publicação permanece separada. Fase C não iniciada.
