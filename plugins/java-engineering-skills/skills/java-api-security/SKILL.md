---
name: java-api-security
description: Design, implement, or review Java service API contracts and access controls. Use for HTTP/RPC compatibility, authentication, object and tenant authorization, idempotency-key request contracts, or untrusted request handling, such as Spring Security, JWT, or IDOR checks, including asks phrased as 越权, 鉴权, 权限校验, 接口兼容, or 防重复提交.
---

# Java API and Security

## Establish scope and trust

For each affected endpoint, record
`<verb> <resource> as <principal kind> via <stack> -> <committed effect>`.
Name the caller kind (end user, service acting for a user, or service
authorized for the full resource set), the trusted identity source, who
enforces authorization, and the permitted resource scope. A caller-supplied ID
is an input, not a grant of authority: check object-level authorization on
every ID the caller supplies (IDOR), and tenant scope on list, batch, search,
and export paths.

- HTTP/RPC semantics, schema evolution, retries, endpoint idempotency:
  [CONTRACTS.md](CONTRACTS.md).
- Credentials, roles, resource ownership, tenants, browser requests:
  [IDENTITY-AND-ACCESS.md](IDENTITY-AND-ACCESS.md).
- Binding, resource limits, outbound URLs, error/log disclosure:
  [INPUT-AND-BOUNDARIES.md](INPUT-AND-BOUNDARIES.md).
- Reviewing existing endpoints, classifying findings, and the evidence that
  proves a control: [REVIEW.md](REVIEW.md).

Preserve public contracts unless the task authorizes a compatible migration or
a specified breaking change.

## Design or implement an endpoint

Settle these before writing DTOs or controller/facade code:

1. Resource policy: who may do what to which resources, which trusted layer
   enforces it, and how direct calls, batch items, cached results, and
   delegated jobs stay covered.
2. Request/response contract: writable versus server-owned fields, null,
   numeric and date semantics, stable errors, and what a denial may disclose.
3. Effect and retry contract: synchronous commit or accepted async work,
   atomicity and concurrency rules, idempotency scope and payload identity where retries can duplicate effects,
   and what a timeout or cancellation means.
4. Work budget: input and batch sizes, downstream work, retained memory,
   response size, deadlines. Derive limits from requirements or capacity evidence, or label
   them proposed with the check that would accept them.

Reuse an enforcement boundary only when its policy and bypass protection cover
the operation; an assumed gateway is not an implemented control. Resolve an
ambiguity that changes authority before building the path that depends on it.
A design-only task delivers the contract, enforcement owner, failure cases,
validation plan, and open decisions. Implement
with the project's actual stack and test permitted, denied, cross-owner, and
malformed cases at the real entry boundary. A proposed control or a mocked
principal is not evidence of runtime protection.

Done when each affected endpoint has its identity and resource scope,
responsible checks, input and work bounds, effects, and denial behavior
accounted for, with proposals and unresolved decisions labeled.

## Report

Close with one report in three parts, worded the same in every skill of this
plugin so that a task loading several skills still produces one report:
**Conclusion** (the answer or change and the conditions it holds under),
**Verified** (what was run or observed, with versions), and **Not verified**
(assumptions and remaining checks, each with the step that would settle it).
Put this skill's report items into those parts rather than adding sections. A
short answer can give each part in a sentence; leave out a part with nothing
in it.
