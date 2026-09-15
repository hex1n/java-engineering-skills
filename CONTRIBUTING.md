# Contributing

## Add or revise a rule

Keep source skills under `plugins/java-engineering-skills/skills/`.
Both plugin integrations consume the same tree. Keep each skill independently
usable; required reference links stay within its own directory.

Each modern-Java rule needs a stable ID, first stable Java release, a concrete trigger,
an illustrative example, the behavior-sensitive limits, and a primary source
from OpenJDK or the Java SE API documentation. Add its pointer to `INDEX.md`.
Use the stable release even when a feature appeared earlier as a preview.

Prefer a small rule that changes a coding decision over a general best-practice
essay. New language syntax and standard APIs need a compatibility boundary;
framework recommendations need the actual dependency version and a distinct
scope. Keep version-resolution rules in `VERSION.md`.

For engineering skills, record the concrete task trigger, mechanism, failure
conditions, relevant platform/client versions, and observable validation. Keep
the entry short and link substantial topic references only at the applicable
branch. Update `SKILLS.md` when adding a skill and `ROADMAP.md` when a suggested
direction becomes implemented. Avoid promoting reference topics into separate
skills unless they have distinct invocation and execution needs.

Use the runtime's official skill-creator guidance and agent-writing guidance
when authoring skills. Keep repository maintenance and evaluation procedures
outside distributed skill bodies.

Before suggesting a replacement, compare nulls, mutability, aliasing, order,
exceptions, charset, resource ownership, cancellation, and public/serialized
contracts where they matter. A shorter expression is not proof of equivalence.

## Verification

### Recommendation quality

Treat best practice as a recommendation under stated conditions, not a
universal recipe. Before accepting guidance:

- Distinguish a correctness requirement from a conditional design choice and
  from an illustrative compatibility example. Explain the invariant behind
  a requirement and the trigger, tradeoff, and simpler alternative for a choice.
- Support API, version, and failure-semantics claims with the relevant primary
  specification, vendor documentation, or implementation source. Check the
  passage and release, not merely whether the link responds. A moving `current`
  page does not establish behavior in an older deployment.
- Separate engineering inference from documented guarantees. A pattern catalog
  defines vocabulary; it does not prove one design is best for every workload.
  If evidence conflicts or is insufficient, narrow the recommendation or mark
  the unresolved decision instead of publishing an unconditional instruction.
- Include a counterexample or failure timeline that exposes misuse of a risky
  recommendation. Cover the affected boundary with a focused executable check
  where feasible; otherwise record the missing runtime evidence explicitly.
- Do not infer reliability from a successful mock, API compilation, or healthy
  response alone. Concurrency, SQL, delivery, and performance claims need their
  actual mechanism and failure/load conditions exercised.

Record corrected claims, sources, executed checks, and remaining gaps in
`VALIDATION.md`. New topics pass this same review before becoming guidance;
topic count and passing package checks are not measures of semantic quality.

### Run the relevant checks

Run `node scripts/check.mjs`, `node --test tests/*.test.mjs`,
and the available runtime manifest validators
documented in the README. The scripts require Node.js 22+ and use built-in modules only; no npm install is needed.

For changed examples, compile a complete surrounding example at the claimed
release and test the material behavior boundary. A modern JDK's `--release`
can check older language/API availability; it does not establish execution
on that older runtime. Record which JDKs actually executed the code.

For changes to the skill's decision process, use realistic scenarios in an
isolated workspace. Give the evaluator the request, skill, and raw project
files without the expected answer. Inspect both its selected baseline and
the resulting code. Useful regression scenarios include:

- JDK 21 with a Maven parent `release=8`, including a child with inherited values.
- Gradle toolchain 21 with production `options.release=11` and newer test settings.
- Java 17 with a mutable stream result and a live unmodifiable view.
- Java 17 persistence objects relying on bean accessors and mutable state.
- Java 21 type dispatch accepting null and a timed executor task whose caller
  must return without waiting indefinitely.
- Java 21 without preview enabled, even when the request names a preview feature.
- A Java 8 CI test JVM with a proposed newer test engine and an async test that
  ignores background failures.
- Two tenants and two owners within one tenant, with repeated cached API reads.
- Stable post-GC heap with rising process/direct-buffer memory, and a proposed
  heap increase unsupported by the supplied evidence.
- MySQL active-row uniqueness with nullable soft-deletion columns, skewed
  query parameters, deep offset pagination, and a legacy 5.7 deployment.

Report structural validation separately from behavioral and compiler results.
Keep evaluation outputs and generated classes out of the distributed plugin.

## Release metadata

Keep the Codex and Claude Code plugin names, versions, and descriptions aligned.
The marketplace entries resolve to the same plugin directory. Validate changes
before publishing, and bump both manifest versions when releasing a changed
plugin. Repository creation does not authorize publishing or installing it.
