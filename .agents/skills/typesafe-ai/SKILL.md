---
name: typesafe-ai
license: MIT
description: >
  Build AI-powered software with TypeSafe: small units of AI intelligence you
  can use like programming primitives. Its System One models, including Jev,
  turn natural language and application state into typed judgments and
  probabilities that code can combine. Use when a feature needs programmable
  common sense, when brainstorming what AI could make possible in an app, or
  when an LLM prompt-and-parse step could become a structured decision.
  Applications include routing, ranking, extraction, verification, and
  interactive experiences. Read live docs at https://docs.typesafe.ai/llms.txt.
---

# Build with TypeSafe (Jev)

TypeSafe makes units of AI intelligence usable like programming primitives: small
judgments you can compose into larger capabilities. Its **System One models** return
fast, focused judgments that software can consume directly. **Jev** is TypeSafe's
flagship and first System One model. It understands natural language and returns
typed answers and probabilities rather than generating text or reasoning explanations.

## The Three Primitives:
1. **Choice**: Selects an option from a closed set. Returns choice, probabilities, and confidence.
2. **Score**: Rates against an ordered rubric (0 to N). Returns calibrated score and probabilities.
3. **Noul**: Evaluates a yes/no statement. Returns a probability between 0 and 1.

## API Endpoint:
POST `https://api.typesafe.ai/v1/systemone`
Header: `Authorization: Bearer <TYPESAFE_API_KEY>`
