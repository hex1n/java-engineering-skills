---
name: java-api-security
description: Design, implement, or review Java service API contracts and access controls. Use for HTTP/RPC compatibility, authentication, object and tenant authorization, idempotency-key request contracts, or untrusted request handling.
---

# Java API and Security

## Establish scope and trust

For each affected endpoint, record
`<verb> <resource> as <principal kind> via <stack> -> <committed effect>`.
Identify whether the caller is an end user, a service acting for a user, or a
service authorized for the full resource set. Name the trusted identity source,
authorization responsibility, and permitted resource scope. A resource ID
provided by the caller is an input, not a grant of authority.

Choose the path matching the task: design/implementation establishes and
enforces a contract; review assesses the existing contract and its enforcement.
For an extension or repair, establish the changed contract and check affected
existing paths. Preserve public contracts unless the task authorizes a
compatible migration or a specified breaking change.

- For HTTP/RPC semantics, schema evolution, retries, and endpoint idempotency,
  read [CONTRACTS.md](CONTRACTS.md).
- For credentials, roles, resource ownership, tenants, and browser requests,
  read [IDENTITY-AND-ACCESS.md](IDENTITY-AND-ACCESS.md).
- For binding, resource limits, outbound URLs, and error/log disclosure,
  read [INPUT-AND-BOUNDARIES.md](INPUT-AND-BOUNDARIES.md).

## Design or implement an endpoint

Establish these decisions before committing to DTOs or controller/facade code:

- Caller privileges and resource policy: who may perform the operation on
  which resources, which trusted layer enforces it, and how direct calls,
  batch items, cached results, and delegated jobs remain covered.
- Request/response contract: writable versus server-owned fields, null and
  numeric/date semantics, stable errors, and what denials may disclose.
- Effect and retry contract: synchronous commit versus accepted async work,
  atomicity/concurrency rules, idempotency scope and payload identity where
  retries can duplicate effects, and the meaning of timeout or cancellation.
- Work budget: supported input/batch sizes, cumulative downstream work,
  retained memory and response size, deadlines and admission controls.
  Derive limits from requirements or capacity evidence; label proposed values
  and the check needed to accept them instead of inventing universal limits.

Reuse an established enforcement boundary when its policy and bypass protection
cover the operation. For external enforcement, specify the required identity
and policy contract and how integration will prove it; an assumed gateway is
not an implemented control. Resolve authority-changing ambiguity before
implementing the dependent path, while progressing independent work.

For a design-only task, deliver the concrete contract, enforcement ownership,
failure cases, validation plan, and unresolved decisions. For implementation,
wire those controls using the project's actual stack and exercise their
boundaries. A proposed control is not evidence of runtime protection.

## Review existing endpoints

State the candidate and comparison baseline; distinguish new endpoints from
changed behavior on existing routes. Trace authentication, authorization,
validation, mutation, and response, including shared wrappers, early returns,
batch/cache hits, and asynchronous paths. Check what a rejected request can
learn as well as what it can change. Keep the scope on affected boundaries.

Classify conclusions separately from severity:

- **Confirmed defect:** a reachable path violates an established access or
  disclosure policy, contract, or operational bound. Cite the trigger,
  violated invariant, impact, and source or runtime evidence.
- **Conditional risk:** impact depends on an unverified caller privilege,
  deployment policy, workload, or other assumption. State the condition and
  the smallest check that would resolve it.
- **Verification gap:** the responsible mechanism or evidence is unavailable.
  Identify the owner/layer and evidence needed to assess it.

Assign severity from supported impact and reachability, separately from
confidence. Returning a field in an error or lacking a local limit establishes
behavior; assess audience permissions and effective bounds before calling it
a disclosure vulnerability or exploitable exhaustion. An intentional contract
can still be unsafe; distinguish that decision from an implementation defect
and describe migration when changing it affects callers.

## Establish implementation evidence

Locate the effective identity/policy mechanism, wire serializer, and validation
invocation. These can be filters, interceptors, platform policy, serializer
SPI/configuration, or explicit service validation; they need not be Spring
beans or annotation-driven. Use the effective POM and resolved dependencies
to identify available mechanisms, then trace their activation. Separate library
defaults from deployment overrides. Missing external policy evidence proves
neither safety nor an authorization bypass. For a new design, name the selected
mechanism and the integration evidence still needed.

Use framework mechanisms supported by the project's version. Check actual
filter ordering and method-security enablement before copying Spring Security
examples. Pair permitted operations with denied and malformed cases at the
real entry boundary. Check status/RPC code, fields, headers where applicable,
committed effects, and absence of protected output. Include relevant cross-owner,
credential, forbidden-field, duplicate, and resource-limit cases.

Mocked principals do not prove credential parsing or filter configuration;
Java object serialization tests do not prove a different RPC wire format.
Use synthetic identities and authorized targets for active checks. If a check
cannot run, finish the source trace and name the missing runtime evidence.

Done when each affected endpoint has its identity/resource scope, responsible
checks, input/work bounds, effects, and denial behavior accounted for. Label
proposals and unresolved decisions in designs, and classify evidence gaps in
implementations/reviews. Report validation scope explicitly; group shared
mechanisms instead of repeating identical checklists.
