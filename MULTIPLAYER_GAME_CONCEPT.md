# Multiplayer Game Concept (Draft)

## Scope
- This document defines the core concept for new multiplayer modes in P23 Market.
- Host controls game start (no auto-start timer).
- All game results and payouts are resolved on server side.

## Shared Room Flow
1. Host creates room with:
- `roomName`
- `gameMode`
- `stake` (M-Coin)
2. Players join while room status is `waiting`.
3. Host presses `Start`.
4. Room locks and game begins.
5. Server resolves result and broadcasts winners/losers.
6. Apply payout and write transaction logs.

## Room Status
- `waiting`: join open, host can start
- `playing`: game action in progress
- `resolved`: result shown
- `closed`: room finished

## Game Mode A: Majority Die (Minority Survival)

### Core Rule
- Each stage, every active player chooses only one side: `Left` or `Right`.
- After reveal, **players in the less chosen side survive**.
- Players in the more chosen side are eliminated.
- Repeat stages until active players `<= 2`.

### Stage Resolution Rules
1. Count `Left` and `Right`.
2. If one side has fewer players, that side survives.
3. If equal count (`Left == Right`), no elimination and replay stage.
4. If everyone picks same side, no minority and replay stage.
5. If a player does not submit before timeout, system auto-selects `Left` or `Right` for that player.

### End Condition
- Stop when survivors `<= 2`.
- Survivors are winners.

### Example
- Stage 1: 8 players -> Left 5, Right 3 -> Right 3 survive.
- Stage 2: 3 players -> Left 1, Right 2 -> Left 1 survives.
- Active players now `1` -> game ends.

## Payout Proposal (v1)
- All players stake into room pot at game start.
- Winners split pot equally.
- If no elimination stage repeats too long, host may cancel and refund all stakes.

## Fairness and Validation
- Random/logic is server-authoritative.
- Clients cannot resolve outcome.
- Host-only start validation.
- Minimum players to start: `2`.
- Reject duplicate submissions per stage.

## Open Decisions
1. If stage keeps tying (equal/same side) many times, should system auto-cancel?
