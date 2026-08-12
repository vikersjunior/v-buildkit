# [Project Name] — System Architecture

## 1. Architecture Overview
One paragraph: the overall architectural style (e.g. monolith, modular monolith, client-server with a thin backend, event-driven) and why that style fits this project's actual requirements — not a default reach for microservices on a project that doesn't need them.

## 2. System Diagram
A text-based or mermaid diagram showing major components and how they connect. Every box in the diagram should map to a named section below.

## 3. Application Structure
High-level folder/module structure and what each top-level directory is responsible for.

## 4. Frontend Architecture
Component structure philosophy, state management approach (conceptually — "global client state for X, server state for Y" not yet naming the specific library), routing structure.

## 5. Backend Architecture
Service/module boundaries, request handling pattern, background job handling if applicable.

## 6. Database Architecture
Core entities and their relationships (ER-level, not full schema/migration detail). Note which entities are the aggregate roots and which are owned/dependent.

## 7. Authentication & Authorization Architecture
How identity is established, how sessions/tokens work conceptually, how permission checks are structured (role-based, attribute-based, resource-owner-based).

## 8. API Architecture
API style (REST/GraphQL/RPC), versioning approach, general request/response conventions, error response shape.

## 9. Data Flow
Walk through 2-3 of the most important user actions end-to-end (e.g. "user submits a booking") tracing exactly which components touch the request in order.

## 10. External Services & Integrations
What the system depends on externally (payment processors, third-party APIs, notification services) at a conceptual level — what role each plays, not which specific vendor yet.

## 11. Security Architecture
Key security boundaries: input validation strategy, secrets handling, data-at-rest/in-transit protection, known attack surfaces and their mitigations.

## 12. Error Handling Strategy
How errors propagate and surface — API error conventions, frontend error boundary strategy, logging/observability approach.

## 13. Scalability Considerations
Where the system is expected to need to scale first (read load, write load, storage, specific hot paths) and the architectural choices made to accommodate that — or explicitly, where scale isn't a near-term concern and simplicity was chosen deliberately instead.

## 14. Deployment Architecture
Conceptual deployment shape — single deployable unit vs. multiple services, how environments (dev/staging/prod) are separated.

## 15. Architectural Decisions (ADRs)
For every decision with real trade-offs, log it here — this is the project's decision history, kept alive instead of lost to chat history.

### ADR-001 — [Decision title]
**Date:** [date]
**Decision:** [what was decided]
**Reason:** [why, tied to a requirement or constraint]
**Alternatives considered:** [what else was weighed]
**Trade-offs accepted:** [what this costs us in exchange for what it buys us]
