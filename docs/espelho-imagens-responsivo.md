# Espelho: imagens persistentes e ajuste automático de tela

Data: 2026-10-21. Autor real: Codex/Tony. Fase A. Revisão por subagente Codex (Ulisses, com análise pontual Teclide/Crowley). Sem publicação, push, commit ou Fase C.

## Pedido e resultado

Yuri pediu que fundo/logo enviados de outro aparelho aparecessem também no painel de configuração e nas miniaturas, persistissem no servidor e que a segunda tela se adaptasse automaticamente a TV/computador/telão, sem informar polegadas.

A implementação usa GET inicial e SSE no painel, além da sincronização local entre abas. A configuração persistida no servidor é a referência; a quota do armazenamento local não impede a prévia nem apaga mídia. A edição mostra carregando, salvando, sincronizado ou erro com nova tentativa. Imagens têm miniatura e dimensões naturais após otimização. São aceitos PNG/JPG/WebP até 5 MB de arquivo; compressão proporcional até 1920×1080 para fundo e 600×300 para logo, preservando transparência do logo. O servidor limita cada data URL a 4 MiB e aceita corpo de até 9 MiB para comportar ambas.

O layout responde à área útil/proporção da janela: fontes e espaçamentos acompanham o viewport; ficha ocupa a largura disponível; telas verticais usam duas colunas de dados; ultralargas colocam destaques e dados lado a lado. ResizeObserver mede o conteúdo e a área central e reduz a escala quando necessário para manter a ficha dentro da tela, inclusive ao redimensionar/entrar em tela cheia. O navegador não precisa identificar polegadas físicas.

O fundo preenche com `cover`, mantendo a proporção e podendo recortar bordas. Logo usa `contain` e mantém sua proporção. A recomendação 1920×1080 para fundo e 600×300 PNG transparente para logo aparece no painel, junto à orientação de manter conteúdo importante no centro.

## Correções de consistência

- Fila, rascunho e falhas são isolados por evento e sobrevivem ao fechamento/desmontagem do modal. Callback de A não altera cache/status de B.
- GET antigo não sobrescreve configuração mais nova recebida por SSE. Reabertura durante POST não anuncia sucesso antecipado nem restaura imagem antiga.
- BroadcastChannel de aparência é um patch: mescla campos sem apagar imagem/logo ou seleção de campos. Remoção explícita por `null` continua funcionando.
- Retry reaplica apenas os campos alterados; uma falha seguida de outro patch bem-sucedido permanece indicada até recuperar os campos pendentes.
- Ao drenar uma fila bem-sucedida, releitura protegida por revisão reconcilia mudanças de outros aparelhos ocorridas durante a gravação.
- Mudança de aparência não envia status LIVRE/atleta vazio. O backend preserva atendimento/entrega e deixa config-only independente do relógio do aparelho.
- Servidor prepara próximo snapshot, grava temporário e renomeia antes de confirmar, alterar memória ou transmitir SSE. Falha retorna503 e mantém configuração anterior; temporário de uma tentativa malsucedida é removido quando possível.
- Backend restringe mídia a data URL raster PNG/JPEG/WebP base64; entrada inválida retorna400 sem substituir mídia existente.
- Eventos `storage` invalidam o cache em memória; a página filtra a chave do evento correto.

## Arquivos da demanda

- `client/src/components/EspelhoModal.jsx`
- `client/src/components/EspelhoModal.css`
- `client/src/components/EspelhoPage.jsx`
- `client/src/components/EspelhoPage.css`
- `client/src/utils/espelhoSync.js`
- `client/src/utils/espelhoSync.test.mjs` (novo, sete testes)
- `server/server.js`: somente o bloco Espelho, entre sua persistência e o parser geral; alterações da importação no mesmo arquivo foram preservadas.
- `server/espelho.http.test.mjs` (novo, servidor real com DATA_DIR temporário)
- Este documento. Evidências locais em `scratch/`, ignorado pelo Git.

## Validação real

- `node --test client/src/utils/*.test.mjs`: 58/58 após os ajustes finais.
- `node --test server/*.test.mjs`: 34/34 no checkout compartilhado; inclui os testes da outra demanda de importação. Após o último ajuste de limpeza de temporário, o teste HTTP específico foi repetido e aprovado.
- `node --test client/src/utils/espelhoSync.test.mjs server/espelho.http.test.mjs`: aprovado; fila, quota, retry, atraso GET/SSE, isolamento e persistência/erro real de disco. Os dois últimos testes cliente (broadcast parcial e reconciliação concorrente) foram acrescentados depois e passaram na suíte final de58.
- `npm run lint --prefix client`: sem erros; três avisos preexistentes em OperacaoPage sobre fallback vazio em spread.
- `npm run build --prefix client`: aprovado após CSS e código finais.
- `git diff --check`: aprovado (Git avisa normalização LF/CRLF no teste de importação de outra demanda).

Teste HTTP usa processo Node real isolado, reinicia o servidor e confirma as mesmas imagens. GET independente e snapshot SSE contêm fundo/logo. Aparência não limpa atleta/status. Patch textual preserva mídia, logo inválido retorna400, remoção explícita de fundo funciona. Falha real de rename (diretório no destino do arquivo) retorna503 e preserva conteúdo/memória anteriores.

Teste de navegador executado em Edge headless local com Playwright já disponível no runtime, sem instalação. Harness temporário importa os componentes React reais via Vite, usa backend real com DATA_DIR temporário e é removido ao terminar. Duas sessões isoladas mais uma aba na mesma origem: upload das duas imagens, prévia remota/miniaturas, patch BroadcastChannel preservando mídia, remoção explícita de logo recebida na outra aba, falha503 seguida de retry, fechamento/reabertura durante POST lento e quota local simulada passaram. Zero pageerrors. A verificação móvel também mede que o corpo interno do painel não transborda horizontalmente.

Com atleta completo, campos extras, terceiro, ENTREGUE e fonte150%, foram medidos bounds de ficha/cabeçalho/rodapé e ausência de overflow horizontal:

| Viewport | Resultado |
| --- | --- |
| 390×844 | ficha encaixada; painel sem corte horizontal |
| 1024×768 | ficha encaixada |
| 1366×768 | ficha encaixada |
| 1920×1080 | ficha encaixada |
| 3840×2160 | ficha encaixada e escala visual acompanha resolução |
| 2560×1080 | destaques/dados lado a lado, ficha encaixada |

Evidências locais: `scratch/espelho-browser.mjs`, `scratch/espelho-browser-results.json`, `scratch/espelho-painel-desktop.png`, `scratch/espelho-painel-mobile.png` e `scratch/espelho-WIDTHxHEIGHT.png` para os seis tamanhos. A imagem usada é raster sintético local com texto TESTE; não contém dados pessoais.

## Limites e próximo passo

Homologação em TV/celular físicos não foi realizada. Navegador foi Edge headless; compatibilidade visual em Safari/iPhone real permanece para Yuri. Muitos campos extras em tela pequena reduzem naturalmente a fonte do encaixe: a aba Campos do Telão permite selecionar o que deve ser legível à distância. Em edição simultânea do mesmo campo vence o último patch aceito pelo servidor; não existe trava colaborativa.

Nenhum acesso/mutação de produção. Nenhuma dependência nova. Não alterados por este agente OperacaoPage, arquivos de importação, workflow ou HANDOFF compartilhado. Central 01a15fc3-461c-7550-8560-c025a0dcb61b fará integração e os registros obrigatórios HANDOFF/AI Memory, conforme acordo explícito entre os chats. Próximo passo: central revisar/integrar e disponibilizar o candidato para homologação do Yuri, dentro da autorização de publicação que ele fornecer.
