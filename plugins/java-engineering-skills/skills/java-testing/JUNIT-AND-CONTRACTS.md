# JUnit and behavioral contracts

## Resolve the execution baseline

Separate the production bytecode/API target, test source target, test JVM,
test engine, and build runner. A Java 21 developer shell can still launch a
Java 8 test fork. Inspect Maven effective configuration or Gradle test-task
toolchains rather than inferring from `java -version` alone.

JUnit 5.10 supports a Java 8 test runtime; JUnit 6.0 requires Java 17 at runtime
and can test older bytecode. These are version anchors, not instructions to
pin old releases. Resolve the actual BOM, engine/launcher alignment, build
plugin compatibility, and maintained patch line before changing dependencies.
Keep a required Java 8 runtime test lane when using a newer test JVM elsewhere.
[JUnit 5 baseline](https://docs.junit.org/5.10.0/user-guide/index.html),
[JUnit 6 baseline](https://docs.junit.org/6.0.3/overview.html).

For JUnit 4 migration, inventory runners, rules, categories, parameterization,
and Spring integration before replacing annotations. When temporarily using
Vintage, ensure the engine is on the runtime classpath and verify both old
and new tests execute. Treat Vintage as a migration bridge. Resolve Mockito
and other test-library Java requirements separately from JUnit.

For missing tests, inspect engines, naming includes/excludes, tags, source
sets, and the actual CI phase. With Maven Failsafe, use the configured
`verify` lifecycle so integration failures are checked after cleanup; calling
only `integration-test` can miss verification and teardown phases.
[Failsafe lifecycle](https://maven.apache.org/surefire/maven-failsafe-plugin/).

## Assertions that survive implementation changes

Capture inputs, outputs, externally visible state, and exception/side-effect
contracts. Use boundary cases that distinguish plausible implementations:
empty vs absent, null vs default, exact limits, duplicate identity, encounter
order, mutation after return, and decimal scale when contractually relevant.
Choose only boundaries that affect this task.

A Java 8 example for a time-based rule uses an injected `Clock` and explicit
zone; advancing the test clock exercises expiry without wall-clock sleeps:

```java
Clock clock = Clock.fixed(Instant.parse("2025-01-01T00:00:00Z"), ZoneOffset.UTC);
Instant deadline = clock.instant().plusSeconds(30);
boolean expired = !Clock.offset(clock, Duration.ofSeconds(30))
        .instant().isBefore(deadline); // Exact deadline is expired by this contract.
```

This models a business deadline, not a guarantee about distributed clock
agreement. Use monotonic elapsed time for elapsed-duration measurement.
[Java 8 Clock](https://docs.oracle.com/javase/8/docs/api/java/time/Clock.html).

For DTO contracts, use the production serializer and inspect actual wire
values, unknown fields, enum handling, precision, and timezone behavior.
Pair consumer expectations with provider verification; a generated schema or
mock-server response alone does not show the deployed provider satisfies it.
Keep compatibility fixtures when old and new consumers coexist.

Coverage measures executed code, not asserted behavior. Prefer a small
counterexample that fails before the repair and passes afterward. Use seeded
generated inputs when they broaden a meaningful invariant and retain failing
seeds; avoid imposing a new property-testing dependency for a simple case.
