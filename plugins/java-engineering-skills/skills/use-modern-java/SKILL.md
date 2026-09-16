---
name: use-modern-java
description: Version-compatible Java 8–21 language and standard-library idioms. Use when writing or modernizing Java code, or when a change must follow the module's compiler release rather than the developer's JDK.
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
   and its primary source.
4. Apply the idiom to new code and to lines already inside the edit. For each
   replacement, name the behavior it keeps (mutability, null handling,
   encounter order, exceptions, resource ownership, concurrency, public or
   serialized contracts) and keep the old form wherever one of these would
   change. Done when every replaced line carries that note; the Java
   baseline, dependencies, and untouched subsystems stay as VERSION.md found
   them.
5. Verify changed code with the module's existing build and focused tests at
   the established target. For a migration, exercise the affected contract
   boundaries from the rule details. Report the target, relevant changes, and
   any behavior or runtime verification that remains untested.

If version evidence is unresolved, continue work that does not depend on newer
features and identify the missing build decision before introducing them.
Compilation on the developer's newer JDK alone does not establish compatibility.

## Coverage boundary

Use preview or incubator features only when the task names them and their
exact release and compile/test/runtime settings are established. In Java 21,
string templates, scoped values, structured concurrency, unnamed patterns,
and unnamed classes/instance main methods are outside this stable catalog.

Framework and library migrations (for example, Spring, persistence mappings,
Lombok, or an HTTP client replacement) need evidence from the project's actual
dependency versions in addition to these Java SE rules. Android API/desugaring
support must be checked separately. For Java beyond 21, reuse covered rules
and consult official documentation for additional features.
