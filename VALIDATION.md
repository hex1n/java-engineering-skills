# Validation record

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
