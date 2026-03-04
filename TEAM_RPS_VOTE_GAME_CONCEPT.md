# Team RPS Vote Game Concept (v1)

## Overview
- Team-based multiplayer mini game for P23 Market.
- Players choose team `A` or `B` while room is `waiting`.
- Match format is `Best of 3` (first team to 2 round wins).
- Each round, every player votes `rock|paper|scissors` at the same time.

## Core Rules
1. Mode: `team_rps_vote`
2. Exactly 2 teams: `A`, `B`
3. Team selection is allowed only when room status is `waiting`.
4. Start conditions:
- total players `>= 4`
- total players must be even
- `team A size == team B size`
5. Input time per round: fixed `15 sec`
6. If player does not submit in time, system applies `auto-pick`.
7. Team representative choice is decided by team majority vote.
8. Team representative choices use normal RPS resolution.
9. If round result is draw, score does not change and next round starts.
10. Match winner is first team to reach 2 round wins.

## Team Vote Tie-Break (Inside Team)
- If team vote counts are tied (example `2-2-0`), server applies deterministic tie-break by selecting one choice from `{rock,paper,scissors}`.
- Result payload must include `teamVoteTieBreak` flag per team for transparency.

## Economy
- `entryStake` = stake per player
- `stake` = total room pot (sum of all joined players)
- Winning team splits total pot equally among all members.
- If system cannot determine a valid final winner due to abnormal condition, fallback is `refund all`.

## Timeout / Reliability
- Round always waits until timer ends, even if all players submit early.
- Disconnect during round does not remove player from room automatically.
- If disconnected player has no submission by timeout, server uses auto-pick.

## Suggested Limits (v1)
- Min players: `4`
- Max players: `10`
- Teams must be equal at start.

## Error Cases
- odd player count on start
- unequal team sizes on start
- submit after round closed
- duplicate submit in same round
- choose team after game started

## Open Decisions
- None for v1.
