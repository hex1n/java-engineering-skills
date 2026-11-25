---
name: "zh: OceanBase MySQL 模式：抢任务、批量更新、加宽字段"
tags: ["zh", "database-transactions"]
runs: 2
max_turns: 12
---

我们的 Spring Boot 服务有四个实例，连的数据库 `SELECT VERSION()` 返回 `5.7.25-OceanBase-v4.2.1.10`，会话变量都是默认值。请设计三件事：

1. 表 `task_queue(id bigint auto_increment primary key, status varchar(16), owner varchar(64), lease_until datetime, payload text, ...)`。四个实例要并发领取 PENDING 任务，每次 20 条，同一任务不能被处理两次，实例挂掉后它的任务要能重新被领取。给出领取的 SQL 和 Java 侧的事务边界。
2. 每天夜里要把 3000 万行的 `trade_history` 表里某个月大约 200 万行的 `status` 改掉。给出执行方案。
3. 下个版本要把 `trade_history.amount` 从 `decimal(16,2)` 加宽到 `decimal(20,4)`。给出上线方案。

给出具体的 SQL 和步骤，并说明上线前必须在目标库上验证什么。
