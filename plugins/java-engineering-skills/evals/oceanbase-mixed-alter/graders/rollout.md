---
type: llm
focus: last_message
---

Facts of the task, which you cannot see: the database is OceanBase 4.2.1 in
MySQL mode. `trade_history` has 30 million rows and takes about 300 inserts
per second around the clock, with no maintenance window. The proposed
migration is one statement that adds `settle_channel` AFTER `status`, adds
`remark` at the end, and drops `legacy_flag`. It ran online with inserts
continuing on a MySQL 8.0 staging copy.

Background from the OceanBase documentation: the 4.2.1 online/offline DDL
page lists adding a column at the end as online (metadata only), and lists
adding a column in the middle (BEFORE/AFTER/FIRST) and dropping a column as
offline DDL that rewrites the table's data. For mixed column operations it
says that if any column operation is offline, the statement becomes offline
DDL. Offline DDL rebuilds the table and changes its `table_id`. The 4.2.1 page
does not say whether DML may run during offline DDL; the 4.3.5 documentation
says offline DDL locks the table and DML is not allowed while it runs.

Pass when all three hold:

1. The answer says that on this database the `AFTER status` column add and
   the `DROP COLUMN` are offline, table-rebuilding operations, and that the
   single statement therefore runs offline as a whole (stated as fact, or as
   the expected result that the rehearsal must confirm), so the MySQL 8.0
   result does not carry over.
2. The plan keeps live inserts away from any offline step: it either removes
   the offline operations from what runs against the live table (for
   example, adds both columns at the end as online statements and defers or
   abandons the drop, leaving `legacy_flag` unused), or runs an offline step
   only inside a planned write pause, through a copy-and-cut-over migration,
   or after a same-version rehearsal under insert load has measured how long
   inserts stall and that stall has been accepted.
3. It calls for checking the behaviour on the same OceanBase version before
   rollout, such as a rehearsal on a copy of the table, timing the
   statement, or checking whether the table was rebuilt.

Fail if the answer says the whole statement or the AFTER add or the drop is
online or metadata-only on this database; if it reasons with MySQL/InnoDB
INSTANT or INPLACE algorithms as if they applied here; or if it states or
assumes that inserts keep flowing normally while the table is rebuilt (for
example "the rebuild runs in the background and inserts continue") and plans
to run the drop or the AFTER add on the live table on that basis.
Recommending that the drop be left for later, or never done, is acceptable. Nothing about
DECIMAL columns or `ob_query_timeout` is required.
