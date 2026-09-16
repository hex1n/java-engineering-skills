# Untrusted inputs and bounded effects

## Bind only the intended operation

Use request DTOs with explicitly writable fields. A client cannot grant itself
an owner, tenant, role, price, or workflow state by sending an extra property.
Choose reject/ignore behavior for unknown fields consistently with existing
clients, while always excluding server-owned fields from mutation.

Check structural and business limits: required vs null, positive quantities,
exact numeric conversion, collection sizes, page sizes, supported media types,
and transitions. Java 8/Boot 2 validation uses the project's actual `javax`
dependencies; newer Jakarta-based stacks require their corresponding APIs.
Validation annotations require invocation and do not replace access checks
or database constraints. Parameterize query values; dynamic column/order
identifiers need an allowlist rather than value placeholders.
[OWASP mass assignment](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html),
[SQL injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).

Bound request bytes, decoded/decompressed size, nesting and collection counts,
uploaded files, response size, execution time, and expensive concurrent work
at the layers that allocate them. A DTO constraint runs too late to prevent
an oversized body from exhausting a parser. Apply rate/quota limits to the
authenticated actor and relevant resource; an attacker-controlled header is
not a trusted quota identity. Scope cost controls to the exposed operation.

Assess the whole request's work budget: SQL chunking can still aggregate an
unbounded result, and a per-expression timeout can multiply across rules,
items, or replay steps. Follow cumulative CPU/time, downstream calls, retained
memory, response bytes, and cancellation after caller timeout. Account for
effective transport limits, admission quotas, and normal workloads before
assigning impact. Derive proposed bounds from supported workloads/capacity;
coordinate a contract change when clients currently rely on unlimited input.
[OWASP REST resource limits](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).

## Outbound URLs and parser boundaries

When the server fetches a user-supplied URL, prefer allowed destinations over
an arbitrary URL contract. Restrict schemes, credentials, ports, and resolved
addresses; include IPv4/IPv6 and private, loopback, link-local, and metadata
destinations in the policy. Revalidate each redirect or disable redirects.
A hostname check followed by an unrelated DNS resolution leaves a rebinding
window: connect through a validated resolution or controlled egress path that
enforces the same policy. Bound connect/read/overall time and response bytes.
Test with local synthetic endpoints instead of probing real metadata services.
[OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

For uploads, generate server-side storage names, enforce destination containment,
and separate uploaded content from executable/public application resources.
For untrusted serialized input, use constrained data formats/types. Inspect
Java native deserialization, polymorphic JSON, XML external entities, and
archive extraction only when those parsers are actually in the request path.
[OWASP deserialization](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html).

## Errors and observability

Return the established public error contract while recording a correlation
identifier and actionable internal reason. Trace exceptions through shared
wrappers: a resource-scope rejection can still disclose the target's actual
owner, tenant, or other protected fields. Compare returned fields with the
caller's established read entitlement and disclosure policy. Preserve stable
error codes while keeping unauthorized details in access-controlled internal
diagnostics. Redact credentials and sensitive payload fields; structured
logging still needs CR/LF and field-boundary
handling for attacker-controlled values. Keep audit identity server-derived.
Metric labels are output too: raw user IDs, URLs, or request bodies in labels
leak data.

Verification pairs each allowed case with a meaningful counterexample: extra
privileged field, oversized decoded body, unauthorized cached resource,
redirect to a denied address, or secret-bearing exception. Assert both the
response and absence of the forbidden side effect.
