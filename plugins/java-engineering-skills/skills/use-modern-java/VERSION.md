# Resolve the Java target

Resolve the file's owning module and source set before selecting language or
library features. A repository may compile production, tests, generated code,
and multi-release JAR entries with different settings.

## Evidence to record

Record a compact conclusion with the configuration path or effective build
output that supports it:

- Source set and effective language level.
- Java SE API target and minimum supported runtime.
- Compiler/toolchain JDK, when known.
- Preview enabled or disabled for that exact release.

An explicit user target guides the requested result; if it conflicts with the
existing build, surface the conflict. A request to modernize code does not by
itself authorize upgrading the project's Java requirement.

## Maven

Inspect the module POM, inherited parent configuration, active profiles,
properties, and compiler-plugin executions. Distinguish production `release`
from `testRelease` and other test-specific overrides.

- An effective compiler `release` / `maven.compiler.release` passed as
  `javac --release N` restricts language, class-file target, and Java SE APIs.
- With `source` and `target`, language and bytecode settings alone do not
  prevent references to APIs from a newer compiler JDK. Respect the declared
  deployment baseline when choosing APIs; verify with the project's supported
  toolchain or compatibility check.
- Toolchains select the compiler, not automatically the deployment baseline.
  A property called `java.version` matters only if the parent or plugin uses it.
- Resolve inherited properties and active profiles before deciding. When static
  files leave a material ambiguity, use the project's existing Maven wrapper
  and effective-model tooling (such as `help:effective-pom`) for that module and
  the same profiles as the intended build. Account for command-line overrides.

The Maven compiler plugin can translate `release` into `source`/`target` when
running on JDK 8 in supported plugin versions; that is not the JDK 9+
`--release` API restriction. Check the actual compiler and plugin behavior.

Source: [Maven compiler release configuration](https://maven.apache.org/plugins/maven-compiler-plugin/examples/set-compiler-release.html).

## Gradle

Inspect the owning project's build files, convention plugins, shared build
logic, and the applicable `JavaCompile` task.

- `options.release` establishes the compiler's release target when configured.
- `java.toolchain.languageVersion` or a task's `javaCompiler` selects a JDK;
  a lower `options.release` still controls the code's target.
- `sourceCompatibility` / `targetCompatibility` do not fence off newer Java SE
  APIs. Preserve the minimum runtime independently.
- Resolve task and source-set overrides; `compileJava` and `compileTestJava`
  can differ. The Gradle daemon's JVM and IDE language setting are not sufficient
  evidence of either target.

If computed configuration is ambiguous, inspect the project's existing build
diagnostics for the actual compile task. Do not infer a version by taking the
largest numeric value in a build file.

Source: [Gradle Java toolchains and release configuration](https://docs.gradle.org/current/userguide/toolchains.html).

## Other builds and preview

For direct `javac`, Bazel, Ant, or IDE-owned builds, inspect the actual compiler
arguments, toolchain configuration, and runtime contract. `java -version` only
identifies that executable; it does not establish the project's target.

Preview features are tied to a specific release. Check the matching JDK and
preview enablement for compilation, tests, and execution; a newer JDK does not
automatically support another release's preview syntax. Stable-catalog rules
remain gated by their stable version even in a project using previews.

Source: [Java preview features](https://docs.oracle.com/en/java/javase/21/language/preview-language-and-vm-features.html).
