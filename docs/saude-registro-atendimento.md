# Registro de atendimento e desfecho (2026-10-21)

Autor real: Claude Code (Opus 5.5), continuando a frente 4 da central (o Codex/Tony atingiu o limite de uso).
Pedido do Yuri: registrar o que o médico prescreveu, aplicou e fez, e o desfecho/destino ao encerrar.

## Como funciona no painel médico

- Na ficha da ocorrência, seção **Registro de atendimento**, há três campos de texto livre: Evolução/avaliação,
  Condutas e procedimentos, Prescrições e administrações. **Salvar registro** acrescenta uma entrada com hora
  e autor (o nome do usuário logado, vindo do servidor). Entradas não são editadas nem apagadas; um ajuste
  vira nova entrada. O sistema não sugere medicamento nem dose.
- **Encerrar…** abre o desfecho: Liberado no local, Retornou à prova, Removido para hospital/UPA (exige qual),
  Transferido ao SAMU/outra equipe (exige qual), Recusou atendimento ou remoção, Óbito, Outro (exige
  descrição), mais uma observação opcional. O que estiver escrito e ainda não salvo nos três campos é gravado na
  **mesma escrita** do encerramento: ou entra tudo ou nada.
- Sem desfecho válido o servidor recusa o encerramento (400) e a ocorrência continua aberta.
- **Reabrir** guarda o desfecho anterior em "Desfechos anteriores"; para encerrar de novo é preciso outro desfecho.
- O rascunho fica só na memória da aba: sobrevive à atualização a cada 10 s, à troca de ocorrência e a erro de
  rede (a mensagem diz que o texto continua na tela). Não vai para o armazenamento do navegador, para não deixar
  dado de saúde no aparelho. Recarregar a página descarta o rascunho não salvo.
- O card da fila mostra o destino das encerradas.

## Servidor

- `server/medico.js`: `DESTINOS`, `validateRegistro` (ao menos um campo, até 2.000 caracteres cada),
  `validateDesfecho`, `addRegistro` (até 200 por ocorrência) e `updateStatus` com `desfecho` e `registro`.
- `server/server.js`: `POST /api/medico/:eventId/ocorrencias/:id/registros`; o PATCH de status exige `desfecho`
  ao passar para Encerrada e aceita `registro` junto. Mesmo acesso do painel: MEDICO do evento, ADMIN e
  SUB_ADMIN no escopo. Nada disso aparece em rota pública, QR ou Espelho.

## Validação

- `server/medicoRegistro.http.test.mjs` (entrou no CI): validações; 401 sem login, 403 operador, 404 para médico
  de outro evento; autor e hora do servidor mesmo com `por` e `em` forjados; encerrar sem desfecho ou sem
  hospital é recusado e não muda o status; anotação final gravada junto; acréscimo depois de encerrar; reabrir
  preserva o desfecho anterior; nada clínico na rota pública; gravado no arquivo do evento.
- `client/src/utils/medico.test.mjs`: rascunho preenchido e destinos que exigem detalhe.
- Navegador local (dados fictícios, Appwrite desligado), na pasta de trabalho: assumir pelo alarme, registrar
  os três campos, rascunho mantido após uma atualização de 10 s, encerrar sem hospital (barrado) e com hospital
  (2 registros + desfecho), reabrir e encerrar como liberado (desfecho anterior listado), formulário de encerramento no celular (375 px).
- Defeito achado e corrigido no teste: a mensagem de erro antiga ficava na tela depois de encerrar com sucesso.

## Pendências

- Homologação do Yuri e da equipe médica (nomes dos destinos, campos e se querem exportar o registro).
- Retenção (LGPD) dos registros clínicos: mesma decisão pendente das ocorrências.
