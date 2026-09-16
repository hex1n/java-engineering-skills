# Web boundaries, tests, and operations

## Web application model

Preserve the actual MVC or WebFlux execution model. A reactive return type alone
does not make blocking JDBC/HTTP work non-blocking; examine the entire chain.
Avoid blocking an event loop. Explicitly scheduled blocking work still needs
capacity and cancellation limits, and a full reactive rewrite needs a reason
beyond stylistic modernization.

Keep transport DTO validation and business invariants distinct. Preserve
status codes, error schema, unknown-field behavior, time/number serialization,
and content negotiation when changing controllers or exception advice. Use
version-compatible validation/error APIs; Boot 2.7 and Boot 3 do not share all
imports and facilities. Test authentication and object/tenant authorization at
the actual request boundary when that behavior is affected.

Source: [Spring WebFlux concurrency model](https://docs.spring.io/spring-framework/reference/6.2/web/webflux/new-framework.html).

## Choose a test boundary

| Question | Useful test |
|---|---|
| Pure business calculation or policy | Plain unit test with real value inputs. |
| JSON, validation, route/error behavior | Appropriate MVC/WebFlux slice and relevant security configuration. |
| Bean conditions or property binding | Small context test exercising the condition/configuration. |
| Transaction proxy, ORM mapping, query, or locking | Managed bean with the actual database dialect/version when claiming that behavior. |
| Startup and real HTTP integration | Full context/server test with explicit dependency lifecycle. |

Choose mocking annotations, slice imports, and client helpers from the installed
Boot/Spring version. In a random-port server test, test-client and server work
run on separate threads; a test method's rollback does not roll back the server's
transaction. Provide deterministic cleanup or isolated database state. In-memory
database tests do not prove production SQL, locking, or collation behavior.

Source: [Testing Boot applications](https://docs.spring.io/spring-boot/3.5/reference/testing/spring-boot-applications.html).

## Observe the changed mechanism

For a pool, cache, or downstream call, observe saturation/queueing, timeouts,
errors, and latency alongside throughput. Keep metric tag sets bounded; user
IDs, request IDs, and raw URLs can create unbounded time series. Correlation
belongs in appropriately controlled logs/traces, not every metric label.

Expose only the intended Actuator endpoints through the configured management
network/security policy. Adding a custom security configuration can change
auto-configured protection. For health checks, distinguish readiness from
liveness; tying liveness to a shared downstream outage can trigger unnecessary
restarts. Preserve graceful shutdown ownership and in-flight work behavior.

Sources: [Boot metrics](https://docs.spring.io/spring-boot/3.5/reference/actuator/metrics.html),
[Actuator endpoint exposure](https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html),
[Application availability probes](https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes).
