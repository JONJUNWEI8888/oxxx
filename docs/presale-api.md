# Presale API

The homepage reads `GET /api/presale` about every 15 seconds. `raised` is **not** the raw USDT balance of the receiving address. It is the sum of BEP-20 `Transfer` events **into** that address, after 15 BSC confirmations, from the Postgres ledger.

Until the indexer has scanned history, `raised` is `0` and `synced` is `false`. Run the backfill before pointing traffic at this response. The existing homepage only reads `raised` and `updatedAt`; extra fields are ignored.

`GET /api/presale/subscribers/{address}` is the wallet lookup for a "my subscription" view. An unknown wallet is `200` with a zero total, not `404`.

Both routes are cached for about 10 seconds (in-process, Vercel Runtime Cache when available, and `s-maxage=10` at the CDN) and rate limited per IP (30/min for the total, 20/min for an address). `429` responses include `Retry-After`.

## `GET /api/presale`

```json
{
  "raised": 1500,
  "raisedRaw": "1500000000000000000000",
  "decimals": 18,
  "updatedAt": 1762200000000,
  "ledgerUpdatedAt": "2026-11-03T00:00:00.000Z",
  "hardCapUsdt": 30000000,
  "priceUsdt": 1,
  "roundSupply": 21000000,
  "progress": 0.00005,
  "progressPercent": 0.005,
  "subscriberCount": 1,
  "receivingAddress": "0xa7304d9e5183f6482a2084c417e44bb84a888888",
  "usdtContract": "0x55d398326f99059ff775485246999027b3197955",
  "chainId": 56,
  "confirmationThreshold": 15,
  "indexedBlock": 12345678,
  "indexedBlockHash": "0x…",
  "indexedBlockTime": "2026-11-03T00:00:00.000Z",
  "startBlock": 10000000,
  "ready": true,
  "synced": true,
  "source": "ledger"
}
```

| Field | Use |
| --- | --- |
| `raised` | Progress bar numerator, in USDT. Same field the homepage already uses. A JS number, so use `raisedRaw` if you sum exact wei. |
| `raisedRaw` | Exact base-unit total (`decimals` is 18). |
| `updatedAt` | Unix ms when this payload was computed. The homepage chart uses it as the point timestamp. It stays still for the cache TTL (~10s). |
| `ledgerUpdatedAt` | Block time of the latest credited transfer, or `null`. |
| `hardCapUsdt` | Presale target (30,000,000). |
| `priceUsdt` | Token price in USDT (currently 1). |
| `roundSupply` | Round token supply figure from `lib/presale.ts`. |
| `progress` | `raised / hardCapUsdt`. Not capped at 1. |
| `progressPercent` | `progress * 100`. Not capped at 100. The homepage computes its own percent from `raised` and the hard cap; either is fine. |
| `subscriberCount` | Distinct `from` addresses with a credited transfer. |
| `receivingAddress` | Presale USDT receiver. Checksums are not preserved; compare case-insensitively. |
| `usdtContract` | BSC-USD. |
| `chainId` | 56 (BSC). |
| `confirmationThreshold` | 15. Transfers newer than this are absent. |
| `indexedBlock` | Last block included in the cursor. `null` before the first run. |
| `indexedBlockHash` | Canonical hash stored for that block. |
| `indexedBlockTime` | Same instant as `ledgerUpdatedAt`. |
| `startBlock` | First block the indexer was configured to scan. |
| `ready` | The cursor has reached at least `startBlock`. |
| `synced` | A run has caught up to `head - 15`. While `false`, `raised` is a partial backfill. |
| `source` | Always `ledger`. |

Errors: `503` `{ "error": "Unable to read on-chain balance", "code": "ledger_unavailable" }` when Postgres is down or `DATABASE_URL` is missing (the homepage already treats non-200 as "unavailable"). `429` `{ "error": "rate_limited" }`.

## `GET /api/presale/subscribers/0xabc…?limit=50`

`limit` defaults to 50 and caps at 100. The address must be `0x` plus 40 hex characters.

```json
{
  "address": "0xabc…",
  "total": 10.5,
  "totalRaw": "10500000000000000000",
  "decimals": 18,
  "contributionCount": 2,
  "truncated": false,
  "contributions": [
    {
      "txHash": "0x…",
      "logIndex": 4,
      "amount": 10.5,
      "amountRaw": "10500000000000000000",
      "blockNumber": 12345000,
      "blockHash": "0x…",
      "blockTime": "2026-11-03T00:00:00.000Z",
      "confirmations": 40
    }
  ]
}
```

`total` / `totalRaw` include every credited transfer for that wallet. `contributions` is the newest page. `truncated` is true when `contributionCount` is greater than `limit`. `confirmations` is refreshed for stored rows on each indexer run (`head - blockNumber` at that moment).

`400` `{ "error": "invalid_address" }` for a bad address.

## What the total does not include

- Transfers that do not yet have 15 confirmations.
- Transfers before `PRESALE_INDEX_START_BLOCK` (or before the safe head, if that variable was unset on the first run).
- USDT sent **out** of the receiving address does not reduce `raised`. Those transfers are stored as `outbound` and subtracted only in the daily reconciliation, so a sweep of the address still matches the on-chain balance change.

Admin listing and CSV export live on the admin service (`GET /api/v1/presale/subscriptions`), not on this public route.
