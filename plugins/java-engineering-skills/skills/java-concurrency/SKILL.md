---
name: java-concurrency
description: In-process Java concurrency, shared state, JVM locks, executors, CompletableFuture, and cancellation. Use for race conditions, deadlocks, or thread-pool saturation inside one JVM; row locks belong to database-transactions and Redis leases to redis-engineering.
---

# Java Concurrency

Start with the invariant and ownership: which state is shared, which operations
must appear atomic, and which thread owns task completion or cancellation.
Resolve the module's effective Java release before selecting APIs. The baseline
guidance applies to Java 8; virtual threads require stable Java 21.

## Select the relevant mechanism

- For visibility, concurrent containers, compound updates, lock choice, and deadlocks, read
  [STATE-AND-LOCKS.md](STATE-AND-LOCKS.md).
- For executors, futures, deadlines, task context, and virtual threads, read
  [TASKS.md](TASKS.md).

1. List every shared field and every path that reads or writes it: callers,
   callbacks, scheduled tasks, shutdown hooks.
2. For each invariant over those fields, write the happens-before edge or the
   single atomic operation that protects it, and the monitor, lock, or atomic
   that every listed path uses. Done when every path has a row; a path
   without one is the defect or the next test.

Use thread confinement or immutable published state when practical. Choose
locks/atomics for the remaining requirement, preserving interruption, failure,
and lifecycle behavior. JVM-local synchronization cannot protect state changed
by other application instances.

## Verify the property

Construct controlled competing operations using latches/barriers and bounded
waits. Assert the invariant, task outcome, and termination; arbitrary sleeps
are not evidence that a race is absent. For saturation, exercise queue capacity,
rejection, and shutdown. For a performance claim, measure the relevant workload
and contention rather than infer speed from a primitive's name.

Report the interleaving or overload condition addressed, tests executed, and
remaining assumptions. For a memory-model claim, run the interleaving under
jcstress; for a throughput or contention claim, measure with JMH or a sampling
profiler on the real workload and report the numbers with the tool and
configuration used.
