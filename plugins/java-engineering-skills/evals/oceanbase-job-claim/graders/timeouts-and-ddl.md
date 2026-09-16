---
type: llm
criteria: "The bulk update is split into bounded batches because of the default 10-second statement timeout (ob_query_timeout), and the answer says the connection must be rolled back after a timeout before reuse. The decimal(16,2) to decimal(20,4) change is treated as an offline (table-rebuilding) DDL on OceanBase 4.2 that needs a rehearsal and a write-outage plan, not as an instant or in-place MySQL change."
focus: "statement timeout handling and DDL classification"
target: last_message
---

Pass when both hold: the two-million-row update is batched with an explicit reference to the statement timeout, and the column type change is planned as offline DDL with a rehearsal. Fail if the update is proposed as one statement without addressing the timeout, or if the type change is described using InnoDB INSTANT/INPLACE reasoning.
