# Redis data and operational contracts

## Keys and values

Define namespace, tenant scope, value schema, TTL, maximum size, and who may
write/delete a key. Redis is not a Java object heap: changing a serializer or
class layout can make existing values unreadable by another deployment.
Choose an explicit compatible encoding and a rolling migration strategy;
keep unknown/untrusted payload handling bounded.

Inspect the actual client connection/pooling contract before sharing or closing
connections. Blocking commands and transaction state can require dedicated
connections even when ordinary calls support sharing. Do not infer client
thread safety from Redis server command serialization.

## Expiration during writes

Decide whether each write preserves, replaces, or removes the key's TTL.
Plain successful `SET` discards an existing expiration; use an explicit expiry
for a fresh lifetime or version-supported `KEEPTTL` when preserving it is the
contract. `KEEPTTL` requires Redis 6.0+ and does not give a persistent/new key
an expiration. `INCR` preserves an existing TTL but does not expire a new counter.
Inspect actual client overloads instead of assuming a Java object's TTL follows
its value automatically. A per-entry TTL inside a hash is a client feature, not
a server one: Redisson's `RMapCache` states that "entry expiry feature is not
supported by Redis or Valkey", needs Redisson itself to evict, and starts that
eviction task "once per unique object name at the moment of getting Map
instance", with a passive path that only runs on access through Redisson, so
expiry depends on some client holding that map and a raw client still reads
entries Redisson considers expired. Use a
key-level TTL, or the client's server-side variant where the deployed server
supports hash-field expiration. A Spring `CacheManager` backed by this client
takes TTL and max-idle per cache name in its own configuration and "stores data
infinitely if they are not defined or equal to `0`", so an explicit `0` and a
new `@Cacheable` name without a matching entry both never expire.

Sources: [Redisson FAQ](https://redisson.pro/docs/faq/),
[Redisson collections](https://redisson.pro/docs/data-and-services/collections/),
[Redisson Spring integration](https://redisson.pro/docs/integration-with-spring/#spring-cache).

For a counter with a window, define whether expiry is anchored to a time bucket,
first request, or last activity. `INCR` followed by a separate conditional
`EXPIRE` leaves a failure gap that can create a permanent counter. Use a short
atomic protocol for the required count/expiry decision, validating inputs before
writes; resetting expiry on every increment changes the window. Check retries
after ambiguous completion and loss through eviction/failover separately.
`EXPIRE NX/XX/GT/LT` require Redis 7.0+; newer syntax is not a legacy-server fix.
Test value replacement, missing/persistent keys, repeated increments, and the
failure boundary against the selected server/client.

Sources: [SET and KEEPTTL](https://redis.io/docs/latest/commands/set/),
[EXPIRE update semantics](https://redis.io/docs/latest/commands/expire/),
[INCR expiration gap](https://redis.io/docs/latest/commands/incr/).

## Cluster and scripts

Multi-key operations and scripts commonly require keys in the same Redis Cluster
hash slot. Use deliberate hash tags for a true atomic group, not one global tag
that concentrates the entire workload on a shard. Handle redirects/reconnects
through the supported cluster client; verify failover assumptions separately.

Bound script execution and avoid scans or large loops in atomic scripts.
`EVALSHA` requires handling a missing script cache, including after failover;
verify how the client reloads it and how that interacts with pipelining.

Sources: [Redis Cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/),
[Scripting and script cache](https://redis.io/docs/latest/develop/programmability/eval-intro/).

## Enumeration and capacity

For operational enumeration, use a bounded cursor workflow when suitable.
`SCAN` may return duplicates or an empty batch with a nonzero cursor; continue
until the cursor returns to zero. `COUNT` is a work hint, not a strict result
limit, and scanning changing data is not a consistent snapshot. Cluster-wide
enumeration must cover the appropriate nodes with a topology-change policy.

Avoid treating a scan followed by deletion as transactional selection. Define
idempotent processing, pace requests, and account for large values, eviction
policy, memory headroom, and persistence costs before bulk work.

Sources: [SCAN guarantees](https://redis.io/docs/latest/commands/scan/),
[Redis eviction](https://redis.io/docs/latest/develop/reference/eviction/).
