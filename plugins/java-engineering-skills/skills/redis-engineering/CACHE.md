# Cache consistency and availability

## Cache-aside contract

Document the source of truth, freshness budget, key scope, and whether cached
absence is distinct from a miss. For a write, coordinate invalidation with the
successful source-of-truth commit. A reader may still refill stale data:

```text
reader misses -> reader reads database version 1
writer commits version 2 -> writer invalidates cache
reader caches version 1 after invalidation
```

Deleting after commit alone does not exclude this timeline. Select a bounded
staleness policy, version-aware fill/invalidation, or a stronger read/write
protocol from the actual requirement. An arbitrary delayed second delete is
not a proof that all late readers have finished. A process can also die between
database commit and invalidation; durable invalidation is an outbox or CDC
problem (messaging-reliability).

The interleaving above is an ordering analysis, not a cited fact; the pattern
reference covers the general contract and the opposite hazard of removing the
cached item before the store is updated.
Source: [Cache-aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside).

## Stampedes and negative caching

A stampede is many callers filling the same missing key at once. Inside one
process, coalesce the fills on a per-key lock or a loading cache's
`computeIfAbsent`; across instances, take a bounded lease from
[ATOMICITY-AND-LOCKS.md](ATOMICITY-AND-LOCKS.md) and serve the stale value or
the database read while another holder fills. Apply expiry jitter to spread
bulk expiration; it does not solve one exceptionally hot key.

Represent negative results explicitly with a suitable shorter freshness window,
and invalidate them when the resource is created. Scope keys by tenant and
authorization-relevant dimensions; a cached object must not leak one caller's
view to another. Treat untrusted key cardinality and payload size as capacity
inputs. Bloom filters, refresh-ahead, and local caches need their own update
and false-positive/staleness assumptions rather than automatic adoption.

## Redis unavailable

Choose fail-open, fail-closed, or bounded stale service from the operation's
contract. Direct database fallback can amplify an outage into database overload;
retain admission limits and a total deadline. Cache errors must be observable
without recording credentials or full sensitive payloads.

Measure hit/miss rates alongside latency, fill concurrency, evictions, stale
reads, and fallback pressure. A high hit rate alone does not show correctness.
Source: [Redis key eviction](https://redis.io/docs/latest/develop/reference/eviction/).
