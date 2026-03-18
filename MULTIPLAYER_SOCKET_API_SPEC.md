# Multiplayer Socket + REST Spec (v1)

Base URL: `/api/v1`  
Socket path: `/socket.io`  
Auth: `Authorization: Bearer <token>` (REST) and `token` in socket handshake  
Time format: Unix timestamp (seconds)  
Amount unit: integer `M-coin`

## 1) Goals
- REST is used for joinable room discovery and non-realtime actions.
- Socket is used for realtime room state and gameplay.
- Server is authoritative for all game results, elimination, and payouts.

## 2) Room Model (Shared)
```json
{
  "id": "room_abc123",
  "name": "Lunch Revenge",
  "mode": "majority_die",
  "stake": 160,
  "entryStake": 20,
  "hostUserId": "u1",
  "status": "waiting",
  "maxPlayers": 20,
  "players": 8,
  "createdAt": 1773001000,
  "startedAt": null,
  "endedAt": null
}
```

`status` values:
- `waiting`: players can join, host can start
- `playing`: in-game stage running
- `resolved`: match finished
- `closed`: archived

`stake` values:
- `stake` = total stake in room (sum of all joined players)
- `entryStake` = per-player stake

## 3) REST API (Rooms + Multiplayer List)

### 3.1 `GET /multiplayer/rooms`
Joinable room list for lobby page. This endpoint returns only rooms that can be joined (`status=waiting`).

Query:
- `mode` (optional): `majority_die`
- `page` (default `1`)
- `limit` (default `20`, max `50`)

Example request:
```http
GET /api/v1/multiplayer/rooms?page=1&limit=20
```

Example response:
```json
{
  "items": [
    {
      "id": "room_abc123",
      "name": "Lunch Revenge",
      "mode": "majority_die",
      "stake": 160,
      "entryStake": 20,
      "hostUserId": "u1",
      "hostDisplayName": "A",
      "hostAvatarIndex": 3,
      "status": "waiting",
      "maxPlayers": 20,
      "players": 8,
      "createdAt": 1773001000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 3.2 `POST /multiplayer/rooms`
Create room (host only action).

Example request:
```json
{
  "name": "Lunch Revenge",
  "mode": "majority_die",
  "entryStake": 20,
  "maxPlayers": 20,
  "stageTimeoutSec": 12
}
```

Example response:
```json
{
  "ok": true,
  "room": {
    "id": "room_abc123",
    "name": "Lunch Revenge",
    "mode": "majority_die",
    "stake": 20,
    "entryStake": 20,
    "hostUserId": "u1",
    "status": "waiting",
    "players": 1,
    "maxPlayers": 20,
    "createdAt": 1773001000
  }
}
```

### 3.3 `GET /multiplayer/rooms/:roomId`
Room detail snapshot for page reload.

Example response:
```json
{
  "room": {
    "id": "room_abc123",
    "name": "Lunch Revenge",
    "mode": "majority_die",
    "stake": 160,
    "entryStake": 20,
    "hostUserId": "u1",
    "status": "playing",
    "stage": 2,
    "stageEndsAt": 1773001099,
    "players": [
      { "userId": "u1", "displayName": "A", "avatarIndex": 3, "alive": true },
      { "userId": "u2", "displayName": "B", "avatarIndex": 9, "alive": false }
    ]
  }
}
```

## 4) Socket Connection

Client connect:
```ts
io(API_ORIGIN, {
  path: '/socket.io',
  auth: { token: 'jwt-token' },
  transports: ['websocket']
})
```

Server emits `socket:error` for domain errors.

Example:
```json
{
  "code": "ROOM_NOT_FOUND",
  "message": "Room does not exist"
}
```

## 5) Socket Events (All Gameplay)

## 5.1 Lobby-level Events

### Client -> Server: `lobby:subscribe`
Subscribe realtime room counters/list updates.

Payload:
```json
{ "mode": "majority_die" }
```

### Server -> Client: `lobby:rooms_updated`
Incremental room list update.

Payload:
```json
{
  "mode": "majority_die",
  "rooms": [
    {
      "id": "room_abc123",
      "name": "Lunch Revenge",
      "status": "waiting",
      "players": 8,
      "stake": 160,
      "entryStake": 20,
      "updatedAt": 1773001011
    }
  ]
}
```

## 5.2 Room Lifecycle Events

### Client -> Server: `room:join`
```json
{ "roomId": "room_abc123" }
```

### Server -> Client: `room:joined`
```json
{
  "room": {
    "id": "room_abc123",
    "status": "waiting",
    "hostUserId": "u1",
    "mode": "majority_die",
    "stake": 160,
    "entryStake": 20
  },
  "you": {
    "userId": "u2",
    "displayName": "B",
    "avatarIndex": 9,
    "alive": true
  }
}
```

### Server -> Room: `room:state`
Canonical room state broadcast (after join/leave/start/stage resolve).

```json
{
  "roomId": "room_abc123",
  "status": "waiting",
  "stage": 0,
  "players": [
    { "userId": "u1", "displayName": "A", "avatarIndex": 3, "alive": true },
    { "userId": "u2", "displayName": "B", "avatarIndex": 9, "alive": true }
  ],
  "updatedAt": 1773001020
}
```

### Client -> Server: `room:leave`
```json
{ "roomId": "room_abc123" }
```

### Client -> Server: `room:start`
Host only. No auto-start timer.

```json
{ "roomId": "room_abc123" }
```

### Server -> Room: `room:started`
```json
{
  "roomId": "room_abc123",
  "status": "playing",
  "stage": 1,
  "stageEndsAt": 1773001050
}
```

## 5.3 Gameplay Events (Mode: `majority_die`)

Choice values:
- `left`
- `right`

### Client -> Server: `game:submit_choice`
```json
{
  "roomId": "room_abc123",
  "stage": 1,
  "choice": "left"
}
```

Rules:
- One submission per player per stage.
- Duplicate submit returns `ALREADY_SUBMITTED`.
- Dead players cannot submit.

### Server -> Room: `game:choice_ack`
(Private ack to submitter, optional)

```json
{
  "roomId": "room_abc123",
  "stage": 1,
  "accepted": true,
  "submittedAt": 1773001041
}
```

### Server -> Room: `game:stage_countdown`
```json
{
  "roomId": "room_abc123",
  "stage": 1,
  "secondsLeft": 5
}
```

### Server -> Room: `game:stage_resolved`
```json
{
  "roomId": "room_abc123",
  "stage": 1,
  "pickCount": { "left": 5, "right": 3 },
  "minoritySide": "right",
  "eliminatedUserIds": ["u1", "u3", "u4", "u6", "u8"],
  "survivorUserIds": ["u2", "u5", "u7"],
  "reason": "minority_survive",
  "resolvedAt": 1773001051
}
```

`reason` values:
- `minority_survive`
- `tie_replay` (left == right)
- `single_side_replay` (everyone same side)

### Server -> Room: `game:auto_choice_applied`
For AFK players at timeout.

```json
{
  "roomId": "room_abc123",
  "stage": 1,
  "userId": "u9",
  "avatarIndex": 11,
  "choice": "right",
  "auto": true
}
```

### Server -> Room: `game:finished`
```json
{
  "roomId": "room_abc123",
  "mode": "majority_die",
  "winners": [
    { "userId": "u2", "displayName": "B", "avatarIndex": 9 }
  ],
  "losers": [
    { "userId": "u1", "displayName": "A", "avatarIndex": 3 },
    { "userId": "u3", "displayName": "C", "avatarIndex": 12 }
  ],
  "pot": 160,
  "payouts": [
    { "userId": "u2", "displayName": "B", "avatarIndex": 9, "amount": 160 }
  ],
  "endedAt": 1773001100
}
```

## 6) Server Validation Rules
- Must be authenticated to connect socket and call REST.
- `room:start` only host and only when status is `waiting`.
- Minimum players to start: `2`.
- Stake lock happens at game start (not at room create).
- If user has insufficient balance at start, server rejects start with `INSUFFICIENT_BALANCE`.
- On disconnect during stage, player remains in room; if timeout reached without submit, apply auto-choice.
- Endgame payout must be idempotent (never pay twice).

## 7) Error Codes (Suggested)
- `UNAUTHORIZED`
- `ROOM_NOT_FOUND`
- `ROOM_NOT_JOINABLE`
- `NOT_ROOM_HOST`
- `ALREADY_IN_ROOM`
- `ALREADY_SUBMITTED`
- `PLAYER_ELIMINATED`
- `INVALID_STAGE`
- `INSUFFICIENT_BALANCE`
- `GAME_ALREADY_FINISHED`
- `INTERNAL_ERROR`

## 8) FE Integration Checklist
- Lobby page:
  - Initial list via `GET /multiplayer/rooms`
  - Live updates via `lobby:subscribe` + `lobby:rooms_updated`
- Room page:
  - Snapshot via `GET /multiplayer/rooms/:roomId`
  - Join with `room:join`
  - Host start with `room:start`
  - Submit with `game:submit_choice`
  - Render by `room:state`, `game:stage_resolved`, `game:finished`

## 9) Versioning
- This file defines `v1` contract for multiplayer mode.
- If payload shape changes, bump to `v2` and keep event names backward-compatible where possible.
