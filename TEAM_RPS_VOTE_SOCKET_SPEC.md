# Team RPS Vote Socket Spec (v1)

Base:
- Socket path: `/socket.io`
- Auth: JWT via socket handshake
- Time format: Unix timestamp (seconds)
- Mode: `team_rps_vote`

## 1) Fixed Config
- Round input time: `15 sec`
- Match format: `BO3`
- Min players: `4`
- Max players: `10`
- Start allowed only when team sizes are equal and total player count is even.

## 2) Event Flow (High Level)
1. players join room
2. players choose team (`A` or `B`)
3. host starts match
4. server starts round timer (15 sec)
5. players submit votes
6. server auto-picks missing votes at timeout
7. server resolves team majority + RPS result
8. repeat until one team reaches 2 wins
9. emit finished + payout (or fallback refund)

## 3) Client -> Server Events

### `room:join`
```json
{ "roomId": "room_team_001" }
```

### `room:leave`
```json
{ "roomId": "room_team_001" }
```

### `team:choose`
Allowed only when room status is `waiting`.
```json
{
  "roomId": "room_team_001",
  "team": "A"
}
```

### `room:start`
Host only.
```json
{ "roomId": "room_team_001" }
```

### `team_rps:submit_vote`
```json
{
  "roomId": "room_team_001",
  "round": 1,
  "choice": "rock"
}
```

Rules:
- only `rock|paper|scissors`
- one submit per player per round
- reject after round closes

## 4) Server -> Client Events

### `room:joined`
```json
{
  "room": {
    "id": "room_team_001",
    "mode": "team_rps_vote",
    "status": "waiting",
    "entryStake": 20,
    "stake": 120,
    "players": 6,
    "teamCounts": { "A": 3, "B": 3 },
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
Canonical state after join/leave/team choose/start/resolve.
```json
{
  "roomId": "room_team_001",
  "mode": "team_rps_vote",
  "status": "playing",
  "matchFormat": "BO3",
  "round": 2,
  "score": { "A": 1, "B": 0 },
  "entryStake": 20,
  "stake": 120,
  "teams": {
    "A": [
      { "userId": "u1", "displayName": "A1", "avatarIndex": 1 },
      { "userId": "u2", "displayName": "A2", "avatarIndex": 2 }
    ],
    "B": [
      { "userId": "u5", "displayName": "B1", "avatarIndex": 5 },
      { "userId": "u6", "displayName": "B2", "avatarIndex": 6 }
    ]
  },
  "teamCounts": { "A": 3, "B": 3 },
  "inputEndsAt": 1773020016,
  "updatedAt": 1773020001
}
```

### `team:updated`
Broadcast on team choose/move.
```json
{
  "roomId": "room_team_001",
  "userId": "u8",
  "team": "A",
  "teamCounts": { "A": 4, "B": 3 },
  "updatedAt": 1773020002
}
```

### `team_rps:round_started`
```json
{
  "roomId": "room_team_001",
  "round": 1,
  "inputStartedAt": 1773020001,
  "inputEndsAt": 1773020016,
  "inputSeconds": 15
}
```

### `team_rps:submit_ack` (private)
```json
{
  "roomId": "room_team_001",
  "round": 1,
  "accepted": true,
  "submittedAt": 1773020008
}
```

### `team_rps:submitted_count`
No vote details revealed.
```json
{
  "roomId": "room_team_001",
  "round": 1,
  "submittedA": 2,
  "submittedB": 3,
  "totalA": 3,
  "totalB": 3,
  "secondsLeft": 6
}
```

### `team_rps:auto_pick_applied`
```json
{
  "roomId": "room_team_001",
  "round": 1,
  "userId": "u3",
  "team": "A",
  "choice": "paper",
  "auto": true
}
```

### `team_rps:round_resolved`
```json
{
  "roomId": "room_team_001",
  "round": 1,
  "teamChoice": { "A": "rock", "B": "scissors" },
  "teamVoteCount": {
    "A": { "rock": 2, "paper": 1, "scissors": 0 },
    "B": { "rock": 1, "paper": 0, "scissors": 2 }
  },
  "teamVoteTieBreak": { "A": false, "B": false },
  "roundWinner": "A",
  "score": { "A": 1, "B": 0 },
  "resolvedAt": 1773020017
}
```

### `team_rps:finished`
```json
{
  "roomId": "room_team_001",
  "winnerTeam": "A",
  "score": { "A": 2, "B": 1 },
  "entryStake": 20,
  "stake": 120,
  "winners": [
    { "userId": "u1", "displayName": "A1", "avatarIndex": 1 },
    { "userId": "u2", "displayName": "A2", "avatarIndex": 2 }
  ],
  "payouts": [
    { "userId": "u1", "amount": 40 },
    { "userId": "u2", "amount": 40 },
    { "userId": "u3", "amount": 40 }
  ],
  "endedAt": 1773020038
}
```

### `team_rps:finished_draw` (fallback)
```json
{
  "roomId": "room_team_001",
  "draw": true,
  "reason": "UNEXPECTED_STATE",
  "refunds": [
    { "userId": "u1", "amount": 20 },
    { "userId": "u2", "amount": 20 },
    { "userId": "u3", "amount": 20 },
    { "userId": "u4", "amount": 20 }
  ],
  "endedAt": 1773020038
}
```

### `socket:error`
```json
{
  "code": "TEAM_NOT_EQUAL",
  "message": "Teams must be balanced before start"
}
```

Suggested codes:
- `UNAUTHORIZED`
- `ROOM_NOT_FOUND`
- `ROOM_NOT_JOINABLE`
- `TEAM_SELECTION_CLOSED`
- `ODD_PLAYER_NOT_ALLOWED`
- `TEAM_NOT_EQUAL`
- `INVALID_TEAM_BALANCE`
- `ALREADY_SUBMITTED`
- `SUBMISSION_CLOSED`
- `NOT_ROOM_HOST`
- `INTERNAL_ERROR`

## 5) Server Validations
- start only when players are even and in range `4..10`
- start only when team counts are equal
- lock match state after start (no team changes)
- prevent duplicate submits in same round
- auto-pick all non-submitted players at timeout
- emit final payout/refund exactly once (idempotent)
