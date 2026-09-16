# Service contracts, retries, and evolution

## HTTP and wire semantics

Define the resource and operation before choosing endpoints. Preserve client
expectations for absent/null values, numeric precision, enum evolution,
timestamps/zones, pagination, ordering, and errors. Use explicit request and
response DTOs to keep persistence details and writable fields out of the
public contract. Validate using the production serializer configuration.

Safe HTTP methods must not request business mutations. Idempotent methods
describe the intended effect of repeating the request, not identical response
bodies or status codes. A timeout is an unknown outcome; automatic retries
need the operation's semantics and a shared retry budget. For concurrent
resource edits, an ETag/If-Match contract can expose optimistic concurrency;
enforce its predicate atomically with the mutation. Choose status codes that
represent actual outcomes rather than returning success for every error.
[HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html).

Use the existing error model or a compatible Problem Details representation.
Keep machine-readable type/code stable, HTTP status consistent, and human
detail free of stack traces, SQL, or secret values. RFC 9457 defines a wire
format; it does not require Spring's newer `ProblemDetail` Java class. On
older frameworks, preserve a supported DTO implementation.
[Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html).

## Idempotent business endpoints

For retriable creation or commands, specify a stable operation key, its
authenticated tenant/client scope, semantic payload identity, retained result,
concurrent-request behavior, and retention horizon. Reject incompatible reuse
instead of replaying a result for another request. Authenticate and authorize
before exposing any saved result, including on retry.

The database side (the unique operation record committed with the mutation,
competing-request arbitration, and lost-commit reconciliation) belongs to
database-transactions. This file owns only the protocol: key scope, pending
and expired-key responses, and retention.
External effects require durable dispatch and recipient-enforced idempotency
or reconciliation; a local key alone cannot make them atomic.

Describe pending and expired-key responses, bounded waiting, and whether
business rejections are retained. Use the same key across network retries.
Key expiry reopens duplication unless the business itself prevents repeat
application. Test simultaneous duplicates and response loss, not only two
sequential calls. These are application protocol choices; do not present a
particular header name or status as universal HTTP behavior.

## RPC and mixed-version clients

Give RPC calls a bounded deadline and propagate the remaining budget through
downstream work. Server cancellation requires cooperative handling and does
not undo committed effects. Bound retries across caller, SDK, gateway, and
service layers rather than multiplying each layer's attempts.
[gRPC deadlines](https://grpc.io/docs/guides/deadlines/).

With Protobuf, retain field numbers and reserve removed numbers/names. Check
both binary and JSON compatibility, field presence, enum handling, and client
code behavior; wire-compatible changes can still break callers' assumptions.
Exercise old/new producer-consumer pairs for rolling upgrades.
[Protobuf evolution](https://protobuf.dev/programming-guides/proto3/#updating).

For Java-specific RPC stacks, also inspect interface/DTO serialization and
registry/version routing. Do not infer compatibility solely from matching
Java method names or a schema generator succeeding.
