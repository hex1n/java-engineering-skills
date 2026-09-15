---
name: redis-engineering
description: Design, implement, or diagnose Redis caching, atomic operations, expiration, and distributed leases in backend services. Use for cache consistency, stampedes, Redis contention, or Redis-backed coordination.
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

Identify the authoritative data store, acceptable staleness, and the effect
of losing Redis state. Distinguish an optimization such as suppressing duplicate
cache fills from enforcing a business invariant such as preventing duplicate
settlement. Choose a mechanism that remains correct under the stated failure
model; a cache lock alone does not create a database transaction.

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
