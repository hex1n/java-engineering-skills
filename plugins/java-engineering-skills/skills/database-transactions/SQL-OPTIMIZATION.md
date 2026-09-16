# SQL optimization with preserved results

## Establish the expensive work

Capture normalized SQL, bound parameter types and representative values,
frequency, result size, server/driver duration, lock waits, schema/indexes,
statistics, and data distribution. Distinguish a single slow statement from
many individually fast statements, connection-pool wait, network transfer,
or Java hydration/serialization. Optimize total request cost and service load,
not only the longest isolated query.

Start with an estimated plan when execution is not authorized or would be
expensive. EXPLAIN ANALYZE executes the statement; SELECT can still invoke
functions, acquire locks, or consume substantial resources. Rolling back does
not reclaim allocated auto-increment values or undo external effects. Use an isolated representative
environment for risky statements and bound execution.

MySQL EXPLAIN ANALYZE is available from 8.0.18; its supported statements and
output differ from earlier MySQL. For 5.7, use supported EXPLAIN output and
separate measured execution evidence. Inspect access path, estimated
and actual rows/loops, filtering, and sorting with the selected version's
format. Iterator times are averages per loop and include child work; summing
all node times double counts. Read estimated cost as optimizer units, not
measured milliseconds. `Using filesort` is a sort operation, not proof of disk spill. A full
scan can be appropriate for a small table or a large result fraction.
[MySQL EXPLAIN](https://dev.mysql.com/doc/refman/8.0/en/explain.html),
[MySQL ORDER BY optimization](https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html).

## Fix the cause shown by the plan

| Evidence | Candidate investigation |
|---|---|
| Major estimated/actual row mismatch | Stale statistics, skew, correlated columns and actual parameter values; inspect supported statistics before hints |
| Excess scanned rows for a selective predicate | Index path, leading keys, expression/cast/collation compatibility, predicate shape |
| Large nested-loop multiplication | Join cardinality, missing join condition or access path, repeated subquery work |
| Large sort/hash or intermediate result | Earlier selective filtering/aggregation when equivalent, order-supporting index, bounded projection/result |
| Fast SQL but slow request | Query count, pool acquisition, network/row volume, ORM materialization, transaction lifetime |

Refresh/analyze statistics through an appropriately scoped operation, and
compare multiple common and skewed parameter values. MySQL 8 histograms can
help selected column-distribution estimates; they do not establish arbitrary
multi-column correlations or make an index unnecessary. Inspect persistent
statistics and the chosen histogram's actual use rather than issuing ANALYZE
TABLE as a reflex for every slow statement.
[MySQL statistics](https://dev.mysql.com/doc/refman/8.0/en/optimizer-statistics.html).

## Rewrite without changing the answer

Prefer predicates the chosen access path can evaluate directly. For a calendar
day, a half-open timestamp range can avoid wrapping the column in a date
function; compute bounds using the business zone and storage semantics. A day
need not be 24 hours across DST. Bind values using compatible types so an
implicit conversion does not change comparisons or the usable index.

Preserve duplicate and NULL semantics when replacing subqueries, joins, or
set operations. NOT IN with a NULL in the subquery can differ from NOT EXISTS.
Moving a right-table predicate from a LEFT JOIN's ON clause into WHERE can
remove unmatched rows. UNION ALL preserves duplicates; UNION removes them.
Check grouping, empty inputs, and aggregate overflows/precision before pushing
aggregation or limits across a join. A syntactically shorter query is not
proof of equivalence.
[MySQL IN/NOT IN NULL semantics and the EXISTS rewrite](https://dev.mysql.com/doc/refman/8.0/en/subquery-optimization-with-exists.html),
[join semantics](https://dev.mysql.com/doc/refman/8.0/en/join.html).

## Pagination and verification

Use deterministic ordering with a unique tie-breaker. For descending non-null
`(created_at, id)`, a next-page predicate can be:

```sql
AND (created_at < :last_created_at
     OR (created_at = :last_created_at AND id < :last_id))
ORDER BY created_at DESC, id DESC
LIMIT :limit
```

Keep the cursor's filters/scope and timestamp precision consistent. Mixed
directions, nullable keys, reverse navigation, and mutable ordering need their
own rules. Keyset pagination can avoid large skipped offsets, but does not
create a snapshot across requests or arbitrary page-number jumps. Inspect
the resulting plan; equivalent predicate forms can optimize differently.
[MySQL LIMIT optimization](https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html),
[row-constructor optimization](https://dev.mysql.com/doc/refman/8.0/en/row-constructor-optimization.html).

Compare old/new results for ties, nulls, empty input, duplicates, boundaries,
and supported concurrent-change semantics. Measure the same workload/data and
record cache state, repetitions, variance, server work, and response volume.
Measure under the cache state and planner settings the workload actually runs
with. If no target database is available, provide candidate SQL/indexes
and verification steps, with no claimed measured speedup.
