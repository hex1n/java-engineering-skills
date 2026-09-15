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
