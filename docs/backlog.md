# EDREN Build Backlog

## Macro Order
1. foundation
2. auth
3. users
4. clients
5. products
6. sales core
7. receivable entries
8. receipts
9. sales edit/cancel
10. consignments
11. consignment settle
12. dashboard
13. hardening

## Official Slices

### Slice 1
- foundation
- auth
- users
- clients
- products

### Slice 2
- sales core
- receivable entries
- receipts

### Slice 3
- sales edit/cancel
- dashboard

### Slice 4
- consignments
- consignment settle

### Slice 5
- hardening

## Recommended Execution Blocks

### Slice 1
- Block 1: foundation + auth
- Block 2: users
- Block 3: clients
- Block 4: products

### Slice 2
- Block 1: sales core
- Block 2: receivable entries
- Block 3: receipts

### Slice 3
- Block 1: sales edit/cancel
- Block 2: dashboard

### Slice 4
- Block 1: consignments
- Block 2: consignment settle

### Slice 5
- Block 1: hardening and edge-case reinforcement

## Slice Exit Criteria

### Slice 1 exit criteria
- project foundation created
- auth working
- user management working with role restrictions
- client CRUD working within role rules
- product CRUD working with normalized unique reference rule
- tests included for critical Slice 1 rules

### Slice 2 exit criteria
- sale creation works
- receivable entries generated correctly
- receipt creation works
- overpayment blocked
- installment and non-installment behavior follows docs
- required invariants covered by tests

### Slice 3 exit criteria
- sale edit rules enforced
- sale cancel rules enforced
- dashboard endpoints implemented
- receipt history lock behavior respected

### Slice 4 exit criteria
- consignment CRUD works within restrictions
- settlement works atomically
- full return without sale works
- one active linked sale per consignment enforced

### Slice 5 exit criteria
- hardening completed
- edge cases reviewed
- rule regressions covered
- API behavior stable for MVP use

## Required Tests by Slice

### Slice 1
- normalized unique username
- normalized unique product reference
- OPERATOR forbidden from sensitive actions

### Slice 2
- sale with zero items rejected
- `discount < gross_total`
- `net_total > 0`
- BOOKLET requires installments
- create sale generates receivable entries whose sum equals `sale.net_total`
- overpayment blocked
- receipt for PAID entry rejected
- receipt for CANCELED entry rejected

### Slice 3
- structural sale edit blocked when ACTIVE receipt exists
- notes-only edit allowed when ACTIVE receipt exists
- sale cancel blocked when any receipt exists in history
- receipt cancel recalculates receivable entry status and open balance
- canceled sale returns `edit_mode = locked`
- canceled sale returns `can_cancel = false`

### Slice 4
- consignment settlement reconciles quantities
- one active linked sale per consignment
- consignment full return creates no sale
- items with `quantity_sold = 0` do not generate sale items
- consignment settle keeps financial invariant:
  - `SUM(receivable_entries.amount) == sale.net_total`

### Slice 5
- regression tests for critical rules
- authorization regressions
- edge-case date and rounding checks for booklet

## Delivery Rules
- critical business tests do not wait for Slice 5
- tests must be implemented alongside the slice that introduces the rule
- do not merge out-of-scope features
- do not continue with broken build
- do not continue with failing core tests

## Session Discipline
Before each new implementation block:
1. restate the current slice
2. restate the current block
3. confirm what is out of scope
4. ask for a short plan
5. only then implement

## Recovery Prompt
Use when the session drifts:

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
