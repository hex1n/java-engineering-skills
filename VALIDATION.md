# Validation record

## Unreleased — use-modern-java within Codex's 8000-byte cut — 2026-11-26

`use-modern-java/SKILL.md` was 8497 bytes, above the 8000 bytes at which Codex
cuts a plugin skill, so a `$use-modern-java` mention injected a truncated body.

Changes:

- The coverage boundary moves word for word to `VERSION.md#coverage-boundary`;
  SKILL.md keeps a pointer naming preview and incubator features, framework or
  library migrations, Android and Java beyond 21. The steps are reworded more
  tightly with the same content. The description, the shared Report section,
  the step 3 examples and the rule index are unchanged. SKILL.md is now 7836
  bytes.
- `scripts/check.mjs` fails any `SKILL.md` over 8000 bytes on disk. On the
  previous file it reports `SKILL.md over 8000 bytes: use-modern-java (8497)`.

Executed:

- `node --test "tests/*.test.mjs"`: 61/61 (one new). `node scripts/check.mjs`:
  pass.
- Claude Code 2.1.332, `claude plugin eval --tag use-modern-java`, plugin arm
  only, sonnet judge, three runs per case, README read grant, before and after
  in parallel ($0.97 and $1.04):

| Case | Loaded before → after | Passed before → after |
|---|---|---|
| java8-release-idioms | 3/3 → 3/3 | 3/3 → 3/3 |
| java8-release-idioms-zh | 3/3 → 3/3 | 3/3 → 3/3 |
| neg-modern-java-no-framework-skills | 0/3 → 1/3 | 0/3 → 1/3 |
| neg-modern-java-no-framework-skills-zh | 2/3 → 3/3 | 2/3 → 3/3 |

Every failure was the skill not loading; the answer criteria (release 8
mutability, null behavior) passed in 12 of 12 runs both times, and no framework
skill loaded. Whether a skill loads depends on its description, which did not
change, so the English negative's 0/3 and 1/3 are routing noise on the same
text (5 of 6 across English and Chinese in the 2026-11-25 routing run).

Not verified:

- A real Codex run with the 7836-byte file.
- Whether the loaded skill opened the moved coverage section; no case asks
  for a preview feature or a framework migration, and the traces were not kept.

## Unreleased — Codex rollout format checked against source, hook paths measured — 2026-11-25

The statistics script and the hook's reading of Codex were written against an
assumed rollout layout. This round checks that layout against the openai/codex
source and measures each hook path with the Claude CLI.

Changes:

- The hook counts a skill the user names in Codex (`$<skill>`) as loaded. The
  host puts the skill into a user message `<skill><name>…</name><path>…</path>`
  followed by the whole `SKILL.md`; the hook accepts it when the path ends in
  `skills/<skill>/SKILL.md` and the text holds the current body.
- An Edit that replaces only a `<version>` line in `pom.xml` is judged by the
  `<parent>` or `<dependency>` block the line sits in, read from the file on
  disk. A Spring Boot parent or `spring-boot-dependencies` BOM now reminds about
  spring-boot-engineering; the project's own version and other dependencies do
  not.
- Statistics:
  - A Codex developer message is no longer taken as the model's text, so a
    load after a reminder counts as `hook`, not `model`.
  - An edit whose tool reported an error (Claude Code `is_error`) is not
    counted.
  - Codex rollouts are read from `$CODEX_HOME` (default `~/.codex`)
    `sessions/` and `archived_sessions/`.
  - Compressed `.jsonl.zst` rollouts are counted, skipped, and reported on
    stderr.
  - Explicit loads in both runtimes now come from the hook's own reader.

Checked against source (openai/codex, commit `06f334aa`, 2026-11-25; no real
Codex rollout was read or produced):

- Rollout location:
  - `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-<time>-<thread id>.jsonl`.
  - Archived threads move to `archived_sessions/`.
  - Compression to `.jsonl.zst` sits behind the feature
    `local_thread_store_compression`, which is off by default.
- Line layout: `{timestamp, type, payload}`, where type is one of
  `response_item`, `event_msg`, `turn_context`, `session_meta`, `compacted`.
  Tool calls are `function_call` (`arguments` is a JSON string) or
  `custom_tool_call` (`input`), each with a `*_output` carrying `call_id`.
  `function_call_output` serialises only its output; `success` is not written.
- Named skill: `SkillInstructions` in `ext/skills/src/fragments.rs` renders the
  `<skill>` user message. The text is the whole file read from disk,
  frontmatter included. It is cut at 8000 bytes (`MAX_SKILL_PROMPT_BYTES`) for
  plugin skills.
- Hook output:
  - additionalContext is recorded as a `developer` message
    (`core/src/hook_runtime.rs`).
  - A PreToolUse deny becomes the tool output `Command blocked by PreToolUse
    hook: {reason}. Command: …` or `Tool call blocked by PreToolUse hook:
    {reason}. Tool: …`.
- Assumptions that matched: the date-sharded path, the call and output shapes,
  and the refusal text inside the tool output.

Executed:

- `node --test "tests/*.test.mjs"`: 60/60. Five new tests fail on the previous
  hook and script. `node scripts/check.mjs`: pass.
- Claude Code 2.1.332, haiku, `--plugin-dir`, a throwaway Maven project under
  the home directory (not the temp directory). Ten `claude -p` runs, about
  $0.06, plus two interactive sessions:
  - A main-code Edit was refused; the agent loaded use-modern-java and the
    retry went through.
  - `/java-engineering-skills:use-modern-java`, in `-p` and interactively, was
    followed by a main-code Edit with no refusal.
  - A fresh session's `java.version` 17 → 21 in `pom.xml`, `-p` and
    interactive, went through with one use-modern-java reminder.
  - The same edit in the session that had typed the slash command gave no
    reminder, because the skill was already loaded.
  - In one session, a Boot parent change reminded about
    spring-boot-engineering and a Gradle `VERSION_21` about use-modern-java. A
    third build edit gave none (once per session).
  - A bare `<version>3.2.0</version>` line edit gave no reminder on the
    previous hook. With this change the same run got the spring-boot-engineering
    reminder.
  - A test-file Edit was refused naming java-testing and use-modern-java; both
    loaded, and the retry went through.
  - An Edit whose `old_string` was not in the file failed in Claude Code's own
    input check, before PreToolUse ran. The previous statistics counted it as
    an edit.

Not verified:

- Any real Codex rollout or Codex run.
- In Codex, the model loading a skill by reading `SKILL.md` with a command
  other than `cat`, `type` or `Get-Content` (for example `sed -n 1,200p`) is
  not recognised by the hook. How often that happens was not measured.
- A failed tool call in Codex cannot be told apart in the rollout, so a failed
  Codex edit still counts.
- `use-modern-java/SKILL.md` is 8497 bytes, above Codex's 8000-byte cut, so a
  `$use-modern-java` mention injects a truncated body and does not count as
  loaded. The skill text is outside this change.

## Unreleased — OceanBase no-plugin baseline, a Java 25 executor case, and probes for java-concurrency and java-design — 2026-11-26

Changed:

- `evals/oceanbase-job-claim{,-zh}/graders/engine-recognized.md`: the line on
  SKIP LOCKED now turns on which claim design the answer writes out for use.
  Suggesting SKIP LOCKED as a later alternative to adopt only after it is
  verified passes when the main design is the conditional UPDATE; a main
  design built on SKIP LOCKED or FOR SHARE, with the conditional UPDATE only
  as a fallback, fails. The live run had judged near-identical no-plugin
  answers PASS in Chinese and FAIL in English.
- `skills/java-concurrency/SKILL.md`: the description adds CompletableFuture
  or executor code that behaves differently after a JDK upgrade, and the
  TASKS.md pointer says it records where the default async executor differs
  between Java releases. TASKS.md itself is unchanged.
- New case `evals/java25-async-default-executor` (English only,
  `discriminating`): a Spring Boot service moves from Java 21 to Java 25 on
  2-CPU pods and an 8-way `supplyAsync` fan-out of blocking calls goes from
  about 320 ms to about 2.4 s.

Executed, Claude Code 2.1.332, sonnet agent and judge:

- `oceanbase-job-claim`, `oceanbase-job-claim-zh`, `oceanbase-mixed-alter`,
  with-without, 3 runs each ($3.79). With plugin every grader passed in all
  9 runs, each reading OCEANBASE.md. Without plugin: job-claim English
  `engine-recognized` 0/3 (1/3 under the reworded grader) and
  `timeouts-and-ddl` 1/3; Chinese 3/3 and 0/3; mixed-alter `rollout` 1/3.
  The `timeouts-and-ddl` failures are four answers that give
  `ob_trx_timeout` a default of about 100 s and one that never ties the batch
  size to `ob_query_timeout`. The two mixed-alter failures plan safely but
  leave the classification of the drop or the AFTER add open. With round 7,
  mixed-alter stands at 9/9 with plugin and 3/9 without under the current
  grader.
- Grader replays, 3 votes each ($1.58 and $0.95): under the final wording
  the English no-plugin answers that lead with SKIP LOCKED fail, the
  English and Chinese no-plugin answers that keep it as a verified-later
  alternative pass, the round-6 no-plugin answer that passed before still
  passes, earlier plugin answers pass, and the hand-written SKIP LOCKED and
  no-ownership-check answers fail.
- `java25-async-default-executor`, with-without, 3 runs ($0.60): 0/3 on
  both arms; the plugin arm loaded the skill once and never read TASKS.md.
  After the SKILL.md change, plugin arm only, 3 runs ($0.38): 3/3, each
  loading java-concurrency and reading TASKS.md. Neighbours after the
  description change, plugin arm, 2 runs each ($0.59):
  `java8-release-idioms` and `boot-2.3-to-2.7-on-java-8` passed and loaded
  only their own skill.
- JDK 21.0.13, `-XX:ActiveProcessorCount=2`: common pool parallelism 1,
  `defaultExecutor()` is `ThreadPerTaskExecutor`, 8 blocking 300 ms tasks
  finish in about 300 ms on 8 new threads; the same tasks on a
  `ForkJoinPool(1)` take about 2.4 s on one worker. JDK 21 swaps a
  parallelism-1 `commonPool()` passed to `supplyAsync` for the thread-per-task
  executor, so a separate pool stood in for Java 25's.
- Source: jdk-21-ga `CompletableFuture` uses the common pool only when its
  parallelism is above 1; jdk-25-ga sets `ASYNC_POOL =
  ForkJoinPool.asyncCommonPool()`, which raises parallelism only from 0 to 2,
  and has no `screenExecutor`; `ForkJoinPool` sizes the common pool at
  `availableProcessors() - 1`, at least 1. A non-pool thread calling `join`
  does not help run the queued tasks.
- No-plugin probes, sonnet, 2 runs each ($0.39): the Java 25 fan-out (both
  runs blamed container CPU detection or compensation threads); Java 25
  virtual threads with a PR replacing `synchronized` and adding
  `jdk.tracePinnedThreads`; cross-thread nested `computeIfAbsent` on one
  `ConcurrentHashMap`; a retry Decorator around a payment charge inside
  `@Transactional`; adding a permitted subtype to a sealed interface whose
  consumers do not recompile. Only the first separated; the other four were
  answered correctly without the plugin and were not added. The
  `computeIfAbsent` deadlock (two threads BLOCKED, nothing thrown) and the
  `MatchException` for a consumer compiled before the new subtype were
  confirmed on JDK 21.

Not verified:

- Java 25 was not run: no JDK 25 binary could be fetched here. The Java 25
  behaviour comes from jdk-25-ga source. A Java 25 worker blocked in a call
  that goes through `ForkJoinPool.managedBlock` (for example `HttpClient.send`,
  which waits on a `CompletableFuture`) may be compensated with an extra
  worker; the case's symptoms assume a plain blocking socket call.
- java-design still has no `discriminating` case; the two design probes this
  round and the one in round 7 were answered correctly without the plugin.
- The new case and description were measured on sonnet only, not Codex.

## Unreleased — OceanBase 4.2.1 DECIMAL widening measured on a real instance — 2026-11-26

Changed:

- `skills/database-transactions/OCEANBASE.md`, DDL section: the earlier text
  said a `DECIMAL` precision-and-scale widening was unconfirmed and to plan
  for offline. It now states the measured result: on OceanBase CE 4.2.1.10, a
  `DECIMAL` change that keeps or raises both the scale and the integer digits
  is online, also when the column is indexed, in a unique key, the primary
  key or the partition key; lowering the scale or precision, or raising the
  scale alone, rebuilds the table. The column-type page's "referenced by an
  index or key makes it offline" rule is kept as documented with a note that
  it did not hold for these widenings or for lengthening an indexed
  `VARCHAR`. It adds that a concurrent single-row write waited for the whole
  offline DDL on 4.2.1.10. Other deployments are told to rehearse and check
  `table_id`.
- `evals/oceanbase-job-claim{,-zh}/graders/timeouts-and-ddl.md`: the facts
  paragraph adds the measurement; pass condition 2 accepts "expected online
  on 4.2.1" alongside "offline" and "must be confirmed", still requires a
  same-version rehearsal, and asks for what to do if the rehearsal shows a
  rebuild instead of a full offline plan. Fail clauses unchanged.

Executed, on `oceanbase/oceanbase-ce:4.2.1-lts` (`OB_VERSION()` 4.2.1.10) in
docker, `MODE=mini`, one observer, 4 cores and 15 GB host. The sandbox's hard
`nproc` limit (64271) is below obd's 120000, so the obd start check for it was
turned from critical into an alert; nothing in the observer was changed. Each
statement ran on a 1,000-row and a 1,048,576-row copy of the same table, all
created on that version. Signals: `table_id` in `oceanbase.__all_table` before
and after; elapsed time at both sizes; the `ddl_type` rootservice.log records
for the statement; and, for three statements, single-row writes from a second
session every 0.1 s.

| ALTER | `table_id` | time 1k / 1M rows | `ddl_type` |
|---|---|---|---|
| `varchar(32)`→`varchar(64)`, `int`→`bigint` | same | 0.04–0.08 s / 0.06–0.07 s | 10001 |
| `decimal(10,2)`→`(16,2)`, `(8,2)`→`(9,2)`, `(8,2)`→`(10,2)`, `(16,2)`→`(18,2)`, `(19,2)`, `(38,2)`, `(40,2)` | same | 0.04–0.05 s / 0.05–0.07 s | 10001 |
| `decimal(16,2)`→`(20,4)`, `(10,2)`→`(16,4)`, `(16,2)`→`(18,4)` | same | 0.04–0.05 s / 0.05 s | 10001 |
| `decimal(16,2)`→`(20,4)` or `(19,2)` on an indexed column; `(20,4)` in a unique key, as the primary key, as the KEY partitioning column | same (index table's own id also same) | 0.04–0.06 s / 0.04–0.06 s | 10001 |
| `decimal(16,2)`→`(16,4)`, `(14,2)` with values that do not fit | rebuilt, then ERROR 1264 | 0.5 s / 3.5–4.0 s | 1001 |
| `decimal(16,2)`→`(14,2)` with values that fit, `(16,2)`→`(16,1)` | new | 0.36–0.47 s / 6.4 s | 1001 |
| `decimal(16,2)`→`(20,4)` together with `drop column` | new | 0.46 s / 4.1 s | 1010 |
| `drop column` | new | 0.38 s / 2.2 s | 1006 |
| the `oceanbase-mixed-alter` statement (AFTER add, end add, drop) | new | — / 2.2 s | 1009 |

Concurrent writes on 1,048,576 rows: during `decimal(16,2)`→`(16,1)` (8.35 s)
the UPDATE issued at its start returned after 8.33 s and no other statement
ran meanwhile; during `decimal(16,2)`→`(20,4)` the slowest of 30 UPDATEs took
0.12 s; during the mixed statement the INSERT issued at its start waited
2.12 s, the whole statement. After the indexed widening, a lookup by the new
value used the index and returned all rows.

Eval, Claude Code 2.1.332, sonnet judge:

- `oceanbase-job-claim` English and Chinese, plugin arm only, 3 runs each
  ($1.46): all three graders 6/6; every run read OCEANBASE.md; all six
  answers called the widening expected-online, asked for a rehearsal that
  checks `table_id`, said what to do on a rebuild, and limited the
  measurement to its single-node setting.
- Grader replay, 3 runs × 3 votes ($0.73): a hand-written answer that calls
  the widening online and checks `table_id` on a copy first, and a round-5
  plugin answer that treats it as offline, both pass 9/9; the round-5
  hand-written answer that runs it directly in production with no rehearsal
  fails 9/9.

Not verified: a distributed (multi-zone) cluster; 4.2.1 builds other than
.10 and other 4.x versions; tables created before an upgrade to 4.2.1; a
foreign-key column; the without-plugin arm under the revised grader, so the
case's DDL discrimination is not re-measured.

## Unreleased — Java 25 default async executor in java-concurrency — 2026-11-26

Changed:

- `skills/java-concurrency/TASKS.md`: the old text said Java 25 "uses
  `ForkJoinPool.asyncCommonPool()`" and cited JDK-8363552. That method is
  package-private, not API, and JDK-8363552 is a SubmissionPublisher
  javadoc fix. The text now says Java 25 drops the thread-per-task fallback
  and always uses the common pool, raising its parallelism from 0 to 2 when
  needed, cites JDK-8319447 and the jdk-25-ga source, and notes that the
  Java 25 `defaultExecutor()` javadoc still describes the old fallback.

Executed:

- Read `CompletableFuture.java` at jdk-21-ga, jdk-24-ga and jdk-25-ga and
  `ForkJoinPool.java` at jdk-25-ga. 21 and 24 pick
  `ForkJoinPool.commonPool()` only when its parallelism is above 1 and
  otherwise a `ThreadPerTaskExecutor`. 25 sets `ASYNC_POOL =
  ForkJoinPool.asyncCommonPool()`, declared `static` with no `public`, which
  CASes the common pool's parallelism from 0 to 2 and returns the common
  pool.
- Ran a probe on JDK 21 with `java.util.concurrent.ForkJoinPool.common.parallelism`
  set to 0, 1 and 3: `defaultExecutor()` was `ThreadPerTaskExecutor` and the
  stage ran on `Thread-0` for 0 and 1, and the common pool for 3.

Not verified:

- No JDK 25 binary could be downloaded here, so the Java 25 behaviour comes
  from the jdk-25-ga source, not a run.

## Unreleased — OceanBase mixed ALTER case, English triggers for java-concurrency and java-design — 2026-11-26

Changes:

- New `discriminating` case `oceanbase-mixed-alter` (English only, like the
  other OceanBase cases): one ALTER that adds a column AFTER another, adds one
  at the end and drops one, on OceanBase 4.2.1 with inserts around the clock.
  The grader uses only facts the documentation states: the 4.2.1 online and
  offline DDL page lists an end-of-table add as online, a middle add and a
  column drop as offline, and a mixed column statement with any offline part
  as offline; the 4.3.5 page says DML is not allowed during offline DDL. It
  does not depend on the DECIMAL widening.
- java-concurrency and java-design descriptions name the English asks the
  English eval prompts make: a check-then-act race on a `ConcurrentHashMap`,
  climbing thread counts, timeouts that leave the work running, hangs in
  `Future.get` or shutdown, explaining code when nothing can be run; and
  reviewing a proposed refactoring into State, Command, Strategy or Abstract
  Factory.

Executed (Claude Code 2.1.332, `--model sonnet`, sonnet judge, reads allowed
under the plugin directory):

- `oceanbase-mixed-alter`, with-without, two rounds of 3 runs ($1.54): with
  5/6, without 2/6. The one failing with-plugin answer stated the documented
  classification and recommended leaving the column, but offered a drop at
  the quietest hour after a rehearsal, which the first fail clause caught.
  Pass condition 2 now also accepts an offline step run after a rehearsal has
  measured and accepted the insert stall, and the fail clause targets an
  answer that assumes inserts keep flowing during the rebuild. Replay against
  the real judge ($0.98, 3 votes each): that answer and another with-plugin
  answer pass 3:0; of the six without-plugin answers, 2 pass and 4 fail (one
  1:2), all failing ones hedge the classification; two written wrong answers
  (all online; rebuild with inserts continuing) and a separate without-plugin
  answer fail 3:0. The other four with-plugin answers passed the stricter
  first grader and were not replayed.
- Trigger, English `async-quota-thread-growth` and
  `order-state-machine-design`, plugin arm only, skill check only, 6 runs
  each: old descriptions 5/6 and 4/6 ($0.89), new descriptions 6/6 and 6/6
  ($0.90). With round 6, old descriptions loaded the skill in 7/9 and 6/9
  English runs.
- Neighbour check with the new descriptions, plugin arm only, 3 runs each
  ($0.76): neither skill loaded in `neg-modern-java-no-framework-skills`,
  `redis-lock-double-charge`, `transaction-swallowed-exception` or
  `java8-release-idioms` (0/12); each case's own skill loaded as before,
  except one modern-java negative run that answered without any skill.
- No discriminating java-concurrency or java-design case was found. Five
  screening prompts, each run once without the plugin by sonnet (three also
  by the default model), were all answered correctly: CallerRunsPolicy
  discarding after shutdown so `Future.get` never returns;
  `ExecutorService.close()` in try-with-resources waiting for the work; an
  unconditional context clear under caller-runs; `allOf` not failing fast
  with `CompletableFuture.cancel(true)` not interrupting; and a Java 17
  Visitor replaced by a pattern switch. None was added. The JDK 21 behaviours
  behind them were confirmed by running them.

Not verified: Codex; other agent models; the four unreplayed with-plugin
OceanBase answers under the revised grader; whether the description change
holds beyond 12 runs.

## Unreleased — evals for three uncovered skills, OceanBase claim grader and codes — 2026-11-26

Changes:

- New eval cases, English and Chinese, for the three skills that had none:
  `async-quota-thread-growth` (java-concurrency), `order-state-machine-design`
  (java-design) and `outbox-after-commit-and-dedup` (messaging-reliability
  DELIVERY.md). Tagged `regression`: most answers without the plugin passed.
- `oceanbase-job-claim` (en, zh) grader `engine-recognized`: the round-5
  failure recognised OceanBase and failed only because it read the claimed
  rows back by a per-claim token instead of checking the affected-row count.
  Either check now passes; a claim with no ownership check now fails.
- OCEANBASE.md: a batch claim selects the rows carrying its token. The
  timeout paragraph keeps the OceanBase codes the transaction-control page
  gives (-6210, -6224) and drops the MySQL-mode numbers 4012/6002 and the
  `ob_trx_idle_timeout` default, which no cited page states.
- database-transactions SKILL.md: the OceanBase detection bullet is rewrapped.

Executed:

- `node --test "tests/*.test.mjs"`: 55/55. `node scripts/check.mjs`: pass.
- `claude plugin eval` (Claude Code 2.1.332, sonnet judge, 3 runs per case,
  reads allowed under the plugin directory):
  - new cases, with-without ($4.37). Skill fired: java-concurrency 5/6,
    java-design 5/6, messaging-reliability 6/6. Graders with / without:
    concurrency en 2/3 / 3/3, zh 3/3 / 1/3; design en 3/3 / 3/3, zh 3/3 / 3/3;
    outbox en 3/3 / 2/3, zh 2/3 / 3/3. The one failing with-plugin
    concurrency run did not load the skill. Both outbox failures named
    `REQUIRES_NEW` only as a way to continue after the error while
    recommending `ON CONFLICT DO NOTHING`; the fail clause now targets a design
    that adopts it, and a replay passed both 3:0 and failed a written
    `REQUIRES_NEW` design 3:0 ($0.46).
  - Replay of the new claim grader ($1.05): six round-5 with-plugin answers,
    including the failed one, 3:0 pass; two without-plugin answers 1 pass,
    1 fail; written SKIP LOCKED and no-ownership-check answers 3:0 fail.
  - `oceanbase-job-claim` en and zh with the new text, with plugin only
    ($1.61): all graders 6/6; every run read OCEANBASE.md and claimed by token.
- `CompletableFuture` default executor on JDK 21 with
  `-XX:ActiveProcessorCount=2`: 50 blocked `supplyAsync` tasks, 51 live
  threads; with 8: 8 threads.

Not verified:

- The MySQL-mode error numbers for OceanBase -6210 and -6224 and the
  `ob_trx_idle_timeout` default are not on the documentation pages read. The
  OceanBase v4.2.1_CE source maps -6210 to 4012, -6224 (transaction needs
  rollback) and -6278 (transaction idle timeout) to 6002, and sets the idle
  default to 24 hours; the skill text does not rely on it.
- Whether OceanBase 4.2.1 runs the `DECIMAL` widening online; no instance.

## Unreleased — transaction fix in the entry point, OceanBase DDL and timeouts — 2026-11-25

Changes:

- `spring-boot-engineering` SKILL.md now states the smallest fix for a
  transaction that does not roll back (one proxied boundary, `rollbackFor`,
  rethrow or `setRollbackOnly()`) and how to prove it (call the bean, force the
  failure, query the rows). The pointer to TRANSACTIONS-AND-ASYNC.md now names
  the cases that need it (propagation, `UnexpectedRollbackException`,
  transaction events, `@Async` executors) instead of the whole topic.
- OCEANBASE.md no longer says a `DECIMAL` widening is offline. The 4.2.1
  online list includes "increasing a column type's length or precision"
  (examples: `INT`, `VARCHAR`, `NUMBER`-class); neither page names a `DECIMAL`
  precision-and-scale change, and the column-type rules make a change offline
  when an index, key or partition key references the column. The file now treats
  such a widening as unconfirmed: rehearse, check `table_id`, plan for offline.
- OCEANBASE.md timeouts: `ob_trx_timeout` is 24 hours from 4.0 (100 seconds
  before); the idle-timeout error now also gives the OceanBase code -6224.
- `oceanbase-job-claim` (en, zh) grader `timeouts-and-ddl`: the widening may be
  treated as offline or as needing confirmation on the target version, with a
  rehearsal and an offline-case plan either way; stating that `ob_trx_timeout`
  defaults to 100 seconds on this version now fails.

Executed:

- `node --test "tests/*.test.mjs"`: 55/55. `node scripts/check.mjs`: pass.
- `claude plugin eval` (Claude Code 2.1.332, `--ablation none`, sonnet judge,
  3 runs per case; reads allowed under the plugin directory):
  - four transaction cases (en, zh): skill fired 12/12, all graders 12/12,
    no reference reads ($1.11);
  - `oceanbase-job-claim` en and zh with the new text: `timeouts-and-ddl` 6/6,
    `skill-fired` 6/6, `engine-recognized` 5/6; every run read OCEANBASE.md
    ($1.38).
- Grader replay (stored answers from earlier result JSONs echoed verbatim, then
  graded by the real judge, 3 votes each): with the final fail clause, 11
  with-plugin answers passed 3:0, 1 of 5 without-plugin answers passed, and 3
  deliberately wrong answers (online-and-direct, InnoDB INPLACE, one statement)
  failed 3:0 ($2.60). An earlier replay of an intermediate grader without the
  `ob_trx_timeout` clause passed 18 of 19 with-plugin answers ($3.73); 12 of
  them were not replayed again and none states a 100-second default.

Not verified:

- Whether OceanBase 4.2.1 runs `decimal(16,2)` to `decimal(20,4)` online; the
  documentation does not settle it and no OceanBase instance was used.
- The `ob_trx_idle_timeout` default and the MySQL-side codes 4012 and 6002 for
  OceanBase -6210 and -6224 were not found on the pages read.
- The final grader text (which no longer names `ob_trx_idle_timeout`) was not
  replayed; the live run used the version that named both variables.

## Unreleased — build-file reminders, slash-command loads, trigger statistics — 2026-11-25

Changes:

- The pre-edit check reminds (soft) on `pom.xml`, `build.gradle(.kts)`,
  `gradle.properties` and `libs.versions.toml` when the written text sets the
  Java level (`use-modern-java`) or the Spring Boot version
  (`spring-boot-engineering`). A dependency or plugin added without such a
  setting, a bare `<version>` line and an in-place `sed -i` do not remind.
  Test sources keep both hard rules (java-testing and use-modern-java).
- A skill the user types as `/java-engineering-skills:<skill>` counts as
  loaded: Claude Code writes its text as a meta user record, with no tool
  call, and the check now reads that record when it holds the current body.
- `scripts/pre-edit-skill-check-stats.mjs` reports how each skill was first
  loaded (model, explicit, hook, not-loaded) beside the covered-edit columns.

Executed:

- `node --test "tests/*.test.mjs"`: 55/55. The build-file test fails on the
  previous hook. `node scripts/check.mjs`: pass.
- Four `claude -p` runs (Claude Code 2.1.332, haiku, `--plugin-dir`, a
  throwaway Maven project outside the temp directory, about $0.03 in all):
  a slash-invoked use-modern-java followed by a Java edit was refused by the
  previous hook and the agent loaded the skill again; with the change the same
  edit went through without a refusal. The runs also gave the transcript
  layouts the statistics read: the slash-command record, the meta record (with
  `sourceToolUseID` for a Skill call), the refusal as an error `tool_result`,
  and the reminder as a `hook_additional_context` attachment. An Edit that
  set `maven.compiler.release` from 8 to 11 in `pom.xml` went through with the
  use-modern-java reminder attached.

Not verified:

- Interactive Claude Code sessions (only `-p` runs were inspected), and any
  Codex rollout: how Codex records an explicit skill mention and a refusal
  is assumed in the statistics. The hook's own Codex reading is unchanged.
- The build-file reminder in an interactive session and in Codex.

## Unreleased — spring-boot transaction routing and the spring-wiring judge — 2026-11-25

spring-boot-engineering loaded in only some English runs of
`transaction-not-rolled-back`: 17 of 27 across this and the two earlier
records. Every miss was a one-turn answer with no tool call. The description
named the symptom only in Chinese (事务不生效).

Changes:

- spring-boot-engineering's description names an annotation that does not
  take effect and a transaction that leaves writes committed after an
  exception, with the usual causes (self-invocation, non-public methods,
  checked exceptions and rollbackFor, exceptions caught inside the method),
  and adds 事务不回滚 and @Transactional 失效. The rollback bullet says rollback
  rules apply only to an exception that leaves the method.
- New `regression` case `transaction-swallowed-exception` (English and
  Chinese): rollbackFor is set, the exception is caught inside the method,
  and the order commits.
- The spring-wiring grader states the task facts and lists what passes and
  what fails (below).

Run: Claude Code 2.1.332, sonnet judge, README read grant. "Before" is the
unchanged skill with the plugin only (3 + 6 runs); "after" ran with-without
(6 runs), plus 6 more English runs with the plugin.

| Case | Loaded before → after | Without plugin (after) |
|---|---|---|
| transaction-not-rolled-back | 6/9 → 11/12 | 6/6 pass |
| transaction-not-rolled-back-zh | 9/9 → 6/6 | 6/6 pass |
| transaction-swallowed-exception | 9/9 → 6/6 | 6/6 pass |
| transaction-swallowed-exception-zh | 9/9 → 6/6 | 6/6 pass |

The remaining English miss was again a one-turn answer, and its answer still
passed. database-transactions loaded alongside in 8 of 18 swallowed-exception
runs before and none after; java-testing loaded alongside once after.
TRANSACTIONS-AND-ASYNC.md was read in 2 of 36 runs before and 1 of 30 after.
In the Boot upgrade, JUnit 4, four OceanBase cases (auto-increment, isolation,
and the job claim in English and Chinese), the modern-Java negatives and the
Python negative, run with the plugin three times each before and after,
spring-boot-engineering loaded only in the Boot upgrade, and no case loaded a
skill it had not loaded before (use-modern-java loaded in 3 of 3 English
modern-Java runs after, 1 of 3 before). `oceanbase-job-claim` failed
`timeouts-and-ddl` in 1 of 3 English and 1 of 3 Chinese runs after (2 and 3
before), and `engine-recognized` once before and once after; this change does
not touch that skill.

The first swallowed-exception grader failed three correct answers, which
listed other causes as assumptions to check or used setRollbackOnly without a
caveat the grader expected. It now gives the task facts and a
numbered list. Replayed to the eval judge (the agent echoes a stored answer,
tools off), those three and five earlier passes pass 3:0, and two wrong answers
(only rollbackFor changed; REQUIRES_NEW with the catch kept) fail 3:0.

### spring-wiring judge

`spring-wiring-evidence` failed about one run in four with answers that read
correct. Replaying stored answers to the real judge reproduced the original
votes, so the failures belonged to the answers and the grader, not to random
votes. The judge sees only the final answer, never the task. The old grader
failed an answer that chose a client arbitrarily, but the judge could not see
that the facade serves the controller's audience, so answers that recommended
publicCatalog for that reason failed. Graded one criterion at a time, three
failing answers met every part of the long one-sentence criterion.

The grader now states the task facts, numbers what a passing answer does, lists
what fails it, and says extra checks or caveats do not fail an answer.

| Grader | 28 earlier answers pass | Wrong answers fail |
|---|---|---|
| old | 21/28 (eval's own votes) | not run |
| new | 28/28 (82 of 84 votes) | 3/3, each 3:0 |

The wrong answers were: one @MockBean for both clients and @Primary on
internalCatalog; waiting for the remote services and a full start for
normalize; and missing the second StorageProperties registration. A fresh run
with the plugin, three runs per language, passed 6 of 6 with every vote PASS;
spring-boot-engineering loaded in 5 of 6 (the English miss was a one-turn
answer).

Not settled: only sonnet was measured as agent and judge, and Codex was not
run. Two earlier wiring answers pass the new grader 2:1. The runs and replays
cost about $32.

## Unreleased — messaging-reliability and use-modern-java routing — 2026-11-25

The Kafka case and the plain Java 21 rewrite failed on routing, not content.
A rerun of the unchanged skills with traces kept showed every miss was a
one-turn answer with no tool call, and that a loaded skill rarely opened its
reference: messaging-reliability loaded in 2 of 6 Kafka runs and read
BROKERS.md once, the only run that passed; use-modern-java loaded in 0 of 6
plain rewrites and in 4 of 6 `java8-release-idioms` runs without reading a
reference.

Changes:

- messaging-reliability's description names producer and consumer settings
  checked against client-version defaults (`acks`, `enable.idempotence`,
  retries, `max.in.flight.requests.per.connection`, confirms, auto-commit) and
  Chinese phrasings; the entry reads BROKERS.md before stating what a default
  or setting does.
- use-modern-java's description names rewrites with Java 17/21 features and
  the behavior they must keep; step 3 reads the linked rule section even for a
  short rewrite.
- Chinese variants of the Kafka case and the plain modernization case.

Run: Claude Code 2.1.332, sonnet judge, three runs per case, README read
grant. "Before" loaded only the plugin; "after" ran with-without. Adjacent
cases ran with the plugin before and after. Total $11.11, plus $4.70 for
the java8 grader below.

| Case | Loaded before → after | With plugin before → after | Without |
|---|---|---|---|
| kafka-idempotence-on-boot-2.6.0 (en, zh) | 2/6 → 6/6 | 1/6 → 6/6 | 0/6 |
| neg-modern-java-no-framework-skills (en, zh) | 0/6 → 5/6 | 6/6 → 6/6 | 6/6 |
| java8-release-idioms (en, zh) | 4/6 → 6/6 | 3/6 → 2/6 | 3/6 |

After the change BROKERS.md was read in 6 of 6 Kafka runs and the linked rule
section in every run where use-modern-java loaded. No framework skill loaded
in the modernization cases. In the redis, Boot upgrade, Spring wiring and
transaction cases (English and Chinese) and the Node and Python negatives,
neither changed skill loaded, before or after, and the expected skill loaded
as before except `transaction-not-rolled-back` (English), where
spring-boot-engineering loaded in 6 of 9 runs before and 5 of 9 after, each
miss a one-turn answer with no skill.

`java8-release-idioms` then passed about half the time in both arms with
nearly identical answers. The eval keeps no judge reasoning, so the 18 answers
were re-graded with sonnet against the same rubric, one verdict per criterion,
without the prompt (the grader's focus is the last message); this matched the
eval's majority verdict on 14 of 17. Every answer met the code criteria. The
failures came from the verification sentence: read without the prompt, it
asked for a release-8 compile and an appending caller that had been run,
while the agent has no shell and the prompt asks how they would check; and
the judge could not tell that the module's own build carries release 8. The
grader now says the verification is a plan, that the user's pom sets release
8, and that a test calling `add` on the result counts as the append check. Two
control answers, one with `Collectors.toList()` and one offering a plain JDK
21 compile as proof, still fail 3 of 3. Rerun with-without, three runs each:
English and Chinese 3/3 with the plugin and 3/3 without (the run above: 2/6
with, 3/6 without).
This case only guards against regressions; it does not separate the arms.

Not settled:

- Only sonnet-5-5 was measured; Codex routing was not run.

## Unreleased — Discriminating evals, negative cases, upgrade routing — 2026-11-25

The first eval run (judge haiku, two runs per case) showed that seven of the
nine cases passed without the plugin, so they could not show what the plugin
adds. This change keeps them as `regression` cases and adds cases a run without
the plugin answers wrong. A case is tagged `discriminating` only after that has
been observed. Candidates that passed without the plugin were dropped:
CompletableFuture on two CPUs, Connector/J upsert affected rows, HttpClient
request timeout scope, Redisson Spring Cache TTL, transactional event listener
upgrade, Redisson lock with replica sync, record pattern accessor exceptions,
and CallerRunsPolicy after shutdown.

Added cases:

- `oceanbase-isolation-and-locking-reads`, `oceanbase-auto-increment-sync`
  (database-transactions): OceanBase 4.2.1 MySQL mode, covering REPEATABLE READ
  as snapshot isolation (error 6235), no READ UNCOMMITTED, shared locks
  emulated as write locks, ORDER BY with FOR UPDATE locking every selected
  row, no EXPLAIN ANALYZE or SKIP LOCKED, and ORDER versus NOORDER
  auto-increment with a cached range that jumps on leader switch.
- `kafka-idempotence-on-boot-2.6.0` (messaging-reliability): kafka-clients
  3.0.0/3.1.0 leave idempotence off unless it is set explicitly (KAFKA-13598).
- Negative cases: a Node.js memory leak and a Python/PostgreSQL deadlock must
  load no skill of this plugin (`tool_used`, `min: 0`, `max: 0`, `arm: both`).
  A plain Java 21 modernization must load no framework skill.

Other changes:

- The jvm grader's attach clause is narrowed to two points.
- The Boot 2.3 to 2.7 grader now accepts both JUnit 4 outcomes after the
  vintage engine leaves: silently not running when `junit:junit` is on the
  classpath, and a compile failure when it is not.
- The JUnit 4 grader no longer asks for an observed run in a case whose prompt
  forbids running anything.
- The Node grader accepts a restart that is labelled as a stopgap.
- `spring-boot-engineering` now reads CONFIGURATION.md first for an upgrade
  across Boot lines, even when java-testing also loads.

Run: Claude Code 2.1.332, `claude plugin eval` with-without, sonnet judge,
three runs per case, with the README's `--allow-tools` read grant. Fifteen
English cases cost $9.19. The JUnit 4, Boot upgrade and Node cases were rerun
after their grader fixes and cost $2.16.

| Case | With plugin | Without | Skill loaded |
|---|---|---|---|
| jvm-jstat-and-attach | 3/3 | 0/3 | 3/3 |
| oceanbase-isolation-and-locking-reads | 3/3 | 0/3 | 3/3 |
| oceanbase-auto-increment-sync | 3/3 | 0/3 | 3/3 |
| oceanbase-job-claim | 2/3 | 0/3 | 3/3 |
| kafka-idempotence-on-boot-2.6.0 | 0/3 | 0/3 | 1/3 |
| redis, order-endpoint, transaction-not-rolled-back | 3/3 each | 3/3 each | 3, 3, 1 of 3 |
| junit4-test-not-discovered (rerun) | 3/3 | 3/3 | 3/3 |
| boot-2.3-to-2.7-on-java-8 (rerun) | 3/3 | 3/3 | 3/3 |
| java8-release-idioms | 2/3 | 3/3 | 2/3 |
| spring-wiring-evidence | 1/3 | 2/3 | 3/3 |
| negatives (Node rerun, Python, modern Java) | 3/3 each | 2/3, 3/3, 3/3 | none fired |

In the Boot upgrade case, CONFIGURATION.md was read in 3 of 3 runs, up from 3
of 6 before the routing line. java-testing also loaded in 2 of 3 runs.

Not settled:

- The Kafka case fails because messaging-reliability loaded in only one run
  and read no reference. It passed in two of two runs when the skill was
  forced. Its description lacks producer-configuration terms, and that skill
  was outside this change.
- use-modern-java did not load for the plain modernization prompt (0 of 3), and
  in java8-release-idioms it loaded without reading a reference.
- spring-wiring-evidence has split judge votes in both arms.
- With three runs, a one-run difference is within judge and agent noise.
- The Chinese variants were not rerun in this change.
- CONFIGURATION.md lines 44-45 still say JUnit 4 tests "stop running rather
  than fail". That omits the compile failure seen when `junit:junit` is
  absent, and the reference edit is pending.

## Version 0.8.7 — Pre-edit check time budget — 2026-11-17

A consumer session on a machine short of memory waited on the pre-edit check
before most edits and shell calls. In a 167-minute stretch of its transcript,
18 of the 19 recorded hook events for this check were cancellations at the
30-second limit; the edits then ran unchecked. The check itself does little on
most calls: it reads the transcript only while a matching skill is not yet
recorded as loaded. The wait was the Node process failing to start in time
under load.

The `PreToolUse` timeout is now 5 seconds for Claude Code and Codex. A check
that cannot finish in that time is skipped, as before, so the cost of a loaded
machine is bounded per call. The Codex `PostToolUse` entry keeps its 30 seconds:
a lost receipt there leaves later edits refused. The Codex `PreToolUse` entry
changed, so its trust key and hash change and it needs trusting again.

This release also carries the Spring change recorded below as unreleased.

Evidence on Windows, Node 26.7.0:

- On the idle machine the hook process took 1.5 to 2.5 seconds for a shell call
  with no matching rule (three runs against that session's 3.4 MB transcript).
- `node scripts/check.mjs` and all Node tests passed after the change.
- Not run: the check under memory pressure after the change, a live Codex call
  with the re-trusted hook, and whether 5 seconds is ever too short for a first
  matching edit that reads a large transcript on a loaded machine; such a call
  is then allowed unchecked.

## Unreleased — Spring reasoning and evidence — 2026-11-08

An inspected consumer session had read the Spring skill before its wiring
failures. That establishes an execution/evidence gap, not a missing-install
cause. The revised entry covers questions and decisions about Spring behavior,
including read-only explanation and review. It replaces the unconditional
proxy/completion checklist with mechanism-specific reasoning and claim-scoped
evidence. The existing references explain candidate selection and tests that
retain the registration paths and competing beans relevant to the question.

Evidence on Windows:

- The pre-change and final skill revisions each completed one independent,
  fresh-context trial on the same current model, using the same synthetic
  read-only request in `evals/spring-wiring-evidence/prompt.md`. Each agent was
  given its skill snapshot and the raw excerpts, without the grader or expected
  answer. No prompted repairs were made. Both identified the two registration
  paths, the lost client selection, and the direct-construction test's limited
  scope; both allowed local analysis without remote services and kept pure
  normalization at the unit-test boundary. The revised arm also explicitly
  proposed observing the selected client after correction. One run per arm
  establishes neither a repeatable improvement nor a general success rate.
- `node scripts/check.mjs` and all 40 Node tests passed before and after the
  skill edits. The skill-creator validator, both Claude manifest validators,
  and the final diff whitespace check passed. The plugin validator reported
  the existing missing-icon warning; no manifest or icon changed, and adding
  a listing icon is outside this instructional change.
- Not run: live Spring execution of the illustrative excerpts, implicit
  invocation trials, or the Claude agent/grader eval. The paired trial
  explicitly supplied the skill, so it does not establish automatic selection.
  Cross-runtime or second-model evaluation was not authorized for this task.
  The new reusable eval includes a skill-invocation grader for a future run.

No hook, runtime setting, installed cache, or release version was changed.

## Version 0.8.6 — Codex receipts without a transcript — 2026-11-06

A Codex Desktop side chat kept refusing a Javadoc-only `apply_patch` on a Java
file after full, successful `use-modern-java/SKILL.md` reads with `Get-Content`
and `cat`. Its audit recorded three `skill-not-loaded` denies. The side chat is
an ephemeral `thread/fork` (Codex Desktop logs), absent from `sessions/`,
`state_5.sqlite` and `thread_history_1.sqlite`, and Codex's hook input schema
declares `transcript_path` as `string | null`. With no transcript, no receipt
could ever be found.

A Codex `PostToolUse` entry now runs the same script. It records a load in an
append-only, per-session or per-agent `*.receipts.jsonl` when the call reads the
skill's `SKILL.md` and its result reports exit code 0 and the full current body.
A still-running read (`session_id`, no exit code), a failure, a truncated body,
or another agent's receipt does not count. `PreToolUse` reads receipts alongside
transcripts. A refusal in a thread without a transcript says that only the
`PostToolUse` hook can record the load. The `PreToolUse` entry is unchanged, so
its trust key and hash stay valid; the new entry needs its own trust. Receipts
also count in threads that do have transcripts, and every Codex shell call now
starts one more hook process.

Evidence on Windows, Node 26.7.0:

- A hook-process regression drives the manifest commands with
  `transcript_path: null` and a result shaped like a real nested
  `exec_command` result from a local rollout. The pre-fix hook still denied
  the edit after a successful read; the fixed hook allows it. Five targeted
  mutants (exit code not required, non-zero exit ignored, body unchecked,
  receipts shared across agents, object result not serialized) were each
  detected by the intended assertion.
- All 40 tests, `node scripts/check.mjs`, both Claude manifest validators and
  `git diff --check` passed.
- Not run: a live Codex `PostToolUse` call, so the actual `tool_response` shape
  is unconfirmed (object, JSON string and `Process exited with code` text are
  accepted; a result without an exit code records nothing), and a Codex Desktop
  side chat after installing 0.8.6 and trusting the new hook.

## Version 0.8.5 — Codex child skill receipts — 2026-10-20

A real Java review ablation was denied after its Codex child had read the full
`use-modern-java/SKILL.md`. The initial read exposed only the shell result's
`output`, losing `exit_code`. A repeated read preserved the complete successful
result: the existing receipt parser recognized it, but the live hook still
denied the edit. Transcript discovery only tried Claude Code's nested child path
and never reached Codex's flat `rollout-...-<child-id>.jsonl` file.

Discovery now selects the exact child ID in Codex's sessions tree, including
different parent/child date directories. It keeps Claude's nested path and the
explicit `agent_transcript_path`, and never substitutes the parent's receipts.
The refusal and README explain preserving the complete successful result in
`functions.exec`. Matched calls, successful completion, full current skill text,
per-agent state and persistent hard refusals remain required.

Evidence on Windows, Node 26.7.0, Codex CLI 0.163.0:

- The owning hook-process regression failed before the fix and passed after it.
  It covers an unfinished child read, a completed cross-date child read, a
  different child despite parent/sibling success, and Claude's nested layout.
  Independent current-model review found the initial same-directory limitation;
  its cross-date regression failed before that repair and passed afterward.
  Re-review closed the finding without additional concrete defects.
- Replaying the actual completed skill-read records in an isolated hook fixture
  changed from `deny`/empty loaded state to `allow`/`use-modern-java` loaded.
  All 36 tests, `node scripts/check.mjs`, both Claude manifest validators and
  `git diff --check` passed. No skill rules or Java examples changed.
- Normal marketplace installation refreshed the Codex cache to 0.8.5; hook
  source/cache bytes match. `hooks/list` points to 0.8.5 and reports enabled and
  trusted. Its hook-definition hash stayed unchanged; an idempotent trust-hash
  upsert through the configuration API returned `ok`.
- The original child retried the blocked experiment. Its live audit recorded
  `allow`, no missing skill and `use-modern-java` in that child's loaded state.
  The existing `unresolved-write` warning remained; the hook was not skipped or
  disabled. The first mutant compilation failed in the validation harness,
  which establishes no detected business fault. After fixing only its javac
  classpath argument transport, the original handler's 17 tests passed, the
  compiled mutant failed exactly the normal-event premature-success assertion,
  and the restored original passed all 17 again. The reviewed production source
  bytes remained unchanged; the separate 45-test focused run also passed.

Evidence is retained in the initiating Organon task's
`.scratch/20261020-euthyna-rewrite/` and the isolated review's `.review-output/`;
it is not distributed with this plugin. No non-Windows runtime or fresh live
Claude Code load/retry loop was exercised for this change.

## Cross-platform hook CI repair — 2026-10-15

This is a new verification against main `6ccca0b`, independent of the author
records below. The task workspace was initially empty; no existing changes
were modified. There were no open PRs when checked.

- Original Actions run [38733708099](https://github.com/hex1n/java-engineering-skills/actions/runs/38733708099):
  Ubuntu succeeded; macOS failed with an empty hook response and a null-property
  assertion; Windows Node 22.23.3 failed with `MODULE_NOT_FOUND` for the copied hook.
- Local macOS Node 26.0.0 reproduced the original failure. With the new process
  tests and the original entry guard, shell and directory-alias launches failed
  with exit 0 and empty stdout, while the canonical-path launch passed. The
  diagnostic identified `/var/folders/...` versus `/private/var/folders/...`.
- Comparing both entry paths with `fs.realpathSync` fixed that reproduction.
  Resolution failure returns false; no `import.meta.main` version requirement
  was introduced. Existing module imports remain covered by the test suite.
- The Unicode-copy workaround follows [Node issue 61878](https://github.com/nodejs/node/issues/61878).
  The Windows cause is inferred from the original CI error and the upstream
  reproduction, rather than a locally executed Windows before/after comparison.
  The fixture retains Chinese characters and spaces, uses `filter: () => true`,
  and verifies the copied hook content before execution.
- Each of shell, canonical-path and directory-alias launches verifies two denies,
  successful skill reads followed by allow, and audit decisions deny/deny/allow.
  Windows uses a directory junction so the alias case needs no symlink privilege.
  An unexpectedly empty deny response includes status, stderr and path diagnostics.
- Local checks passed: `node scripts/check.mjs`, all 37 tests with
  `node --test "tests/*.test.mjs"`, both README Claude plugin/marketplace manifest
  validators, and `git diff --check`. No live Codex editing session or Java
  compilation was executed for this repair.
- PR [#1](https://github.com/hex1n/java-engineering-skills/pull/1), code commit
  `70ef02d`: Actions [38742024633](https://github.com/hex1n/java-engineering-skills/actions/runs/38742024633)
  completed successfully on all three platforms: Ubuntu Node 22.23.3,
  Windows Node 22.23.3, macOS Node 22.23.2. Each executed 37 tests with
  37 passes, zero failures, and passed structure checks. This validates the
  repaired fixture on Windows; it does not independently isolate the original
  native-copy bug. No merge or release was performed.
- A read-only Claude Review (quick/Sonnet) was attempted via the
  Claude Code for Codex plugin. Job `a31fbc17-9e67-4fd0-925c-8da9f3132763`
  exited 1 before model work (zero tokens/cost), producing no review findings.
  The changes are self-reviewed; independent review remains unavailable.

## Version 0.8.4 — Codex hook launcher and deny decision — 2026-10-15

Codex CLI 0.162.1 on Windows never ran the 0.8.3 hook. Its `hooks/list`
showed the `%PLUGIN_ROOT%\hooks\...` command unexpanded, every edit printed
`hook: PreToolUse Failed`, and a `JES_PRE_EDIT_SKILL_CHECK_DUMP` probe file was
never written. The Codex command is now `node "${PLUGIN_ROOT}/hooks/..."` with
no `commandWindows`; Codex substitutes that placeholder in the command text,
and `hooks/list` then showed the expanded cache path.

With the hook running, a refusal exposed a second defect: the audit recorded
`skill-not-loaded`, Codex printed `PreToolUse Failed`, and the `apply_patch`
still created the file. A refusal is now the PreToolUse
`hookSpecificOutput.permissionDecision: "deny"` decision on stdout with exit 0,
which the Codex and Claude Code hook references both define as a block. The
audit field `exitCode` became `decision` (`deny` or `allow`).

Evidence on Windows, Node 26.7.0:
- All 35 tests, `node scripts/check.mjs`, `claude plugin validate` and
  `git diff --check` passed. The process test now substitutes `${PLUGIN_ROOT}`
  into the manifest command and runs it through the shell. Replacing `deny`
  with `ask` turns it red. It cannot reproduce Codex leaving `%PLUGIN_ROOT%`
  unexpanded; the 0.162.1 runner source still names `cmd.exe`, so that cause
  stays unexplained and is established only by the live runs below.
- Codex 0.162.1 `codex exec`, cache refreshed to 0.8.4 and byte-identical,
  hook trusted at the new definition through the app-server config API: a
  read-only `git status` turn printed `PreToolUse Completed` and wrote the dump;
  an `apply_patch` adding `src/test/java/a/FooTest.java` in a repository outside
  host temp roots printed `PreToolUse Blocked`, the file was not created, and
  the model relayed the load instruction.
- Claude Code 2.1.300, `claude -p --model sonnet --permission-mode
  bypassPermissions`, plugin loaded in place: the same `Write` was blocked with
  the hook's message and the file was not created.
- Not run: a Codex Desktop session, a skill load followed by an allowed retry
  in either host, and any non-Windows host.

## Windows hook direct Node launcher — 2026-10-09

The Windows command now starts Node directly with the quoted
`%PLUGIN_ROOT%\hooks\pre-edit-skill-check.mjs` path. Codex CLI 0.161.0's
[default Windows hook runner](https://github.com/openai/codex/blob/rust-v0.161.0/codex-rs/hooks/src/engine/command_runner.rs#L359)
uses `cmd.exe`; removing the PowerShell wrapper
preserves Node's exit code without a second shell or explicit forwarding.
The command assumes the default hook shell, not a custom PowerShell shell.

The existing hook-process test copies the real plugin into a path containing
spaces and Chinese characters, then uses the manifest's Windows command.
The focused regression passed: refusal, repeated refusal and successful skill
loads returned 2, 2 and 0, with matching decision audits.

The handoff run passed all 35 tests, `node scripts/check.mjs`, both Claude
plugin/marketplace manifest validators and `git diff --check` on Windows.
The unchanged Claude hook command was also run through local Git Bash:
refusal, repeated refusal and an input without edit targets returned 2, 2
and 0. Claude's PowerShell fallback and a fresh model session were not tested.

Both installed plugins were then refreshed from the local marketplace to
0.8.3; all 59 files in each cache match the source byte-for-byte. Codex
`hooks/list` loaded the direct Node command, and the app-server configuration
API updated only this hook's trust hash. A subsequent list reported it enabled
and trusted. Claude's update command requires restarting to apply the update.
No fresh model session exercised a refused edit through the full agent loop.

## Windows hook launcher correction — 2026-10-09

The installed Codex hook logged a refusal with Node exit code 2, but its
`powershell -Command` wrapper returned 1 and the source edit still executed.
The initial correction added `exit $LASTEXITCODE` to both the source manifest
and the installed 0.8.3 manifest. No skill rules or versions changed.

The existing hook-process test now uses the manifest's Windows command on
Windows. Before the fix it failed with actual exit code 1 versus expected 2;
after the fix its refusal, repeated refusal, and completed-load sequence
returned 2, 2, and 0. All 35 tests, the offline structure check, both Claude
manifest validators, and `git diff --check` passed on Windows with Node 26.7.0.

At that point, the source and installed manifest/hook bytes matched. Codex
`hooks/list` read the fixed command; `config/value/write` updated only this
hook's reviewed trust hash, and a subsequent list reported it enabled and
trusted. No new model
session was run to exercise a refused edit through the full agent loop.

## Version 0.8.3 — persistent hard checks and successful skill-load receipts

### Incident and changes

The 2026-09-23 Codex session patched scratch Python/PowerShell files. A compiler
argument naming `PerfMissingDiagnosis.java` was rescanned as a script target.
The hook then exempted later production edits because `prompted` was treated
like `loaded`. Replaying the actual tool call against this revision returns
no target, no block and no unresolved-write warning.

- Patch headers own their targets; patch bodies are excluded from script scans.
  Resolve paths before excluding scratch, including an exec command's workdir.
- Hard rules continue blocking until successful load evidence exists. Only soft
  reminders use `prompted`; an earlier soft reminder never exempts a hard rule.
- Pair transcript calls and results by ID. Failed, pending, empty or truncated
  reads do not load a skill. Reads must return the current plugin's complete
  SKILL.md body; successful Claude Skill invocations use the runtime's result.
  Codex cell waits and shell-session polls retain the original read identity.
  Version 1 state is rebuilt because it previously trusted attempted reads.
- Unresolved script targets produce a warning, not invented filename targets.
- Record compact per-session decision audits without source or command text.
  Offline statistics also use completed loads instead of attempted reads.

### Validation boundary

On Windows, `node --test "tests/*.test.mjs"` passed all 35 tests (21 hook
tests); `node scripts/check.mjs`, both Claude plugin/marketplace validators
and `git diff --check` passed. Java examples were unchanged and not rerun.
The normal `codex plugin add java-engineering-skills@java-engineering-skills`
command installed local version 0.8.3; the cached hook's SHA-256 matches the
source. No hook trust record was manually written and no Git commit was made.

Tests cover the incident shape, repeated denials, old state, soft-to-hard rule
transitions, successful and failed reads, unrelated result IDs, Claude numbered
reads, asynchronous Codex completion, scratch cwd, and patch move/delete targets.
The real local transcript recognizes both `java-testing` and `use-modern-java`
from completed reads after the change.

Process tests verify refusal exit code 2, a repeated refusal, and exit code 0
after successful read receipts, together with audit contents. They do not prove
that Codex Desktop presents a refusal or prevents the underlying edit. The
original incident's first refusal receipt remains unverified. Runtime acceptance
requires updating the plugin, trusting its changed hook and testing in a fresh
session; installing the new cache alone does not establish host enforcement.
Dynamic scripts and unsupported transcript formats remain outside hard-check
coverage; parsing failures retain the existing fail-open policy.

## Version 0.8.2 — heredoc and here-string bodies are content; host temp roots

### Why

Session `96c8107b` (2026-09-21) wrote an analysis document with
`cat > docs/….md <<'EOF'`. The hook blocked it for
`use-modern-java` and `database-transactions`: Markdown citation lines such as
``> `OrderService.java:126-136` `` inside the body matched the shell
redirection pattern, so six Java and XML names became write targets. The model
loaded both skills, retried, and fell back to the Write tool. A PowerShell
here-string body had the same defect. The same root lost content: a heredoc
that wrote a Java file reached the content rules with empty text, so the file
got one hit where the Write tool got four. On macOS the temp directory
(`/var/folders/…/T`) matched no scratch name and was gated.

### Changes

- Heredoc and PowerShell here-string bodies are data regions. A body's target
  comes from its opening line (a redirection or pipe may follow the marker) or,
  for a here-string, from the `Set-Content`/`Out-File` that writes its variable
  or receives it through a pipe. The body is that write's content and is not
  scanned for targets.
- A body stays code when an interpreter consumes it (`python - <<'EOF'`,
  `cat <<'EOF' | python -`) or when it is written to a script file
  (`.py`, `.mjs`, `.sh`, `.ps1`, …), since that script runs next.
- An unterminated body, and a region inside another data body, keep the
  previous reading instead of removing overlapping spans.
- Scratch detection adds this host's `os.tmpdir()`, including the macOS
  `/private` form, to the name test.
- `.github/workflows/ci.yml` runs `node scripts/check.mjs` and the unit tests
  on Ubuntu, macOS, and Windows with Node 22. The test pattern is quoted
  because PowerShell does not expand globs for native commands.
- The hook is renamed `hooks/skill-gate.mjs` → `hooks/pre-edit-skill-check.mjs`:
  it blocks or only reminds, so "gate" overstated the soft rules, and the
  plugin directory and the `java-engineering-skills:` message prefix already
  identify the plugin wherever the hook surfaces. The stats script, test file,
  state directory, and dump variable (`JES_PRE_EDIT_SKILL_CHECK_DUMP`) follow.
  The old names above are left as they were recorded.

### Executed validation for 0.8.2

- `node --test "tests/*.test.mjs"` passed (26 tests) under Git Bash and
  PowerShell on Windows; `node scripts/check.mjs` passed. The macOS and Linux
  temp roots are unit-tested through `tempRoots`. The CI workflow passed on
  Ubuntu, macOS, and Windows for the push of `5b5142f`.
- The new heredoc and here-string tests failed against the 0.8.1 hook and pass
  now. Targeted faults, each run against the final tests: interpreter
  detection disabled, body not removed, target dropped, script-target rule
  removed, pipe consumer ignored, here-strings ignored, nesting filter removed,
  and the `/private` root dropped were all detected. Dropping `\r?` from the
  delimiter pattern is equivalent: a multiline `$` already stops before a CR.
- Old and new extraction were compared over all 2,345 local Claude Code and
  Codex transcripts (49,947 shell or exec calls that name a gated file). No
  call raised. No call gained a target; 86 gained the written content. Seven
  calls lost targets, and each was read: three wrote a Markdown or text file
  that cited Java or properties files (including the `96c8107b` command), and
  four were Codex `apply_patch` text held in a `$patch` here-string, where the
  lost names sat inside patched test fixtures and the patch targets remained.
- A first version classified bodies by their immediate consumer only. The
  same comparison showed 38 lost calls that wrote a `.py` or `.mjs` script
  through `cat` and ran it next, which is why a script target keeps a body as
  code. The replay also exposed a crash on a here-string piped straight into
  `Set-Content`; `main()` would have swallowed it and skipped the check for that
  call.

### Remaining gaps

- Bodies whose commands arrive as escaped JavaScript strings (Codex `exec`
  input) are not split into regions; they keep the 0.8.1 reading.
- Bash here-strings (`<<<`) and data passed as quoted arguments are still
  scanned as code.
- `src/test` path matching is case-sensitive.

## Version 0.8.1 — gate every Java edit, fewer false targets

### Why

Session `4a5e1adb` (2026-09-18) edited a `*Processor.java` class
under `src/main`. The gate only reminded, naming `use-modern-java` and
`java-concurrency`; the model continued without loading either. The
`java-concurrency` hit came from an existing `java.util.concurrent` import,
not from the edit. While changing the gate, a Python script that rewrote
`tests/skill-gate.test.mjs` was blocked for `java-testing`, because every
`*.java` string in a script that writes any file counted as a target.

### Changes

- `use-modern-java` blocks the first edit of any `*.java` file, test files
  included.
- Content rules match only the text being written, not the file's imports.
- Inline scripts: each write, copy, or delete call's target is resolved
  through literal assignments, loop headers (tuple targets, multi-line
  literals), shell variables, and interpolated strings. A target taken from
  argv, a directory walk, a function parameter, or an unassigned name falls
  back to every Java path in the script. Shell redirects, `sed -i`, and
  copy targets in the same command are still checked, and `$VAR` targets
  resolve to their assigned value.

### Executed validation for 0.8.1

- `node --test tests/*.test.mjs` passed (23 tests) and `node scripts/check.mjs`
  passed.
- Old and new target extraction were compared over all 2,378 local Claude
  Code and Codex transcripts (5,832 shell or exec calls that name a Java
  file). 105 calls lost at least one Java target. The 25 of those where the
  lost path sits near a write call were each read: the script wrote a doc, a
  `.scratch` copy, a mutation script, or a javac argument file, and the Java
  path was data. 400 calls gained a target, mostly `Set-Content $path`,
  `cp "$SP/x.bak" "$F"`, and `mv "$F.bak" "$F"` restores that the 0.8.0 gate
  missed.

## Version 0.8.0 — edit-time skill gate

### Why

Local transcripts from 2026-09-08 to 2026-09-18 (`scripts/skill-gate-stats.mjs`)
showed the skills were almost never loaded before the edits they cover:
`java-testing` before 0 of 12 Claude Code and 0 of 8 Codex transcripts that
edited `src/test` Java files; `use-modern-java` before 0 of 13 and 0 of 18.
The one late `java-testing` load came after the user asked for it mid-turn.
Description matching runs when a task starts; a bug fix or plan landing
reaches test and SQL edits as intermediate steps, and a workflow skill that
owns the task does not re-check plugin skills.

### Changes

- `hooks/skill-gate.mjs`, wired through `hooks/hooks.json` (Claude Code) and
  the `hooks` entry of `.codex-plugin/plugin.json` (Codex CLI and Desktop).
  Test Java files and project SQL/mapper files block the first edit until
  `java-testing` or `database-transactions` is loaded; other Java edits and
  import or content signals add a one-time reminder. Blocking uses exit code 2;
  Claude Code honored it under `bypassPermissions` (below), and the Codex
  hooks reference documents the same exit code, not yet exercised.
- `jvm-performance` and `java-design` descriptions name common Chinese
  phrasings; their need arises in the request, which description matching
  already sees, so they are not gated.

### Executed validation for 0.8.0

- `node --test tests/*.test.mjs` passed, including the new classifier,
  shell-target, Codex patch, transcript-scan, and process exit-code tests.
  `node scripts/check.mjs` passed.
- Claude Code 2.1.273, `claude -p --plugin-dir` with `bypassPermissions`,
  Sonnet: the first `src/test` edit was blocked with the hook reason, the
  model invoked `java-engineering-skills:java-testing`, and the retried edit
  succeeded. A general-purpose subagent was gated the same way under its own
  `agent_id`. The soft reminder for an `@Transactional` service reached the
  subagent as hook additional context; the subagent did not load the skills.
- Not executed: Codex. The hook input shape for Codex code-mode `exec`
  edits, `PLUGIN_ROOT` expansion under `commandWindows`, and hook trust in
  Codex Desktop are implemented from the Codex hooks reference but untested;
  the probe run stopped on an account usage limit.

## Version 0.7.0 — accuracy corrections, OceanBase, Boot 2.x lines, JVM evidence, skill rewrite

### Audit round: descriptions, single sources, steps, and eval cases

Three independent reviews (cross-skill structure against the agent-writing
reference; per-skill content and writing quality in two halves) and two
fresh-context forward evaluations (a Boot 2.3 to 2.7 upgrade on JDK 8 with
five planted release-line problems; a JVM triage with a failed root attach,
`jstat` `M` 93% and `FGC` 8 under CMS, and an all-interfaces JDWP agent)
drove these changes:

- Every skill description now leads with its trigger nouns and names the
  neighbouring skill that owns an adjacent branch (row locks, Redis leases,
  idempotency keys, committed-state assertions), and `outbox`, `@Cacheable`,
  and `Boot 2.x release-line` appear in the descriptions that own them.
  (Later descriptions were rewritten around their own trigger words: by 0.8.7
  only `java-concurrency` still names a neighbouring skill, for row locks and
  Redis leases. This entry records the 0.7.0 state.)
- Rules that were restated in several skills (proxy self-invocation,
  JVM-local locks across instances, in-memory databases, metric labels,
  outbox, virtual threads) now live in one owner; other skills name the owner
  in plain text because the package check forbids cross-skill links.
- Entry files gained first steps with completion criteria (database
  connection inventory, endpoint lines, shared-field rows, cache contract
  lines, no-attach JVM evidence, hypothesis form) and lost no-op and
  negation-only sentences.
- Examples now carry the boundary they describe: a same-object call that
  bypasses `@Transactional`, a strategy registry with duplicate and unknown
  keys, a `Clock`-injected rule with a test seam, a JMH benchmark that avoids
  dead code and constant folding.
- New sourced facts: `Executors` factory queue bounds (Java 8 javadoc),
  Redisson `lockWatchdogTimeout` 30 s and no renewal under an explicit
  `leaseTime` (Redisson reference), Kafka `enable.idempotence` requirements
  and `max.poll.interval.ms` 300000 ms / `max.poll.records` 500 (Kafka 4.1
  configuration pages), `spring.profiles.include` and `spring.profiles.group`
  under 2.4 (config data migration guide).
- Both forward evaluations passed on the pre-rewrite text: the upgrade plan
  attributed all five problems to the right release line and compared
  executed test counts; the triage attributed the attach failure to identity,
  read `M` against `MaxMetaspaceSize`, reconciled `FGC` with the GC log, and
  refused restart or heap growth. Their prompts and graders are now
  `plugins/java-engineering-skills/evals/` cases, together with the OceanBase
  job-claiming case. `claude plugin eval` reported early access on this
  account, so no case has been executed by the runner; the cases follow the
  `prompt.md` plus `graders/*.md` layout from the CLI reference.
- Repository hygiene: `.gitattributes` pins LF; tracked IDE files were
  removed and ignored; `ROADMAP.md`, `SKILLS.md`, and the README tree were
  realigned with the plugin.

### Executed validation for 0.7.0

- `node scripts/check.mjs` passed: ten skills, 98 local links, 32 rules. All
  14 Node.js tests passed. `claude plugin validate` passed for the plugin and
  the marketplace manifest, and `git diff --check` was clean.
- The four Java snippets added this round were compiled and executed on
  Zulu JDK 8u482 with `-source 8 -target 8`, using stub annotations in place
  of Spring and JMH. Their asserted boundaries hold: the registry rejects an
  unknown carrier and cannot hold a duplicate key, `TokenPolicy` treats the
  exact deadline as expired and one second earlier as live, and
  `ParseBench.parse()` returns the parsed value. Neither the Spring proxy
  behavior nor JMH harness behavior was executed; only the shapes type-check.
- Every page cited by this round's new or rewritten text was re-fetched and
  the quoted passage confirmed against it: the OceanBase V4.2.1 pages for
  auto-increment mode and cache size, the offline-DDL list and mixed-statement
  rule, local index defaults and unique-index partition columns,
  weak-consistency isolation and `max_stale_time_for_weak_consistency`,
  `ob_query_timeout`, transaction and idle timeout error codes with DDL's
  implicit commit, CHECK enforcement, and the DESC/generated-column index
  limits; the Spring Boot 2.1, 2.2, 2.5, and 2.7 release notes for bean
  overriding, JUnit 5 with the vintage engine, SQL script initialization, and
  the `spring.factories` deprecation; and the Kafka 4.1 producer and consumer
  configuration pages and the Redisson lock reference for the facts added to
  BROKERS.md and ATOMICITY-AND-LOCKS.md.

### Every skill re-checked by opening its cited pages

Five reviews opened each cited URL and compared the quoted passage, and also
looked for factual claims with no citation. No link was dead except one, and
the version thresholds and JEP numbers held throughout. Corrected:

- A systemic sourcing defect: unversioned `docs.spring.io` URLs now resolve to
  Boot 4.1.1 and Framework 7.0.9, so the transaction page they reached already
  documents 6.2-only `rollbackOn=ALL_EXCEPTIONS` while the surrounding text
  describes 5.3. All 18 such links are now version-pinned.
- `redisson.pro/docs/cache/spring-cache/` returned 404; the Spring cache
  section lives under `integration-with-spring`. The quoted sentence also lost
  "or equal to `0`", which changes where the never-expire branch starts.
- Contract versus implementation: `Stream.toList()` accepting null,
  `toMap`/`groupingBy` rejecting null, and a discarded task's `Future` never
  completing are implementation behavior, not documented contracts, and now
  say so. `ConcurrentHashMap`'s computation rule regained its documented
  "must not update any other mapping", and read-to-write upgrade of
  `ReentrantReadWriteLock` is stated as impossible rather than unsupported.
- Claims attached to pages that did not carry them: the `MatchException`
  behavior (JEP 441, not 440), parallel-stream pool selection (qualified in
  the follow-up below), MySQL `NOT IN` NULL semantics (the EXISTS-rewrite page), and
  range access stopping interval construction (the range-optimization page).
  Kafka's consumer, topic, and transactional-producer claims gained their own
  configuration pages.
- Overreach in this session's own additions: the CMS `FGC` explanation no
  longer cites a JDK 21 page for a collector removed in JDK 14, the `jcmd`
  attach message is no longer presented as an identity signature, the
  `jstat`-answers-so-the-VM-is-alive test now states that it only holds for
  root, the no-attach step accepts `-Xlog:gc*` as well as `-Xloggc`, the CMS
  log spellings are presented as something to read out of the log in hand, and
  the cache-aside interleaving is labelled an ordering analysis rather than a
  cited fact.
- Defaults that change the advice: Kafka idempotence is on by default and is
  silently disabled by a conflicting value; `@Cacheable(sync=true)` is a hint
  the provider may ignore, with three documented limits; Testcontainers
  documents parallel execution as unsupported; `@MockitoBean` arrived in
  Framework 6.2 with Boot 3.4 deprecating `@MockBean`; Spring Security's
  resource server does not check `aud` by default; JMH folds a `final` field
  initialized to a literal, so inputs belong in non-final `@State` fields;
  MySQL reports changed rows while Connector/J reports matched rows, which
  decides what an affected-row count means; adding a `STORED` generated column
  rebuilds an existing table; online VIRTUAL addition depends on partitioning
  and the complete ALTER operation, as corrected below.

Not verified: link-liveness only was checked for roughly thirty low-risk
javadoc and JEP URLs, and no behavior in this round was executed.

### Redisson claims re-checked against the vendor documentation

A second pass over the Redisson reference and configuration pages corrected
what the previous round had written from a single page:

- Only two of the three earlier claims are documented. The lease-versus-
  watchdog split and the 30 s `lockWatchdogTimeout` are stated outright. That
  a paused or disconnected holder is never told it lost the lock appears only
  as the rationale for `RFencedLock` ("can't detect that it doesn't own the
  lock anymore"), not as a contract of the ordinary lock, so
  ATOMICITY-AND-LOCKS.md now states the renewal shapes generically and keeps
  the vendor-specific wording inside a Redisson section. The renewal interval
  is not documented at all and is no longer implied.
- Added with sources: the owner-thread unlock rule and the
  `IllegalMonitorStateException` that a bare `finally` block raises once the
  lease has expired; the documented requirement to pin the thread id across
  async, reactive, and RxJava calls; locks being advisory with
  `checkLockSyncedSlaves` on by default and a 1000 ms `slavesSyncTimeout`
  whose synchronization failures need separate classification from contention;
  `RedLock` deprecated since 3.12.5 while
  `MultiLock` is not.
- OPERATIONS.md now records that per-entry expiry in a hash is a client
  feature ("not supported by Redis or Valkey"), that the eviction task starts
  when the map instance is obtained, and that a Spring cache name without a
  configured TTL never expires.

At that pass, source-only claims (renewal interval, `forceUnlock` side effects,
semaphore permit leakage) were left out, and no Redisson behavior was executed
against a server. The follow-up below adds versioned source evidence for the
unlock and synchronization paths.

### Review follow-up — seven semantic corrections (2026-09-16)

The review of `74174f9..2a7ab3c` identified seven introduced documentation
defects. All seven have been addressed in the working tree; source-based
verification is distinct from runtime reproduction:

| Finding | Correction and evidence |
|---|---|
| F1 | Redisson ownership checks and unlock are separate operations. Documented the expiry window, preservation of the original exception, and owner-checked cleanup; cited Redisson 3.52.0 lock implementations. |
| F2 | Issuer validation requires issuer configuration or a validator. Added the JWK-only counterexample and wrong-issuer/audience checks; cited Boot 3.4.0 JWT configuration. |
| F3 | Redisson 3.52.0 replica synchronization can fail with `NoSyncedSlavesException`. Separated this from ordinary contention and retained exceptional completion after attempted cleanup; cited `CommandAsyncService`. |
| F4 | GC evidence may be in stdout/stderr or service logs without `-Xloggc`. Added Java 8 logging switches and destination checks, using the Java 8 tool reference. |
| F5 | MySQL 8.0 online VIRTUAL addition is conditional on partitioning and the complete ALTER. Added algorithm/lock constraints and the Online DDL reference. |
| F6 | Recursive map updates have no Java 8/later binary failure rule. Kept the detectable-recursion qualification and the cross-bin deadlock counterexample, citing Java 8 API and OpenJDK 21 source. |
| F7 | OpenJDK 8 stream task forking depends on the invoking worker's pool. Distinguished this implementation from Stream API guarantees, citing `ForkJoinTask.fork` and stream task source. |

The affected reference files contain the primary-source links. No executable
examples or skill entrypoint routing changed. Runtime Redis, MySQL, Spring
security, and cross-thread deadlock reproductions remain unexecuted; the
failure scenarios are documented for validation on the deployed versions.

Executed after the corrections: `node scripts/check.mjs` passed (ten skills,
98 local links, 32 rules); all 14 `node --test tests/*.test.mjs` tests passed;
the official skill-creator `quick_validate.py` passed for all six affected
skills; both Claude plugin/marketplace validators and `git diff --check`
passed. These are structural checks, not middleware behavior evidence.

Not executed: `claude plugin eval` reports early access on this account, so no
eval case has been run by the runner. The gate was re-confirmed by running the
command in an empty directory, where an enabled account would report that no
cases were found.

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

### jvm-performance: attach identity, jstat columns, no-attach evidence

A read-only baseline diagnosis of HotSpot 1.8.0_131 services running with CMS
in Linux containers exercised the skill and exposed three gaps:

- `jcmd` run as root through `nsenter` into the container's mount, PID, and
  UTS namespaces failed with `Unable to open socket file: target process not
  responding or HotSpot VM not loaded`; the same command with the JVM's own
  uid and gid listed the VM, returned `VM.flags`, and produced a full
  `Thread.print`. `jstat -gc`, `-gcutil`, `-gccapacity`, and `-class`
  answered in both cases. `GC.heap_info` returned `Unknown diagnostic command`
  on this JDK. `COLLECTION.md` now names the failure signature, the `jstat`
  fallback, the container-side PID, and the JDK 8 command gap; the existing
  same-user rule was correct and is unchanged.
- `jstat -gcutil` reported a non-zero `FGC` on services whose GC logs
  contained zero `Full GC` lines and exactly `FGC / 2` pairs of `CMS Initial
  Mark` and `CMS Final Remark` events; `M` read above 90% while `MU` was well
  under the `-XX:MaxMetaspaceSize` confirmed by `VM.flags`, and `MCMX`
  reported more than that flag. `DIAGNOSIS.md` now explains the three
  columns, citing the jstat manual's definitions.
- The full-collection, pause, promotion-failure, RSS, thread, descriptor,
  and memory-limit conclusions came from the GC log, `/proc`, and cgroup
  files without any attach. Some services log without `-XX:+PrintGCDetails`,
  so CMS phases appear as `[GC (CMS Initial Mark) …]`, and none set
  `-XX:+PrintGCDateStamps`. `COLLECTION.md` now lists that evidence first and
  both format traps, citing the Java 8 `java` tool page for the option
  defaults.
- One flag inventory showed a JDWP agent bound to all interfaces; `SKILL.md`
  now asks for network-listening agents to be reported.

Not executed: no load was applied, no JFR recording or heap dump was taken,
and NMT was not enabled; the attach-identity behavior was observed on HotSpot
8u131 only.

### Spring Boot lines before 2.7

The skill anchored on Boot 2.7 and 3.x without stating which line a Java 8
service belongs to, and covered nothing between 2.0 and 2.7. The entry now
records that Boot 2.7 requires Java 8 and runs up to Java 21 while Boot 3
requires Java 17, and `CONFIGURATION.md` adds a section on the 2.1–2.7 changes
that alter behavior silently or stop a build: bean-definition overriding,
JUnit 5 and constructor binding, the validation starter split, the 2.4 config
data rewrite and vintage-engine removal, SQL script initialization, prohibited
circular references with `PathPatternParser`, and the `spring.factories`
deprecation. Every claim comes from that release's official notes, the config
data migration guide, or a Spring blog post; the sources are listed in the
section. "Boot 2.7 is the last line supporting Java 8" is an inference from the
2.7 and 3.0 requirements, so the text states those requirements instead.
No Boot upgrade was executed.

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

## Unreleased — 2026-09-16 API design and review boundaries

Updated `java-api-security` from an endpoint-review-oriented entrypoint to
explicit design/implementation and review paths sharing trust-boundary and
validation principles. New designs establish caller/resource policy, writable
fields and disclosure, effects/retries, work budgets, and enforcement ownership
before DTO/controller implementation. Design-only completion is a concrete
contract and validation plan, not a claim of active runtime protection.

Corrected the unconditional owner/tenant SQL predicate prescription: require
the established resource policy, with scoped SQL or equivalent trusted
enforcement as appropriate. Full-scope service authorization needs evidence;
missing gateway/RPC policy is a verification gap. Review outputs separate
confirmed defects, conditional risks, and missing evidence, with severity
based on supported impact rather than an absent local check alone.

The existing authorization, tenant isolation, REST resource-limit, and error
contract references remain the supporting sources. No framework-version
guarantees were added. SQL chunking versus total aggregation and per-item
timeouts versus total work are engineering inferences from those budget
boundaries, not claims of vendor-provided protection.

Manual scenario walkthroughs of the final text covered a new user-scoped async
command, an existing full-scope internal RPC with unavailable external policy,
and an unlimited batch query with chunked SQL. The instructions respectively
require a concrete delegated-authority/retry/denial contract, an explicit
policy evidence gap, and assessment of cumulative work plus compatibility.
These are author walkthroughs, not independent agent executions.

Executed on Windows:

- Official skill `quick_validate.py`: passed.
- `node scripts/check.mjs`: passed for 10 skills and 98 local links.
- `node --test tests/check.test.mjs tests/check-examples.test.mjs`: 14 passed.
  The initial sandbox attempt could not spawn child processes (`EPERM`);
  the authorized rerun outside the sandbox passed.
- Claude plugin and marketplace manifest validators: both passed.
- `git diff --check`: passed.

These checks validate packaging and check-script behavior, not API security
enforcement or agent decision quality. No independent agent/Claude evaluation,
live RPC/HTTP test, or Java compilation was performed for this documentation
change. Source only; no plugin installation, cache synchronization, release,
version bump, or Git commit was performed.
