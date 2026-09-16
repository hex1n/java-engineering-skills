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

Renewal fails in two shapes. A lease renewed by a client-side watchdog stops
extending when that client pauses or loses its connection; a lease taken with
an explicit expiry is never extended at all and ends under a holder that is
still working. Name which shape the code is in and how the protected write is
rejected after loss; asynchronous replication and failover add a third path
where two holders exist at once. Redis-based coordination reduces contention
while a database constraint enforces correctness, so state the failure
assumptions and the resource-side enforcement with every lock design.

Source: [Redis distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/).

## Redisson locks

The documented contract, when the project uses this client:

- `lockWatchdogTimeout` (30 s by default) applies only to a lock acquired
  **without** a lease time; with an explicit lease, "after specified time
  interval locked lock will be released automatically". The renewal interval
  is an implementation detail, not a documented promise.
- Only the owning thread may unlock, or `IllegalMonitorStateException` is
  thrown. After the lease has expired the lock no longer exists, so a bare
  `finally { lock.unlock(); }` throws from the finally block and replaces the
  business exception. Guard it with `isHeldByCurrentThread()`.
- In the async, reactive, and RxJava APIs "a single logical operation may run
  across more than one thread, so the thread that acquires a lock may not be
  the one that releases it": capture the thread id once and pass it to
  `lock`, `tryLock`, and `unlock`.
- These locks are advisory and their safety "depends on the deployment
  topology". `checkLockSyncedSlaves` is on by default: when replicas do not
  acknowledge within `slavesSyncTimeout` (1000 ms), Redisson releases the lock
  and the acquisition fails, which reads like contention rather than
  replication lag.
- `RedLock` is deprecated (since 3.12.5) in favor of a plain lock with the
  replica check, and `RFencedLock` where the protected resource can verify a
  monotonic token; `MultiLock` is not deprecated.

Sources: [Redisson locks](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/),
[Redisson configuration](https://redisson.pro/docs/configuration/).

## Verification scenarios

- Acquisition times out after the server may have accepted it: no unconfirmed
  owner starts protected work; recovery does not delete a successor's lease.
- Owner A pauses past expiry; B acquires and writes; A resumes. Verify how the
  protected resource rejects A when stale writes are forbidden.
- A transaction/script has a runtime error after an earlier write. Verify the
  actual partial state and recovery instead of assuming rollback.
