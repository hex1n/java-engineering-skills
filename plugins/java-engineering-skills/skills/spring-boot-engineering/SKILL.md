---
name: spring-boot-engineering
description: Spring Boot wiring, auto-configuration, property binding, @Transactional and @Cacheable proxies, @Async, Boot 2.x release-line changes, MVC/WebFlux, and Spring test slices. Use when a Spring annotation, bean, or context behaves unexpectedly, or when crossing a Boot release line.
---

# Spring Boot Engineering

Inspect the effective Boot parent/BOM/plugin version, Spring modules, Java
release, application type, and active configuration before choosing APIs.
The main compatibility anchors are Boot 2.7/Framework 5.3, which requires
Java 8, and Boot 3.x/Framework 6.x, which requires Java 17; per-line details
are in CONFIGURATION.md. Confirm exact patch requirements; examples are not
upgrade instructions.

## Select the relevant reference

- For version compatibility, dependency management, injection, auto-configuration,
  properties, and declarative caching, read [CONFIGURATION.md](CONFIGURATION.md).
- For `@Transactional`, propagation, events, and `@Async`, read
  [TRANSACTIONS-AND-ASYNC.md](TRANSACTIONS-AND-ASYNC.md).
- For MVC/WebFlux choices, validation, test context, and operational exposure,
  read [WEB-TESTING-OPERATIONS.md](WEB-TESTING-OPERATIONS.md).

Trace the call from the framework entry point to the annotated method and
name the proxy it crosses. A call that stays inside the same object, whether
self-invocation, a private method, or a `@PostConstruct` body, reaches the
method with no advice applied. Done when every `@Transactional`, `@Async`,
and `@Cacheable` method in scope has a named caller outside its own class.
Check the created bean, proxy, executor/transaction manager, and relevant
configuration for the source set being exercised.

Before reporting done, diff these against the baseline and list any that
moved: managed dependency versions, bean names and qualifiers, servlet versus
reactive stack, each `@Transactional` boundary, and which bean owns each
executor, pool, and shutdown hook. A request for modern Java syntax
does not by itself require a Boot major-version migration or an MVC-to-reactive
rewrite. For Boot 4+, resolve the matching official documentation before
transferring older configuration or annotation behavior.

## Validation

Use the smallest test that exercises the changed mechanism. A direct object
unit test cannot prove Spring proxying, configuration binding, or transaction
interception. For framework behavior, exercise the managed bean/context; for
database or remote integration, use representative real dependencies when
making those integration claims. State the versions and mechanisms actually
tested and any remaining runtime gap.
