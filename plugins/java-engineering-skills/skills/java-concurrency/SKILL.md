---
name: java-concurrency
description: Implement or diagnose Java shared-state concurrency, locks, executors, asynchronous composition, and cancellation. Use for race conditions, deadlocks, thread-pool saturation, or concurrent task design.
---

# Java Concurrency

Start with the invariant and ownership: which state is shared, which operations
must appear atomic, and which thread owns task completion or cancellation.
Resolve the module's effective Java release before selecting APIs. The baseline
guidance applies to Java 8; virtual threads require stable Java 21.

## Select the relevant mechanism

- For visibility, compound updates, lock choice, and deadlocks, read
  [STATE-AND-LOCKS.md](STATE-AND-LOCKS.md).
- For executors, futures, deadlines, and virtual threads, read
  [TASKS.md](TASKS.md).

Inspect callers, synchronization already in use, and representative failure
evidence before changing a primitive. State the happens-before relationship
or atomic operation that protects each shared invariant. Coordinate all access
paths; adding a lock to only the writer does not protect an unlocked reader.

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
remaining assumptions. Stress tests can expose defects but cannot prove all
possible schedules correct. Use existing concurrency testing/profiling tools
when a difficult memory-model or performance question warrants them.
