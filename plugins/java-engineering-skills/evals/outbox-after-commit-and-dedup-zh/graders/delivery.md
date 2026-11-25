---
type: llm
focus: last_message
---

Facts of the task, which you cannot see: Spring Boot 3.2, PostgreSQL 15,
spring-kafka. The order service saves an order in a `@Transactional` method
and publishes `OrderPlaced` (with a random `eventId`) from a
`@TransactionalEventListener(phase = AFTER_COMMIT)` that calls
`kafkaTemplate.send(...)` without waiting on or handling its result. The
producer has `enable.idempotence=true` and `acks=all`. The inventory consumer
calls Redis `setIfAbsent("seen:" + eventId, ...)` first and, only if that
succeeds, runs a `@Transactional` PostgreSQL stock deduction. Some orders never
reach inventory. The team proposes, inside the `@Transactional` `deduct`, to
insert into `processed_event(event_id primary key)` first, catch
`DataIntegrityViolationException` and return on a duplicate, otherwise deduct
in the same transaction.

Pass when all three hold:

1. Producer: an after-commit listener is not durable delivery. A crash or
   restart after the database commit and before the send, or a failed send
   whose result nobody observes, loses the event; idempotence and `acks=all`
   do not cover that gap. The fix stores an outbox row in the same database
   transaction as the order and relays committed rows with a polling relay or
   CDC (for example Debezium); the answer notes the relay can publish a row
   again, so consumers must tolerate duplicates.
2. Consumer today: setting the Redis flag before the database deduction
   leaves a loss window (the flag is set, then the deduction fails or the
   process dies, and the redelivery is skipped), because Redis and PostgreSQL
   cannot commit together.
3. Proposed change: recording the event id in the same database transaction
   as the deduction, arbitrated by the unique key, is the right idea, but
   catching the unique violation and returning inside the same transaction is
   not a clean duplicate path on PostgreSQL: the failed insert aborts the
   transaction (or Spring/JPA marks it rollback-only), so the commit fails or
   rolls back and the duplicate is redelivered or retried instead of being
   acknowledged. The answer uses `INSERT ... ON CONFLICT DO NOTHING` and
   branches on the affected-row count (or an equivalent that does not abort
   the transaction, such as a savepoint), and acknowledges or commits the
   offset only after the database transaction commits. Noting that Spring Data `save()` with an
   assigned id may merge instead of insert, so no violation is raised at all,
   is a valid extra point but not required.

Fail if the answer claims Kafka idempotence, transactions or exactly-once
semantics make the PostgreSQL deduction happen exactly once, keeps the Redis
flag set before the deduction, approves the catch-and-return as correct, or
recommends, as its design, moving the dedup insert into a separate transaction
(`REQUIRES_NEW`) that commits independently of the deduction. Naming a
savepoint or `REQUIRES_NEW` only as the ways to continue after a failed
statement, while the recommended design uses `ON CONFLICT DO NOTHING` in the
deduction's transaction, is not a failure.
