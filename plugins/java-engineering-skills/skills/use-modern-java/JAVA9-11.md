# Java 9 through 11

## collection-factories

**Minimum: Java 9.** Use `List.of`, `Set.of`, `Map.of`, or `Map.ofEntries` for
small collections whose contract is unmodifiable and rejects nulls.

```java
// Before: constant non-null list with no exposed backing list.
List<String> roles = Collections.unmodifiableList(Arrays.asList("reader", "writer"));

// After.
List<String> roles = List.of("reader", "writer");
```

`Arrays.asList` permits `set` and can reflect changes to its backing array;
`List.of` does neither. The factories reject null elements/keys/values;
`Set.of` rejects duplicates and map factories reject duplicate keys. Set/map
iteration order is unspecified. Preserve mutable, null-tolerant, ordered, or
backed-view contracts with appropriate existing implementations. Unmodifiable
containers do not make their elements immutable.

Source: [JEP 269](https://openjdk.org/jeps/269).

## optional-stream

**Minimum: Java 9.** Flatten optional values using `Optional.stream()` in an
existing pipeline.

```java
// Before.
Stream<Value> present = candidates.filter(Optional::isPresent).map(Optional::get);

// After.
Stream<Value> present = candidates.flatMap(Optional::stream);
```

This expects non-null `Optional` objects. For a nullable value rather than an
optional, Java 9's `Stream.ofNullable(value)` gives zero or one elements. Use
an ordinary conditional when no surrounding pipeline benefits from a stream.

Sources: [Optional.stream](https://docs.oracle.com/javase/9/docs/api/java/util/Optional.html),
[Java 9 Stream](https://docs.oracle.com/javase/9/docs/api/java/util/stream/Stream.html).

## existing-resource

**Minimum: Java 9.** Reference an existing final or effectively final resource
directly in try-with-resources when the current scope owns its closure.

```java
// Before: reader is effectively final and owned here.
try (BufferedReader owned = reader) {
    return owned.readLine();
}

// After.
try (reader) {
    return reader.readLine();
}
```

Keep the same lifetime and ownership. A borrowed stream supplied by a caller
is not automatically yours to close. Basic declaration-form try-with-resources
already works on Java 8 (introduced in Java 7); only the existing-variable
form needs Java 9. Resource-backed streams such as `Files.lines` still require
closure even when their terminal operation has finished.

Source: [JEP 213](https://openjdk.org/jeps/213).

## collection-copy

**Minimum: Java 10.** Use `List.copyOf`, `Set.copyOf`, or `Map.copyOf` when a
shallow unmodifiable snapshot with the corresponding null/order semantics
is intended.

```java
// Before: input is known not to contain nulls.
List<String> snapshot = Collections.unmodifiableList(new ArrayList<>(input));

// After.
List<String> snapshot = List.copyOf(input);
```

`Collections.unmodifiableList(input)` alone is a live view, so replacing it
with `copyOf` changes whether later input mutations are visible. `copyOf`
rejects nulls and need not allocate a distinct object. Elements are still
shared. `List.copyOf` retains iteration order; set/map copies do not promise
it. Verify aliasing, null handling, and caller mutation before replacing a
wrapper or a defensive copy.

Sources: [List.copyOf](https://docs.oracle.com/javase/10/docs/api/java/util/List.html),
[Set.copyOf](https://docs.oracle.com/javase/10/docs/api/java/util/Set.html),
[Map.copyOf](https://docs.oracle.com/javase/10/docs/api/java/util/Map.html).

## local-var

**Minimum: Java 10.** Use `var` for local variables when the initializer makes
the type apparent and the inferred type supports intended later assignments.

```java
// Before.
ByteArrayOutputStream buffer = new ByteArrayOutputStream();

// After.
var buffer = new ByteArrayOutputStream();
```

Keep an explicit type when it communicates an abstraction, provides a needed
generic target type, or makes an opaque factory result understandable. Changing
`List<String> x = new ArrayList<>()` to `var x = new ArrayList<>()` loses the
`String` target and infers `ArrayList<Object>`. `var` is not available for
fields, return types, or ordinary method parameters. Explicit repository
conventions can prefer declared local types.

Source: [JEP 286](https://openjdk.org/jeps/286).

## string-whitespace

**Minimum: Java 11.** Use `isBlank`, `strip`, `stripLeading`, or `stripTrailing`
when the desired whitespace definition is `Character.isWhitespace`.

```java
// Before: tests whether every code point is Java whitespace.
boolean blank = text.codePoints().allMatch(Character::isWhitespace);

// After.
boolean blank = text.isBlank();
```

`trim()` removes characters at or below U+0020; `strip()` uses a different
definition. Neither means every Unicode space (for example, a non-breaking
space is not Java whitespace). A mechanical `trim().isEmpty()` replacement
can change validation results. Both APIs require a non-null receiver; retain
existing null behavior when replacing utility-library calls.

Source: [Java 11 String](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/lang/String.html).

## files-string

**Minimum: Java 11.** Use `Files.readString` and `Files.writeString` for bounded
whole-file text operations with a known charset.

```java
// Before: bounded, well-formed UTF-8 input.
String text = new String(Files.readAllBytes(path), StandardCharsets.UTF_8);

// After.
String text = Files.readString(path, StandardCharsets.UTF_8);
```

Malformed input is a migration boundary: the `String` constructor replaces
malformed byte sequences, whereas `readString` reports an I/O error. Preserve
that behavior or explicitly test the intended change. Default overloads use
UTF-8, which can differ from old platform-default readers. For large input,
retain streaming and resource closure. `writeString` defaults to create/write/
truncate, so pass the existing append or creation options where required.

Source: [Java 11 Files](https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/nio/file/Files.html).

## http-client

**Minimum: Java 11.** For new Java SE HTTP calls, consider `java.net.http`
instead of manual `HttpURLConnection` lifecycle code. Reuse an appropriately
configured client across requests.

```java
// New code: client is configured once and reused.
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();
HttpRequest request = HttpRequest.newBuilder(uri)
    .timeout(Duration.ofSeconds(10)) // Java 11–21: does not bound body reading.
    .GET()
    .build();
HttpResponse<String> response = client.send(request,
    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
```

Replacing an existing client is a migration: preserve redirects, proxy/TLS,
authentication, cookies, status/error handling, charset, cancellation, and
timeouts. The default redirect policy is `NEVER`; `send` does not turn an HTTP
error status into an application exception.

Distinguish connection establishment, waiting for response headers, response-body
reading, and the total operation budget. In Java 11–21, the request timeout
applies until response headers arrive; it does not cover consuming the body.
With `ofString`, `send` can keep waiting beyond ten seconds if headers arrive
but the body stalls. This setting does not replace an existing
`HttpURLConnection.readTimeout` contract. JDK 26 extended request timeout to
body consumption; that later behavior must not be assumed for Java 11–21.

For a required body-read or overall deadline, retain a client with suitable
controls or implement and verify a compatible timeout/cancellation mechanism.
A timeout on `Future.get` alone bounds the caller's wait, not the underlying
operation. Test prompt headers followed by a stalled body, and verify termination
and resource release after cancellation. Follow existing interruption handling
and close streaming bodies. Keep a framework-managed client when its integration
is needed. `HttpClient` is not `AutoCloseable` on Java 11.

Sources: [Java 11 HttpClient](https://docs.oracle.com/en/java/javase/11/docs/api/java.net.http/java/net/http/HttpClient.html),
[Oracle Java team: request-timeout scope change](https://inside.java/2026/03/04/jdk-26-http-client/#timeout-update).
