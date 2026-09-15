# Java 21

## pattern-switch

**Minimum: Java 21.** Use pattern switch for clear dispatch across multiple
types when the branch behavior can be preserved.

```java
// Before.
String label;
if (value == null) {
    label = "missing";
} else if (value instanceof String text) {
    label = text;
} else if (value instanceof Integer number) {
    label = Integer.toString(number);
} else {
    label = "other";
}

// After.
String label = switch (value) {
    case null -> "missing";
    case String text -> text;
    case Integer number -> Integer.toString(number);
    default -> "other";
};
```

Without `case null`, a null selector throws even when `default` is present.
Place specific cases before dominating general cases; use `when` for guards.
Preserve matching order, exceptions, and selector evaluation count. A switch
expression must be exhaustive. Avoid a catch-all that hides intentionally
exhaustive handling of a closed hierarchy unless it represents real fallback
behavior.

Source: [JEP 441](https://openjdk.org/jeps/441).

## record-pattern

**Minimum: Java 21.** Destructure an existing record in a type match when the
components are needed locally.

```java
// Before: Point is record Point(int x, int y).
if (value instanceof Point point) {
    consume(point.x(), point.y());
}

// After.
if (value instanceof Point(int x, int y)) {
    consume(x, y);
}
```

Record patterns invoke accessors; review custom accessors with effects or
exceptions. An accessor failure during pattern matching is wrapped in
`MatchException`, unlike a direct accessor call. Preserve an existing caller's
exception contract; do not mechanically replace such calls with a record pattern.
A record pattern does not match null. Nested record patterns can
fail on null components where old accessor code might have accepted or thrown
on them. This rule does not justify converting a class into a record. Named
components work on Java 21; unnamed `_` patterns are outside this stable
catalog.

Sources: [JEP 440](https://openjdk.org/jeps/440),
[Java 21 pattern matching semantics](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.30.2).

## sequenced-collections

**Minimum: Java 21.** Use endpoint access and reversed traversal on collections
with defined encounter order, such as `List` and `LinkedHashSet`.

```java
// Before: iterate a list backwards without modifying it.
for (int i = items.size() - 1; i >= 0; i--) {
    consume(items.get(i));
}

// After: items is a List; consume does not mutate it.
for (Item item : items.reversed()) {
    consume(item);
}
```

`reversed()` is a view rather than an independent copy or in-place reversal;
supported mutations write through to the original collection. It is not a
replacement for `Collections.reverse(items)` when callers require mutation.
`getFirst`/`getLast` throw `NoSuchElementException` on an empty list, unlike
indexed access's `IndexOutOfBoundsException`. `HashSet` and `HashMap` do not
gain a defined encounter order. Preserve snapshot and concurrent-modification
behavior when changing traversal.

Source: [JEP 431](https://openjdk.org/jeps/431).

## virtual-threads

**Minimum: Java 21.** Consider a virtual thread per task for many concurrent
blocking I/O operations. Keep CPU-bound parallelism sized to the workload;
virtual threads do not make computation faster.

```java
// New scoped blocking-I/O task; deadlines and resource limits are set by
// the surrounding client/service configuration.
try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
    Future<Response> pending = executor.submit(() -> client.fetch(request));
    consume(pending.get());
}
```

Use a thread per task rather than pooling virtual threads. Replacing a bounded
pool can remove its concurrency limit: retain explicit admission control or
resource limits (for example, a semaphore around calls to a constrained
downstream service). Review task volume, cancellation, deadlines, thread-local
context, and expensive per-thread caches. Verify integration with the actual
framework/runtime before changing its executor.

On **Java 21**, blocking while holding a monitor or inside certain native calls
can pin a carrier thread. Investigate long/frequent blocking synchronized
regions under representative load; do not mechanically replace every lock.
Virtual threads are daemon threads, so establish completion ownership. The
[executor closure rule](JAVA12-20.md#executor-close) applies: scope exit waits,
and a timeout on `Future.get` alone does not bound that wait. Cancel work and
verify the blocking operation responds to cancellation before claiming a
deadline is preserved.

Source: [JEP 444](https://openjdk.org/jeps/444).
