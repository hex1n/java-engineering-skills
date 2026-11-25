---
type: llm
focus: last_message
---

Facts of the task, which you cannot see: the database is OceanBase 4.2.1 in MySQL mode with default session variables; the nightly job changes `status` on about two million rows of a 30-million-row table; the next release widens `trade_history.amount` from decimal(16,2) to decimal(20,4). Nothing says whether `amount` is indexed. The OceanBase 4.2.1 documentation lists "changing a column type" as offline (table-rebuilding) DDL but also lists "increasing a column type's length or precision" as online and metadata-only, and it does not say which of the two a DECIMAL precision-and-scale widening is. Measured on OceanBase CE 4.2.1.10 (single node, tables created on that version), this widening is online and metadata-only: the table's `table_id` does not change, it takes about the same time on a thousand rows as on a million, and concurrent writes are not delayed; lowering the scale or the integer digits rebuilds the table.

Pass when both hold:

1. The two-million-row update is split into bounded batches with an explicit reference to the statement timeout (ob_query_timeout, 10 seconds by default). Saying that a connection that hit the timeout must be rolled back or discarded before reuse is expected but not required.
2. The DECIMAL widening is not run on the live table without a check: the plan either says it is expected to be online/metadata-only on 4.2.1, or treats it as offline DDL, or says its classification must be confirmed on the target version. Either way it calls for a rehearsal on a copy of the same version and schema (for example checking that `table_id` does not change, or timing it on the full row count), and it says what to do if the rehearsal shows a rebuild (a write-outage window, or an expand-backfill-switch migration). Treating the widening as offline is more cautious than needed but passes.

Fail if the update is proposed as one statement without addressing the timeout, if the type change is described using InnoDB INSTANT/INPLACE reasoning, or if the answer asserts that the widening is online or metadata-only and plans to run it directly on the live table without a rehearsal, or if it states that `ob_trx_timeout` defaults to 100 seconds on this version (100 seconds was the default before 4.0; from 4.0 it is 24 hours). Not mentioning `ob_trx_timeout` is fine. Extra checks or alternatives beyond these do not count against the answer.
