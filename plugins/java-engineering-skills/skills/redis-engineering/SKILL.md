---
name: redis-engineering
description: Redis caching, TTL semantics, atomic scripts, and distributed locks (leases, Redisson, SET NX) in backend services. Use for cache consistency, miss storms, TTL lost on write, or lock ownership under expiry and failover, including asks phrased as 缓存一致性, 缓存击穿, 缓存雪崩, or 分布式锁.
---

# Redis Engineering

Establish the actual Redis server version, topology, persistence/replication
settings, and Java client/framework versions before choosing commands or APIs.
A Redis feature's availability is independent of the project's Java release.

## Choose the relevant contract

1. Write the contract in three lines: the source of truth, the staleness
   budget, and what the caller sees when the key is missing, stale, or the
   server is down. Done when each line names a table, a key pattern, or a
   code path.
2. Classify the use. An optimization (duplicate fills, contention) may rely on
   Redis alone; an invariant (duplicate settlement, a quota) needs a database
   constraint or a fencing token. Done when the use is named as one or the
   other, with the constraint or token named for an invariant.
3. Read the matching reference: cache freshness, invalidation, misses, and
   outages → [CACHE.md](CACHE.md); counters, scripts, transactions, leases,
   stale owners, and Redisson locks →
   [ATOMICITY-AND-LOCKS.md](ATOMICITY-AND-LOCKS.md); key/schema design,
   serialization, cluster behavior, and bounded operations →
   [OPERATIONS.md](OPERATIONS.md).

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

## Report

Close with one report in three parts, worded the same in every skill of this
plugin so that a task loading several skills still produces one report:
**Conclusion** (the answer or change and the conditions it holds under),
**Verified** (what was run or observed, with versions), and **Not verified**
(assumptions and remaining checks, each with the step that would settle it).
Put this skill's report items into those parts rather than adding sections. A
short answer can give each part in a sentence; leave out a part with nothing
in it.
