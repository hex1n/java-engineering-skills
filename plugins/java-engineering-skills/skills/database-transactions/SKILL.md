---
name: database-transactions
description: Design or repair MySQL/InnoDB or OceanBase MySQL-mode schemas, indexes, SQL, and transactions in Java services. Use for table design, slow SQL and execution plans, lost updates, idempotency enforced by a unique key in one transaction, ORM persistence, or database migrations.
---

# MySQL Design and Transactions

Before reading any SQL, record from the target connection:

- `SELECT VERSION()`: a result containing `OceanBase` routes locking,
  isolation, timeout, auto-increment, DDL, partitioned-index, plan-evidence,
  and replica-read questions to [OCEANBASE.md](OCEANBASE.md), which replaces
  the InnoDB rules in the other files; otherwise note the exact 5.7, 8.0.x,
  or 8.4 update, since 8.0 releases differ.
- `SHOW VARIABLES` for `transaction_isolation`, `sql_mode`,
  `character_set_server`, and `collation_server`.
- `SHOW CREATE TABLE` for every table the task touches (engine, indexes,
  collation); the transactional claims here assume InnoDB.
- Connector/J and ORM/mapper versions from the effective POM, and the Spring
  transaction manager bean that owns the DataSource.

Done when each item has a value or is marked unreachable.

- For row identity, types, relationships, business constraints, and soft deletion,
  read [TABLE-DESIGN.md](TABLE-DESIGN.md).
- For access paths, composite/covering/expression indexes, and index lifecycle,
  read [INDEX-DESIGN.md](INDEX-DESIGN.md).
- For slow-query evidence, execution plans, query rewrites, and pagination,
  read [SQL-OPTIMIZATION.md](SQL-OPTIMIZATION.md).
- For invariants, idempotency, concurrency, retries, and replica-read consistency,
  read [CONSISTENCY.md](CONSISTENCY.md).
- For ORM fetching, connection budgets, backfills, and schema
  evolution, read [QUERIES-AND-MIGRATIONS.md](QUERIES-AND-MIGRATIONS.md).

State the business condition the database must enforce. Trace every read,
write, commit, and external effect that participates in it, including other
application instances. Put every invariant that spans instances into a
database constraint or a single conditional statement whose affected-row
count is the decision; JVM locks and pre-checks stay as error-message
improvements in front of it.

Whether Spring's proxy actually intercepted the call is spring-boot-engineering's
question; here, confirm the transaction manager and that a transaction is open
before reasoning about isolation. Keep
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

A proposed index or estimated plan is not a measured improvement; the
comparison protocol is in [SQL-OPTIMIZATION.md](SQL-OPTIMIZATION.md) and
[INDEX-DESIGN.md](INDEX-DESIGN.md).
