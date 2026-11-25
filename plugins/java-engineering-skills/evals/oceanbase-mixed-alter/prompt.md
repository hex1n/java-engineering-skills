---
name: "OceanBase MySQL mode: one ALTER that mixes online and offline column changes"
tags: ["discriminating", "database-transactions", "oceanbase"]
runs: 3
max_turns: 12
---

Our Java service runs against a database where `SELECT VERSION()` returns
`5.7.25-OceanBase-v4.2.1.10` (MySQL mode). `trade_history` holds 30 million
rows and receives about 300 inserts per second around the clock; there is no
maintenance window. The next release needs this migration, which a teammate
wrote and tested on MySQL 8.0:

```sql
ALTER TABLE trade_history
  ADD COLUMN settle_channel VARCHAR(32) NULL AFTER status,
  ADD COLUMN remark VARCHAR(255) NULL,
  DROP COLUMN legacy_flag;
```

On a MySQL 8.0 staging copy it ran online with inserts continuing. Will it behave the same
way here? Give the rollout plan for this database, with the SQL, and say what
must be checked on the target before rollout.
