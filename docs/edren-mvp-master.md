# EDREN MVP Master Document

## 1. Product Definition
EDREN is a focused MVP for commercial and financial operation with emphasis on accounts receivable visibility.

The main problem to solve is clarity about:
- what is still to be received
- from whom
- how much
- when it should have been received

This is not an ERP.
This is not a full inventory system.
This is not a multi-company platform.

## 2. Technical Direction
- Frontend: React
- UI: Tailwind CSS + shadcn/ui
- Backend: Node.js + Fastify
- Database: PostgreSQL
- Authentication: username + password
- No email flow
- No complex account recovery

### Auth rules
- Auth mechanism: Bearer token in `Authorization` header
- Base URL prefix: `/api`
- Token TTL: 12 hours
- No refresh flow in MVP
- Every authenticated request must validate `user.is_active`

## 3. Language Rules
- Technical naming must be in English
- Database schema must be in English
- API contracts must be in English
- User-facing texts must be in Portuguese

## 4. Roles

### ADMIN
- full access

### OPERATOR
- commercial/financial daily operation only
- cannot manage users
- cannot inactivate clients
- cannot inactivate products
- cannot delete products
- cannot cancel sales
- cannot cancel receipts

## 5. Approved Scope

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

## 6. Domain Rules

### 6.1 Products
- `product.reference` is required
- globally unique
- normalized with `UPPER(BTRIM(reference))`
- inactivation does not free the reference for reuse

### 6.2 Sales
- sale must have at least one item
- backend computes `gross_total`
- backend computes `net_total`
- `discount >= 0`
- `discount < gross_total`
- `net_total > 0`
- `sale_date` is business date
- structural edit of `sale_date` only if no ACTIVE receipt exists

### 6.3 Payment Method
Allowed values:
- CASH
- PIX
- CARD
- BOOKLET
- MIXED

Final decisions:
- only BOOKLET creates installments
- MIXED does not create installments
- MIXED means multiple future receipts with different payment methods may exist
- if MIXED has `down_payment_amount > 0`, create:
  - one receivable entry already PAID for down payment
  - one ACTIVE receipt linked to it
  - remaining balance as pending receivable logic for non-installment flow

### 6.4 Payment Plan Matrix

| agreed_payment_method | down_payment_amount | remaining_balance_due_date | number_of_installments | first_due_date |
|---|---:|---|---:|---|
| CASH / PIX / CARD fully paid | optional | null | null | null |
| CASH / PIX / CARD with remaining balance | optional | required if remaining balance > 0 | null | null |
| BOOKLET | optional | null | required >= 1 | required |
| MIXED | optional | required if remaining balance > 0 | null | null |

### 6.5 Booklet Rules
- same day-of-month anchor
- if a month does not contain the anchor day, use the last day of that month
- round to 2 decimals
- remainder goes to the last installment
- partial receipt is allowed
- backend is source of truth

### 6.6 Receivable Entries
- derived `open_balance`
- persisted `status`
- transactional recalculation after receipt create/cancel
- status meanings:
  - PENDING if active receipts total `< amount`
  - PAID if active receipts total `= amount`
  - CANCELED when parent sale is canceled

### 6.7 Receipts
- every receipt belongs to exactly one receivable entry
- cannot be edited
- cannot be hard deleted
- can be canceled
- only ADMIN can cancel

### 6.8 Overpayment
- forbidden
- validate with row lock on receivable entry

### 6.9 Sale Edit
- if no ACTIVE receipt exists -> full structural edit allowed
- if any ACTIVE receipt exists -> notes only
- structural edit must recreate receivable entries inside one transaction

### 6.10 Sale Cancel
- blocked if any receipt exists in history
- history includes ACTIVE and CANCELED receipts
- canceled sale becomes locked
- canceled sale cannot be canceled again

### 6.11 Consignments
- one consignment can have at most one ACTIVE linked sale
- linked source of truth is `sales.consignment_id`
- no `consignments.sale_id`
- settlement is atomic
- settlement validates:
  - `quantity_sold + quantity_returned = quantity_sent`
- `quantity_sold = 0` is valid
- items with `quantity_sold = 0` do not create sale items
- settlement calculates gross total before discount validation
- settlement validates `discount < gross_total` before writing

While OPEN and without active linked sale:

Editable:
- `reference_unit_price`
- `size`
- `color`

Not editable:
- `product_id`
- `name_snapshot`
- `reference_snapshot`
- `quantity_sent`

Settlement-only:
- `quantity_sold`
- `quantity_returned`

Patch rule:
- if `items` omitted -> do not change items
- if `items` present -> must include all consignment items
- missing item -> `CONSIGNMENT_ITEM_MISSING`

Full return rule:
- if all items have `quantity_sold = 0`, settlement does not create sale
- consignment becomes SETTLED with full return and no linked sale

## 7. Data Model

### Tables
- `users`
- `clients`
- `products`
- `sales`
- `sale_items`
- `receivable_entries`
- `receipts`
- `consignments`
- `consignment_items`

### ID strategy
- all primary and foreign IDs use `BIGINT`

### Required invariants
- `receivable_entries.amount > 0`
- `receipts.received_amount > 0`
- `sales.discount < gross_total`
- `consignment_items.quantity_sold + quantity_returned <= quantity_sent`

### Required indexes
```sql
CREATE UNIQUE INDEX products_reference_unique
  ON products (upper(btrim(reference)));
```

Also required:
- normalized unique username index
- partial unique index on `sales(consignment_id)` for active linked sale rule

## 8. Transaction and Lock Rules

### Transactional endpoints
- `POST /sales`
- `PATCH /sales/:id`
- `POST /sales/:id/cancel`
- `POST /receivable-entries/:id/receipts`
- `POST /receipts/:id/cancel`
- `POST /consignments`
- `PATCH /consignments/:id` when nested items change
- `POST /consignments/:id/settle`

### Mandatory locks
- lock receivable entry on receipt create/cancel
- lock sale on sale edit/cancel
- lock consignment on settlement

## 9. Error Codes
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

### Standard error shape
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensagem para a interface"
  }
}
```

## 10. Non-goals
Do not add:
- stock control
- stock movement
- production flow
- supplier flow
- accounts payable
- refund/reversal flow
- complex reporting
- integrations
- multi-company support
- ERP abstractions

## 11. Delivery Standard
Implementation must:
- follow docs as source of truth
- avoid speculative abstractions
- keep slices isolated
- include tests with the slice that introduces the rule
- not leave TODOs in core business logic
