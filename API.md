# P23 Market API (v1)

Base URL: `/api/v1`  
Primary currency: `M-coin`  
Exchange reference: `1 M-coin = 10 THB` (display only)

## Conventions
- Auth: `Authorization: Bearer <token>`
- Content-Type: `application/json`
- Time format: ISO8601 UTC (`2026-02-27T12:00:00.000Z`)

## Common Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be greater than 0."
  }
}
```

## 1) Auth

### `POST /auth/login`
Login with username/password.

Example request:
```json
{
  "username": "player1",
  "password": "1234"
}
```

Example response:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "u2",
    "username": "player1",
    "displayName": "Player 1",
    "role": "player"
  }
}
```

### `POST /auth/register`
Create new player account.

Example request:
```json
{
  "username": "player99",
  "displayName": "Player 99",
  "password": "1234"
}
```

Example response:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "u99",
    "username": "player99",
    "displayName": "Player 99",
    "role": "player"
  }
}
```

### `POST /auth/logout`
Invalidate current token/session.

Example request:
```json
{}
```

Example response:
```json
{
  "ok": true
}
```

## 2) Players / Leaderboard

### `GET /players`
Return all players with balances.

Example request:
```http
GET /api/v1/players
```

Example response:
```json
{
  "items": [
    {
      "id": "u2",
      "username": "player1",
      "displayName": "Player 1",
      "role": "player",
      "coin": 120,
      "bankDebt": 20,
      "net": 100
    },
    {
      "id": "u3",
      "username": "player3",
      "displayName": "Player 3",
      "role": "player",
      "coin": 80,
      "bankDebt": 40,
      "net": 40
    }
  ]
}
```

### `GET /players/:id`
Return one player profile.

Example request:
```http
GET /api/v1/players/u2
```

Example response:
```json
{
  "id": "u2",
  "username": "player1",
  "displayName": "Player 1",
  "role": "player",
  "coin": 120,
  "bankDebt": 20,
  "net": 100
}
```

### `GET /leaderboard`
Return ranked players by `coin - bankDebt`.

Example request:
```http
GET /api/v1/leaderboard
```

Example response:
```json
{
  "items": [
    { "rank": 1, "playerId": "u10", "displayName": "Player 10", "coin": 188, "bankDebt": 42, "net": 146 },
    { "rank": 2, "playerId": "u4", "displayName": "Player 4", "coin": 150, "bankDebt": 10, "net": 140 },
    { "rank": 3, "playerId": "u12", "displayName": "Player 12", "coin": 143, "bankDebt": 36, "net": 107 }
  ]
}
```

## 3) Transfer & Ledger

### `POST /transfers`
Create transfer from current user to receiver.

Example request:
```json
{
  "receiverId": "u4",
  "amount": 50,
  "note": "table A"
}
```

Example response:
```json
{
  "ok": true,
  "transaction": {
    "id": "tx101",
    "type": "transfer",
    "fromUserId": "u2",
    "toUserId": "u4",
    "amount": 50,
    "note": "table A",
    "createdAt": "2026-02-27T12:15:00.000Z"
  }
}
```

### `GET /transactions`
Public ledger records.

Query params:
- `type`: `transfer|borrow|repay`
- `playerId`: optional filter by player involved
- `from`: ISO datetime
- `to`: ISO datetime
- `page`: default `1`
- `limit`: default `20`

Example request:
```http
GET /api/v1/transactions?type=transfer&page=1&limit=20
```

Example response:
```json
{
  "items": [
    {
      "id": "tx101",
      "type": "transfer",
      "fromUserId": "u2",
      "toUserId": "u4",
      "amount": 50,
      "note": "table A",
      "createdAt": "2026-02-27T12:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 37
  }
}
```

## 4) Bank

### `GET /bank/me`
Return my bank summary.

Example request:
```http
GET /api/v1/bank/me
```

Example response:
```json
{
  "coin": 120,
  "bankDebt": 20,
  "net": 100,
  "exchangeRate": 10
}
```

### `POST /bank/borrow`
Borrow from bank in M-coin.

Example request:
```json
{
  "amount": 30,
  "note": "top up"
}
```

Example response:
```json
{
  "ok": true,
  "coin": 150,
  "bankDebt": 50,
  "transactionId": "tx102"
}
```

### `POST /bank/repay`
Repay bank debt in M-coin.

Example request:
```json
{
  "amount": 10,
  "note": "partial repay"
}
```

Example response:
```json
{
  "ok": true,
  "coin": 140,
  "bankDebt": 40,
  "transactionId": "tx103"
}
```

## 5) Settlement

### `POST /settlement/run`
Run manual settlement snapshot (admin only).

Example request:
```json
{}
```

Example response:
```json
{
  "id": "set12",
  "createdAt": "2026-02-27T18:00:00.000Z",
  "runByUserId": "u1",
  "players": [
    { "playerId": "u2", "coin": 120, "bankDebt": 20, "net": 100 },
    { "playerId": "u3", "coin": 80, "bankDebt": 40, "net": 40 }
  ]
}
```

### `GET /settlement/runs`
List settlement history.

Example request:
```http
GET /api/v1/settlement/runs
```

Example response:
```json
{
  "items": [
    {
      "id": "set12",
      "createdAt": "2026-02-27T18:00:00.000Z",
      "runByUserId": "u1",
      "players": [
        { "playerId": "u2", "coin": 120, "bankDebt": 20, "net": 100 },
        { "playerId": "u3", "coin": 80, "bankDebt": 40, "net": 40 }
      ]
    }
  ]
}
```

## 6) Dashboard

### `GET /dashboard`
Return home page aggregate data.

Example request:
```http
GET /api/v1/dashboard
```

Example response:
```json
{
  "totals": {
    "totalCoin": 1324,
    "totalDebt": 438
  },
  "topWinner": {
    "playerId": "u10",
    "displayName": "Player 10",
    "net": 146
  },
  "topLoser": {
    "playerId": "u9",
    "displayName": "Player 9",
    "net": 24
  },
  "recentTransactions": [
    {
      "id": "tx101",
      "type": "transfer",
      "fromUserId": "u2",
      "toUserId": "u4",
      "amount": 50,
      "note": "table A",
      "createdAt": "2026-02-27T12:15:00.000Z"
    }
  ]
}
```
