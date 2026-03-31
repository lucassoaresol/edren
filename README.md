# EDREN MVP

EDREN is a focused MVP for commercial and financial operation with emphasis on accounts receivable clarity.

## Goal
The MVP must make it easy to understand:
- what is still to be received
- from whom
- how much
- when it should have been received

## Tech Stack
- Frontend: React
- UI: Tailwind CSS + shadcn/ui
- Backend: Node.js + Fastify
- Database: PostgreSQL
- Auth: username + password
- Bearer token

## Language Convention
- Technical naming in English
- User-facing content in Portuguese

## Repository Structure
```text
/
├─ CLAUDE.md
├─ README.md
├─ docs/
│  ├─ edren-mvp-master.md
│  ├─ api-final.md
│  └─ backlog.md
├─ apps/
│  ├─ api/
│  └─ web/
```

## Source of Truth
Read these files before implementing:
1. `CLAUDE.md`
2. `docs/edren-mvp-master.md`
3. `docs/api-final.md`
4. `docs/backlog.md`

If any implementation idea conflicts with these files, the docs win.

## Working Rules
- Always work one slice at a time
- Always ask Claude for a short plan before code changes
- Keep changes small and reviewable
- Review diffs after each block
- Run tests before moving on
- Commit by approved block
- Never ask Claude to "build everything"

## Recommended First Session
Use this sequence.

### Prompt 1 — recognition
Read `CLAUDE.md` and everything under `/docs`.

Do not implement anything.

Tell me:
1. what the product does
2. what Slice 1 includes
3. the main business rules that matter for Slice 1
4. the files and folders you recommend creating first
5. the main risks you see before implementation

### Prompt 2 — implementation plan
Based on the approved docs, propose a small implementation plan for Slice 1 only.

Rules:
- do not touch future slices
- keep the plan small
- separate into reviewable blocks
- include tests that must be created alongside each block

Do not implement yet.

### Prompt 3 — implementation
Implement only Block 1 of Slice 1.

Rules:
- follow `CLAUDE.md` and `/docs`
- do not implement anything from future slices
- keep changes minimal
- add or update tests for the rules introduced in this block
- after coding, summarize changed files and why

## Health Check Prompt
Use this when the session starts drifting.

```text
Stop and re-read CLAUDE.md and /docs.

Tell me:
1. What slice are we currently implementing?
2. What exactly was implemented in this session?
3. Did you violate any rule or business constraint?
4. Did you change anything that belongs to a future slice?
5. Is there anything I should revert before continuing?

Do not implement anything new. Only report.
```

## Review Discipline
If Claude:
- goes out of scope -> stop and ask for revert or isolation
- leaves TODOs in core business rules -> stop and require completion
- breaks build or tests -> fix before continuing
- starts a long session -> restate current slice before next block

## Current Scope Summary
### In scope
- Login
- Users
- Clients
- Products
- Sales
- Sale items
- Receipts
- Accounts receivable
- Client history
- Basic consignments
- Simple dashboard

### Out of scope
- inventory
- stock movement
- production
- purchases
- suppliers
- accounts payable
- advanced reports
- integrations
- multi-company
- ERP
- refund / reversal flow
