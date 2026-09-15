# Identity, resource access, and tenant isolation

## Authenticate credentials, then authorize the action

Validate bearer tokens with a configured verifier: signature and allowed
algorithms, issuer, intended audience, expiry/not-before, and the trusted key
source. Decoding JWT claims is not verification. Bound clock skew, key refresh,
and dependency failures using the deployed framework's configuration. Claims
needed for authorization must be verified and mapped deliberately.
[Spring resource-server JWT validation](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).

Check the action against resource ownership and applicable policy on every
access path. A role alone can be insufficient: an account reader may read its
own account but not another account. Enforce access at a trusted server boundary
and scope repository lookups/mutations when possible. Deny when required
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
[Spring CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).

CORS controls browser cross-origin access; it is not server authorization.
Use an explicit origin/credential policy for the application's clients. A
non-browser caller can still call the endpoint and needs the same access
checks. Keep session/token secrets out of URLs and logs; use transport security
through the actual proxy boundary and trust forwarded identity only from the
configured trusted intermediary.
[OWASP REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
