# Design indexes for observed access paths

## Start from workload and existing definitions

Collect the actual query predicates, joins, ordering, projection, limits,
parameter distribution, call frequency, and write rate. Inspect existing
indexes and constraints before adding another. An index is justified by an
access path or integrity requirement, not by a column's presence in a DTO.

For B-tree candidates, align leading keys with commonly fixed predicates and
then consider range/order requirements. This is a starting hypothesis, not
“most selective column first” for every workload. Optional predicates,
multiple-value IN filters, direction/null ordering, collation, and joins can
change the useful order. A range condition can limit how later keys narrow
the scan while later keys still help filtering, ordering, or coverage; it
does not universally make all following columns useless. Verify the actual
plan and version-specific optimizer strategies. A leftmost prefix is the
baseline B-tree lookup model; a version-specific skip scan or index merge is
not evidence that any arbitrary column order is equally effective.
[MySQL multicolumn indexes](https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html).

For example, for a hot query whose tenant and status are single fixed values:

```sql
SELECT id, created_at
FROM orders
WHERE tenant_id = :tenant AND status = :status
ORDER BY created_at DESC, id DESC
LIMIT :limit;
```

`(tenant_id, status, created_at, id)` is a candidate to test for filtering and
ordered retrieval. Check scan direction and actual sorting at the target
version. If status becomes optional or spans several values, reassess this
candidate; it may no longer supply global created_at order efficiently.

## Coverage and specialized indexes

In InnoDB, secondary indexes already include primary-key columns. Account for
that before adding duplicate payload. Cover only valuable projections: wide
text/blob payloads can inflate storage, cache pressure, and every write.
Check `Using index` and actual work rather than promising zero clustered-row
access for every MVCC/locking situation. `Using index condition` describes
index condition pushdown and is not the same as a covering read.
[index condition pushdown](https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html).

MySQL does not offer arbitrary WHERE-filtered indexes. For conditional
uniqueness, see [soft deletion](TABLE-DESIGN.md#soft-deletion-and-business-key-reuse).
Functional key parts require MySQL 8.0.13 or later; generated-column indexing
is a different version-gated option. Expression matching, result type and
collation matter. For prefix indexes, evaluate remaining filtering, order,
coverage, and full-value uniqueness requirements. FULLTEXT and SPATIAL indexes
serve their supported operators; an ordinary B-tree does not efficiently
solve every leading-wildcard search.
[MySQL index forms](https://dev.mysql.com/doc/refman/8.0/en/create-index.html).

## Lifecycle and operational cost

Evaluate insert/update/delete cost, index size, build I/O, lock duration,
replication lag, and maintenance. Foreign-key support and unique constraints
can depend on an index; a low query-usage count alone does not justify removal.
A prefix-overlapping index is only a redundancy candidate: uniqueness, order,
expressions, indexed prefix lengths, size, and other queries can distinguish it.

Supported ALGORITHM/LOCK combinations depend on the MySQL operation and
version; online DDL can still wait for metadata locks. Specify
required behavior so unsupported execution fails instead of silently choosing
an unacceptable rebuild path.
[MySQL online DDL limits](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-limitations.html).

Where supported, an invisible index can help test plan dependence before
removal, but it remains maintained and unique constraints remain enforced.
Changing visibility affects query plans and needs a representative observation
window, including infrequent jobs; it does not measure the write benefit of
actually dropping the index.
[invisible indexes](https://dev.mysql.com/doc/refman/8.0/en/invisible-indexes.html).

Compare representative parameter sets before and after the proposed change.
Record scanned/fetched rows, sort work, latency and write cost. Keep the old
access path until the new one is verified and removal is within scope.
