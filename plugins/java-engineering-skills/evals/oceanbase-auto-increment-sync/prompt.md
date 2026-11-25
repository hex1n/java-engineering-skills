---
name: "OceanBase MySQL mode: incremental sync by auto-increment id"
tags: ["database-transactions", "oceanbase", "discriminating"]
runs: 3
max_turns: 12
---

Our Java data-sync job copies new rows from `order_event` to a warehouse every
minute. The database's `SELECT VERSION()` returns
`5.7.25-OceanBase-v4.2.1.10`; the cluster was upgraded from OceanBase 3.2 last
year, and `order_event` was created before the upgrade (`id bigint
auto_increment primary key`, no other auto-increment options). A table created
last month, `refund_event`, has the same shape and uses the same job.

```sql
SELECT * FROM order_event WHERE id > :lastId ORDER BY id LIMIT 5000;
-- then lastId = max(id) of the batch
```

Reconciliation finds `order_event` rows that were committed but never copied.
For `refund_event`, ids sometimes jump by about a million after a maintenance
window, and the dashboard that computes "events today" as
`max(id) - min(id) + 1` reports nonsense. The Java side uses MyBatis with
default settings and commits each insert in its own transaction.

Explain both tables' behavior on this database and give a sync design that does
not lose rows. Do not run anything.
