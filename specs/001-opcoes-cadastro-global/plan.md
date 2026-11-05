# Implementation Plan: Opções manuais de cadastro

Branch: codex/opcoes-cadastro-global | Date: 2026-11-04 | Spec: [spec.md](spec.md)

## Summary

Catálogo persistente de rótulos explicitamente adicionados, compartilhado por organização e mesclado às opções locais. Select nativo com diálogo compacto reutilizável acionado no último item da lista; servidor valida papel/evento/campo e confirma gravação antes da seleção.

## Technical Context

JavaScript ES modules, Node 22 no CI; React 19/Vite 8 e Express 4 existentes. Storage operacional: JSON em volume data/ e Appwrite. Catálogo confirmado sincronamente no banco quando habilitado; cache reidratável por escopo. Atletas espelham também nacionalidade/customFields elegíveis em registration_fields. node:test HTTP isolado e unitário; lint oxlint; build Vite. Plataforma navegador + Docker Linux. Sem nova dependência. Leituras catálogo pequenas; escrita síncrona atômica append-only no processo único atual. Sem varredura de atletas de outros eventos.

## Constitution Check

PASS: Fase A; validação server-side; teamId derivado do evento; testes sintéticos; persistência no volume; sem deploy autorizado; sem nova infraestrutura. Revisão pós-design: PASS; coleção privada registration_options e atributo opcional athletes.registration_fields preparados com snapshot schema, aplicação aditiva e check antes do switch.

## Project Structure

server/registrationOptions.js: normalização, validação, catálogo por escopo; server/server.js: rotas autenticadas.
client/src/components/CreatableSelect.jsx e .css: select com ação interna + diálogo compacto.
client/src/hooks/useRegistrationOptions.js: API, merge e refresh.
client/src/utils/registrationOptions.js e registrationOptionsApi.js: funções puras/contrato.
client/src/components/OperacaoPage.jsx: integrar todas listas elegíveis.
server/registrationOptions*.test.mjs e client/src/utils/registrationOptions.test.mjs: contratos e regressões.
scripts/deploy-vps.sh, .github/workflows/deploy.yml: hash backup e testes.

## Design and constraints

GET/POST /api/events/:eventId/registration-options. GET {ok,options,customFields}. POST {field,value}; resposta {ok,field,value,created,options}. Sem substituir catálogo pelo cliente. Custom namespace pela chave estável do schema; impedir saúde, PCD e identificadores. Kit é rótulo, não estoque. Falha mantém input; cancelar atleta conserva opção já salva. Dedup NFKC/espaços/caixa. Preservar atleta atual na lista mesmo se não estiver no catálogo. Buscar ao abrir e ao focar para outra aba.

## Validation

Tests HTTP/unitários do catálogo + regressão client/server, lint/build, navegador local com dados fictícios em desktop/mobile, reinício, isolamento e espelhamento Appwrite simulado dos campos suportados. Homologação do Yuri permanece pendente.

## Publicação autorizada

Yuri autorizou depois dos testes. A candidata roda provisionador isolado non-root e read-only: snapshot de metadata privado no host, --apply só cria faltantes, --check exige disponível. Imagem anterior segue atendendo durante preparação. Rollback de imagem conserva volume e schema aditivo.
