# Atomic operations and leases

## Atomicity is scoped

Use a single command where it expresses the operation. Use a short script or
`WATCH`/`MULTI`/`EXEC` when dependent decisions need one server-side operation.
Pipelining reduces round trips but does not make a group of commands atomic.

Redis transactions do not roll back successful commands after a runtime command
error. A Lua script runs without command interleaving, but a later error also
does not undo earlier writes. Validate arguments/types before mutation and
handle individual transaction replies. After a connection failure, determine
whether retrying could duplicate an already-applied increment or side effect.

Sources: [Redis transactions](https://redis.io/docs/latest/develop/using-commands/transactions/),
[Lua execution](https://redis.io/docs/latest/develop/programmability/eval-intro/),
[Pipelining](https://redis.io/docs/latest/develop/using-commands/pipelining/).

## Lease ownership

A basic single-instance lease acquires the key and expiration together:

```text
SET resource:lease unique-owner-token NX PX lease-milliseconds
```

Proceed only on confirmed acquisition. Release with an atomic owner comparison,
using the deployed server/client's supported mechanism. A compatible Lua form:

```lua
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
end
return 0
```

Separate `GET` then `DEL` is racy. Use a unique token per acquisition, not only
per process. Renewal must also verify the current owner atomically.

This token identifies the owner; it is **not a fencing token**. A paused owner
can resume after expiration while a successor holds the lease. If the protected
resource must reject stale writes, it must enforce a monotonically ordered
fencing token or another atomic version/uniqueness condition. Tokens merely
logged or checked in Redis do not fence an external database/API.

Asynchronous replication/failover, pauses, clock behavior, and renewal failure
belong in the safety argument. A watchdog does not prove perpetual ownership.
Redis-based coordination can reduce contention while a database constraint
enforces correctness. Do not describe a distributed lock algorithm as universally
safe without specifying its failure assumptions and resource enforcement.

Source: [Redis distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/).

## Verification scenarios

- Acquisition times out after the server may have accepted it: no unconfirmed
  owner starts protected work; recovery does not delete a successor's lease.
- Owner A pauses past expiry; B acquires and writes; A resumes. Verify how the
  protected resource rejects A when stale writes are forbidden.
- A transaction/script has a runtime error after an earlier write. Verify the
  actual partial state and recovery instead of assuming rollback.
