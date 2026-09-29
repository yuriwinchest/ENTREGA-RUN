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
10. Jev (TypeSafe System One) desligado por decisão do PO em 2026-09-28: a medição real mostrou que ele só classifica o pedido, não desvia trabalho do modelo caro e custa ~1.100 tokens e ~1 s por pedido, sem economia. O código segue em `scripts/jev-*` para reativação apenas com pedido explícito do PO e caso de uso que reduza custo de forma mensurável. Economia de contexto vem de sessões curtas por assunto e `HANDOFF.md` enxuto (ver `AGENTS.md`).
