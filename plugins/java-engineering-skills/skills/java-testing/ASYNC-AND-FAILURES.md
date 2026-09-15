# Asynchronous checks and failure schedules

## Wait for evidence

Use a completion signal or bounded polling of the observable result. A fixed
sleep proves elapsed time, not task completion. Polling predicates should be
side-effect-free and report the last observed state on timeout. Inject a
business clock for expiry rules; keep real bounded waits for thread progress.

Use latches/barriers to expose the relevant interleaving: all contenders read,
one writer commits, a lease expires, or a delivery is acknowledged. A barrier
controls ordering only at its placement; it does not prove every interleaving.
Bound each wait and release blocked workers in `finally` so a failed assertion
does not strand the test runner.
[CountDownLatch semantics](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/CountDownLatch.html).

Observe submitted task results with `Future.get` or the project's equivalent;
exceptions on background workers must fail the test. A wait timeout or a
cancel request does not prove work stopped. After failure, stop new admission,
release test barriers, request cancellation where supported, and verify owned
executors/processes terminate before removing their fixtures.
[Future cancellation](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/Future.html).

For absence claims, define the window and terminal condition: “no duplicate
after both deliveries completed” is stronger than “count was one once.” If
late work can still run, a momentary assertion cannot establish no side effect.

## Fault boundaries worth testing

Select the boundaries that support the requested guarantee:

| Injection point | Observable assertion |
|---|---|
| Mutation before transaction commit | Failed transaction leaves no committed partial effect |
| Commit completed, response lost | Retry reconciles by stable identity; effect remains singular |
| Publish accepted, acknowledgement lost | Duplicate delivery is safe; durable pending work remains recoverable |
| Worker finishes out of order | Progress marker never skips unfinished work |
| Timeout while dependency still works | Late completion follows the declared cancellation/idempotency contract |
| Two instances contend | Database/broker/shared-store invariant holds across independent owners |

Inject failures at known boundaries, using service hooks or a controlled test
proxy where available. A thrown mock exception can test the caller branch;
it does not reproduce a server commit followed by a dropped response. Label
simulated and real-service evidence separately.

## Flaky-test repair

First preserve the failure, seed, timing, and environment. Classify shared
state, clock dependence, uncontrolled ordering, resource leaks, and actual
product races. Rerunning until green hides the frequency; use bounded repeats
only to reproduce or estimate it. Repair the cause and verify the original
counterexample. Quarantine, if needed, records an owner and missing coverage
rather than silently turning failure into success.
