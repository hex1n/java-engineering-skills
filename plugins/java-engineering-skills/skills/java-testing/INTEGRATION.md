# Integration boundaries and fixture ownership

## Match the mechanism under test

| Claim | Evidence boundary |
|---|---|
| Mapping and validation | Actual configured serializer/validator and representative payloads |
| Spring interception | Managed bean through its real proxy, with the selected manager/executor |
| SQL uniqueness, locks, isolation | Target engine/version, schema and independent connections |
| HTTP status, headers, security | Actual web/security configuration; full server when dispatch matters |
| Broker redelivery/offsets | Actual broker/client configuration and restart or acknowledgement boundary |

Use H2 for claims it actually models. It cannot establish PostgreSQL/MySQL
locking or dialect behavior. Apply representative migrations and constraints
to database fixtures; a hand-built simplified schema can omit the failing
mechanism. Pin a reviewed service image version or digest appropriate to the
task instead of taking an unbounded `latest` tag.

## Testcontainers lifecycle

Check the selected Testcontainers release, modules, Java baseline, and usable
container runtime. Reuse the project's dependency management and initialization
path. A missing runtime is an environment gap; a test silently skipped for
that reason is not an integration pass.

Choose one lifecycle owner. JUnit-managed instance containers are per test;
static containers are shared within the class. A manually shared singleton
needs lifecycle aligned with its consumers. Mixing class-managed stop with
cached Spring contexts can leave later tests pointing at stopped services.
Shared containers also share state: namespace fixtures and clean each test's
data. Confirm the selected extension's parallel-execution support before
enabling parallel tests.
[JUnit extension](https://java.testcontainers.org/test_framework_integration/junit_5/),
[lifecycle patterns](https://testcontainers.com/guides/testcontainers-container-lifecycle/).

Connect through `getHost()` and the mapped port after startup. `localhost` and
fixed host ports break with remote runtimes or parallel workers. Containers
talking to each other use their network aliases and internal ports; the host
uses the published endpoint. Use the service's authenticated readiness check
when a listening socket is not enough. Bound startup and capture service logs
on failure.
[networking](https://java.testcontainers.org/features/networking/),
[readiness](https://java.testcontainers.org/features/startup_and_waits/).

## Commit, rollback, and HTTP cleanup

To verify commit-time constraints or durable effects, let the application
transaction complete and query through a fresh transaction. ORM flush can
surface deferred work but is not proof of commit. A surrounding test-owned
transaction can hide a missing application boundary or delay a constraint.

Spring test transactions are thread-bound. Preemptive timeout execution can
run the body outside them. A real HTTP server, async worker, or separate
transaction can commit work that the test's rollback will not remove. Use
isolated fixture identities/databases or explicit cleanup after workers finish.
Do not broadly delete shared data to make tests repeatable.
[Spring test transaction boundaries](https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html).

For cross-service contracts, verify representative producer/consumer versions
and real protocol mapping. Keep a focused real integration path for transport,
security, and persistence behavior that contract stubs deliberately replace.
