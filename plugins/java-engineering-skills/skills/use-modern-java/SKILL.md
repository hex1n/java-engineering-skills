---
name: use-modern-java
description: Version-compatible Java 8–21 language and standard-library idioms. Use when writing, rewriting, or modernizing Java code, including rewriting a class with Java 17 or 21 features (pattern matching for switch or instanceof, records, sealed types, text blocks, var, streams) while keeping behavior such as null handling and list mutability, or when a change must follow the module's compiler release rather than the developer's JDK, including asks phrased as 升级 Java 版本, 用新语法, 用 Java 21 特性重写, 模式匹配, switch 表达式, or 改成 Stream.
---

# Use Modern Java

Prefer clear, modern Java the target module supports. This skill covers
selected stable language and Java SE library features through Java 21.

## Apply the guidelines

Fast path: a change that introduces no idiom from the [rule index](#rule-index)
(a plain bug fix or logic change) needs only the module's effective
`release`/`target` from step 1, then step 5.

1. Establish the target source set's language level, Java SE APIs, minimum
   runtime, and preview setting with [VERSION.md](VERSION.md). Reuse that
   evidence until the module or build configuration changes.
2. Select rules from the [rule index](#rule-index) whose minimum version fits
   the target and whose trigger matches the changed code. Earlier rules still
   apply on newer releases.
3. Read the linked rule section before applying it, even for a short rewrite
   you could write from memory: for example
   [pattern-switch](JAVA21.md#pattern-switch) before switching on a value that
   can be null, or [mutable-stream-result](JAVA8.md#mutable-stream-result)
   before collecting a list callers modify. Each gives the intended use,
   behavior-sensitive exceptions, an example, and its primary source.
4. Apply idioms only to code the task already changes, unless it asks for
   modernization. For each replacement, check what it must keep (mutability,
   null handling, encounter order, exceptions, resource ownership,
   concurrency, public or serialized contracts) and keep the old form where
   any of these would change. List replacements and what each keeps in the
   summary, not in code comments. Leave the Java baseline, dependencies, and
   untouched subsystems as VERSION.md found them.
5. Verify changed code with the module's existing build and focused tests at
   the established target; for a migration, exercise the affected contract
   boundaries from the rule details. Report the target, relevant changes, and
   any behavior or runtime verification left untested.

If version evidence is unresolved, continue work that needs no newer feature
and name the missing build decision before introducing one. Compiling on the
developer's newer JDK alone does not establish compatibility.

## Report

Close with one report in three parts, worded the same in every skill of this
plugin so that a task loading several skills still produces one report:
**Conclusion** (the answer or change and the conditions it holds under),
**Verified** (what was run or observed, with versions), and **Not verified**
(assumptions and remaining checks, each with the step that would settle it).
Put this skill's report items into those parts rather than adding sections. A
short answer can give each part in a sentence; leave out a part with nothing
in it.

## Coverage boundary

Preview and incubator features, framework or library migrations, Android
targets, and Java beyond 21 need more than this catalog: read
[VERSION.md](VERSION.md#coverage-boundary) before using them.

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
