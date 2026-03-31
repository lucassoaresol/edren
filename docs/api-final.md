# EDREN Final API Contract

## General Rules
- Base URL prefix: `/api`
- API naming in English
- business behavior strictly follows approved docs
- user-facing text returned to UI may be in Portuguese
- protected routes require authenticated user
- authenticated routes use Bearer token in `Authorization` header
- token TTL: 12 hours
- every authenticated request must validate `user.is_active`
- authorization must enforce ADMIN vs OPERATOR restrictions

---

## AUTH

### POST `/auth/login`
Authenticate with username and password.

#### Request
```json
{
  "username": "admin",
  "password": "secret"
}
```

#### Response
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "ADMIN",
    "display_name": "Administrador"
  },
  "token": "jwt-or-session-token",
  "expires_in_hours": 12
}
```

### GET `/auth/me`
Return authenticated user.

#### Response
```json
{
  "id": 1,
  "username": "admin",
  "role": "ADMIN",
  "display_name": "Administrador"
}
```

---

## USERS

### GET `/users`
List users.

### POST `/users`
Create user.

### PATCH `/users/:id`
Update allowed user data.

### POST `/users/:id/reset-password`
Reset password.

#### Authorization
- ADMIN only

---

## CLIENTS

### GET `/clients`
List clients.

### POST `/clients`
Create client.

### PATCH `/clients/:id`
Update client.

### POST `/clients/:id/inactivate`
Inactivate client.

#### Authorization
- ADMIN only

### GET `/clients/:id/history`
Return client history.

#### Response
```json
{
  "client": {
    "id": 1,
    "name": "Maria",
    "client_type": "INDIVIDUAL",
    "phone": "85999999999"
  },
  "sales": [
    {
      "id": 1,
      "sale_date": "2026-03-31",
      "net_total": 120.5,
      "payment_status": "PENDING"
    }
  ],
  "current_total_debt": 120.5
}
```

---

## PRODUCTS

### GET `/products`
List products.

### POST `/products`
Create product.

#### Rules
- `reference` required
- `reference` unique under `UPPER(BTRIM(reference))`

### PATCH `/products/:id`
Update product.

### POST `/products/:id/inactivate`
Inactivate product.

#### Authorization
- ADMIN only

### DELETE `/products/:id`
Delete product.

#### Authorization
- ADMIN only

#### Rules
- allowed only if product has no references in `sale_items` or `consignment_items`
- return 422 if references exist
- must obey role restrictions from source docs

---

## SALES

### GET `/sales`
List sales.

### GET `/sales/:id`
Return sale details.

#### Must return
```json
{
  "id": 1,
  "status": "ACTIVE",
  "edit_mode": "full",
  "can_cancel": true
}
```

#### `edit_mode` rules
- `full` if no ACTIVE receipt exists
- `notes_only` if any ACTIVE receipt exists
- `locked` if sale status is CANCELED

#### `can_cancel` rules
- `true` only if no receipt exists in sale history
- `false` if any receipt exists, active or canceled
- `false` if sale status is CANCELED

### POST `/sales`
Create sale.

#### Required rules
- reject zero items
- backend computes `gross_total`
- backend computes `net_total`
- `discount >= 0`
- `discount < gross_total`
- `net_total > 0`
- create receivable entries according to payment plan

### PATCH `/sales/:id`
Edit sale.

#### Rules
- if no ACTIVE receipt -> full structural edit allowed
- if any ACTIVE receipt -> reject structural edit with 422
- when ACTIVE receipt exists, use `PATCH /sales/:id/notes` for notes-only changes
- structural edit deletes and recreates receivable entries inside one transaction
- lock sale row while editing

### PATCH `/sales/:id/notes`
Edit notes only.

#### Rules
- always allowed regardless of receipt state
- updates only the `notes` field

### POST `/sales/:id/cancel`
Cancel sale.

#### Authorization
- ADMIN only

#### Rules
- blocked if ANY receipt exists in history
- if canceled, sale becomes locked
- lock sale row while canceling

#### Errors
- `SALE_HAS_RECEIPT_HISTORY`
- `SALE_CANCEL_REQUIRES_ADMIN`

---

## RECEIVABLE ENTRIES

### GET `/receivable-entries`
List receivable entries.

### GET `/receivable-entries/:id`
Return one receivable entry.

#### Must include
- amount
- status
- due_date
- open_balance
- related sale
- related receipts summary if needed by UI

---

## RECEIPTS

### POST `/receivable-entries/:id/receipts`
Create receipt for one receivable entry.

#### Rules
- lock receivable entry row
- reject if entry already PAID
- reject if entry is CANCELED
- reject overpayment
- recalculate entry status transactionally

#### Success response must return
```json
{
  "receipt": {
    "id": 1
  },
  "receivable_entry": {
    "id": 10,
    "status": "PAID",
    "open_balance": 0
  }
}
```

#### Errors
- `RECEIVABLE_ENTRY_ALREADY_PAID`
- `RECEIVABLE_ENTRY_CANCELED`
- `RECEIPT_OVERPAYMENT`

### GET `/receipts`
List receipts.

### POST `/receipts/:id/cancel`
Cancel receipt.

#### Authorization
- ADMIN only

#### Rules
- lock parent receivable entry row
- cancel receipt
- recalculate parent entry status and open balance

#### Success response must return
```json
{
  "receipt": {
    "id": 1,
    "status": "CANCELED"
  },
  "receivable_entry": {
    "id": 10,
    "status": "PENDING",
    "open_balance": 100
  }
}
```

---

## CONSIGNMENTS

### GET `/consignments`
List consignments.

### GET `/consignments/:id`
Return consignment details.

### POST `/consignments`
Create consignment.

### PATCH `/consignments/:id`
Update consignment.

#### Rules
- if `items` omitted -> keep current items unchanged
- if `items` present -> must include all consignment items
- missing item -> `CONSIGNMENT_ITEM_MISSING`
- while OPEN and without active linked sale:
  - editable: `reference_unit_price`, `size`, `color`
  - non-editable: `product_id`, `name_snapshot`, `reference_snapshot`, `quantity_sent`

### POST `/consignments/:id/settle`
Settle consignment.

#### Rules
- lock consignment row
- settlement is atomic
- validate `quantity_sold + quantity_returned = quantity_sent`
- `quantity_sold = 0` is valid
- items with `quantity_sold = 0` do not generate sale items
- calculate gross total before discount validation
- validate `discount < gross_total` before writes
- if all items return and all `quantity_sold = 0`, do not create sale
- one consignment may have at most one ACTIVE linked sale

#### Success response
```json
{
  "consignment": {
    "id": 1,
    "status": "SETTLED"
  },
  "sale": {
    "id": 100
  }
}
```

#### Special full-return response
```json
{
  "consignment": {
    "id": 1,
    "status": "SETTLED"
  },
  "sale": null
}
```

#### Errors
- `INVALID_CONSIGNMENT_SETTLEMENT`
- `CONSIGNMENT_ITEM_MISSING`

---

## DASHBOARD

### GET `/dashboard/summary`
Return dashboard summary.

#### Must include
- `overdue_receivables_total`
- `upcoming_receivables_total_30d`
- `received_amount_current_month`
- `next_7_days_due_count`
- `next_7_days_due_total`

### GET `/dashboard/due-soon`
Return receivables due soon.

---

## Error Response Shape
Recommended standard shape:

```json
{
  "error": {
    "code": "RECEIPT_OVERPAYMENT",
    "message": "Pagamento excede o valor em aberto."
  }
}
```

## Authorization Summary
### ADMIN only
- manage users
- inactivate clients
- inactivate products
- delete products
- cancel sales
- cancel receipts

### OPERATOR allowed
- login
- basic client/product/sale/receipt daily operations within role limits
