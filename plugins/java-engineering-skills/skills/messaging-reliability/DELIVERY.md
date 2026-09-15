# Business effects and delivery

## Idempotent consumption

Use a stable identity scoped to the logical operation and consumer. When the
effect is entirely in one transactional database, commit its deduplication
record and business change in the **same transaction**:

```text
begin transaction
  claim unique (consumer, message_id), retaining payload identity as needed
  if already committed: verify duplicate semantics; do not repeat the effect
  otherwise: apply business change and record the outcome
commit transaction
acknowledge message / advance the eligible offset
```

The uniqueness constraint must arbitrate concurrent deliveries; checking then
inserting without it races. Use the database's supported conflict handling:
on PostgreSQL, blindly catching a constraint error and continuing in the same
aborted transaction is not sufficient. A reused key with different business
content requires an explicit conflict policy. Retain identities long enough
for the allowed redelivery/replay window.

A Redis deduplication flag before a SQL update introduces a loss window if the
process dies between them. A flag afterward leaves a duplicate window. For an
external side effect, use an idempotency key enforced by that system or a
reconcilable durable workflow; local flags cannot supply remote atomicity.

Source: [PostgreSQL INSERT conflict handling](https://www.postgresql.org/docs/current/sql-insert.html).

## Publish with database changes

Writing business data and publishing to a broker are separate commits unless
a proven transaction protocol covers both. For a local database transaction,
store an outbox event with the business change, then relay committed rows using
a managed polling or CDC process. The relay can publish again after a lost
confirmation; consumers must tolerate duplicates.

Specify relay ownership, checkpoints, recovery after a crash, outbox retention,
lag monitoring, and per-entity ordering. A framework after-commit callback is
not durable delivery: the process may die before it sends, and the database
cannot be rolled back after it has committed.

Source: [Debezium outbox event router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html).

## Retry, order, and replay

Classify transient, permanent, and ambiguous failures. Use bounded attempts,
backoff/jitter, total time limits, and durable failure disposition. An immediate
requeue loop can saturate the system. Dead-letter routing needs monitoring,
ownership, and a controlled replay policy; moving a message there is not the
completion of its business effect.

Define ordering per key/partition/group. Parallel handlers, retry topics, and
dead-letter detours can reorder effects even if the original queue was ordered.
Handle stale event versions or serialize the required scope. Keep enough schema
compatibility to replay retained data, and make replay use the same idempotency
contract rather than bypass it for convenience.

Verify the disposition of every failed message and the growth bounds on in-flight
work, queues, and retry retention. Backpressure must reach the producer or
admission point that can actually slow the workload.
