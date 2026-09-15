# Queries, persistence, and schema evolution

## Observe query behavior

Inspect executed SQL and query count for a representative request before
rewriting repository methods. ORM lazy access, serialization, and loops can
produce N+1 queries. Fetch joins, batch loading, entity graphs, or projections
must match the requested result and pagination behavior; eagerly fetching
everything can multiply rows and memory use.

Keep lazy loading inside a deliberate persistence context or materialize the
required DTO data before leaving it. Serialization-driven database access
obscures query and transaction ownership. Validate ORM features against the
installed generation: Jakarta Persistence 3.x imports do not apply unchanged
to a legacy `javax.persistence` project.

Source: [Hibernate fetching guidance](https://docs.hibernate.org/orm/6.6/userguide/html_single/Hibernate_User_Guide.html#fetching).

For execution plans, semantic rewrites, and pagination, read
[SQL optimization](SQL-OPTIMIZATION.md); for access paths and build cost, read
[index design](INDEX-DESIGN.md). Preserve root-entity pagination when fetching
one-to-many collections; SQL row limits and ORM entity limits can differ.

## Connections and migration lifecycle

Coordinate connection pool capacity with request/worker concurrency and the
database's total connection budget. More threads do not create more database
capacity. Set acquisition/query/transaction deadlines deliberately and verify
how cancellation reaches the driver/server. Keep connection ownership and
release observable under error paths.

For rolling deployment, use an expand/backfill/switch/contract sequence when
old and new application versions must coexist. Bound backfills, retain restart
progress, and verify constraints/index build behavior on the target engine.
Destructive column removal waits until old readers/writers and recovery paths
no longer depend on it. State rollback limitations once data has been transformed.

Make backfills restartable with a stable cursor and bounded batches; define
how concurrent writes participate so the backfill cannot overwrite newer data.
Reconcile counts, nulls, duplicates, and domain totals before switching reads.
Test old/new application versions against each intermediate schema, including
deploy rollback. Column defaults, renames, type changes, and NOT NULL validation
have engine/version-specific rewrite and lock costs.

Treat partitioning as a measured pruning/retention choice. Check predicates,
partition-key distribution, uniqueness/foreign-key restrictions, and maintenance
at the selected MySQL version. It does not replace access-path design or
automatically create cross-server capacity. Propose sharding only with evidence
for its capacity need and an explicit routing, transaction, and migration model.

Keep migrations versioned and review their lock/runtime impact. MySQL atomic
DDL is not a user transaction that can be rolled back with surrounding DML:
DDL commonly causes implicit commits. INSTANT, INPLACE, and COPY describe
different operation paths; support and metadata-lock windows depend on the
exact operation/version. Inspect long transactions, temporary space, and
replication lag before a large change. A migration framework tracks execution;
it does not make DDL lock-free or make destructive data conversion reversible.

Sources: [MySQL atomic DDL](https://dev.mysql.com/doc/refman/8.0/en/atomic-ddl.html),
[online DDL operation matrix](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html),
[partitioning restrictions](https://dev.mysql.com/doc/refman/8.0/en/partitioning-limitations.html),
[Flyway migrations](https://documentation.red-gate.com/flyway/flyway-concepts/migrations).
