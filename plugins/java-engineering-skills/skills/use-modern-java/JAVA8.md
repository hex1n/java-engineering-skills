# Java 8 baseline

## java-time

**Minimum: Java 8.** Use `java.time` for new temporal logic: `Instant` for a
point on the timeline, `LocalDate` for a calendar date, and an explicit zone
when converting between them. Use `Duration` for elapsed time and `Period`
for calendar amounts; a calendar day is not always 24 hours across DST.

```java
// Before: legacy representation of a timestamp.
Date timestamp = new Date(epochMillis);

// After: explicit instant; bridge only at a legacy API boundary.
Instant timestamp = Instant.ofEpochMilli(epochMillis);
Date legacyTimestamp = Date.from(timestamp);
```

Keep existing API/database/wire representations until their migration is in
scope. A `LocalDateTime` has no offset and cannot identify an instant alone.
Preserve formatter patterns, locale, zone, and parsing strictness during a
conversion; test boundary dates and DST when relevant.

Source: [Java 8 time package](https://docs.oracle.com/javase/8/docs/api/java/time/package-summary.html).

## standard-base64

**Minimum: Java 8.** Prefer `java.util.Base64` where its variant matches the
existing protocol, instead of internal JDK utilities or a dependency used only
for equivalent encoding.

```java
// Before: a third-party encoder using the basic alphabet and padding.
String encoded = org.apache.commons.codec.binary.Base64.encodeBase64String(bytes);

// After: the corresponding Java SE encoder.
String encoded = Base64.getEncoder().encodeToString(bytes);
```

Choose basic, URL-safe, or MIME explicitly. Preserve padding and line wrapping.
Decoder tolerance is also observable: MIME decoding ignores characters that
basic decoding rejects. Validate existing inputs before replacing a decoder;
matching successful encodings alone does not prove decoding compatibility.

Source: [Java 8 Base64](https://docs.oracle.com/javase/8/docs/api/java/util/Base64.html).

## map-compute

**Minimum: Java 8.** Use `computeIfAbsent` for a lazily initialized non-null
value, or `merge` for accumulation, when the operation matches the map's
existing semantics.

```java
// Before: this map treats absent and null-mapped keys alike.
List<String> bucket = groups.get(key);
if (bucket == null) {
    bucket = new ArrayList<>();
    groups.put(key, bucket);
}
bucket.add(value);

// After.
groups.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
```

`computeIfAbsent` also runs for a null-mapped key; a null computation does not
install a value. `merge` requires a non-null supplied value and removes a
mapping when its remapping function returns null. Keep mapping functions free
of mutations to the same map. Default `Map` methods do not confer atomicity:
check the concrete concurrent map's contract, and remember that a stored
`ArrayList` still needs its own concurrency discipline.

Source: [Java 8 Map](https://docs.oracle.com/javase/8/docs/api/java/util/Map.html).

## optional-lazy

**Minimum: Java 8.** Use `orElseGet` for an expensive or side-effecting fallback
that should run only on absence. Keep `orElse` for an already available value.

```java
// Before: fallback evaluation occurs even when cached is present.
Value result = cached.orElse(loadDefault());

// After: only when that evaluation is intended to be conditional.
Value result = cached.orElseGet(this::loadDefault);
```

This changes evaluation behavior. Preserve eager work if callers depend on its
side effects. Retain an existing optional representation; do not spread
`Optional` into persistence fields or public parameters merely for style.

Source: [Optional fallback methods](https://docs.oracle.com/javase/9/docs/api/java/util/Optional.html).

## mutable-stream-result

**Minimum: Java 8.** Express required mutability using
`Collectors.toCollection(ArrayList::new)`.

```java
// Before: downstream mutation relies on an unspecified collector property.
List<String> names = users.stream().map(User::getName)
    .collect(Collectors.toList());
names.add("guest");

// After: the mutable collection is explicit.
List<String> names = users.stream().map(User::getName)
    .collect(Collectors.toCollection(ArrayList::new));
names.add("guest");
```

`Collectors.toList()` promises no particular implementation or mutability.
On Java 16+, `Stream.toList()` explicitly returns an unmodifiable list, so it
does not fit this case. Keep a loop when it expresses control flow or effects
more clearly; this rule does not call for converting every loop to a stream.

Source: [Java 8 Collectors](https://docs.oracle.com/javase/8/docs/api/java/util/stream/Collectors.html).
