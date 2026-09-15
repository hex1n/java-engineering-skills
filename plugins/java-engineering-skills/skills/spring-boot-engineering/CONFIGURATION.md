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
