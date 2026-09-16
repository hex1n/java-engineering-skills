# OceanBase MySQL mode

This reference covers OceanBase 4.2.x tenants in MySQL mode, checked against
the 4.2.1 LTS documentation and a 4.2.1.10 tenant. Feature availability moves
between 4.x minor releases; resolve the deployed version before reusing a rule.
The InnoDB guidance elsewhere in this skill applies only where this file does
not replace it.

## Identify the engine and version

`VERSION()` returns a MySQL-compatible string such as
`5.7.25-OceanBase-v4.2.1.10`, and the `version` variable is settable. Read
`OB_VERSION()` for the OceanBase release and `ob_compatibility_mode` for the
tenant mode (`MYSQL` or `ORACLE`, fixed at tenant creation). A `5.7` prefix is
not MySQL 5.7, and MySQL 8.0 version gates do not apply either way.

Sources: [VERSION()](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000222256),
[OB_VERSION()](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000222254),
[ob_compatibility_mode](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220726).

## Isolation and write conflicts

The default is READ COMMITTED. Only READ COMMITTED and SERIALIZABLE are
implemented; REPEATABLE READ runs as SERIALIZABLE, which is snapshot isolation.
READ UNCOMMITTED is unsupported, and changing isolation inside a transaction
fails with ERROR 1568. Reads take no locks.

Under READ COMMITTED, an `UPDATE` that reaches a row locked by another
transaction waits for it. The two 4.2.1 pages disagree on what follows a
commit: the isolation overview re-executes the statement with a new snapshot,
while the MySQL-mode comparison judges the predicate on the statement-snapshot
version, unlike InnoDB's semi-consistent read. Until a two-connection test on
the target version shows the predicate re-evaluated, the affected-row count of
a conditional `UPDATE` alone does not grant exclusive ownership; also check the
owner column when completing the work. Under REPEATABLE READ or
SERIALIZABLE, when another transaction commits a conflicting write first, the
later writer fails with `ERROR 6235 … can't serialize access` instead of
waiting and updating the new version; retry the whole transaction. Snapshot
isolation permits write skew: lock the rows the decision depends on with
`SELECT … FOR UPDATE`, or express the invariant as a constraint.

The documentation describes exclusive row locks and lock-free reads, with no
gap or next-key locks. Protect an absent-row predicate with a unique constraint
or an explicitly locked guard row, not an InnoDB-style range lock.

Sources: [isolation overview](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220991),
[MySQL-mode isolation differences](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220992),
[lock mechanism](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220994).

## Locking reads and lock waits

The 4.2.1 MySQL syntax is `FOR UPDATE [WAIT n | NOWAIT | NO_WAIT]` or
`LOCK IN SHARE MODE`. `FOR SHARE` and `SKIP LOCKED` are rejected on 4.2.1.10;
`SKIP LOCKED` appears in later 4.x documentation. Claim jobs with a conditional
`UPDATE` of a lease/owner column, check the affected-row count, and fence the
completing write on the owner (see the READ COMMITTED caveat above).
`LOCK IN SHARE MODE` is emulated with write locks, so "shared" readers block
each other. `FOR UPDATE … LIMIT 1` locks only the returned row; with
`ORDER BY` it locks every selected row. `GET_LOCK()` and `RELEASE_LOCK()` are
unsupported.

`ob_trx_lock_timeout` defaults to -1, leaving lock waits bounded by the
statement timeout. A lock-wait timeout returns ERROR 1205. Deadlock detection
aborts the lowest-priority transaction, usually the most recently started one,
with ERROR 1213.

Sources: [SELECT syntax](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000222205),
[LOCK IN SHARE MODE](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000218846),
[MySQL compatibility](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000217920),
[ob_trx_lock_timeout](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220832),
[lock mechanism](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220994),
[error codes](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000218685).

## Timeouts

`ob_query_timeout` defaults to 10 seconds. A longer statement (batch update,
backfill, report, or lock wait) fails with ERROR 4012 and is rolled back. Set a
larger session value for a known long operation or split the work into bounded
batches. `ob_trx_timeout` and `ob_trx_idle_timeout` default to 24 hours in 4.x;
some pages still show the older 100 s and 120 s. Read the session values.

After a transaction timeout (ERROR 4012, OceanBase -6210) or an idle timeout
(ERROR 6002), the application must issue `ROLLBACK` before the connection can
be reused. Make the pool discard or roll back such a connection. A DDL
statement inside an active transaction commits it implicitly.

Sources: [ob_query_timeout](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220700),
[ob_trx_timeout](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220720),
[transaction control](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220989).

## Auto-increment values

4.x tables default to `ORDER` mode with `auto_increment_cache_size` 1,000,000.
Values still jump when the leader restarts, crashes, or switches. `NOORDER`
tables, including tables created before 4.0, guarantee only uniqueness. Derive
neither insertion order, row counts, nor deletions from ID values.

Source: [auto-increment columns](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220211).

## DDL

Replace MySQL INSTANT/INPLACE reasoning with the target version's online and
offline lists. In 4.2.1 these are offline: changing a column type (beyond
lengthening `VARCHAR` and similar), adding or dropping a primary key, dropping
a column, adding a column other than at the end, converting the charset,
changing partitioning, adding an auto-increment column, and adding or dropping
a stored generated column. A statement that mixes one offline change with
online ones runs offline. Offline DDL rebuilds the table through a hidden
table and changes its `table_id`. The 4.3.5 documentation disallows DML while
it runs; the 4.2.1 page is silent, so plan a write outage and rehearse it.

Sources: [4.2.1 online and offline DDL](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000252799),
[column type changes](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000221444),
[4.3.5 DDL blocking](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000002017083).

## Partitioned tables and index features

MySQL-mode indexes are `LOCAL` unless declared otherwise. The primary key and
every local unique index must include the partitioning columns; a local unique
index guarantees uniqueness only within a partition. A `GLOBAL` index can turn
each write into a distributed transaction. Descending index keys are not
supported, and functional indexes on generated columns are rejected; an
ordinary index on a generated column works. `CHECK` constraints are enforced,
and foreign keys, CTEs, and window functions are supported.

Sources: [local and global indexes](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000221077),
[CREATE INDEX](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000221408),
[CHECK constraints](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220218).

## Plan evidence

`EXPLAIN ANALYZE` is a syntax error. `EXPLAIN` prints an operator tree with
estimated rows and time plus `range_key`/`range_cond` and index-back details;
`EXPLAIN EXTENDED_NOADDR` adds outline data, candidate and pruned indexes, and
the statistics version. Estimates are not measurements. For executed work, read
`GV$OB_SQL_AUDIT` (elapsed, queue and execute time, retries, plan-cache hit)
and `GV$SQL_PLAN_MONITOR`, or `DBMS_XPLAN.DISPLAY_CURSOR`; application accounts
often lack access to these views. The plan cache parameterizes literals and
reuses plans per tenant and node, so compare representative parameter values.
`CREATE OUTLINE` binds a plan to a statement.

Sources: [EXPLAIN](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000221427),
[GV$OB_SQL_AUDIT](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000219838),
[plan cache](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220892),
[plan binding](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000220954).

## Weak-consistency reads

`ob_read_consistency` defaults to `STRONG`. `READ_CONSISTENCY(WEAK)` or the
session variable allows reads from replicas up to
`max_stale_time_for_weak_consistency` (default 5 s) behind. WEAK works only
under READ COMMITTED, the first statement fixes a transaction's consistency
level, and DML and `SELECT … FOR UPDATE` always read strongly. Keep
read-your-writes, idempotency, and authorization reads `STRONG`.

Source: [weak-consistency reads](https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000000219036).
