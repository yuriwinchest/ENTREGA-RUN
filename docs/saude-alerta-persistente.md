# Alerta persistente no painel médico (2026-10-21)

Autores reais: Codex/Tony (implementação e testes) e Claude Code (Opus 5.5) (conferência, CI e
documentação), após o limite de uso do Codex.

## O que faz

- Toda ocorrência nova fica **sem reconhecimento** até alguém do evento agir. Enquanto houver uma, o painel
  mostra a faixa "N alertas aguardando reconhecimento" com a maior gravidade pendente, nas cores
  Leve verde, Moderada âmbar, Grave laranja e Crítica vermelho, e toca uma sirene sintetizada
  (sem arquivo de áudio) a cada 4 s.
- **Assumir e silenciar** (ocorrência aberta): passa para Em atendimento e reconhece o alerta na mesma
  gravação. **Silenciar alerta** (já em atendimento ou encerrada) só reconhece e não mexe no atendimento nem no
  histórico.
- O reconhecimento vale para **todas as telas médicas do evento** (decisão do Yuri): é gravado no
  servidor por ID e as outras telas param na próxima atualização (até 10 s). Uma nova ocorrência rearma.
- Som por dispositivo: o navegador só libera áudio depois de um toque. O painel mostra o estado
  (ativo, aguardando liberação, indisponível) e um botão para ativar. Os avisos visuais funcionam sempre.
- Pulsação lenta da faixa; sem animação para quem pede movimento reduzido no sistema.
- O painel continua consultando a cada 10 s mesmo com a aba em segundo plano, para o alarme tocar.

## Onde está

`client/src/utils/medicoAlert.js` (pendências, maior gravidade, repetidor da sirene),
`client/src/components/MedicoPage.*`, `server/medico.js` (`recognizeAlert`, `updateStatus` com
reconhecimento), `server/server.js` (`POST /api/medico/:eventId/ocorrencias/:id/silenciar`; o PATCH de status
aceita `reconhecerAlerta`). Quem reconheceu fica gravado no servidor e não é devolvido na fila.

## Validação

- `client/src/utils/medicoAlert.test.mjs`: pendências antigas e encerradas, prioridade das quatro gravidades,
  rearmar com nova crítica, repetidor sem áudio duplicado, parada cancelando fontes, contexto suspenso.
- `server/medicoAlert.http.test.mjs`: 401 sem login, 403 operador e outro evento, 404 para ocorrência de outro
  evento, reconhecimento repetido sem nova versão, reconhecimento de X não alcança Y criada ao mesmo tempo,
  persistência após reabrir o servidor.
- Os dois arquivos entraram no CI em 2026-10-21.
- **Não verificado:** som real em celular ou TV e dois aparelhos físicos ao mesmo tempo. Fica para a homologação do Yuri.
