# Validation record

## Version 0.5.2 — HTTP response-body timeout boundary

Closed the independent review's P2 in the modern-Java HTTP client rule. The
example now labels Java 11–21 request timeout as excluding body consumption.
The adjacent guidance distinguishes connection, header, body, and total-budget
controls, preserves existing read-timeout contracts during migration, and
requires actual cancellation/resource-release evidence for a deadline claim.
It also identifies the JDK 26 behavior change using the linked Oracle source.

### Executed validation

- A temporary Java fixture compiled with OpenJDK 25.0.2 `--release 11` and ran
  on OpenJDK 25.0.2 on macOS against its own loopback HTTP server.
- With a two-second request timeout, the server sent headers and one body byte,
  then held the remaining byte behind a latch. After the client observed the
  headers, a three-second Future.get timed out while the synchronous HTTP call
  remained pending. Releasing the body let that same call return the complete
  expected response. This also demonstrates that the caller wait timeout alone
  did not stop the HTTP operation.
- A separate route withheld headers and triggered HttpTimeoutException with a
  one-second request timeout, checking that request timeout was active.
- The fixture released latches in finally, stopped its server, and verified its
  owned caller/handler executors terminated. It did not establish a general
  cancellation implementation. The temporary fixture and outputs were removed.
- The original review agent re-read the corrected section, confirmed its P2 was
  closed, and found no new misleading guidance in this change. This was a focused
  content re-review, not a new full-package or independent execution evaluation.
- Official Codex skill/plugin and Claude Code plugin/marketplace validators
  passed. Package checks passed before and after the correction: ten skills,
  79 local links, 24 Java rules. All five checker tests passed.

### Limits

No Java 11/21 native runtime was available or executed; those version claims
rely on the primary documentation and the prior review's implementation-source
checks. The local execution above used JDK 25, not a simulated Java 11 runtime.
No JDK 26, production endpoint, HTTP/2/TLS, framework HTTP client, or cancellation
repair was exercised. Other skill content and Java examples were unchanged.

## Repository and plugin rename — java-engineering-skills

Renamed the local repository and plugin directory to `java-engineering-skills`.
Aligned both plugin identifiers, both marketplace names/source paths, display
and contributor names, README commands, skill-directory links, and checker
fixtures. The ten skill packages and their guidance are unchanged. Existing
versioned validation history retains the command paths used at that time.

Package validation passed before and after renaming. The final package has ten
independent skills, 79 local links, and 24 Java rules; all five checker tests
passed. Official Codex plugin validation, marketplace-name validation, and
Claude Code plugin/marketplace validation passed at the new path. Skill contents
were compared byte-for-byte across the directory move. No Java tests were
rerun because this change only affects naming, metadata, and package paths.

The repository remains local, uncommitted, unpublished, and uninstalled.

## Version 0.5.1 — recommendation quality and semantic corrections

Reviewed the ten skill entry points and their guidance for version boundaries,
unsupported guarantees, and missing failure conditions. This was a focused
editorial/semantic review, not exhaustive verification of every linked API or
all deployment combinations. Added recommendation admission criteria to
CONTRIBUTING.md and summarized the quality standard in README.md.

### Corrected guidance

- **JFR:** a reviewed per-recording configuration does not isolate collection
  from concurrent recordings. Added combined-setting scope and lifecycle limits,
  grounded in the Java 21 SettingControl contract.
- **Spring after commit:** specifying a transaction boundary was insufficiently
  precise. Added the risk of REQUIRED joining still-bound resources after the
  original commit, and a real REQUIRES_NEW boundary for work that needs its own
  commit. The Spring 5.3.31 TransactionSynchronization contract supports this;
  it does not make callbacks durable.
- **Record patterns:** added the Java 21 language specification's MatchException
  wrapping of a failing custom accessor, which can change an existing caller's
  exception handling. Added a regression case to Java21Checks.java.

Primary sources are linked beside each corrected rule. Other reviewed guidance
remains conditional on the actual versions, topology, business contract, and
failure/load assumptions; this review is not an error-free certification.

### Executed mechanism checks

- Java 21 example suite compiled with OpenJDK 25.0.2 `--release 21` and ran on
  that JDK. The added case distinguishes a direct accessor's original exception
  from pattern matching's wrapped exception and checks the cause.
- A separate self-created JVM used two JFR recordings with no predefined
  profile, enabling only a synthetic custom event in one and disabling it in
  the other. The latter's file still contained that event. This ran on OpenJDK
  25.0.2 with a Java 21 compilation target; no existing process was attached.
  No host-process/environment event was enabled for this check.
- A native Corretto 8u452 fixture used cached Spring 5.3.31 and H2 2.1.214 with
  TransactionTemplate/DataSourceTransactionManager. Inside an after-commit
  callback, REQUIRED was not a new transaction and its write was not visible
  to an independent connection before resource cleanup; REQUIRES_NEW committed
  and was visible. Another case verified that callback failure left the
  original database commit intact. This does not assert every driver's later
  cleanup behavior or test the annotation/proxy path.

The temporary JFR and Spring fixtures were removed after inspection. No library
was installed. The permanent record-pattern regression remains in tests/examples.

### Package checks

The official Codex plugin validator and validators for all three changed skills
passed. Claude Code plugin and marketplace validation passed. The package
checker passed with ten independent skills, 79 local links, and 24 Java rules;
all five checker tests passed. The same package checker also passed before
editing. These are structural results, separate from the mechanism checks above.

### Scope limits

No Java 21 runtime, Spring 6/Boot application, real MySQL/Redis/broker, production
load, or installed-plugin session was executed in this pass. No new independent
agent scenario was run; the checks above exercised concrete API mechanisms.
Package/link checks do not establish the semantic correctness of all guidance.
Earlier validation results and their limits remain recorded below.

## Version 0.5.0 — Mockito and test doubles

Expanded the existing `java-testing` skill with a focused mocking reference:
mock/stub/fake/spy selection, Mockito/JUnit setup, null matchers, spy stubbing,
argument capture, strictness, scoped static/construction mocks, instrumentation,
and version-aware Spring bean replacement. The plugin still has ten skills.

### Executed validation

- Official Codex skill/plugin and Claude Code plugin/marketplace validators passed.
- Package checks passed: ten independent skills, 77 local links, and 24 unchanged
  Java rules. Five checker tests passed before and after the expansion.
- Six focused JUnit tests verified the documented real-service fragment,
  anyString/null versus nullable matching, doReturn versus real spy invocation,
  outbound argument capture, void-method failure, and rejection of an unused
  stub in a strict Mockito session.
- Both native Corretto 8u452 compilation and OpenJDK 25.0.2 `--release 8`
  compilation succeeded; both test suites executed on Corretto 8 and passed.

These isolated tests used already cached JUnit 4.13.2, Mockito Core 4.5.1,
Byte Buddy/agent 1.12.23, Objenesis 3.2, and Hamcrest Core 1.3. No dependency
was installed or added to the plugin. The fixtures and compile outputs were
removed after inspection. The newer compiler emitted obsolete Java 8 target
warnings, with no compilation or test failure.

### Limits

This was focused API/example verification, not a new independent agent
evaluation. It did not run Mockito 5, inline/static/construction mocking,
Spring bean overrides, WireMock/MockWebServer, a full application build, or
real database/HTTP integration. Mockito/JDK and Spring version boundaries
were checked against primary documentation; those branches retain runtime
verification needs. Other skills and Java language examples were unchanged.

The repository remains local, uncommitted, unpublished, and uninstalled.

## Version 0.4.0 — MySQL table, index, and SQL design

Expanded `database-transactions` within the existing ten-skill plugin. The
database skill now focuses on MySQL/InnoDB, with 8.0/8.4 guidance and explicit
legacy 5.7 boundaries. PostgreSQL branches and sources were removed from this
skill; earlier validation history below remains a record of what ran then.

### Changes and checks

- Added table-design, index-design, and SQL-optimization references; retained
  transaction and ORM/migration guidance with MySQL-specific semantics.
- Covered identity, types/collation, constraints, soft deletion, generated
  uniqueness markers, composite/covering/expression indexes, plans, statistics,
  query equivalence, pagination, locking, retries, and online DDL.
- Official Codex plugin/skill and Claude Code plugin/marketplace validators passed.
- Package checks passed for ten independent skills, 76 local links, and the
  unchanged 24 Java language rules. Five checker tests passed before and after
  the expansion.

### Independent forward evaluation

An evaluator received only the skill and raw MySQL 8.0.34/5.7.44 scenario
artifacts in an isolated directory. The case combined nullable active-payment
uniqueness, exact currency storage, case-sensitive identities, and an orders
query with tenant skew, a date predicate, deep offset pagination, and a
cross-tenant background query. The primary agent inspected its report and SQL.

The proposal used a generated active marker with non-null business identity,
identified collation/padding and monetary-conversion boundaries, proposed a
half-open UTC date range and a workload-specific composite index, and retained
page-number navigation plus the index needed by the background query. It
separated deterministic tie-order refinement from the original query contract.
It rejected unsupported 5.7 reuse of enforced CHECK, 0900 collations, and
EXPLAIN ANALYZE, and did not claim an estimated plan proved a speedup.

The evaluation identified a useful precision caveat: CHECK on a DECIMAL column
sees an already converted value. Table guidance now explicitly requires
validating the original scale/range before binding when conversion is forbidden,
including every writer; schema conversion cannot recover lost DOUBLE precision.

### Limits

This was source-backed proposal evaluation and manual SQL review, not executed
MySQL validation. No MySQL executable/server was available or installed; no
DDL parsing by MySQL, concurrent-transaction test, migration rehearsal, actual
execution plan, or load comparison ran. Exact SQL mode, Connector/J patch,
data quality, production volume effects, and operational costs remain scenario
verification needs. Java examples were unchanged and were not rerun.

The plugin remains local, uncommitted, unpublished, and uninstalled.

## Version 0.3.0 — testing, API security, and JVM performance

Three new independent skills, each with three topic references, bring the
plugin to ten skills. Validation ran locally on macOS; earlier skill sources
and the existing language examples were preserved.

### Package and source checks

- Official Codex plugin validator and all ten official skill validations passed.
- Claude Code plugin and marketplace validators passed.
- `python3 scripts/check.py`: ten independent packages, 69 local links, and
  the original 24 versioned language rules passed.
- The five standard-library checker tests passed before and after the change.
- Primary references were checked against JUnit, Testcontainers, Spring,
  OWASP, IETF, OpenJDK, and Java documentation. Version anchors are not claims
  that a historical dependency is the currently recommended release.

### Independent scenarios and executed checks

Evaluators received only the new skill paths, raw fixtures, and realistic
requests in isolated temporary directories. The primary agent inspected the
generated code and execution records.

| Skill | Observed evidence |
|---|---|
| java-testing | A delayed asynchronous increment used controlled barriers and observed its Future; background failure was surfaced. Two JUnit 4.13.2 tests passed on Java 8. |
| java-api-security | Scoped repository/cache access by authenticated tenant and checked resource ownership on cold and cached reads. Thirty-four assertions covered two tenants, two owners in one tenant, forged tenant input, malformed identity, and unchanged denial/response contracts. |
| jvm-performance | A self-created JVM ran for approximately 14 seconds and exited normally. A five-second JFR recording succeeded on OpenJDK 25.0.2; an NMT baseline request returned “not enabled,” confirming that command exit success alone was insufficient evidence. |

The testing evaluator rejected JUnit 6 on the required Java 8 test JVM and
identified Failsafe lifecycle and mocked-database evidence gaps. The performance
evaluator treated direct/native memory growth as an investigation lead rather
than a proven leak, and rejected an unsupported heap increase, collector
switch, and single-loop benchmark improvement claim.

Testing and API fixtures compiled with native Corretto 8u452 and OpenJDK
25.0.2 `--release 8`; both compiled variants executed on Java 8. The JUnit
checks used existing cached dependencies. A separate Java 8 check verified
the documented Clock example before, at, and after its expiry boundary.

### Evidence-driven correction

The initial JFR experiment used the default profile and discovered host
process events outside the intended single-process evidence scope. The
evaluator did not print their payloads, filtered the retained recording, and
removed the original recording. The collection guide now requires reviewing
enabled events before recording, points to the JDK 21 default configuration,
and uses a reviewed JFC profile in its example. Post-collection filtering is
explicitly distinguished from preventing collection in the first place.
The evaluator then constructed a reviewed profile enabling only two relevant
events and statically checked its XML and event scope; no second JVM recording
was run. All temporary evaluation recordings were removed after inspection.

### Limits

No real HTTP/security filter chain, JWT validation, PostgreSQL, broker, or
Testcontainers execution was performed for these scenarios. Pure service
access checks do not establish cache revocation behavior after ownership
changes. The synthetic Java 21/Linux memory incident was not reproduced:
the local JFR experiment ran on JDK 25/macOS and established tool behavior
only. No JMH benchmark or service load comparison was executed. Diagnostic
conclusions must retain these evidence boundaries.

No dependencies were installed into the project, and no existing user JVM
was attached to or restarted. The plugin remains local, uncommitted,
unpublished, and uninstalled.

## Version 0.2.0 — backend skill expansion

Validated locally on macOS. Six new skills extend the original Java language
skill: design, concurrency, Redis, messaging, Spring Boot, and database
transactions. The original 24 language rules and compiler examples are unchanged.

### Package checks

- Official Codex plugin validator: passed.
- Official skill validator: all seven entrypoints passed.
- `claude plugin validate ./plugins/modern-java-guidelines`: passed.
- `python3 scripts/check.py`: manifests, marketplace targets, licenses, seven
  independent skill packages, 56 local links, and 24 versioned rules passed.
- `python3 -m unittest discover -s tests -p 'test_*.py'`: five tests passed,
  including rejection of cross-skill dependencies, orphan references, incorrect
  skill names, and broken nested references.

### Independent forward evaluations

Two independent evaluators received raw case evidence, a user request, and the
relevant skill path, without expected answers. The primary agent inspected the
resulting code, checks, and proposals.

| Skill | Scenario and observed outcome |
|---|---|
| Design | Two fixed Java 8 pricing plans: retained the simple implementation, rejected speculative registry/factory/singleton layers, and added contract assertions. |
| Concurrency | Replaced a volatile check/increment gate with atomic CAS admission. Controlled tests checked capacity, rejection, release, reuse, bounded waits, and executor termination. |
| Spring Boot | Moved a transaction boundary from a private self-invoked method to the public managed entrypoint. A real Spring proxy/JDBC transaction test verified both successful commit and rollback after the second insert failed. |
| Redis | Replaced split lease acquisition/release with atomic commands/scripts; identified expiry and asynchronous failover windows; retained authoritative SQL state/identity guards against stale or duplicate settlement. |
| Messaging | Preserved the completed prefix of asynchronously processed Kafka records, used transactional SQL inbox/outbox records, and accounted for rebalances, duplicate publication, ambiguous acknowledgements, and ordering. |
| Database | Proposed a conditional stock decrement with a unique operation identity and saved outcome in the same PostgreSQL transaction; specified concurrent duplicate, rollback, lost-response, and input-boundary cases. |

The design, concurrency, and Spring fixtures compiled with OpenJDK 25.0.2
`--release 8` and native Corretto 8u452; both compiled variants ran on JDK 8.
The gate check ran 100 controlled rounds per run with 24 callers and capacity 3.
The Spring check used already cached Spring 5.3.31 and H2 2.1.214, matching the
Boot 2.7.18 dependency versions, with an explicit test-support repository because
the fixture omitted its production implementation. No dependencies were installed.

The Redis, messaging, and database evaluations produced failure timelines and
concrete repair/test proposals. They were inspected against the supplied facts
and official documentation; no Redis, broker, or PostgreSQL service was executed.
The evaluators found no missing or contradictory skill instructions. Where the
fixture's product version differed from a reference link, they checked the
deployed version's documentation before applying its semantics.

### Limits

The Spring check exercised a managed Spring context, JDBC, and H2; it did not
execute a full Boot application, HTTP server, or production database. It cannot
establish PostgreSQL locking/isolation behavior. Concurrency checks sample
controlled schedules, not every interleaving. No live middleware failure
injection, Boot 3 runtime, Windows/Linux execution, or installed-plugin session
was performed. The original language examples were not rerun for this
documentation expansion; their earlier results are recorded below.

The repository remains local, uncommitted, unpublished, and uninstalled.

## Version 0.1.0 — initial language skill

Validated locally on macOS for the initial `0.1.0` package.

### Packaging

- Official Codex `plugin-creator` validator: passed.
- Official `skill-creator` validator: passed.
- `claude plugin validate`: plugin and marketplace passed without warnings.
- `python3 scripts/check.py`: plugin metadata, marketplace targets, local links,
  and all 24 rule/version/source entries passed.
- Isolated negative checks: a changed index version, broken document pointer,
  and wrong marketplace source were each rejected.

The official Python validators were run with an isolated `uv --with pyyaml`
environment because the default Python did not have PyYAML. PyYAML is not a
dependency of this plugin or its repository check scripts.

### Compiler and contract examples

`scripts/check_examples.py` passed for Java 8, 11, 17, and 21 release targets
compiled with OpenJDK 25.0.2 and executed on that JDK. The Java 8 sample also
compiled and executed on Corretto 8u452.

Examples exercised lazy fallbacks, null map initialization, mutable stream
results, snapshot/view differences, whitespace differences, malformed UTF-8,
record shallowness, text-block contents, null-tolerant unmodifiable stream
results, type patterns, reversed views, and owned executor completion.

OpenJDK 25 reported obsolete-target warnings for Java 8; compilation and
execution succeeded. These checks sample important boundaries rather than
compile every documentation fragment.

### Independent skill scenarios

An independent agent received the skill, raw fixture files, and realistic
requests in an isolated temporary workspace, without expected answers.

| Scenario | Observed outcome |
|---|---|
| Maven parent release 8; developer JDK 21 | Kept Java 8, selected an explicitly mutable collector, retained null filtering and encounter order. |
| Gradle toolchain/test release 21; production release 17 | Used Java 17 `instanceof` binding and retained a live null-tolerant unmodifiable view. |
| Java 21 with preview disabled | Generated a pattern switch preserving null handling and outputs; correctly identified executor closure/admission-limit changes in a proposed virtual-thread conversion. |

The evaluator compiled all three modified fixtures at their resolved releases
and ran focused behavior assertions. The Maven fixture additionally ran on
JDK 8. Resulting sources were inspected by the primary agent.

### Remaining scope at 0.1.0

No Java 11, 17, or 21 runtime was executed; those release-target samples ran on
JDK 25. No Maven/Gradle build, framework integration, virtual-thread load test,
Windows/Linux execution, or installed-plugin end-to-end session was performed.
The plugin has been packaged and validated locally, not published or installed.
