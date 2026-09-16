---
name: java-testing
description: Design, implement, or repair Java unit, integration, and contract tests. Use for Mockito and test doubles, JUnit migration, test discovery, Testcontainers, asserting committed state from a test, asynchronous verification, or unreliable backend tests.
---

# Java Testing

Write the claim as one sentence naming the observable and its owner (the
committed row count after `save()`, the JSON the configured `ObjectMapper`
emits), then pick the smallest runner that can see that observable. The claim
is testable when a wrong implementation would change that observable. Preserve the requested scope: a test plan identifies cases and execution needs;
a test implementation includes running the affected checks when available.

Inspect production and test source targets, the actual test JVM, build plugins,
test engines, framework BOM, existing fixtures, and CI commands. Tests running
on a newer JDK do not prove compatibility with the oldest supported runtime.

- For JUnit selection, discovery, assertions, and legacy migration, read
  [JUNIT-AND-CONTRACTS.md](JUNIT-AND-CONTRACTS.md).
- For mock/stub/fake/spy selection, Mockito setup and verification, or Spring
  bean replacement, read [MOCKING.md](MOCKING.md).
- For real databases/brokers, Testcontainers, HTTP tests, and transaction
  boundaries, read [INTEGRATION.md](INTEGRATION.md).
- For asynchronous outcomes, concurrency, fault injection, and flaky tests,
  read [ASYNC-AND-FAILURES.md](ASYNC-AND-FAILURES.md).

Choose the smallest boundary that can falsify the claim; the claim-to-boundary
table is in [INTEGRATION.md](INTEGRATION.md). A mock at the claimed mechanism
removes the evidence the test was meant to produce.

Start from public outcomes and failure conditions. Control time, randomness,
and dependency responses at existing seams; add a seam only when it reduces
real coupling. Preserve useful legacy tests while improving coverage of the
changed behavior. Assertions on collaborator calls are useful when that
interaction is itself the contract, not a substitute for committed results.

## Completion evidence

Run the project's actual test task and inspect discovered/executed/skipped
counts, failures, and cleanup. A green command with zero relevant tests is a
discovery gap. Record the JVM, dependency/service versions, selected cases,
and unexecuted boundaries. Distinguish a regression reproduced by a failing
test from an inability to start the test environment. Keep shared or live
service mutation within the task's authorized environment.
