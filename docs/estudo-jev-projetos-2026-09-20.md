# Jev nos projetos de Yuri — estudo de viabilidade

Data: 20/09/2026. Fase A, estudo; implementação não iniciada.
Responsável: Codex/Tony, com subagentes Kastiel (código pessoal), Ulisses (revisão crítica) e Teclide (critérios de validação).

## Conclusão

Os candidatos mais concretos são a sugestão de mapeamento de colunas no Entregas-run/ENTREGADEKIS e a seleção de contexto no TEMINAL. deepseek-harness tem um ponto plausível para recomendação de presets. São hipóteses de benefício ancoradas no código, não ganhos medidos. Não recomendo instalar Jev indiscriminadamente nos projetos.

## O que foi confirmado sobre Jev

Jev é um modelo hospedado da TypeSafe para decisões tipadas: Choice seleciona entre opções fornecidas; Score avalia uma escala descritiva; Noul retorna probabilidade para uma pergunta sim/não. Não gera textos ou código. A versão consultada é jev-1.13.0; aceita texto, não imagens/áudio. OCR e transcrição precisam acontecer antes.

O preço publicado nesta data é US$ 0,042 por milhão de tokens de entrada, com saída gratuita. Inglês é o idioma de melhor desempenho declarado; uso em português precisa ser medido. A documentação reconhece erros semânticos e limitações em aritmética, contagem, datas, contexto irrelevante e conteúdo adversarial. Saída tipada não garante decisão correta.

Fontes oficiais consultadas:
- https://docs.typesafe.ai/primitives
- https://docs.typesafe.ai/models
- https://docs.typesafe.ai/model-jaggedness/jev-1.13
- https://docs.typesafe.ai/patterns/intent-routing
- https://typesafe.ai/blog/introducing-system-one-models-and-jev

## Oportunidades priorizadas

### 1. Entregas-run e ENTREGADEKIS — importação assistida

Evidências:
- `D:/Projetos/Clientes/Entregas-run/client/src/components/ImportarAtletasModal.jsx:164`: autoGuessMapping usa includes e nomes conhecidos; linhas 187–188 associam cabeçalhos contendo "data" ao nascimento. Isso é uma regra ampla; corrigi-la deterministicamente pode ser mais apropriado que adicionar IA para esse caso isolado.
- `D:/Projetos/Clientes/ENTREGADEKIS/web/src/components/ImportWizardModal.tsx:145`: detecção por expressões regulares, com destino ignore quando não reconhece.

Uso proposto: conservar aliases conhecidos; para nomes desconhecidos ou conflitantes, pedir ao Jev uma sugestão entre os campos já aceitos, incluindo "sem correspondência". Exemplo hipotético: um cabeçalho pouco usual como "Denominação da agremiação" poderia ser sugerido como equipe. Não foi testado nesta sessão.

A proposta só se paga se o usuário recebe planilhas variadas com frequência. Usar apenas os cabeçalhos quando suficientes, sem transmitir registros de atletas. Revisão humana antes de importar, proibição de destinos duplicados incompatíveis, cache de mapeamentos confirmados e fluxo manual funcionando sem rede. Uma chamada por conjunto de cabeçalhos, não uma por atleta. Integração remota futura no backend, sem chave no frontend.

### 2. TEMINAL — seleção semântica dos arquivos de contexto

`D:/Projetos/Pessoal/TEMINAL/src/project_context/builder.py:140` pontua relevância por palavras literais no caminho/conteúdo. Linhas 84–102 ordenam e selecionam candidatos; linha 38 define até 10 arquivos e 48 mil caracteres. O contexto é usado no envio em `src/ui/gui_app.py:400`.

Uso proposto: Jev pontua uma lista curta de candidatos já filtrados, para melhorar a ordem quando a pergunta usa sinônimos ou descreve intenção sem citar arquivo. Se o arquivo correto não entrar na lista inicial, reordenar não o recupera: a qualidade da seleção inicial também precisa ser avaliada. Preservar prioridade de caminhos explícitos, limites, seleção local e controle do usuário sobre envio a um novo fornecedor. Os filtros de segredos existentes não demonstram, por si, ausência de conteúdo sensível.

### 3. deepseek-harness — recomendação de preset/subagente

`D:/Projetos/Pessoal/deepseek-harness/packages/preset/agent-presets/src/index.ts:199` lista presets e a linha 213 resolve seu ID. `packages/subagent/tool-subagent/src/index.ts:28` já contém configuração de provedor de delegação.

Choice poderia recomendar um ID cadastrado segundo a tarefa, mantendo override explícito e as permissões existentes. É uma extensão possível, não uma integração existente demonstrada. Para poucos presets, uma regra simples pode ser suficiente. Comparar sucesso final da tarefa, custo e tempo com o fluxo atual.

## Onde o benefício é fraco ou depende de nova funcionalidade

- **ZYNEXLOG:** `zynexlog-app/src/screens/entregador/DeliveryFlow.tsx:10` define motivos de ocorrência e a linha 155 usa select. Esse fluxo já recolhe informação categorizada. Não há justificativa encontrada para inserir Jev nele; triagem de texto livre seria outra funcionalidade.
- **WhatsApp-Clone-master:** há recebimento/persistência de mensagens em `web-server/controller/chatRoomController.ts:40`. Triagem de atendimento seria possível, mas não foi encontrada uma operação de atendimento existente que demonstrasse a necessidade.
- **RAVELI, Chip Reader, ShipRed Android, URM Mobile e LR-LIVE-RACE:** não colocar chamadas remotas probabilísticas no caminho de captura RFID, associação de chip, cálculo de tempo ou envio Wiclax. Diagnóstico textual fora da captura seria possibilidade futura, sem demanda demonstrada.
- **timesfm-studio:** Jev não substitui previsão numérica, OCR de imagens ou conferência de dezenas. `backend/ticket_scanner.py:103` detecta modalidade no texto; classificá-la seria um ponto estreito possível, porém sem evidência de falha que justifique a troca.
- **Cardozo/Preço Justo:** o README descreve painel DDE e fórmula numérica; não foi identificada vantagem para o núcleo do cálculo. Não é recomendação financeira nem validação da estratégia.
- **AuroraCode:** `src/services/ai_service.py:29` treina modelo e a linha 77 gera texto. Jev não substitui essas funções.
- **CHIPES-PLATAFORMAS e ciclone:** baixa afinidade para cálculo físico e interpretação de dados já estruturados; não substituir severidade meteorológica oficial por julgamento do modelo.
- **site-renata, portfólio e teste-click-hero:** triagem preliminar não revelou uma tarefa ambígua repetitiva que sustente adoção imediata.

## Escopo e profundidade

`C:/Users/yuriv/Projetos` não foi encontrado; a pasta examinada foi `D:/Projetos`. Houve inventário das categorias e subpastas, seguido de leitura dirigida de código e documentos dos candidatos. Isso não foi uma revisão completa de cada repositório.

Pastas com análise apenas superficial/inventário, sem recomendação conclusiva: agente-tono, cart-terminal, largada, Minha-IA, Contabilidades/BRBgestão, SUPABASE e portfólio. PLYTV e a pasta pessoal marcada para apagar estavam vazias. Muitas categorias de primeiro nível estavam vazias. Pastas de runtime/memória não foram tratadas como produtos.

## Validação real da integração existente

Executado o router do Entregas-run com uma descrição genérica deste estudo, sem dados de clientes:

```
modelo: jev-1.13.0
especialista_tone: kastiel_dev; confiança 75%
tipo_tarefa: duvida_conceitual; confiança 99%
severidade: 0,01 / 2
tempo observado: 877 ms
tokens: 770 entrada; 192 saída
```

O próprio script registrou a chamada na telemetria local ignorada pelo Git. Uma chamada comprova conectividade e retorno do router; não comprova economia, acurácia geral ou funcionamento automático do hook neste cliente. A diretiva textual exibida pelo router é montada por JavaScript a partir das decisões, não escrita pelo Jev. O script inspecionado não troca o modelo desta sessão; indicar um especialista não demonstra roteamento real para um modelo mais barato.

O briefing MCP retornou referências aparentemente de outro projeto; não foi usado como evidência deste estudo. As conclusões foram ancoradas no checkout atual e na documentação oficial. O histórico local só auxiliou a localizar o router.

## Experimento recomendado antes de adotar

Começar pela importação se houver amostra recorrente de planilhas fora do padrão; caso contrário, priorizar o contexto do TEMINAL.

1. Separar exemplos anonimizados, com resposta humana definida antes do teste, incluindo português, abreviações, campos ambíguos e ausência de correspondência.
2. Comparar Jev com aliases/regras atuais e correção manual. No roteamento, comparar com escolha atual/modelo fixo e regras simples.
3. Medir erros por campo, erros críticos, abstenções, correções, tempo do operador, custo total e latência p50/p95. No TEMINAL, medir recuperação dos arquivos relevantes e qualidade da resposta final.
4. Exercitar falta de rede, timeout, baixa confiança e respostas inadequadas: fluxo local/manual deve continuar e nada deve ser gravado automaticamente por uma sugestão.
5. Só promover quando o ganho observado superar complexidade e custos conforme critérios acordados. Fixar a versão do modelo ao calibrar limiares; confiança alta não substitui autorização ou validação de domínio.

Não foram executados testes funcionais dos produtos, comparação A/B, instalação, mudança de código de aplicação ou deploy nesta sessão.
