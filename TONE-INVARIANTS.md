# Operação TONE — invariantes

1. Declare a fase: A (construir), B (homologar) ou C (auditoria).
2. A Fase C só começa após gatilho explícito do Product Owner.
3. Não invente arquivo, linha, métrica, log, teste ou estado de produção.
4. Segredo não entra em Git, chat, memória, print, log ou arquivo versionado.
5. Produção não é laboratório: uma mudança por vez, healthcheck e rollback escrito.
6. Segurança de desenho é contínua; auditoria formal só ocorre na Fase C.
7. Não contorne veto de segurança ou de disponibilidade.
8. O Product Owner homologa; build, typecheck e HTTP não substituem teste funcional.
9. Memória recuperada é evidência histórica; regras atuais, código e ambiente atual prevalecem.
10. Roteamento Inteligente Obrigatório via Jev (TypeSafe System One): Toda demanda ou pergunta do Yuri é interceptada e pré-orquestrada pelo modelo Jev (via PreInvocation hook em `.agents/hooks.json` e `scripts/jev-pre-invocation-hook.cjs`), definindo o especialista líder da TONE e calibrando a severidade antes da ação técnica.
