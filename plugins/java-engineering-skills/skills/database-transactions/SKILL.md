---
name: database-transactions
description: Design or repair MySQL/InnoDB schemas, indexes, SQL queries, and transactions in Java services. Use for table design, slow SQL and execution plans, lost updates, idempotency, ORM persistence, or database migrations.
---

# MySQL Design and Transactions

Establish the MySQL release, storage engine, isolation level, SQL mode,
charset/collation, schema/indexes, Connector/J/ORM versions, and transaction
manager before reasoning about SQL. This skill focuses on MySQL 8.0/8.4 and
legacy 5.7 migration; resolve exact update-level behavior rather than treating
all 8.0 releases as equivalent. Verify InnoDB for the transactional claims.

- For row identity, types, relationships, business constraints, and soft deletion,
  read [TABLE-DESIGN.md](TABLE-DESIGN.md).
- For access paths, composite/covering/expression indexes, and index lifecycle,
  read [INDEX-DESIGN.md](INDEX-DESIGN.md).
- For slow-query evidence, execution plans, query rewrites, and pagination,
  read [SQL-OPTIMIZATION.md](SQL-OPTIMIZATION.md).
- For invariants, idempotency, optimistic/pessimistic concurrency, and retries,
  read [CONSISTENCY.md](CONSISTENCY.md).
- For ORM fetching, connection budgets, backfills, and schema
  evolution, read [QUERIES-AND-MIGRATIONS.md](QUERIES-AND-MIGRATIONS.md).

State the business condition the database must enforce. Trace every read,
write, commit, and external effect that participates in it, including other
application instances. Use constraints and atomic changes where they express
the invariant; a JVM lock or pre-check alone cannot enforce cross-process
uniqueness.

If Spring provides transactions, confirm the actual proxied invocation and
manager; an annotation alone is not proof of a running transaction. Keep
external side effects outside the atomicity claim unless the mechanism truly
coordinates them. Design-only work returns a proposal; apply schema/data
changes only within the task's authorized environment and scope.

## Verify at the database boundary

Test conflicting operations with independent connections/transactions and
controlled ordering. Assert affected-row counts, committed state, uniqueness,
and retry outcomes. For SQL or locking claims, use the target dialect and
representative schema/data; an in-memory substitute or mocked repository is
insufficient. Report the engine/version and unexecuted migration or production
scale assumptions.

For schema/index/query work, preserve result semantics and compare plans plus
measured work on representative volumes, distributions, and parameter values.
Record read benefit, write/storage cost, and migration impact. A proposed
index or estimated plan is not a measured performance improvement.
