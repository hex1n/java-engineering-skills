---
type: llm
criteria: "The answer finds both causes: (1) transfer() calls doTransfer() on this, bypassing the transactional proxy, so no transaction is started and each JdbcTemplate statement auto-commits; (2) even through the proxy, InsufficientFundsException is a checked exception, which does not trigger rollback by default. The fix puts the transactional boundary on the method the caller invokes through the proxy (or moves it to another bean) and declares rollbackFor for the exception or makes it unchecked. Proof is an integration test against a real transaction manager and database that triggers the exception and then reads the source balance unchanged, without a test-level transaction that would roll everything back and hide the defect."
focus: "proxy invocation and checked-exception rollback"
target: last_message
---

Pass when both causes, a fix for both, and a test that observes committed state
are present. Fail if only one cause is found, if the fix makes the method
private or final or relies on self-invocation, if the proof is a mocked unit
test, or if the proposed test wraps the scenario in a rolling-back @Transactional
test without addressing that.
