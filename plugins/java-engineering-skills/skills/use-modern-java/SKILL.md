---
name: use-modern-java
description: Apply version-compatible Java language and standard-library idioms when writing, modifying, or modernizing Java code targeting Java 8–21. Use for Java modernization and incremental upgrades while preserving existing contracts.
---

# Use Modern Java

Prefer clear, modern Java supported by the target module. This skill covers
selected stable language and Java SE library features through Java 21.

## Apply the guidelines

1. Establish the target source set's language level, available Java SE APIs,
   minimum runtime, and preview setting using [VERSION.md](VERSION.md).
   Reuse established evidence until the module or build configuration changes.
2. Read the short [rule index](INDEX.md). Select rules whose minimum version
   fits the target and whose trigger matches the code being changed. Earlier
   rules still apply on newer Java releases.
3. Follow the linked rule details before applying a candidate transformation.
   Each explains the intended use, behavior-sensitive exceptions, an example,
   and its primary source. Load only the relevant sections.
4. Prefer the applicable idiom for new code and in-scope edits. Preserve explicit
   project conventions and observable behavior: mutability, null handling,
   encounter order, exceptions, resource ownership, concurrency, and public or
   serialized contracts. A newer API alone is not a reason to rewrite a working
   subsystem, change dependencies, or raise the Java baseline.
5. Verify changed code with the module's existing build and focused tests at
   the established target. For a migration, exercise the affected contract
   boundaries from the rule details. Report the target, relevant changes, and
   any behavior or runtime verification that remains untested.

If version evidence is unresolved, continue work that does not depend on newer
features and identify the missing build decision before introducing them.
Compilation on the developer's newer JDK alone does not establish compatibility.

## Coverage boundary

The index uses the **first stable release**, not a preview introduction.
Use preview or incubator features only when the task calls for them and their
exact release and compile/test/runtime settings are established. In Java 21,
string templates, scoped values, structured concurrency, unnamed patterns,
and unnamed classes/instance main methods are outside this stable catalog.
Do not enable preview merely to apply a guideline.

Framework and library migrations (for example, Spring, persistence mappings,
Lombok, or an HTTP client replacement) need evidence from the project's actual
dependency versions in addition to these Java SE rules. Android API/desugaring
support must be checked separately. For Java beyond 21, reuse covered rules
and consult official documentation for additional features.

This skill uses ordinary Markdown references and requires no helper runtime.
Its version index and on-demand explanations are inspired by
[JetBrains/go-modern-guidelines](https://github.com/JetBrains/go-modern-guidelines);
the Java guidance is based on the linked OpenJDK and Java SE sources.
