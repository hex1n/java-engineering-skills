# Identity, resource access, and tenant isolation

## Authenticate credentials, then authorize the action

Validate bearer tokens with a configured verifier: signature and allowed
algorithms, issuer, intended audience, expiry/not-before, and the trusted key
source. Decoding JWT claims is not verification. Note which checks the stack
already performs: Spring Security 6.4's standard JWT setup verifies signatures
and uses timestamp validation with a 60-second default clock skew. Issuer
validation requires an expected issuer, such as Boot's `issuer-uri`, or an
issuer validator; `jwk-set-uri` or a public key alone does not establish it.
Audience validation requires the supported audiences property or an
`OAuth2TokenValidator`. Inspect the actual decoder and validator chain,
especially after customization, and test a validly signed token with the wrong
issuer or audience. Bound clock skew, key refresh, and dependency failures
using the deployed framework's configuration. Claims
needed for authorization must be verified and mapped deliberately.
[Spring resource-server JWT validation](https://docs.spring.io/spring-security/reference/6.4/servlet/oauth2/resource-server/jwt.html),
[Boot 3.4.0 JWT configuration](https://github.com/spring-projects/spring-boot/blob/v3.4.0/spring-boot-project/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/security/oauth2/resource/servlet/OAuth2ResourceServerJwtConfiguration.java).

Establish the access model before choosing an enforcement shape. A service
authorized for the full resource set has a different resource scope from one acting
for an end user. Verify who grants that privilege and which methods/resources
it covers; an internal network location alone does not grant it. Where a
gateway or RPC platform owns authorization, inspect its trusted identity,
resource policy, and coverage of reachable direct calls. Missing configuration
in the reviewed repository leaves that responsibility unverified.

For owner/tenant-scoped access, bind client-supplied resource IDs to trusted
scope, for example `WHERE id = :id AND tenant_id = :tenant`, or verify an
equivalent server-side policy enforcement path. Matching a child resource to the
parent named in the request only proves resource consistency; it does not
establish the caller's entitlement to either resource. Map denials/missing rows according
to the API's disclosure policy. At runtime, reject requests lacking identity
or policy required by the established model. Unpredictable IDs reduce guessing;
they do not replace authorization. Test direct calls as well as routed calls
when both are reachable.
[OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## Tenant scope is server-established

Derive the active tenant from verified identity and membership or an authorized
tenant-selection flow. A header/path tenant must be checked against that scope.
Carry it through SQL predicates, cache keys, object storage, exports, and job
payloads. Re-establish and clear context across thread reuse; a leftover
ThreadLocal can leak one request's scope into another.

Scope cached data and saved idempotency results by their real audience. Tenant
scope alone is insufficient for owner-private data within a tenant: authorize
the resource on hits too, or use a safely scoped authorization-aware cache.
Check membership/policy changes under the declared revocation semantics.
Keep permission checks ahead of idempotent early returns; replaying a frozen
business result need not rerun business validation. For asynchronous work,
identify whether execution uses delegated caller scope or a privileged service
mandate, and how admission, payload integrity, and revocation semantics protect
that scope. Tenant isolation tests need two tenants and two owners within one
tenant when that access model applies.
[OWASP tenant boundaries](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html).

For an update, prevent a check-then-write race from changing which object is
modified: bind trusted scope, resource identity, and relevant state/version in
the actual mutation. Treat zero affected rows as denied/conflict/missing under
the API's disclosure policy. Batch operations must authorize every affected
resource or implement an explicit all-or-nothing/partial-result contract.

## Browser credentials, CSRF, and CORS

Select CSRF handling from how credentials reach the server. Cookies and other
automatically sent browser credentials can require CSRF protection even for
an API described as stateless. Keep the framework's protection for those
flows and test unsafe methods. A header-only bearer flow has different
assumptions; verify that no alternate cookie/session credential path exists
before narrowing protection. Preserve version-specific token handling during
Spring Security upgrades.
[Spring CSRF](https://docs.spring.io/spring-security/reference/6.4/servlet/exploits/csrf.html).

CORS controls browser cross-origin access; it is not server authorization.
Use an explicit origin/credential policy for the application's clients. A
non-browser caller can still call the endpoint and needs the same access
checks. Keep session/token secrets out of URLs and logs; use transport security
through the actual proxy boundary and trust forwarded identity only from the
configured trusted intermediary.
[OWASP REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
