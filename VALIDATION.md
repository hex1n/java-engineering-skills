# Validation record

## Unreleased — reference accuracy corrections and OceanBase MySQL mode

### OceanBase MySQL-mode reference

Added `database-transactions/OCEANBASE.md` with a pointer from the skill entry,
which now names OceanBase MySQL mode in its description. The reference covers
version identification, isolation and write conflicts, locking reads, timeouts,
auto-increment, online/offline DDL, partitioned indexes, plan evidence, and
weak-consistency reads. Each section cites OceanBase V4.2.1 LTS documentation;
the 4.3.5 page is cited only for DDL blocking, which the 4.2.1 page leaves
unstated. English documentation pages returned HTTP 429, so the Chinese V4.2.1
pages were used. Two of the cited pages were re-fetched to confirm the quoted
passages and their V4.2.1 label.

Read-only checks on a 4.2.1.10 MySQL tenant:

- `VERSION()` returned `5.7.25-OceanBase-v4.2.1.10`, `OB_VERSION()` returned
  `4.2.1.10`, and `ob_compatibility_mode` was `MYSQL`.
- Session values matched the documented defaults: READ-COMMITTED,
  `ob_query_timeout` 10 s, `ob_trx_timeout` and `ob_trx_idle_timeout` 24 h,
  `ob_trx_lock_timeout` -1, `auto_increment_cache_size` 1,000,000.
- `EXPLAIN` accepted `FOR UPDATE NOWAIT`, `FOR UPDATE WAIT 1`, and
  `LOCK IN SHARE MODE`; the last was planned as a `FOR UPDATE` operator.
  `FOR UPDATE SKIP LOCKED`, `FOR SHARE`, and `EXPLAIN ANALYZE` were syntax
  errors. A CTE with a window function was accepted, and
  `EXPLAIN EXTENDED_NOADDR` returned outline data and pruned index names.
- The application account was denied `GV$OB_SQL_AUDIT`.

A fresh evaluator received only the skill directory and a task on a
`5.7.25-OceanBase-v4.2.1.10` database: claim jobs across four instances, update
two million rows nightly, and widen a DECIMAL column. It identified OceanBase
rather than MySQL 5.7, claimed jobs with a conditional lease `UPDATE` instead of
`SKIP LOCKED`, `FOR SHARE`, or `GET_LOCK()`, batched the update under the
10-second statement timeout with `ROLLBACK` after timeouts, treated the type
change as offline DDL with a write-outage rehearsal, and avoided REPEATABLE
READ and `EXPLAIN ANALYZE`. It also reported that the reference did not say
whether READ COMMITTED re-evaluates an `UPDATE` predicate after a lock wait.
The two 4.2.1 pages contradict each other on that point, so the reference now
states both, requires a two-connection test, and adds owner fencing.

Not executed: concurrent write conflicts, including that READ COMMITTED
re-evaluation question, ERROR 6235 retries, lock-wait and deadlock errors,
statement/transaction timeout recovery, auto-increment jumps, or any DDL; only
syntax and plan acceptance were observed. Other 4.2.1 pages disagree on the
older 100 s transaction timeout and on the default index scope; the reference
follows the pages that agree with each other and with the tenant's values.

### Reference accuracy corrections

An independent line-by-line review of every reference file found one factual
error and four statements that needed narrowing or a matching source:

- `use-modern-java/JAVA12-20.md` executor-close: explicit shutdown applies to
  Java 8–18, not 8–17; `ExecutorService.close()` is `@since 19`.
- `use-modern-java/JAVA8.md` standard-base64: the commons-codec example matches
  `Base64.getEncoder()` only from commons-codec 1.5; the Base64 javadoc records
  that 1.4 `encodeBase64String` chunked its output.
- `database-transactions/CONSISTENCY.md`: the MySQL 8.0.1 release notes add
  `NOWAIT` and `SKIP LOCKED`, so no 5.7 release has them. The previous wording
  implied a 5.7 release might.
- `spring-boot-engineering/TRANSACTIONS-AND-ASYNC.md`: a crash after commit
  loses the `AFTER_COMMIT` listener invocation; the publishing transaction has
  already committed.
- `jvm-performance/COLLECTION.md`: the cited `java` launcher page did not
  support the claim that cross-JDK tools are unsupported, and neither the Java
  21 `jcmd` page nor the Java 21 troubleshooting guide states it. The text now
  says the documentation makes no cross-release promise and cites the `jcmd`
  same-machine, same-user requirement instead.
- `tests/check.test.mjs`: the CRLF fixture replaced `\n` with `\r\n` on files a
  Windows `core.autocrlf=true` checkout already stores as CRLF, producing
  `\r\r\n` and a false failure. The fixture now normalizes line endings first.

### Installation commands

`claude plugin marketplace add .` fails with `Invalid marketplace source
format. Try: owner/repo, https://..., or ./path`. The README now uses `./`,
which both CLIs accept. Installed from a local clone on Windows: Claude Code
registered the directory marketplace and installed the plugin at 0.6.0 (user
scope), and `codex plugin marketplace add` plus `codex plugin add` installed
the same version, whose cache contains the new OceanBase reference. Codex
copies the plugin into a version-named cache directory, so a later change
without a version bump may not be picked up.

### Executed validation

- On Windows with Node.js 26.7.0, node scripts/check.mjs passed after both
  changes: ten skills, 91 local links and 32 Java rules. `claude plugin
  validate` passed for the plugin.
- All 14 Node.js tests passed on an LF checkout and on a `core.autocrlf=true`
  checkout. Before the fixture change, the CRLF checkout failed that test.
- Java examples were unchanged. On the same tree, check-examples passed Java 8
  on Zulu 8u482 and Java 11/17 targets on OpenJDK 17.0.20.1; no Java 21
  compiler was available, so the Java 21 suite was not executed.
- git diff --check passed.

### Limits

Source passages were checked against the current online MySQL 8.0.1 release
notes, commons-codec API docs, and Java 21 `jcmd` and troubleshooting pages.
The rest of the review was offline reading; no Redis, MySQL, broker, or Spring
behavior was newly executed. Manifest versions were not bumped. No commit,
push or plugin installation was made.

## Node.js script migration

Replaced both repository-owned Python tools and their unittest suite with
Node.js built-in modules. Current maintenance requires Node.js 22+ and no npm
dependencies. README and contributor commands now use check.mjs,
check-examples.mjs, and the built-in test runner. Earlier records below retain
the commands actually executed at those points; they are historical evidence,
not current setup instructions. No Python tool was executed for this migration.

### Executed validation

- On macOS with Node.js 26.0.0, node scripts/check.mjs passed: ten skills,
  90 local links and 32 Java rules, matching the pre-migration package counts.
- All 14 Node.js tests passed. They retain the five original package scenarios
  and check metadata equality, anchors/code fences, rule versions/sources, and
  CLI error handling. Fixtures run from another working directory and paths
  containing spaces; CRLF Markdown is also checked. Deliberate corruptions must produce a failing exit status.
- The Node.js example runner compiled and ran both Java 8 suites on native
  Corretto 8u452. A repeated release argument was accepted and deduplicated.
- The same runner compiled Java 8/11/17/21 targets and executed all five suites
  on OpenJDK 25.0.2. The compiler emitted the expected obsolete Java 8 target
  warnings. No native Java 11/17/21 execution is claimed.
- git diff --check passed. No repository-owned Python scripts remain, and
  current README/contributor commands contain no Python dependency.

The runner retains explicit toolchain selection, compiler version checks,
argument-vector invocation, runtime identification, and temporary output
cleanup. All JDK subprocesses now have a 30-second timeout; previously only
example execution was timed. Duplicate target arguments now run once instead
of failing on a duplicate output directory. These are intentional CLI changes.
Node.js 22 and other operating systems were not executed in this iteration;
only Node.js 26 on macOS was exercised. Skill guidance and Java examples were
unchanged by this migration. No commit, push or plugin installation was made.

## Version 0.6.0 — Java 8 coverage and cross-skill gaps

Added eight Java 8 decision rules covering functional interfaces, method
references, stream pipelines, collectors, parallel streams, interface default
and static methods, and Optional composition. The index now contains 32 rules,
13 with a Java 8 minimum. Added six topics across five other skills: Redis TTL
mutation, Spring declarative caching, Kafka failures before the listener,
MySQL replica reads, concurrent containers, and context on reused threads.

An independent agent inspected the other nine skills for coverage gaps and
re-reviewed these additions against their entry points and selected official
sources. It found no definite issue requiring correction in the final revision.
This is a focused coverage and semantic review, not a completeness certificate.

### Executed validation

- On macOS, the permanent Java 8 suites compiled and ran on native Corretto
  8u452. They also compiled with OpenJDK 25.0.2 `--release 8` and ran on that JDK.
  The new Java8FunctionalChecks covers receiver evaluation and failure timing,
  capture semantics, stream lifecycle and short-circuiting, collector conflicts
  and nulls, sequential/parallel reductions, default-method resolution, static
  factories, and Optional composition. The example checker now includes it.
- An independent forward evaluation used the updated skill to modernize an
  isolated Java 8 catalog fixture. It preserved dynamic Sink selection by
  retaining a lambda, preserved mutable results, duplicates and encounter order,
  and added a derived default isEmpty method. Native Corretto 8 passed 29
  contract assertions on the original implementation and the same 29 using the
  updated implementation with old caller binaries. Eight further assertions
  checked defaults, including a synthetic implementation compiled against the
  old interface. The evaluator reported no execution-blocking skill ambiguity.
- A native Java 8 fixture with locally cached Spring Framework 5.3.31 exercised
  real caching proxies and ConcurrentMapCacheManager. It reproduced tenant
  leakage from an incomplete key, verified distinct tenant keys and cache hits,
  and confirmed self-invocation bypassed the proxy.
- A separate native Java 8 fixture verified ThreadLocal removal between reused
  worker tasks and restoration after nested failure. It checked bounded queue
  admission and reproduced a ConcurrentHashMap size-then-put race with two
  synchronized callers. Owned executors terminated after the checks.
- Package checks passed before and after the changes. The updated package has
  ten independently distributable skills, 90 local links and 32 Java rules.
  All five checker tests, official Codex validators for all ten skills and the
  plugin, Claude Code plugin/marketplace validation, and git diff --check passed.

The forward evaluation's code, assertions and execution log were inspected.
Temporary evaluation and mechanism fixtures were removed after inspection;
the permanent Java 8 functional suite remains under tests/examples.

### Limits

No live Redis, MySQL replication or Kafka environment was exercised. Their new
guidance rests on linked primary sources and semantic review. The Spring check
does not validate Redis-backed caches, distributed synchronization, transaction
rollback, or Spring 6/Boot 3. No native Java 11/17/21 runtime, Maven lifecycle,
production load, other operating system or installed-plugin discovery was
tested in this iteration. Known mixed-version interface examples do not prove
compatibility with unknown external implementations. These edits are local;
no new commit, push, release or plugin installation was performed in this step.

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
