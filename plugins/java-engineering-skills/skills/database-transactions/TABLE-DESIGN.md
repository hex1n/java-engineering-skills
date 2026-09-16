# Tables, identity, and constraints

## Begin with the row's meaning

State what one row represents, who owns it, its lifecycle, and which attributes
may change independently. Map the important reads, writes, cardinalities,
retention needs, and expected growth before choosing columns. Separate
independent entities and repeated relationships; denormalize only for a
demonstrated access need with an owner for consistency and repair. Comma-separated
IDs or an opaque JSON blob should not replace relationships that need joins,
uniqueness, or referential integrity.

Choose a stable primary key and separately enforce the scoped business key.
A generated ID does not prevent duplicate business operations. Compare integer
and UUID/distributed identifiers using generation ownership, ordering,
interoperability, storage, and insert locality. InnoDB clusters rows by its
clustered key and carries the primary key in secondary indexes, so a wide
primary key amplifies secondary storage. Choose from the real workload rather
than imposing either auto-increment IDs or UUIDs on every table.
[InnoDB key layout](https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html).

## Encode the actual domain

| Choice | Decision boundary |
|---|---|
| Money and quantities | Use exact decimal or bounded integer units; state scale, rounding, currency/unit, sign and overflow policy. Match Java BigDecimal or integer conversion. |
| Missing values | Define absent, unknown, zero, empty, and not-applicable separately. Defaults do not validate every writer. |
| Text and business identity | Select length from the domain and encoding; collation/case/accent/trailing-space behavior changes equality, sorting, and uniqueness. Normalize only by a declared business rule. |
| Time | Distinguish an instant, local wall time, date, and recurring schedule; define precision and JDBC/session timezone conversions. Retain a zone identifier separately when the original zone matters. |
| Flexible attributes | JSON fits genuinely variable attributes; frequently filtered keys or relationships may need typed columns and explicit constraints/indexes. |

DECIMAL defines stored precision/scale; conversion can reduce excess fractional
digits instead of rejecting the original input. If the contract forbids that,
validate exact scale and range before binding the value and cover every writer.
CHECK on the DECIMAL column sees the converted value, so it cannot reconstruct
and reject fractional digits already discarded during assignment.
Use decimal text/BigDecimal rather than passing through a binary floating-point
value. Migrating existing DOUBLE values requires an explicit reconciliation
policy; a type change cannot recover precision already lost.
[MySQL exact numeric types](https://dev.mysql.com/doc/refman/8.0/en/fixed-point-types.html).

MySQL `TIMESTAMP` converts between the session timezone and UTC storage, while
`DATETIME` does not perform that conversion. Their supported ranges differ.
Neither retains a named business timezone. Verify server/session, Connector/J,
and Java mapping with round trips around precision and DST boundaries; declaring
that the application uses UTC does not itself configure every connection.
[MySQL time types](https://dev.mysql.com/doc/refman/8.0/en/datetime.html).

## Constraints and relationship ownership

Apply NOT NULL, UNIQUE, CHECK, and foreign keys to the real invariant. A single-column foreign
key may verify existence while still allowing an unintended tenant relationship;
use the appropriate scoped relationship, for example referencing a unique
`(tenant_id, customer_id)` pair. Decide delete/update behavior explicitly;
cascades can turn one operation into a large transaction. Match referenced
column types, integer signedness, and string charset/collation as required;
reference a primary/unique key rather than relying on legacy non-unique-key
extensions. Verify supporting indexes and the actual constraint definition.
[MySQL 8.4 foreign keys](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html).

CHECK such as `quantity > 0` needs NOT NULL when NULL is invalid. MySQL CHECK
constraints became enforced in 8.0.16; older accepted syntax is
not evidence of protection. Inspect actual enforcement, engine, and SQL mode
when upgrading legacy schemas. Clean conflicting historical rows before
validating a new constraint, with a documented resolution policy.
[MySQL CHECK version boundary](https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html).

## Soft deletion and business-key reuse

Decide whether deletion permits reuse of a business key and what restoration
means. A nullable `deleted_at` inside an ordinary composite UNIQUE key usually
does not enforce one active row, because NULL entries can remain distinct.
Conversely, UNIQUE on `(tenant, key, is_deleted)` permits at most one row per
flag value and can block multiple historical versions.

For MySQL, an indexed generated marker can express one active row while
allowing multiple historical rows. On a compatible InnoDB table, a candidate is:

```sql
active_marker TINYINT GENERATED ALWAYS AS
  (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END) STORED,
UNIQUE KEY uk_active_business (tenant_id, business_key, active_marker)
```

Require tenant_id and business_key to be NOT NULL, select their collation,
and check indexed generated-column support at the exact version. On an existing
InnoDB table in MySQL 8.0, adding this marker as `STORED` requires a rebuild
without concurrent DML. Adding a `VIRTUAL` column supports online algorithms
on non-partitioned tables; partitioned tables do not support INPLACE for this
addition. VIRTUAL columns can carry unique secondary indexes, but check the
exact release, partitioning, and complete ALTER combination, including index
creation. Specify the required `ALGORITHM`/`LOCK` so an unsupported migration
fails instead of silently accepting a more blocking operation. Active rows
share marker 1 and conflict; historical rows use NULL and may coexist. This
does not define restoration automatically: restoring an old row must conflict
when another active row owns the key. Preflight existing duplicates before
adding the constraint. A unique prefix index can collapse distinct long keys;
it is not interchangeable with uniqueness over the complete business value.
[MySQL unique indexes](https://dev.mysql.com/doc/refman/8.0/en/create-index.html),
[generated columns](https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html),
[MySQL 8.0 online DDL operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html).

Validate duplicate concurrent inserts, null/invalid values, cross-tenant
relationships, deletion/recreation/restoration, and serialization round trips.
For an existing table, include compatibility and backfill steps from
[migration lifecycle](QUERIES-AND-MIGRATIONS.md#connections-and-migration-lifecycle).
