---
type: llm
criteria: "The answer states that authentication does not authorize access to a particular order. It flags GET /{orderId} as an insecure direct object reference because the lookup ignores the caller's tenant (and ownership if orders are per user), and flags /export because it trusts a caller-supplied tenantId instead of the tenant from the authenticated principal. The fix scopes both queries by the principal's tenant (for example findByIdAndTenantId) and decides a consistent response for another tenant's order (typically 404). Tests use two users in different tenants and assert that each cannot read or export the other's data, including the export path."
focus: "object-level and tenant authorization on every caller-supplied ID"
target: last_message
---

Pass when both endpoints are flagged with the correct reason and fixed from the
principal, and the tests cover cross-tenant access on both paths. Fail if the
answer treats `authenticated()` as sufficient, relies on random or UUID IDs as
the fix, fixes only one endpoint, or trusts a tenant header or parameter from
the client.
