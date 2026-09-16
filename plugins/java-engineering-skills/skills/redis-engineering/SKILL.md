---
name: redis-engineering
description: Redis caching, TTL semantics, atomic scripts, and leases in backend services. Use for cache consistency, miss storms, TTL lost on write, or lease ownership under expiry and failover.
---

# Redis Engineering

Establish the actual Redis server version, topology, persistence/replication
settings, and Java client/framework versions before choosing commands or APIs.
A Redis feature's availability is independent of the project's Java release.

## Choose the relevant contract

- Cache freshness, invalidation, misses, and outages:
  [CACHE.md](CACHE.md).
- Counters, scripts, transactions, leases, and stale owners:
  [ATOMICITY-AND-LOCKS.md](ATOMICITY-AND-LOCKS.md).
- Key/schema design, serialization, cluster behavior, and bounded operations:
  [OPERATIONS.md](OPERATIONS.md).

1. Write the contract in three lines: the source of truth, the staleness
   budget, and what the caller sees when the key is missing, stale, or the
   server is down.
2. Classify the use. An optimization (duplicate fills, contention) may rely on
   Redis alone; an invariant (duplicate settlement, a quota) needs a database
   constraint or a fencing token from [ATOMICITY-AND-LOCKS.md](ATOMICITY-AND-LOCKS.md).
3. Open the file for that contract. Steps 1 and 2 are done when each line
   names a table, a key pattern, or a code path.

Inspect the existing client configuration, timeouts, serializers, and retry
policy. Preserve key and value compatibility with other producers/consumers.
Use the deployed version's official API documentation before introducing
version-sensitive commands or client methods.

## Verify failure windows

Exercise the relevant timeline: concurrent miss/write/refill, expiration during
work, ambiguous command completion, stale-owner release, failover, or cache
outage. Test with the actual Redis/client topology when claiming integration
behavior; a mocked command response cannot establish lease or cluster safety.
Report command outcomes, residual consistency assumptions, and untested failures.
