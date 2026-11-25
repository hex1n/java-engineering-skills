# Reviewing existing endpoints

## Trace the paths

State the candidate and the comparison baseline, and separate new endpoints
from changed behavior on existing routes. Trace authentication,
authorization, validation, mutation, and response, including shared wrappers,
early returns, batch and cache hits, and asynchronous paths. Check what a
rejected request can learn as well as what it can change. Keep the scope on
the affected boundaries. For an extension or repair, establish the changed
contract first, then check the existing paths it touches.

## Classify findings

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
mechanism and the integration evidence still needed; for external enforcement,
specify the identity and policy contract it must meet and how integration will
prove it.

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

A review is done when each affected endpoint has its identity and resource
scope, responsible checks, input and work bounds, effects, and denial behavior
accounted for, and every evidence gap is classified. Report validation scope
explicitly; group shared mechanisms instead of repeating identical checklists.
