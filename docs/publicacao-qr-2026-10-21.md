# Publicação de QR permanente e cache de kits

Autor: Codex/Tony. Data: 21/10/2026, Fase B. Autorização do PO nesta conversa: “pode subir então”.

- Código publicado: `00017e9bb2743f16183e79c91e08d004d650cdf0`, integrado à main sobre `663fd70`, mantendo os ajustes de idade, ErrorBoundary e deploy.
- Pipeline: https://github.com/yuriwinchest/ENTREGA-RUN/actions/runs/39653204756 — validate, preflight e deploy concluídos com success.
- Local: cliente 51/51; servidor 32/32; teste HTTP da trava de publicação aprovado; lint sem erros e três avisos existentes; build e bash -n aprovados.
- Preflight remoto: disco 33%; serviço anterior saudável. Sem novo serviço/volume/porta. RAM não medida nesta entrega.
- Snapshot conferido por hash e manifesto privado antes da substituição. Nova imagem saudável na tentativa 2. Log remoto confirmou integridade de 2 eventos, 15781 atletas e 703 entregas, além da preservação desses dados na API.
- Verificação pública após deploy: os dois domínios responderam health ok; entregasrunning.com.br serviu `/assets/index-DrnrMiYs.js`, com a interface de reaproveitamento de QR. Nenhum vínculo de evento real foi transferido nesta validação.
- Trava temporária de binding/archive aplicada no script; liberada no cleanup após confirmação. Reversão posterior precisa continuar compatível com vínculos permanentes/arquivamento, conforme docs/qr-permanente.md.
- Pendente: Yuri testar Edge no evento real, escolher QR antigo e destino no modal e homologar leitura física. Não houve homologação pelo agente.

Para usar: atualizar a página, abrir Emergência médica no evento novo, expandir Reaproveitar QR Code já impresso, colar o link antigo, conferir endereço, selecionar e confirmar o evento/data/lista e vincular. O recurso exige Super Admin.
