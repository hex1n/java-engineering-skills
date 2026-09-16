# Shared state and locks

## Visibility and atomicity

`volatile` establishes visibility/order for a field, not atomicity for
read-modify-write operations such as `count++` or an invariant across fields.
Publish a fully constructed immutable snapshot when readers need a consistent
configuration. `final` references do not make referenced objects immutable.

For an independent counter, an `AtomicLong` can provide atomic increments.
For `available >= reservation` followed by a deduction, use a correct CAS loop
or one lock over the entire check-and-update operation. A concurrent map does
not make a sequence of map calls, or mutable values stored inside it, atomic.
Use `LongAdder` for contended statistical accumulation when its non-atomic
aggregate observation fits; it is not a ticket allocator or quota guard.

Sources: [JLS happens-before and final fields](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html),
[Java 8 LongAdder](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/atomic/LongAdder.html).

## Concurrent containers and observation

Choose a container from the required operation, not merely its thread-safe
label. ConcurrentHashMap supports atomic operations at their documented scope;
`size() < limit` followed by insertion still is not atomic admission. Its
iteration can reflect concurrent changes and does not provide a whole-map
snapshot. If a cross-key invariant or consistent report is required, establish
one synchronization/snapshot protocol followed by all participants.

A map computation callback "should be short and simple, and must not attempt
to update any other mappings of this map". Recursive updates can hang or
throw `IllegalStateException`; the API promises the exception only for
detectable recursive updates that would otherwise never complete. Later
JDKs still permit deadlock when two callbacks each wait for a bin held by
the other. Keep callbacks free of updates to the same map, and investigate
the actual call structure and JDK implementation when diagnosing a hang.
Blocking remote work inside one can block competing updates too. Mutable
values need separate protection. For producer/consumer work, use an explicitly
bounded queue and choose `offer`, timed `offer`, or `put` from the caller's
blocking/rejection contract. Test full queues and failed consumers; BlockingQueue
has no universal close operation, so define termination and unblock ownership.

Sources: [Java 8 ConcurrentHashMap](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ConcurrentHashMap.html),
[Java 8 BlockingQueue](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/BlockingQueue.html).

Implementation reference: [OpenJDK 21 ConcurrentHashMap](https://github.com/openjdk/jdk/blob/jdk-21%2B35/src/java.base/share/classes/java/util/concurrent/ConcurrentHashMap.java).

## Choose a lock from requirements

| Requirement | Candidate | Constraint to verify |
|---|---|---|
| Short, scoped mutual exclusion | `synchronized` | All access uses the same monitor; avoid external calls while holding it. |
| Interruptible/timed acquisition or multiple conditions | `ReentrantLock` | Release in `finally` only after successful acquisition. |
| Measured benefit from concurrent readers | `ReentrantReadWriteLock` | Writer progress and upgrade behavior; read-mostly alone does not establish a gain. |
| Very short optimistic reads with validation | `StampedLock` | Non-reentrant; copy fields, validate, and retry under a read lock before using inconsistent results. |
| Bound simultaneous use of a scarce resource | `Semaphore` | Release exactly acquired permits; this is not ownership-based mutual exclusion. |

For interruptible locking, Java 8-compatible code:

```java
lock.lockInterruptibly();
try {
    updateProtectedState();
} finally {
    lock.unlock();
}
```

For `tryLock`, enter the protected block and release only if the returned value
is true. Wait for a condition in a loop that checks the predicate while holding
the lock; waking does not establish the predicate. Interruption must terminate,
propagate, or be restored when translated according to the caller's contract.

Sources: [ReentrantLock](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/locks/ReentrantLock.html),
[StampedLock](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/locks/StampedLock.html),
[Condition](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/locks/Condition.html).

## Deadlock and contention

Establish one lock order for operations acquiring multiple locks, including
callbacks and database work beneath the Java call. Keep network I/O and
uncontrolled callbacks outside critical sections where the invariant allows.
Avoid waiting for work scheduled onto the same saturated executor while holding
resources that work needs. A timeout helps recovery only if acquired resources
are released and the partially performed operation has defined semantics.

Upgrading from the read lock to the write lock of a `ReentrantReadWriteLock`
is not possible: a thread that requests the write lock while holding the read
lock never succeeds. Release, acquire, and recheck the state if that protocol
fits; downgrading write to read by taking the read lock before releasing the
write lock is supported. Fairness can affect throughput and does
not provide a business-level latency guarantee.

Source: [ReentrantReadWriteLock](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/locks/ReentrantReadWriteLock.html).
