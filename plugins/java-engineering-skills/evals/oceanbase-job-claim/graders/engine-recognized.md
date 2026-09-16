---
type: llm
criteria: "The answer recognizes the database as OceanBase 4.2.x in MySQL mode rather than MySQL 5.7 or 8.0, and its locking-read advice reflects that: it does not rely on SELECT ... FOR UPDATE SKIP LOCKED, FOR SHARE, or GET_LOCK() as available features, and it claims jobs with a conditional UPDATE that sets an owner/lease column and checks the affected-row count."
focus: "engine identification and the job-claiming mechanism"
target: last_message
---

Pass when the design treats the `5.7.25-OceanBase-v4.2.1.10` version string as OceanBase, avoids the MySQL 8.0-only or unsupported locking syntax, and claims work through a conditional UPDATE with an owner or lease column plus an affected-row check. Mentioning SKIP LOCKED only to say it is unavailable is acceptable. Fail if the design depends on SKIP LOCKED, FOR SHARE, GET_LOCK(), or a JVM-local lock for cross-instance exclusivity.
