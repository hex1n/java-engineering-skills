# Versions, wiring, and configuration

## Compatibility first

Boot 2.7.18 documents Java 8 as its minimum and compatibility through Java 21;
Boot 3.2.12 requires Java 17. These are specific historical compatibility
anchors, not statements of current maintenance/security support or instructions
to choose those patch versions. Check the actual release's requirements and
support policy for upgrades.

Boot 3 uses the Jakarta generation of enterprise APIs. Migrate dependencies,
annotations, servlet/persistence integrations, and tests together. A global
`javax` to `jakarta` substitution is wrong: Java SE packages such as `javax.sql`
do not move. Keep Java language level distinct from framework/client support.

Sources: [Boot 2.7.18 requirements](https://docs.spring.io/spring-boot/docs/2.7.18/reference/html/getting-started.html),
[Boot 3.2.12 requirements](https://docs.spring.io/spring-boot/docs/3.2.12/reference/html/getting-started.html),
[Boot 3 migration guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide).

## Lines before 2.7

A Java 8 service often sits on an earlier 2.x line, where the examples here
still assume defaults it does not have. Resolve the line first, then read that
release's notes for the step being crossed. The changes that most often alter
behavior silently or stop a build:

- 2.1 disables bean definition overriding; `spring.main.allow-bean-definition-overriding`
  restores it.
  [2.1 release notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.1-Release-Notes).
- 2.2 makes JUnit 5 the default in `spring-boot-starter-test` and adds
  constructor binding through `@ConstructorBinding`.
  [2.2 release notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.2-Release-Notes).
- 2.3 stops pulling the validation starter through the web and WebFlux
  starters, so `javax.validation` imports need the starter declared.
  [2.3 release notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.3-Release-Notes).
- 2.4 rewrites `application.properties`/`application.yml` processing: property
  sources are added in declaration order rather than profile-activation order,
  external files always override packaged ones, `spring.profiles` becomes
  `spring.config.activate.on-profile`, and neither `spring.profiles.active`
  nor `spring.profiles.include` is allowed in a profile-specific document;
  express "profile x also activates y" as `spring.profiles.group.x=y` in a
  non-profile-specific document. `spring.config.use-legacy-processing`
  restores the old logic and survives until Boot 3. The same release removes
  JUnit 5's vintage engine from the test starter, so JUnit 4 tests stop running
  rather than fail.
  [2.4 release notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.4-Release-Notes),
  [config data migration guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-Config-Data-Migration-Guide).
- 2.5 redesigns `schema.sql`/`data.sql` support and runs `data.sql` before
  Hibernate initializes.
  [2.5 release notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.5-Release-Notes).
- 2.6 prohibits circular references, recoverable with
  `spring.main.allow-circular-references`, and switches MVC path matching to
  `PathPatternParser`. `spring.mvc.pathmatch.matching-strategy` returns MVC to
  `AntPathMatcher`, but actuator endpoints are not configurable that way, and
  Actuator with Springfox may fail to start.
  [2.6 release notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.6-Release-Notes).
- 2.7 deprecates auto-configuration entries in `spring.factories` in favor of
  `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`,
  while still honoring both. That one is preparation for Boot 3, not a 2.7 break.
  [2.7 release notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-2.7-Release-Notes).

After crossing any of these, verify the resolved configuration and the executed
test count; the 2.4 config-data rewrite and the vintage-engine removal both
survive a successful start. Treat a stay on 2.7 as a decision with a support
boundary; read the current support policy at spring.io rather than this file.

## Dependencies and auto-configuration

Use the project's parent/BOM to align dependencies. Inspect the effective
dependency graph before overriding an individual Spring, Jackson, logging,
servlet, or persistence version; an isolated override can create binary/API
incompatibility. Prefer the existing starter when its managed integration fits.

When a bean is missing, duplicated, or unexpectedly selected, inspect component
scan scope, active profiles, conditional configuration, qualifiers, and the
condition evaluation report. Auto-configuration can back off when user beans
are present. Replacing it with a custom bean can also remove defaults the
application relied on.

Prefer constructor injection for required collaborators and explicit qualifiers
when selection is ambiguous. Resolve a circular dependency by examining
responsibility/lifecycle rather than enabling circular references by default.
Container singleton scope does not protect mutable fields from concurrent
requests.

Source: [Boot auto-configuration](https://docs.spring.io/spring-boot/reference/using/auto-configuration.html).

## Properties

Use typed `@ConfigurationProperties` for cohesive configuration with explicit
validation, units, and bounds. Choose constructor/setter binding syntax from
the actual Boot version. Trace active profiles and property-source precedence;
an environment or command-line override may differ from the checked-in YAML.

Preserve externally supplied property names during refactoring or provide an
explicit migration. Fail on invalid required configuration where appropriate,
instead of silently substituting an unsafe timeout or empty endpoint. Keep
secret values out of diagnostic output; names and origins are usually enough
to diagnose binding.

Source: [Externalized configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html).

## Declarative caching

Resolve cache enablement, CacheManager/CacheResolver, provider, and proxy mode.
Self-invocation bypasses `@Cacheable` (proxy rule in
[TRANSACTIONS-AND-ASYNC.md](TRANSACTIONS-AND-ASYNC.md)). Check actual
hits/misses through the managed entry point.

A key must distinguish every input/context that changes the cached result,
including tenant or audience where relevant. Default argument-based keys do
not automatically include a tenant held in ThreadLocal. For methods sharing a
cache region, also prevent collisions between different operations. Set TTL,
size, serialization, null-value and error policies through the chosen provider.
An annotation alone does not establish those properties.

`@CachePut` executes the method and updates the cache; `@CacheEvict` normally
evicts after successful method invocation, while `beforeInvocation=true`
changes that timing. Successful return is not necessarily database commit.
Inspect advice ordering and transaction-aware cache behavior; rollback and a
crash between commit and cache update still need the declared consistency policy.

`@Cacheable(sync=true)` (Framework 4.3+) delegates synchronized loading to the
provider and has restrictions such as no `unless`. It does not establish
cross-instance exclusion or database consistency by itself. Test the actual
provider and topology before claiming one load globally. Verify same-key calls,
cross-tenant inputs, self-invocation, and rollback after a cache-changing call.

Sources: [Spring cache abstraction](https://docs.spring.io/spring-framework/reference/integration/cache.html),
[Framework 5.3 Cacheable](https://docs.spring.io/spring-framework/docs/5.3.31/javadoc-api/org/springframework/cache/annotation/Cacheable.html),
[Framework 5.3 CacheEvict](https://docs.spring.io/spring-framework/docs/5.3.31/javadoc-api/org/springframework/cache/annotation/CacheEvict.html).
