---
name: "OceanBase MySQL mode: job claiming, bulk update, column widening"
tags: ["database-transactions", "oceanbase"]
runs: 2
max_turns: 12
---

Our Spring Boot service runs four instances against a database where `SELECT VERSION()` returns `5.7.25-OceanBase-v4.2.1.10`, with default session variables. Please design three things:

1. Table `task_queue(id bigint auto_increment primary key, status varchar(16), owner varchar(64), lease_until datetime, payload text, ...)`. The four instances must claim PENDING tasks concurrently, 20 at a time, without processing a task twice, and a crashed instance's tasks must become claimable again. Give the claiming SQL and the Java-side transaction boundaries.
2. Every night we change `status` on about two million rows of one month in the 30-million-row table `trade_history`. Give the execution approach.
3. Next release widens `trade_history.amount` from `decimal(16,2)` to `decimal(20,4)`. Give the rollout plan.

Give concrete SQL and steps, and say what must be verified on the target database before rollout.
