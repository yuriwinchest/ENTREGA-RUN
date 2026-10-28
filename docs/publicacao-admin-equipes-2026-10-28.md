# Publicação de equipes e correção da navegação do sub-admin

Data: 2026-10-28. Autor: Codex/Tony. Fase A/B; Fase C não iniciada.
Yuri autorizou publicar os ajustes de equipes e corrigir a tela do sub-admin nesta conversa.
Intervalo do código: `67352ed..fbc795d`; equipes em `d93859b`, proteção operacional em `387ad12`, regressões de navegação/recarga em `fbc795d`.

## Falha reproduzida e correção

A imagem do PO mostra a operação do evento TESTE com o cursor sobre USUÁRIOS. No código anterior (`origin/main` em `67352ed`), Sidebar oferece esse menu ao SUB_ADMIN vinculado a evento, mas os guards do App tratavam esse vínculo como proibição e devolviam `/usuarios` à operação. No candidato, o perfil conserva a gestão de usuários dentro do seu escopo, sem esse redirecionamento. Operadores/supervisores continuam sem gestão de usuários.

Reprodução em navegador local com APIs/dados sintéticos: porta31858 serviu build antigo, clique USUÁRIOS retornou `/operacao/event-test`; porta31859 serviu candidato, clique abriu `/usuarios` e a página permaneceu aberta durante a observação, inclusive após os ciclos de consulta periódica. Evidência: `docs/evidencias/subadmin-usuarios-2026-10-28.png`. Nenhum cadastro real foi usado.

O candidato também tinha um risco de recarga entre abas ao regravar a mesma sessão com propriedades JSON em outra ordem ou nome atualizado. O listener agora compara identidade, equipe, papel, evento e principal semanticamente; token/escopo diferente ou logout continuam invalidando a aba. Polling funcional de dados não foi removido.

## Testes e operação

- Servidor: **50/50**; suíte de equipes incluindo gate de publicação: **11/11**, contando o pai.
- Client: **75/75**; testes novos executam os guards reais do App e simulam revalidação/troca de sessão.
- Lint exit0 com quatro avisos existentes; build final passou (`index-Dl7Ksvzp.js`); diff check e bash `-n` via Git Bash passaram.
- CI+preflight sem deploy da branch: [run40789596678](https://github.com/yuriwinchest/ENTREGA-RUN/actions/runs/40789596678), concluído com validate/preflight success e deploy skipped.
- Preflight real: disco36%, RAM63,8%, zero usuários/equipes com vínculo e zero eventos de equipe; saúde HTTP200. A imagem anterior foi identificada por Docker inspect no workflow, sem presumir host por histórico.

Plano de publicação em cinco linhas:

1. Atualizar somente a imagem do serviço Entregas-run com o commit validado pelo workflow; conservar o volume de dados.
2. Preservar usuários/eventos/planilhas/QR, demais serviços e schema remoto; espelhamento Appwrite mantém o limite descrito em `admin-equipes-2026-10-28.md`.
3. Conferir snapshots por leitura/hash, saúde e manifesto de eventos/atletas/entregas via API; liberar criação de equipes só depois dessa validação.
4. Em falha, o script restaura a imagem anterior; antes exige ausência de equipes ou imagem anterior com suporte à transição de isolamento. Não restaura snapshot sobre entregas novas.
5. Janela: execução única do workflow autorizada em 2026-10-28, acompanhada até concluir; parada breve restrita à recriação deste serviço.

Vitor revisou o desenho; condições do veto inicial atendidas pelo gate503 sem persistência e verificação fail-closed de compatibilidade. O script confere o marcador `server/teamAccess.js` na imagem exata anterior, em container efêmero sem rede, somente leitura e sem volume, quando já há equipes. O marcador vale para esta transição conhecida, não certifica versões futuras arbitrárias.

Backup de data no mesmo host, excluindo fotos/sessões conforme política existente, com hash de usuários/eventos/planilhas. Não foi realizado restore em produção. Restore isolado e RTO/RPO atuais não foram comprovados nesta entrega; recuperação das equipes exige volume/backup completo, pois Appwrite legado não guarda equipe nos eventos.

## Resultado da publicação

Publicado em 2026-10-28, aproximadamente 20h51 de Brasília: [workflow40789978678](https://github.com/yuriwinchest/ENTREGA-RUN/actions/runs/40789978678), commit `fbc795ddf97d86dd6bf25dc75653c4d74c020e44`; validate, preflight e deploy concluídos com success.

Logs reais confirmaram imagem anterior identificada e zero equipes existentes, snapshot de usuários conferido por leitura/hash, snapshot completo de eventos/atletas/usuários por hash, manifesto privado, nova imagem saudável na segunda tentativa e integridade preservada: **1 evento, 16.481 atletas e 865 entregas**. A verificação autenticada local da API manteve todos os eventos, atletas e entregas anteriores. Nenhum rollback foi necessário.

Verificação pública após a publicação: `https://app.entregasrun.com.br/api/health` e `https://entregasrunning.com.br/api/health` responderam HTTP200. Ambos os frontends serviram `/assets/index-Dl7Ksvzp.js`, o bundle final validado. Não foi criado usuário de teste nem feita entrega em produção. O fluxo funcional do sub-admin foi reproduzido no navegador local; homologação com a conta e aparelho do PO permanece com Yuri.

Os servidores/abas sintéticos foram encerrados. Registro de continuidade e AI Memory atualizados; o commit documental posterior usa `[skip ci]` e não altera o runtime publicado.
