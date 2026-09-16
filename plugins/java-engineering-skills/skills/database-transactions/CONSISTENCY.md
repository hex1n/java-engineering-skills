# Database-enforced invariants

## Atomic conditional changes

Encode a predicate in the mutation when it fits. For reserving available stock,
bind positive `quantity` and the product identifier as parameters:

```sql
UPDATE inventory
SET available = available - :quantity
WHERE product_id = :product_id
  AND available >= :quantity;
```

Require exactly one affected row for success, and record which count the stack
returns before relying on it: MySQL reports changed rows by default, while
Connector/J sets `CLIENT_FOUND_ROWS` unless `useAffectedRows=true` and so
reports matched rows, and `INSERT … ON DUPLICATE KEY UPDATE` reports 1, 2, or 0
only when that flag is unset. A conditional update that writes the same values
reports zero changed rows without being a conflict. Validate `quantity > 0`; a
negative value would increase stock. This protects the local stock predicate,
not exactly-once requests: repeated reservations need a unique operation
identity committed with the inventory change. A prior `SELECT` followed by
an unconditional `UPDATE` is not equivalent under concurrency.

For versioned updates, include the expected version in the `WHERE` clause and
increment it atomically. A zero-row result is a conflict to resolve explicitly;
blindly retrying a stale entity can overwrite another change.

Sources: [MySQL UPDATE](https://dev.mysql.com/doc/refman/8.0/en/update.html),
[mysql_affected_rows](https://dev.mysql.com/doc/c-api/8.0/en/mysql-affected-rows.html),
[Connector/J useAffectedRows](https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-connection.html),
[Jakarta Persistence optimistic locking](https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1).

## Uniqueness and transaction scope

Use a database uniqueness constraint for a business key or scoped idempotency
key. Claim the key and apply the business mutation in one transaction; a
separately committed claim can suppress work that never completed. Preserve
the result and detect incompatible reuse of a key when callers need repeatable
responses. Require non-null identity columns when NULL would bypass intended
uniqueness; use the actual collation for textual identities.

An application pre-check can improve an error message, but the database must
arbitrate simultaneous requests. Map conflicts to the intended API result
without swallowing unrelated SQL errors. INSERT IGNORE can suppress errors
beyond the intended duplicate, and ON DUPLICATE KEY UPDATE can match any
applicable unique key and performs its update branch. Neither is a universal
idempotency primitive; distinguish the intended identity and payload before
returning a saved outcome.

Sources: [MySQL duplicate-key behavior](https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html),
[MySQL INSERT](https://dev.mysql.com/doc/refman/8.0/en/insert.html).

## Isolation and locks

For each invariant, write the two-connection interleaving that breaks it
(read/read/write/write for a lost update, two reads of disjoint rows then two
writes for write skew, a count then an insert for a phantom) and run it on
the target engine. The invariant holds only when the second connection
blocks, fails, or affects zero rows.

For pessimistic locking, keep the transaction short and acquire resources in
a consistent order. Verify the rows/ranges and index paths locked by the engine;
locking an existing row may not protect every absent-row predicate. InnoDB
locking reads need an actual transaction. Record locks, gap/next-key locks,
and unique point lookups have different scopes, affected by isolation and
the scanned index range. A missing suitable index can greatly broaden locks.
Consistent snapshot reads and locking/current reads can observe different
states in the same REPEATABLE READ transaction; do not reuse an old snapshot
as proof of a just-completed competing update.

`SKIP LOCKED` changes which work is observed and needs a starvation/recovery
policy for job claiming. `NOWAIT` and `SKIP LOCKED` exist from MySQL 8.0.1;
a 5.7 deployment needs another claiming mechanism.
[MySQL 8.0.1 release notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-1.html).
Transaction isolation does not replace business uniqueness constraints.

Sources: [InnoDB isolation](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html),
[InnoDB lock scope](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html),
[InnoDB locking reads](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html).

## Retry the unit that failed

For a recognized retryable transaction failure, roll back and retry the entire
business transaction with fresh reads, bounded attempts, and a total budget.
Retrying only the last statement can retain decisions based on stale reads.
Make effects outside the database separately idempotent or durably coordinated;
transaction retry must not repeat an irreversible external action unchecked.
InnoDB deadlocks roll back the transaction; a lock-wait timeout normally rolls
back the statement, with behavior affected by innodb_rollback_on_timeout.
Inspect the actual error/state and explicitly roll back the business unit
before retrying it. A lost commit response is an unknown outcome to reconcile
by operation identity, not permission to issue a fresh operation.

Source: [InnoDB error handling](https://dev.mysql.com/doc/refman/8.0/en/innodb-error-handling.html).

## Replica reads and routing

Identify reads that must observe a preceding successful write: order details,
saved idempotency outcomes, authorization state, or cache refill. A transaction
on the primary does not make another connection to a replica immediately current.
Semisynchronous replication acknowledgement means receipt/logging, not that
the replica has applied and committed the transaction; other replicas may lag.

For read-your-writes, route the relevant read to the authoritative writer under
the topology's guarantees, use a verified bounded replication-progress barrier
on the selected replica, or explicitly accept a staleness window. A fixed sleep
is not a replication guarantee. Waiting for progress must precede a suitably
fresh read snapshot; an already established old snapshot can remain stale.
Specify timeout/fallback and failover behavior rather than silently serving old
state. Check GTID/wait support against MySQL 5.7/8.0/8.4 and actual replication.

Trace driver/framework routing and connection ownership. Spring `readOnly`
does not by itself establish the intended data source or read consistency.
Test a delayed replica, a write followed by a read on another request, and
topology changes. Measure apply progress as well as commit latency; replica
lag can also reintroduce old data through an otherwise correct cache protocol.

Source: [MySQL 8.4 semisynchronous replication guarantees](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html).
