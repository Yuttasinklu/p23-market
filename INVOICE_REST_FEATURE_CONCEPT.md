# Invoice Feature Concept (REST Only, v1)

## Goals
- Provide a simple invoice workflow between players using REST APIs only.
- Allow payer-side actions to either pay full invoice or transfer debt (`โอนหนี้`) to another player.
- Define one "My Invoices" page that supports both payer and creator views.

## Scope
- Add invoice resource and lifecycle: create, list, pay, transfer, cancel.
- Add one My Invoices page contract at route `/invoices/my`.
- Add clear permissions and validation rules for each action.
- Add test scenarios for backend and frontend integration readiness.

## Out of Scope
- Socket events, realtime pushes, notification bell badge, and websocket connections.
- Partial payment.
- Auto-borrow when payer has insufficient coin.
- Any direct frontend/backend code implementation in this release (documentation only).

## Domain Model
### Invoice
```json
{
  "id": "inv_1001",
  "createdByUserId": "u2",
  "currentPayerUserId": "u4",
  "amount": 50,
  "noteLatest": "table A",
  "status": "pending",
  "createdAt": 1740658500,
  "updatedAt": 1740658500,
  "paidAt": null,
  "cancelledAt": null
}
```

### InvoiceStatus
- `pending`
- `paid`
- `cancelled`

## REST API
Base URL: `/api/v1`  
Auth: `Authorization: Bearer <token>`  
Amount unit: integer `M-coin`

### 1) `POST /invoices`
Create a new invoice.

Request:
```json
{
  "receiverId": "u4",
  "amount": 50,
  "note": "table A"
}
```

Validation:
- `receiverId` must exist and must not be the current user.
- `amount` must be integer and greater than `0`.
- `note` optional (trimmed).

Response:
```json
{
  "ok": true,
  "invoice": {
    "id": "inv_1001",
    "createdByUserId": "u2",
    "currentPayerUserId": "u4",
    "amount": 50,
    "noteLatest": "table A",
    "status": "pending",
    "createdAt": 1740658500,
    "updatedAt": 1740658500,
    "paidAt": null,
    "cancelledAt": null
  }
}
```

### 2) `GET /invoices/my?tab=assigned|created&status=all|pending|paid|cancelled&page=1&limit=20`
Return invoices for My Invoices page.

Query:
- `tab=assigned`: invoices where `currentPayerUserId = me`
- `tab=created`: invoices where `createdByUserId = me`
- `status`: `all|pending|paid|cancelled`
- `page`: default `1`
- `limit`: default `20`, max `100`

Response:
```json
{
  "items": [
    {
      "id": "inv_1001",
      "createdByUserId": "u2",
      "currentPayerUserId": "u4",
      "amount": 50,
      "noteLatest": "table A",
      "status": "pending",
      "createdAt": 1740658500,
      "updatedAt": 1740658500,
      "paidAt": null,
      "cancelledAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 3) `POST /invoices/:invoiceId/pay`
Pay full invoice amount.

Request:
```json
{}
```

Validation:
- Caller must be current payer.
- Invoice must be `pending`.
- Caller coin balance must be greater than or equal to invoice `amount`.
- No auto-borrow fallback if coin is insufficient.

Response:
```json
{
  "ok": true,
  "invoice": {
    "id": "inv_1001",
    "status": "paid",
    "paidAt": 1740658600,
    "updatedAt": 1740658600
  },
  "transfer": {
    "id": "tx5001",
    "type": "transfer",
    "fromUserId": "u4",
    "toUserId": "u2",
    "amount": 50,
    "note": "invoice:inv_1001",
    "createdAt": 1740658600
  }
}
```

### 4) `POST /invoices/:invoiceId/transfer`
Transfer debt (`โอนหนี้`) to another payer.

Request:
```json
{
  "toUserId": "u9",
  "note": "โอนหนี้โต๊ะ B"
}
```

Validation:
- Caller must be current payer.
- Invoice must be `pending`.
- `toUserId` must exist and must not equal current payer.
- `note` is required and must be non-empty.
- Invoice `amount` is immutable and cannot be changed.

Response:
```json
{
  "ok": true,
  "invoice": {
    "id": "inv_1001",
    "createdByUserId": "u2",
    "currentPayerUserId": "u9",
    "amount": 50,
    "noteLatest": "โอนหนี้โต๊ะ B",
    "status": "pending",
    "updatedAt": 1740658700
  }
}
```

### 5) `POST /invoices/:invoiceId/cancel`
Cancel invoice.

Request:
```json
{}
```

Validation:
- Caller must be invoice creator (`createdByUserId`).
- Invoice must be `pending`.

Response:
```json
{
  "ok": true,
  "invoice": {
    "id": "inv_1001",
    "status": "cancelled",
    "cancelledAt": 1740658800,
    "updatedAt": 1740658800
  }
}
```

## My Invoices Page
- Route: `/invoices/my`
- Data source: REST only (no socket subscription).
- Refresh pattern: manual refresh button triggers refetch for active tab/filter.

### Tab A: Assigned to me
- Query: `tab=assigned`
- Meaning: rows where `currentPayerUserId = me`
- Actions:
  - `Pay` (visible when status = `pending`)
  - `โอนหนี้` (visible when status = `pending`)

### Tab B: Created by me
- Query: `tab=created`
- Meaning: rows where `createdByUserId = me`
- Actions:
  - `Cancel` (visible when status = `pending`)

### Shared UI Controls
- Status filter: `all|pending|paid|cancelled`
- Pagination: `page`, `limit`
- List columns: Invoice ID, Amount, Current Payer, Creator, Latest Note, Status, Updated Time

## Business Rules
- Invoice amount is immutable after creation.
- Pay action always attempts full payment; partial payment is not supported.
- If payer coin is less than invoice amount, API returns `INSUFFICIENT_COIN`.
- Auto-borrow is not allowed under any condition in invoice pay flow.
- Transfer debt changes only `currentPayerUserId` and `noteLatest`.
- Transfer debt requires updated note input.
- Cancel is allowed only for creator and only while status is `pending`.
- Paying invoice transfers coin from current payer to original creator.

## Error Codes
- `INVOICE_NOT_FOUND`
- `NOT_INVOICE_PAYER`
- `NOT_INVOICE_CREATOR`
- `INVOICE_ALREADY_PAID`
- `INVOICE_CANCELLED`
- `INSUFFICIENT_COIN`
- `INVALID_TRANSFER_TARGET`
- `VALIDATION_ERROR`

## Test Scenarios
1. Create invoice succeeds with valid receiver, amount, and optional note.
2. Create invoice fails for `amount <= 0` and for self receiver.
3. Assigned payer pays invoice successfully and invoice status becomes `paid`.
4. Pay fails with `INSUFFICIENT_COIN` when payer balance is below amount.
5. Transfer debt succeeds and `currentPayerUserId` changes to selected target.
6. Transfer debt fails when target is invalid or equal to current payer.
7. Creator cancels pending invoice successfully and status becomes `cancelled`.
8. Cancel fails when requester is not creator or invoice is not `pending`.
9. `GET /invoices/my` returns correct rows and pagination for both tabs and each status filter.

## Rollout Notes
- This release artifact is documentation only.
- Backend and frontend implementation must follow this spec without introducing realtime dependencies.
- Any future notification/socket enhancement should be defined in a separate versioned document.
