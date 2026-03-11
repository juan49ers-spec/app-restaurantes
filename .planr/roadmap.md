Project: Restaurant Finance App

Phase 1 — Requirements Ingestion
- Load .planr/prd.md and .planr/tech-stack.md
- Summarize product vision, key user stories, constraints, and high-level architecture choices. The product is a specialized financial dashboard for restaurants built on Next.js and Supabase. It prioritizes data integrity and automated quality via AI-driven testing tools (Shortest, EvoMaster, Testsigma). Constraints include zero-trust security and sub-2-second load times.

Phase 2 — Development Planning
- Total story points: 20
- Context window capacity: 200000 tokens
- Batching decision: Holistic Build
- Planned Batches:

| Batch | Story IDs | Cumulative Story Points |
|------|-----------|-------------------------|
| 1 | US1, US2, US3, US4, US5 | 20 |

Phase 3 — Iterative Build
For each batch:
1. Load batch requirements and current codebase.
2. Design or update database schema.
3. Implement backend services and API endpoints.
4. Build or adjust frontend components.
5. Refine UX details and run batch-level tests.
6. Merge with main branch and update internal context.

Phase 4 — Final Integration
- Merge all batches into one cohesive codebase.
- Perform end-to-end verification against all PRD requirements.
- Optimize performance and resolve residual issues.
- Update documentation and deployment instructions.
- Declare the application deployment ready.

End of roadmap.
