# Emergência médica por evento (2026-10-20)

Fluxo pedido pelo Yuri: QR Code único por evento, impresso no número de peito, abre uma página pública
onde quem socorre busca o atleta, vê as informações de saúde e abre uma ocorrência; a ocorrência cai no
painel do perfil **MEDICO**, preso ao evento.

Os dados de saúde **vêm da planilha de inscrição** (gerada por outro sistema e importada aqui). Não há
formulário para o atleta preencher nem montador de perguntas: essa primeira versão foi descartada pelo
Yuri em 2026-10-20 antes de publicar.

## Telas

| Onde | Quem | O quê |
|---|---|---|
| Entregar kit → Auditoria → **Importar** → etapa 2, seção **Saúde** | quem importa a planilha | Marca quais colunas são de saúde e quais aparecem na página pública. Reimportar traz as marcações de volta |
| Eventos → botão **Emergência médica** | ADMIN, SUB_ADMIN | QR Code (PNG alta resolução e SVG), link público, resumo das colunas de saúde, atalho para o painel |
| `/emergencia/:eventId` | qualquer pessoa (QR) | Pede GPS sem bloquear; busca por peito, CPF completo ou nome (máx. 5); "Pessoa não identificada"; gravidade, nome, telefone, descrição e local; embaixo, as colunas públicas de saúde; botão Enviar fixo no rodapé |
| `/medico/:eventId` | MEDICO do evento; ADMIN e SUB_ADMIN no escopo | Fila (10 s, com versão: sem mudança não trafega lista), alerta sonoro, status Aberta / Em atendimento / Encerrada, cadastro completo, todas as colunas de saúde, mapa |

## Onde fica cada dado

- Valores de saúde: nos campos personalizados do atleta (`customFields`), em `data/athletes_<evento>.json`,
  como qualquer coluna importada. Não vão ao Appwrite (o espelho não envia `customFields`).
- Escolha das colunas: `healthFields` no mesmo arquivo (`[{ key, label, publico }]`). Salvar sem
  `healthFields` (autosave da operação) mantém a escolha anterior.
- Ocorrências: `data/medico/ocorrencias_<evento>.json` (arquivo 0600, pasta 0700). O vínculo com o atleta é
  um hash de evento + CPF (ou peito) e sobrevive a reimportar a planilha.

## Decisões de segurança e operação (Crowley / Vitor / Teclide)

- Colunas que identificam ou localizam a pessoa (CPF, RG, documento, telefone, celular, contato, e-mail,
  endereço, CEP, nascimento) **nunca** ficam públicas: a tela bloqueia e o servidor reaplica a regra.
- Página pública: só nome, peito, modalidade e colunas públicas preenchidas. Validação pública do kit
  (`/api/public/events/:id/athletes/:numero`) e espelho do guichê passaram a esconder as colunas de saúde.
- Perfil MEDICO é barrado no servidor em toda rota `/api` fora de `/api/medico/*`, `/api/session`,
  `/api/logout` e `/api/health`. Exige evento vinculado na criação e no login.
- Limites: consulta pública 60/min por IP; abrir ocorrência 5 a cada 10 min por IP; teto de 2.000 ocorrências por evento.
- Excluir o evento apaga as ocorrências. Logs nunca recebem conteúdo de ficha ou ocorrência.
- O palpite automático da importação mapeava "Contato de emergência" como CONTATO do atleta
  (sobrescrevia o telefone). Agora vira campo próprio.

## Riscos que continuam

- Algumas rotas antigas de atletas respondem sem login (`GET /api/events/:id/athletes` e outras) e
  devolvem `customFields`, ou seja, também os dados de saúde da planilha. Já era assim com qualquer coluna
  importada. Proposta de tarefa separada: "Fechar rotas de atletas abertas sem login".
- A planilha original inteira (`originalSheet`) também fica guardada, com todas as colunas.
- Retenção (LGPD): por quanto tempo guardar ocorrências e dados de saúde após a prova? Hoje só somem ao
  excluir o evento.
- Backups do deploy (`/opt/entregas-run/backups`, sem rotação) já contêm as planilhas e agora as ocorrências.
- A página pública não substitui o 192: o botão "Risco de vida? Ligue 192" fica fixo no topo.
