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

Require exactly one affected row for success. Validate `quantity > 0`; a
negative value would increase stock. This protects the local stock predicate,
not exactly-once requests: repeated reservations need a unique operation
identity committed with the inventory change. A prior `SELECT` followed by
an unconditional `UPDATE` is not equivalent under concurrency.

For versioned updates, include the expected version in the `WHERE` clause and
increment it atomically. A zero-row result is a conflict to resolve explicitly;
blindly retrying a stale entity can overwrite another change.

Sources: [MySQL UPDATE](https://dev.mysql.com/doc/refman/8.0/en/update.html),
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

Read phenomena depend on isolation, indexes, and access pattern. Assess
lost updates, write skew, and phantom-sensitive predicates from actual
interleavings. An isolation name alone is not a proof of the invariant.

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
policy for job claiming; verify support before introducing it into a 5.7
project. Transaction isolation does not replace business uniqueness constraints.

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
