# Test doubles and Mockito

## Select the boundary to replace

| Double | Useful when | Evidence limit |
|---|---|---|
| Stub | A dependency must return a selected value or failure | Exercises the caller's response, not the real dependency |
| Mock | A meaningful outbound interaction needs verification | A recorded call does not prove a remote effect or database commit |
| Fake | A small working substitute makes stateful scenarios clearer | In-memory storage does not reproduce MySQL constraints, locks, or isolation |
| Spy | A legacy seam needs a narrowly scoped partial replacement | Unstubbed methods execute real code and can cause side effects |

These describe test roles, not necessarily different libraries: one Mockito
object can supply stubbed responses and record calls. Keep the subject under
test real, replace dependencies at intentional boundaries, and assert its
public result. Real value objects and collections are usually clearer than
deep mock chains. If an HTTP client's serialization, headers, or retry protocol
is the subject, use a local protocol stub such as an already adopted WireMock
or MockWebServer and the real client; a mocked client method skips that path.
Check the stub server's and test client's runtime requirements separately.

## Match Mockito to the test JVM

Resolve test JVM, Mockito, mock maker, Byte Buddy, and JUnit integration from
the actual dependency tree/BOM. Mockito 4 is a Java 8-compatible line; Mockito
5 requires Java 11 and defaults to the inline mock maker. This is a compatibility
boundary, not a claim that older branches receive current fixes. Preserve a
required Java 8 test lane rather than upgrading its engine by accident.
[Mockito release policy](https://github.com/mockito/mockito).

Use one initialization owner: a Mockito JUnit 4 runner/rule, Jupiter's
MockitoExtension, or a managed MockitoAnnotations.openMocks lifecycle closed
after each test. Match the selected integration to the real runner. Construct
the subject explicitly when that makes dependencies clear. `@InjectMocks`
attempts injection; it is not a Spring container and does not establish proxy,
configuration, or transaction behavior. Missing dependencies may remain null.
[injection behavior](https://javadoc.io/static/org.mockito/mockito-core/4.11.0/org/mockito/InjectMocks.html).

## Stub deliberately and verify behavior

For a regular mock, `when(...).thenReturn(...)` selects a response;
`thenThrow(...)` selects a supported failure. Use `doThrow(...).when(...)`
for void failures. For spies, `when(spy.method())` invokes the real method
during setup; use `doReturn(...).when(spy).method()` when that call must not run.
Prefer a dependency seam over partially mocking the business algorithm.
[Mockito stubbing and spies](https://javadoc.io/static/org.mockito/mockito-core/4.11.0/org/mockito/Mockito.html).

A Java 8-compatible test fragment, with a real service that delegates pricing:

```java
PriceGateway gateway = mock(PriceGateway.class);
when(gateway.lookup(eq("standard"), isNull())).thenReturn(100);
InvoiceService service = new InvoiceService(gateway);

assertEquals(100, service.total("standard", null));
verify(gateway).lookup(eq("standard"), isNull());
```

If any argument uses a matcher, use matchers for all arguments in that call.
`anyString()` and `any(SomeClass.class)` do not match null; choose `isNull()`
or `nullable(...)` according to the contract. Exact values or focused predicates
catch wrong IDs and amounts that broad `any()` matchers can conceal. Keep
matchers inside stubbing/verification calls.
[argument matching](https://javadoc.io/static/org.mockito/mockito-core/4.11.0/org/mockito/ArgumentMatchers.html).

Use ArgumentCaptor during verification when the produced argument is an
observable output, then assert its meaningful fields. Captured mutable objects
are references, not historical snapshots; capture/copy at invocation time if
later mutation would obscure the required state.
[argument capture](https://javadoc.io/static/org.mockito/mockito-core/4.11.0/org/mockito/ArgumentCaptor.html).

Use `never()` or call counts when absence/count is the contract, such as no
charge after rejection. Require InOrder only for a meaningful order constraint.
Blanket verifyNoMoreInteractions makes incidental implementation changes fail.
Await terminal completion before verifying asynchronous calls or absence;
Mockito verification alone does not stop late work.

Prefer strict stubbing through the chosen integration to expose unused stubs
and argument mismatches. Fix stale setup first; use narrowly justified leniency
for an intentionally optional interaction. Avoid resetting shared mocks to
hide test coupling; create isolated fixtures for each test.
[strictness](https://javadoc.io/static/org.mockito/mockito-core/4.11.0/org/mockito/quality/Strictness.html).

## Static, construction, and framework boundaries

Check mock-maker and version support before mocking final methods/classes,
static calls, or construction. Scope MockedStatic/MockedConstruction with
try-with-resources. Static mocking is thread-local; an async worker does not
automatically inherit the caller's mock. A constructor/static dependency used
across threads is often better controlled by an injected factory, Clock, or
gateway. Preserve an existing legacy tool's runner/classloader constraints
when migrating; do not introduce PowerMock merely to bypass an available seam.
[scoped static mocks](https://javadoc.io/static/org.mockito/mockito-core/4.11.0/org/mockito/MockedStatic.html).

On newer JDKs, inline instrumentation may require explicit test-JVM agent
configuration. Use the selected Mockito release's documented setup and retain
existing coverage-agent arguments. JDK 21 dynamic-agent warnings are not a
reason to change global JVM settings or assume the same flags work on Java 8.
[Mockito instrumentation setup](https://javadoc.io/static/org.mockito/mockito-core/5.14.2/org/mockito/Mockito.html).

A plain `@Mock` does not replace a Spring context bean. Use the actual stack's
supported bean-override mechanism: legacy Boot uses `@MockBean`/`@SpyBean`;
Framework 6.2+ provides `@MockitoBean`/`@MockitoSpyBean`. Resolve availability
before changing annotations. Keep the service/proxy under test real and replace
only its intended collaborators; verify bean names/qualifiers and whether an
override creates a missing bean or requires an existing one. Mocking the bean
that owns `@Transactional` removes the transaction behavior being tested.
[Spring bean overrides](https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-mockitobean.html).
