---
name: "OceanBase MySQL mode: isolation, shared locks, and plan evidence"
tags: ["database-transactions", "oceanbase", "discriminating"]
runs: 3
max_turns: 12
---

Our Java inventory service talks to a database where `SELECT VERSION()` returns
`5.7.25-OceanBase-v4.2.1.10`. HikariCP sets
`transactionIsolation=TRANSACTION_REPEATABLE_READ` "to match MySQL's default".
Four problems came up this week:

1. Under load, `deductStock` fails with `ERROR 6235 ... can't serialize access`.
   It runs, in one transaction:
   `SELECT available FROM stock WHERE sku = ? LOCK IN SHARE MODE;` then, if
   enough stock is left,
   `UPDATE stock SET available = available - ? WHERE sku = ?;`
   A developer proposes switching the pool to READ UNCOMMITTED so the error
   goes away.
2. Read-only "check stock" requests that also use `LOCK IN SHARE MODE` queue
   behind each other even though no writer is running.
3. A dispatcher claims one task with
   `SELECT * FROM task WHERE status = 'NEW' ORDER BY id LIMIT 1 FOR UPDATE;`
   and the other three dispatchers sit in long lock waits.
4. To find out why the claim query is slow, the DBA wants to run
   `EXPLAIN ANALYZE` on it.

Explain each problem for this database and say what to change. Do not run
anything.
