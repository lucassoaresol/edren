# EDREN - Claude Code Operating Guide

## Role
You are implementing the EDREN MVP.
Work as a disciplined implementation partner.

Your job is to:
- follow the approved scope exactly
- implement one slice at a time
- avoid speculative architecture
- avoid adding features not explicitly documented
- keep changes small and reviewable
- preserve business rules as source of truth

## Stack
- Frontend: React
- UI: Tailwind CSS + shadcn/ui
- Backend: Node.js + Fastify
- Database: PostgreSQL
- Auth: username + password
- No email
- No complex recovery flow

## Auth Rules
- Auth mechanism: Bearer token in `Authorization` header
- Base URL prefix: `/api`
- Token TTL: 12 hours
- No refresh flow in MVP
- Every authenticated request must validate `user.is_active`

## Language Rules
- All technical naming must be in English
- Database/table/column/API/service/code naming must be in English
- User-facing labels, messages, and displayed information must be in Portuguese

## Product Goal
This MVP exists to solve accounts receivable visibility:
- what is still to be received
- from whom
- how much
- when it should have been received

## Roles
### ADMIN
- full access

### OPERATOR
- basic commercial / finance operation
- cannot manage users
- cannot inactivate clients
- cannot inactivate products
- cannot delete products
- cannot cancel sales
- cannot cancel receipts

## Approved Scope

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

## Core Business Rules

### Products
- `product.reference` is required
- `product.reference` must be globally unique
- normalize `product.reference` using `UPPER(BTRIM(reference))`
- inactive product keeps reference

### Sales
- backend rejects zero items
- `discount >= 0`
- `discount < gross_total`
- backend computes `gross_total`
- backend computes `net_total`
- `net_total` cannot be zero in MVP
- `sale_date` is the business date
- `sale_date` structural edit only if no ACTIVE receipt exists

### agreed_payment_method
Allowed values:
- CASH
- PIX
- CARD
- BOOKLET
- MIXED

Final decisions:
- BOOKLET is the only installment case
- MIXED does not create installments
- MIXED only means the sale may later receive multiple receipts with different `payment_method`
- for MIXED, if `down_payment_amount > 0`, create:
  - 1 PAID receivable entry for the down payment
  - 1 ACTIVE receipt linked to that entry
  - remaining balance handled like other non-installment methods

### Receipts
- every receipt belongs to one receivable entry
- receipts can be canceled
- receipts cannot be edited
- receipts cannot be hard deleted
- only ADMIN can cancel receipts

### Receivable entries
- `open_balance` is derived
- `status` is persisted and transactionally recalculated
- PENDING if active receipts sum `< amount`
- PAID if active receipts sum `= amount`
- CANCELED when parent sale is canceled

### Overpayment
- forbidden
- validate using `SELECT ... FOR UPDATE` on the target receivable entry

### Sale edit
- if no ACTIVE receipt exists -> structural edit allowed
- if any ACTIVE receipt exists -> notes only
- structural edit deletes and recreates receivable entries in one transaction

### Sale cancel
- blocked if ANY receipt exists in history
- receipt history includes ACTIVE and CANCELED receipts

If `sale.status = CANCELED`:
- `GET /sales/:id` must return `edit_mode = "locked"`
- `can_cancel = false`

## Payment Plan

| agreed_payment_method | down_payment_amount | remaining_balance_due_date | number_of_installments | first_due_date |
|---|---:|---|---:|---|
| CASH / PIX / CARD fully paid | optional | null | null | null |
| CASH / PIX / CARD with remaining balance | optional | required if remaining balance > 0 | null | null |
| BOOKLET | optional | null | required >= 1 | required |
| MIXED | optional | required if remaining balance > 0 | null | null |

### Booklet rules
- same day-of-month anchor
- if month lacks anchor day, use last day of month
- rounding to 2 decimals
- remainder goes to last installment
- partial receipt supported
- backend is source of truth

## Consignments
- one consignment can have at most one ACTIVE linked sale
- source of truth is `sales.consignment_id`
- do not create `consignments.sale_id`
- settlement is atomic
- settlement validates:
  - `quantity_sold + quantity_returned = quantity_sent`
- `quantity_sold = 0` is valid
- items with `quantity_sold = 0` do not generate sale items
- settlement calculates `gross_total` first
- settlement validates `discount < gross_total` before writes

While consignment is OPEN and there is no active linked sale:

Editable:
- `reference_unit_price`
- `size`
- `color`

Non-editable:
- `product_id`
- `name_snapshot`
- `reference_snapshot`
- `quantity_sent`

Settlement-only:
- `quantity_sold`
- `quantity_returned`

For `PATCH /consignments/:id`:
- if `items` is omitted, do not change items
- if `items` is present, it must contain all consignment items
- missing item => `422 CONSIGNMENT_ITEM_MISSING`

Final rule for full return:
- if all consignment items have `quantity_sold = 0`, settlement must not create a sale
- in this case, the consignment becomes SETTLED with full return and no linked sale

## Schema Decisions

### Tables
- users
- clients
- products
- sales
- sale_items
- receivable_entries
- receipts
- consignments
- consignment_items

### ID strategy
- id type: BIGINT (not UUID)

### Important DB invariants
- `receivable_entries.amount > 0`
- `receipts.received_amount > 0`
- `sales.discount < gross_total`
- `consignment_items.quantity_sold + quantity_returned <= quantity_sent`

### Required unique indexes
- normalized unique username
- normalized unique product reference
- partial unique index for one active linked sale per consignment

## Transactional Endpoints
These endpoints must be transactional:
- `POST /sales`
- `PATCH /sales/:id`
- `POST /sales/:id/cancel`
- `POST /receivable-entries/:id/receipts`
- `POST /receipts/:id/cancel`
- `POST /consignments`
- `PATCH /consignments/:id` when nested items change
- `POST /consignments/:id/settle`

## Mandatory Locks
- lock receivable entry on:
  - `POST /receivable-entries/:id/receipts`
  - `POST /receipts/:id/cancel`
- lock sale on:
  - `PATCH /sales/:id`
  - `POST /sales/:id/cancel`
- lock consignment on:
  - `POST /consignments/:id/settle`

## Error Codes
- `SALE_HAS_RECEIPT_HISTORY`
- `SALE_HAS_ACTIVE_RECEIPTS`
- `RECEIPT_OVERPAYMENT`
- `RECEIVABLE_ENTRY_ALREADY_PAID`
- `RECEIVABLE_ENTRY_CANCELED`
- `INVALID_PAYMENT_PLAN`
- `BOOKLET_REQUIRES_INSTALLMENTS`
- `INVALID_CONSIGNMENT_SETTLEMENT`
- `CONSIGNMENT_ITEM_MISSING`
- `PRODUCT_REFERENCE_ALREADY_EXISTS`
- `FORBIDDEN_OPERATION`
- `SALE_CANCEL_REQUIRES_ADMIN`

## Standard Error Shape
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensagem para a interface"
  }
}
```

## Build Order

### Official slices
Slice 1:
- foundation
- auth
- users
- clients
- products

Slice 2:
- sales core
- receivable entries
- receipts

Slice 3:
- sales edit/cancel
- dashboard

Slice 4:
- consignments
- consignment settle

Slice 5:
- hardening

### Recommended implementation blocks inside Slice 1
- Block 1: foundation + auth
- Block 2: users
- Block 3: clients
- Block 4: products

## Required Tests

### Required invariant tests
- `SUM(receivable_entries.amount) == sale.net_total` after create sale
- `SUM(receivable_entries.amount) == sale.net_total` after edit sale
- `SUM(receivable_entries.amount) == sale.net_total` after consignment settle

### Other critical tests
- overpayment blocked
- sale cancel blocked when any receipt exists in history
- structural sale edit blocked when ACTIVE receipt exists
- BOOKLET requires installments
- receipt cancel recalculates entry status
- consignment settlement reconciles quantities
- one active linked sale per consignment
- OPERATOR blocked from sensitive actions

## Implementation Behavior
- work one slice at a time
- do not jump ahead
- read `/docs` before making changes
- always propose a short plan before editing
- keep diffs small
- do not leave TODOs for core business rules
- do not silently change business rules
- ask for confirmation only if a rule is genuinely missing from docs

## Git Workflow
- one commit per approved block
- use Conventional Commits only
- do not create commits continuously
- create a commit only after a block is finished, reviewed, and tests are passing
- show a short summary of what changed before committing
- show the proposed commit message before committing
- do not commit partial work
- do not commit broken code
- do not commit TODOs for core business rules
- do not commit out-of-scope changes
- do not mix unrelated changes in the same commit

## What NOT to do
- Do not implement anything outside the current slice
- Do not add features not listed in scope
- Do not change business rules defined in `/docs`
- Do not create database columns not defined in the approved schema
- Do not generate TODO comments for core business rules
- Do not invent fallback logic for undocumented cases
- Do not refactor unrelated files while implementing the current task

## Recovery Rules
- If you implement anything outside the current slice, stop and report it
- If you leave a TODO in a core rule, stop and complete it before moving on
- If code fails to build or tests fail, fix that before continuing
- In long sessions, re-read this file and restate the current slice before the next block

## End-of-Session Self-Review
Before ending a session, always report:
1. what was implemented
2. what files changed
3. what tests were added or updated
4. whether any rule was assumed
5. whether anything belongs to a future slice
6. whether any rollback or cleanup is recommended
