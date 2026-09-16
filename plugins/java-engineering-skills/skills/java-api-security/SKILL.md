---
name: java-api-security
description: Design, implement, or review Java service API contracts and access controls. Use for HTTP/RPC compatibility, authentication, object and tenant authorization, idempotency-key request contracts, or untrusted request handling.
---

# Java API and Security

For each endpoint in scope write one line:
`<verb> <resource> as <principal kind> via <MVC | WebFlux | RPC stack> -> <committed effect>`.
Then locate the class that authenticates it (filter chain or RPC filter), the
serializer bean, and the validation starter in the effective POM. Done when
every endpoint line names its authentication checkpoint and its authorization
predicate. Preserve existing public contracts unless the task authorizes a
compatible migration or a specified breaking change.

- For HTTP/RPC semantics, schema evolution, retries, and endpoint idempotency,
  read [CONTRACTS.md](CONTRACTS.md).
- For credentials, roles, resource ownership, tenants, and browser requests,
  read [IDENTITY-AND-ACCESS.md](IDENTITY-AND-ACCESS.md).
- For binding, resource limits, outbound URLs, and error/log disclosure,
  read [INPUT-AND-BOUNDARIES.md](INPUT-AND-BOUNDARIES.md).

Trace each entrypoint through authentication, authorization, validation,
mutation, and response. Authentication establishes a principal; authorization
decides whether that principal may perform this operation on this resource.
Include list, export, batch, cached, and asynchronous paths when they expose
the same operation. Scope the work to affected boundaries instead of turning
every endpoint edit into an unrelated hardening project.

Use the framework's supported security mechanisms at the project's version.
Spring Security configuration APIs differ across release lines; check the
actual filter chain, matcher ordering, and method-security enablement before
copying an example. Client-controlled IDs or tenant headers are inputs to
validate, not authority granted by their presence.

## Verify the contract and denial path

Pair a permitted operation with denied and malformed cases at the real entry
boundary. Check status/RPC code, response fields, headers, committed effects,
and absence of sensitive output. Exercise another owner/tenant, expired or
wrong-audience credentials, forbidden field changes, duplicates, and resource
limits when relevant. A mocked principal test does not validate token parsing
or filter configuration; label that gap explicitly. Use synthetic identities
and authorized test targets for active checks.
