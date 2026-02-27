# P23 Market API Draft (P23 Market)

Base path: `/api/v1`  
Primary currency unit: `M-Coin`  
Exchange reference: `1 M-Coin = 10 THB` (display helper only)

## Auth

### `POST /auth/login`
Login by username/password (or office PIN for MVP).

Request:
```json
{
  "username": "player1",
  "password": "string"
}
```

Response:
```json
{
  "token": "jwt-or-session-token",
  "user": {
    "id": "u2",
    "username": "player1",
    "displayName": "Player 1",
    "role": "player"
  }
}
```

### `POST /auth/register`
Register a player account.

Request:
```json
{
  "username": "player9",
  "displayName": "Player 9",
  "password": "string"
}
```

Response: same shape as login.

### `POST /auth/logout`
Invalidate session/token.

## Players

### `GET /players`
Return all players with public balances and debts.

Response item:
```json
{
  "id": "u3",
  "username": "player3",
  "displayName": "Player 3",
  "role": "player",
  "coin": 80,
  "bankDebt": 40,
  "net": 40
}
```

### `GET /players/:id`
Return profile and summary stats for one player.

## Transfers and Ledger

### `POST /transfers`
Create transfer from current user to receiver.

Request:
```json
{
  "receiverId": "u4",
  "amount": 50,
  "note": "table A"
}
```

### `GET /transactions`
List public ledger records.

Query:
- `type`: `transfer|borrow|repay`
- `playerId`
- `from` / `to` (ISO datetime)
- `page`, `limit`

Response item:
```json
{
  "id": "tx100",
  "type": "transfer",
  "fromUserId": "u2",
  "toUserId": "u4",
  "amount": 50,
  "note": "table A",
  "createdAt": "2026-02-27T08:00:00.000Z"
}
```

## Bank

### `GET /bank/me`
Return my coin, my debt, and exchange info.

Response:
```json
{
  "coin": 120,
  "bankDebt": 20,
  "exchangeRate": 10
}
```

### `POST /bank/borrow`
Borrow from bank in M-Coin.

Request:
```json
{
  "amount": 100,
  "note": "top up"
}
```

### `POST /bank/repay`
Repay bank debt in M-Coin.

Request:
```json
{
  "amount": 50,
  "note": "partial repay"
}
```

### `GET /bank/history`
List current user's borrow/repay history.

## Settlement

### `POST /settlement/run`
Run manual settlement snapshot (admin only).

Response:
```json
{
  "id": "set1",
  "createdAt": "2026-02-27T12:00:00.000Z",
  "runByUserId": "u1",
  "players": [
    {
      "playerId": "u2",
      "coin": 120,
      "bankDebt": 20,
      "net": 100
    }
  ]
}
```

### `GET /settlement/runs`
List settlement run history.

## Dashboard / Leaderboard

### `GET /dashboard`
Return aggregate stats for home page (totals, top winner/loser, recent activity).

### `GET /leaderboard`
Return ranked players by net (`coin - bankDebt`).

## Common Error Shape
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be greater than 0."
  }
}
```
