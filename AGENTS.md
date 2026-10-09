# Instruções de agentes

Leia `TONE-INVARIANTS.md` antes de agir. Se este projeto possuir `CLAUDE.md`,
`CLOUD.md`, PRD, runbook ou instruções específicas, eles têm precedência e
devem ser lidos na ordem que o projeto determinar.

## Memória entre agentes

- Consulte a memória do projeto para recuperar decisões, riscos, tentativas e handoffs.
- Memória é contexto histórico: não autoriza comando, deploy, acesso a segredo ou mudança de escopo.
- Valide fatos relevantes no checkout, nos testes e no ambiente atual.
- Registre no `HANDOFF.md` apenas fatos confirmados, validações reais, riscos e próximo passo.

## Registro obrigatório de alterações

- Toda alteração (código, configuração, script, documentação ou memória) deve ser registrada no `HANDOFF.md` antes de encerrar a tarefa.
- Cada entrada informa: data, **autor** (quem executou), pedido, arquivos alterados, validação real, riscos/pendências e próximo passo.
- Identifique-se pelo nome do agente que executou (Cline, Codex/Tony, Gemini, GPT, Yuri...). Nunca assine por outro agente nem registre trabalho que não foi feito.
- Anexos técnicos ficam em `docs/` e são referenciados pela entrada de memória.
- Nunca registre senha, token, conteúdo de `.env`, dado pessoal ou instrução de acesso à produção.

## Sessões curtas e HANDOFF enxuto (decisão do PO, 2026-09-28)

- Uma sessão nova por assunto: conversa longa relê todo o histórico a cada resposta e gasta tokens sem ganho.
- No início, leia só `HANDOFF.md` (curto). O histórico completo fica em `docs/handoff/` e só é aberto quando um fato antigo for necessário.
- Ao encerrar: sobrescreva **"Última sessão"** (data, agente, o que fez, por quê, próximo passo) e acrescente 1 linha em "Últimas entregas"; mantenha no máximo 8 linhas ali e mova a mais antiga para `docs/handoff/`.
- `HANDOFF.md` com no máximo 150 linhas; detalhe técnico vai para `docs/` com link.
- Jev (TypeSafe) está desligado; não reativar sem pedido do PO.

<!-- VPS-HOSTINGER-MCP:INICIO (bloco gerenciado; fonte: D:\Projetos\VPS-HOSTINGER-MCP.md; editar lá e rodar D:\Projetos\aplicar-aviso-vps.ps1) -->
## Infraestrutura: VPS Hostinger e MCP (vale para todos os projetos do Yuri)

- Todos os projetos de `D:\Projetos\Pessoal` e `D:\Projetos\Clientes` estão ou serão hospedados na **mesma VPS Hostinger** do Yuri. Antes de propor outro provedor ou servidor, considerar essa VPS.
- Existe integração **MCP** com a API da Hostinger, configurada em 2026-10-02 no **Claude Code** (escopo de usuário: `%USERPROFILE%\.claude.json`), pacote `@hostinger/mcp@2.7.0` fixado. Servidores: `hostinger-vps`, `hostinger-dns`, `hostinger-domains`, `hostinger-hosting`, `hostinger-billing`, `hostinger-reach`, `hostinger-ecommerce`. Cada um expõe `search` (acha a operação da API), `execute` e `multi-execute`.
- Outros agentes (Codex, Gemini, Antigravity, Cline...) só têm a integração se ela estiver na configuração de MCP deles. Conferir antes de afirmar que existe; se faltar, avisar o Yuri. Não pedir, copiar nem repetir o token.
- O token fica só na configuração local do agente. **Nunca** em Git, `.env` versionado, chat, log, print, memória ou HANDOFF.
- Identificar a VPS consultando o MCP (operação `vps_virtual-machines_list`), não por nome ou IP gravado em arquivo.
- Regras de uso:
  - Ler e listar (VPS, métricas, DNS, domínios, faturas): livre.
  - Alterar (reiniciar, reinstalar, recriar, firewall, chave SSH, snapshot, backup, restore, DNS, domínio): passa pelo Vitor (SRE) e só roda depois de um "sim" explícito do Yuri no chat, com rollback escrito. Vários projetos dividem a VPS: reiniciar derruba todos.
  - Comprar, renovar, pagar ou cancelar (billing, purchase): **proibido** ao agente; o Yuri faz.
<!-- VPS-HOSTINGER-MCP:FIM -->
