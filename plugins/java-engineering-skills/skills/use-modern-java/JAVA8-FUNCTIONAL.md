# Java 8 functions, streams, and interfaces

## lambda-contracts

**Minimum: Java 8.** Use a lambda for a small behavior supplied through a
functional interface when its inputs, result, and failure contract are clear.
Prefer an existing `Predicate`, `Function`, `Consumer`, or `Supplier` when it
expresses that contract; keep a domain interface when names or checked failures
carry meaning. A lambda does not require a stream.

```java
// New predicate: null is rejected by this contract.
String prefix = "app-";
Predicate<String> accepted = value -> value != null && value.startsWith(prefix);
```

Captured local variables must be final or effectively final; referenced objects
can still mutate. Capturing a collection does not snapshot it or synchronize
access. Lambda `this` is the enclosing instance, unlike an anonymous object's
`this`; preserve that distinction when converting listeners. Match checked
exceptions to the target interface, rather than silently swallowing them to
fit `Function`. Give substantial branching or stateful protocols a named method
or collaborator.

Sources: [Java 8 function interfaces](https://docs.oracle.com/javase/8/docs/api/java/util/function/package-summary.html),
[JLS lambda bodies](https://docs.oracle.com/javase/specs/jls/se8/html/jls-15.html#jls-15.27.2).

## method-references

**Minimum: Java 8.** Use a method or constructor reference when it names exactly
the operation a lambda delegates to and improves readability.

```java
// Before: one non-null input is supplied at invocation.
Function<String, String> normalize = text -> text.trim();

// After: same input and operation.
Function<String, String> normalize = String::trim;
Supplier<List<String>> newList = ArrayList::new;
```

A bound receiver expression such as `factory.create()::run` is evaluated once
when the reference is created. `() -> factory.create().run()` evaluates it at
each invocation. A null bound receiver throws during reference creation; a
lambda can defer that failure. Verify receiver lifetime, nulls, overload
selection, and effects before replacement. Retain the lambda when it makes
argument adaptation or evaluation timing explicit.

Source: [JLS method-reference evaluation](https://docs.oracle.com/javase/specs/jls/se8/html/jls-15.html#jls-15.13.3).

## stream-pipelines

**Minimum: Java 8.** Use a stream for a cohesive transformation or query over
data; retain a loop when branching, checked failures, or effects are clearer.
Choose `map` for one mapped value, `flatMap` for flattening, and `filter` for a
declared selection policy.

```java
// New transformation: batches and their lists are non-null; null names are skipped.
List<String> names = batches.stream()
    .flatMap(List::stream)
    .filter(Objects::nonNull)
    .map(String::trim)
    .filter(name -> !name.isEmpty())
    .collect(Collectors.toCollection(ArrayList::new));
```

Intermediate operations are lazy and streams are consumed once. Keep predicates
and mappers stateless and non-interfering with their source. Required writes,
validation, or auditing must not depend on `peek`/mapper side effects being
executed for every input; short-circuiting and permitted optimizations affect
which elements are processed. Choose a terminal result or explicit effect
boundary. Preserve duplicates, encounter order and the chosen null policy.
Sorting and distinct processing can retain substantial state; streaming syntax
does not itself bound memory. Close streams backed by owned I/O resources.

Source: [Java 8 stream pipeline contracts](https://docs.oracle.com/javase/8/docs/api/java/util/stream/package-summary.html).

## collector-contracts

**Minimum: Java 8.** Select a collector from result shape, duplicate policy,
ordering, and required mutability. A map needs one value per key; grouping
retains multiple values or applies a deliberate downstream aggregation.

```java
// New frequency table: words are non-null; first key encounter order matters.
Map<String, Long> frequencies = words.stream().collect(Collectors.toMap(
    Function.identity(), word -> 1L, Long::sum, LinkedHashMap::new));

Map<Integer, Long> byLength = words.stream().collect(Collectors.groupingBy(
    String::length, TreeMap::new, Collectors.counting()));
```

The two-argument `toMap` rejects duplicate keys. Supply a merge function only
when the domain defines how conflicts resolve; silently keeping the first or
last value can hide corrupt identities. Specify map factories when order is
contractual. Do not infer null support from a chosen map implementation: in
the JDK implementation `toMap` rejects null values and `groupingBy` rejects a
null classifier result, neither of which the `Collectors` javadoc states, so
treat both as observed behavior rather than contract. Define rejection or normalization at the input boundary. Use
[an explicit mutable collector](JAVA8.md#mutable-stream-result) for mutable lists.

Use `collect` for mutable accumulation; a shared mutable identity in `reduce`
does not become safe under parallel execution. For numeric reductions, retain
unit, range and overflow policies; primitive streams avoid boxing but do not
make integer overflow or floating-point rounding disappear.

Sources: [Java 8 Collectors](https://docs.oracle.com/javase/8/docs/api/java/util/stream/Collectors.html),
[Collector accumulation contract](https://docs.oracle.com/javase/8/docs/api/java/util/stream/Collector.html).

## parallel-streams

**Minimum: Java 8.** Consider a parallel stream for sufficiently large,
splittable computation only after correctness and workload measurements justify
its scheduling and combining costs.

```java
// Candidate pure computation with an associative sum; benchmark before adopting.
long total = IntStream.rangeClosed(1, 1000).parallel()
    .mapToLong(value -> (long) value * value)
    .sum();
```

An ordered result does not imply ordered mapper calls. `forEachOrdered` orders
terminal actions, not the preceding stages. Avoid shared mutable accumulation;
use a valid collector or associative reduction with a true identity. Subtraction,
rounding after each addition, and a non-neutral seed can change answers when
work is partitioned. Compare sequential/parallel results, including empty input.

Parallel streams expose no executor parameter and run on the common
`ForkJoinPool`, so request context, transaction state, pool isolation, and
bounded remote-call admission must not be assumed. For
blocking database/HTTP work needing those controls, choose an explicitly managed
execution mechanism. Measure representative data, core limits, allocation, and
competition with other work; `parallel()` alone is not an optimization result.

Sources: [Java 8 parallelism guidance](https://docs.oracle.com/javase/tutorial/collections/streams/parallelism.html),
[Stream reduction and ordered traversal](https://docs.oracle.com/javase/8/docs/api/java/util/stream/Stream.html),
[ForkJoinPool.commonPool](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ForkJoinPool.html#commonPool--).

## interface-default-methods

**Minimum: Java 8.** Use a default method for behavior that all conforming
implementations can derive from the interface contract. Check existing
implementations and callers before evolving a public interface.

```java
interface Sized {
    int size(); // Contract: non-negative element count.
    default boolean isEmpty() {
        return size() == 0;
    }
}
```

Class methods take precedence over interface defaults; more-specific interface
defaults can override inherited ones. Unrelated conflicting defaults need
explicit resolution, for example an override selecting `Left.super.label()`.
Adding a default can create source conflicts or invocation-time failures in
existing binaries, despite its binary-compatibility classification. Exercise
known implementations and mixed-version callers; it is not an unconditional
safe upgrade. Keep shared mutable state or mandatory lifecycle in an appropriate
class/collaborator instead of requiring implementers to emulate hidden fields.

Sources: [JLS interface inheritance](https://docs.oracle.com/javase/specs/jls/se8/html/jls-9.html#jls-9.4.1),
[JLS interface evolution](https://docs.oracle.com/javase/specs/jls/se8/html/jls-13.html#jls-13.5.6).

## interface-static-methods

**Minimum: Java 8.** Put a static factory or helper on an interface when that
interface clearly owns the operation; keep unrelated utilities elsewhere.

```java
@FunctionalInterface
interface TextRule {
    boolean accepts(String value);
    static TextRule prefixed(String prefix) {
        Objects.requireNonNull(prefix, "prefix");
        return value -> value != null && value.startsWith(prefix);
    }
}
TextRule rule = TextRule.prefixed("app-");
```

Call the method through its declaring interface. Interface static methods are
not inherited by implementing classes or subinterfaces and cannot be overridden
as instance methods. They do not add an abstract operation to the functional
contract. Moving an existing public utility here still changes callers and
binary references; preserve or deliberately migrate the old entry point.

Source: [Java 8 interface methods](https://docs.oracle.com/javase/specs/jls/se8/html/jls-9.html#jls-9.4).

## optional-composition

**Minimum: Java 8.** Use `Optional` at a return boundary where absence is a
normal, meaningful result. Keep invalid input and operational failure distinct
from absence; preserve established API/serialization representations.

```java
// Lookup functions already return non-null Optional values.
String email = findUser(id)
    .flatMap(User::primaryEmail)
    .filter(address -> !address.isEmpty())
    .orElseThrow(() -> new IllegalStateException("email unavailable"));
```

Use `map` for a value-producing function and `flatMap` for an Optional-producing
one. `map` converts a null mapped result to empty; `flatMap` requires a non-null
Optional result. Return `Optional.empty()`, never a null Optional. Avoid unchecked
`get()` chains or wrapping an exception as empty. Prefer an empty collection for
an ordinary zero-result collection contract unless absent and empty differ.
Do not introduce Optional fields/parameters solely for style. Use
[lazy fallback](JAVA8.md#optional-lazy) when needed; Java 8 has no `isEmpty()`,
`stream()`, or no-argument `orElseThrow()` on Optional.

Source: [Java 8 Optional](https://docs.oracle.com/javase/8/docs/api/java/util/Optional.html).
