# Highest Unique Number Game Concept (Draft)

## Overview
- Multiplayer game where each player secretly selects one number.
- Winner is the player who picked the **highest number that no one else picked**.
- If no unique number exists, round is draw/refund by rule.

## Core Rule
1. All joined players submit a number in the allowed range.
2. Server counts frequency of each number.
3. Keep only numbers with frequency `1` (unique picks).
4. Highest value among unique numbers is winner.
5. If there is no unique number, no winner in that round.

## Suggested Parameters (v1)
- Number range: fixed globally at `1..9`
- Submission window: fixed at `15 sec`
- Minimum players: `3`
- Maximum players: `10`
- Single-round resolution (no elimination stages)
- Round always waits until timer ends, even if all players submitted early.

## Tie / No-Winner Cases
- Same number picked by multiple players: those picks are invalid for winning.
- If all numbers are duplicated (no unique number):
  - Draw + refund all stakes.

## Timeout Rule
- If a player does not submit before timeout, server auto-picks random number in range.
- Auto-pick must be logged in result payload for transparency.

## Example
Players pick:
- A: 9
- B: 9
- C: 8
- D: 6

Frequency:
- 9 => 2 (not unique)
- 8 => 1 (unique)
- 6 => 1 (unique)

Winner:
- `8` is highest unique number => **C wins**.

## Payout Proposal (v1)
- Pot = stake of all players in room.
- If one winner: winner takes all pot.
- If draw (no unique number): refund all stakes.

## Fairness / Validation
- Server-authoritative resolution only.
- One submission per player.
- Reject out-of-range numbers.
- Reject duplicate submission from same player.
- Result and payout must be idempotent.

## Socket Event Sketch (Optional)
- `game:submit_number` `{ roomId, stage, number }`
- `game:number_ack` `{ accepted, submittedAt }`
- `game:round_resolved` `{ picks, uniqueNumbers, winnerUserId?, winningNumber?, draw }`
- `game:finished` `{ winners, losers, payouts, endedAt }`

## Open Decisions
- None for v1.
