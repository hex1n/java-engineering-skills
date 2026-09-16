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

Every repository read or write that takes a client-supplied ID takes the
server-derived owner or tenant in the same predicate
(`WHERE id = :id AND tenant_id = :tenant`), and the service maps an empty
result to the API's not-found or denied response. A role check in the filter
chain decides which operations exist; the predicate decides which rows.
Enforce access at a trusted server boundary on every access path. Deny when required
identity or policy evidence is missing. Unpredictable IDs reduce guessing;
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
Tenant isolation tests need two tenants and two owners within one tenant.
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
