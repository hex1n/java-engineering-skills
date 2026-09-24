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
2. Select rules from the [rule index](#rule-index) whose minimum version fits
   the target and whose trigger matches the code being changed. Earlier rules
   still apply on newer Java releases.
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

## Rule index

Minimum versions are first **stable** releases.

| Minimum Java | Rule | Apply when |
|---|---|---|
| 21 | [pattern-switch](JAVA21.md#pattern-switch) | Several type tests dispatch on one value; preserve null and branch semantics. |
| 21 | [record-pattern](JAVA21.md#record-pattern) | Destructuring an existing record improves a local match. |
| 21 | [sequenced-collections](JAVA21.md#sequenced-collections) | Accessing endpoints or reverse order of a collection with defined encounter order. |
| 21 | [virtual-threads](JAVA21.md#virtual-threads) | Many concurrent tasks block on I/O; establish resource limits and lifecycle. |
| 19 | [executor-close](JAVA12-20.md#executor-close) | A locally owned executor should finish its tasks before scope exit. |
| 17 | [sealed-types](JAVA12-20.md#sealed-types) | A domain hierarchy intentionally has a closed set of implementations. |
| 16 | [records](JAVA12-20.md#records) | A new transparent value carrier fits record semantics and its consumers. |
| 16 | [instanceof-pattern](JAVA12-20.md#instanceof-pattern) | A type test is followed by a cast of the same value. |
| 16 | [stream-to-list](JAVA12-20.md#stream-to-list) | A stream result is intended to be an unmodifiable list. |
| 15 | [text-blocks](JAVA12-20.md#text-blocks) | A multiline literal becomes clearer without changing its exact contents. |
| 14 | [switch-expression](JAVA12-20.md#switch-expression) | Switch branches compute one value with no intended fall-through. |
| 11 | [string-whitespace](JAVA9-11.md#string-whitespace) | Whitespace handling should follow `Character.isWhitespace`. |
| 11 | [files-string](JAVA9-11.md#files-string) | Reading or writing bounded text files with a known charset. |
| 11 | [http-client](JAVA9-11.md#http-client) | New Java SE HTTP code fits the standard client's behavior. |
| 10 | [collection-copy](JAVA9-11.md#collection-copy) | A shallow unmodifiable snapshot of non-null elements is intended. |
| 10 | [local-var](JAVA9-11.md#local-var) | A local initializer makes its inferred type clear. |
| 9 | [collection-factories](JAVA9-11.md#collection-factories) | Constructing small unmodifiable collections of non-null values. |
| 9 | [optional-stream](JAVA9-11.md#optional-stream) | Flattening optionals in an existing stream pipeline. |
| 9 | [existing-resource](JAVA9-11.md#existing-resource) | An owned final or effectively final resource already has a variable. |
| 8 | [java-time](JAVA8.md#java-time) | New time calculations need explicit instant, calendar, or zone semantics. |
| 8 | [standard-base64](JAVA8.md#standard-base64) | Encoding or decoding Base64 with a known alphabet and padding contract. |
| 8 | [map-compute](JAVA8.md#map-compute) | Local map initialization or accumulation matches the API's null semantics. |
| 8 | [optional-lazy](JAVA8.md#optional-lazy) | An optional fallback should run only when the value is absent. |
| 8 | [mutable-stream-result](JAVA8.md#mutable-stream-result) | Downstream code requires a mutable stream result. |
| 8 | [lambda-contracts](JAVA8-FUNCTIONAL.md#lambda-contracts) | Small behavior fits a functional contract; preserve capture, scope, and failures. |
| 8 | [method-references](JAVA8-FUNCTIONAL.md#method-references) | A direct delegation is clearer by name and receiver evaluation stays equivalent. |
| 8 | [stream-pipelines](JAVA8-FUNCTIONAL.md#stream-pipelines) | A cohesive transformation benefits from map/filter/flatMap without hidden effects. |
| 8 | [collector-contracts](JAVA8-FUNCTIONAL.md#collector-contracts) | Map/group/aggregate results need explicit duplicate, null, order, and mutation policies. |
| 8 | [parallel-streams](JAVA8-FUNCTIONAL.md#parallel-streams) | Splittable computation has valid reduction semantics and measured parallel benefit. |
| 8 | [interface-default-methods](JAVA8-FUNCTIONAL.md#interface-default-methods) | Shared derived behavior fits all implementations and interface evolution is verified. |
| 8 | [interface-static-methods](JAVA8-FUNCTIONAL.md#interface-static-methods) | An interface owns a factory/helper whose declaring-type call fits the API. |
| 8 | [optional-composition](JAVA8-FUNCTIONAL.md#optional-composition) | Normal absence should compose without null Optional values or hidden failures. |
