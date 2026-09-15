# Java rule index

Minimum versions are first **stable** releases. Select rows compatible with
the target established in [VERSION.md](VERSION.md), then open the linked detail.
This is a curated catalog, not an inventory of every JDK change.

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
