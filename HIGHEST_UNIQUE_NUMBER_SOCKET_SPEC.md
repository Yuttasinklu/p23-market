# Highest Unique Number - Socket Spec (v1)

Base:
- Socket path: `/socket.io`
- Auth: JWT token via socket handshake
- Time format: Unix timestamp (seconds)

Mode:
- `highest_unique_number`

## 1) Game Config (Fixed v1)
- Number range: `1..9`
- Input time: `15 sec` (always wait until timer ends)
- Minimum players: `3`
- Maximum players: `10`
- No-winner case: refund all

## 2) Event Flow (High Level)
1. Player joins room
2. Host starts game
3. Server starts input timer (15 sec)
4. Players submit number (one time)
5. Timer reaches 0
6. Server resolves highest unique number
7. Server emits finish + payout/refund

## 3) Client -> Server Events

### `room:join`
```json
{ "roomId": "room_hun_001" }
```

### `room:leave`
```json
{ "roomId": "room_hun_001" }
```

### `room:start`
Host only, room status must be `waiting`.
```json
{ "roomId": "room_hun_001" }
```

### `hun:submit_number`
Submit one number during input phase.
```json
{
  "roomId": "room_hun_001",
  "round": 1,
  "number": 7
}
```

Rules:
- Accept only integer `1..9`
- One submission per player per round
- Reject after timer end

## 4) Server -> Client Events

### `room:joined`
```json
{
  "room": {
    "id": "room_hun_001",
    "mode": "highest_unique_number",
    "status": "waiting",
    "entryStake": 20,
    "stake": 120,
    "players": 6,
    "hostUserId": "u1"
  },
  "you": {
    "userId": "u8",
    "displayName": "Player 8",
    "avatarIndex": 8
  }
}
```

### `room:state`
Canonical room snapshot broadcast after join/leave/start/resolve.
```json
{
  "roomId": "room_hun_001",
  "mode": "highest_unique_number",
  "status": "playing",
  "round": 1,
  "entryStake": 20,
  "stake": 120,
  "players": [
    { "userId": "u1", "displayName": "A", "avatarIndex": 1 },
    { "userId": "u8", "displayName": "Player 8", "avatarIndex": 8 }
  ],
  "updatedAt": 1773010000
}
```

### `hun:round_started`
Input phase started with fixed 15 sec.
```json
{
  "roomId": "room_hun_001",
  "round": 1,
  "inputStartedAt": 1773010001,
  "inputEndsAt": 1773010016,
  "inputSeconds": 15
}
```

### `hun:submit_ack`
Private ack to submitter.
```json
{
  "roomId": "room_hun_001",
  "round": 1,
  "accepted": true,
  "number": 7,
  "submittedAt": 1773010008
}
```

### `hun:submitted_count`
Public progress without revealing numbers.
```json
{
  "roomId": "room_hun_001",
  "round": 1,
  "submitted": 4,
  "total": 6,
  "secondsLeft": 7
}
```

### `hun:auto_pick_applied`
When player did not submit before timeout.
```json
{
  "roomId": "room_hun_001",
  "round": 1,
  "userId": "u5",
  "avatarIndex": 5,
  "number": 3,
  "auto": true
}
```

### `hun:round_resolved`
Full reveal after timer ends.
```json
{
  "roomId": "room_hun_001",
  "round": 1,
  "picks": [
    { "userId": "u1", "displayName": "A", "avatarIndex": 1, "number": 9 },
    { "userId": "u2", "displayName": "B", "avatarIndex": 2, "number": 9 },
    { "userId": "u3", "displayName": "C", "avatarIndex": 3, "number": 8 },
    { "userId": "u4", "displayName": "D", "avatarIndex": 4, "number": 6 }
  ],
  "frequency": {
    "6": 1,
    "8": 1,
    "9": 2
  },
  "uniqueNumbers": [6, 8],
  "winningNumber": 8,
  "winnerUserId": "u3",
  "resolvedAt": 1773010017
}
```

### `hun:finished`
Final financial result.
```json
{
  "roomId": "room_hun_001",
  "round": 1,
  "entryStake": 20,
  "stake": 120,
  "winner": {
    "userId": "u3",
    "displayName": "C",
    "avatarIndex": 3,
    "number": 8
  },
  "payouts": [
    { "userId": "u3", "displayName": "C", "avatarIndex": 3, "amount": 120 }
  ],
  "refunds": [],
  "endedAt": 1773010018
}
```

### `hun:finished_draw`
No unique number -> refund all.
```json
{
  "roomId": "room_hun_001",
  "round": 1,
  "entryStake": 20,
  "stake": 120,
  "draw": true,
  "reason": "NO_UNIQUE_NUMBER",
  "winner": null,
  "payouts": [],
  "refunds": [
    { "userId": "u1", "amount": 20 },
    { "userId": "u2", "amount": 20 },
    { "userId": "u3", "amount": 20 }
  ],
  "endedAt": 1773010018
}
```

## 5) Error Event

### `socket:error`
```json
{
  "code": "ALREADY_SUBMITTED",
  "message": "You already submitted this round"
}
```

Suggested codes:
- `UNAUTHORIZED`
- `ROOM_NOT_FOUND`
- `ROOM_NOT_JOINABLE`
- `NOT_ROOM_HOST`
- `INVALID_NUMBER_RANGE`
- `ALREADY_SUBMITTED`
- `ROUND_ALREADY_RESOLVED`
- `SUBMISSION_CLOSED`
- `INTERNAL_ERROR`

## 6) Server Validations
- Start game only when players `>= 3` and `<= 10`
- Lock stake at round start
- Always resolve only after `inputEndsAt`
- Ensure idempotent payout/refund transaction write
- Record auto-pick markers in audit log
