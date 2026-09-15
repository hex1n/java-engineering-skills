---
name: spring-boot-engineering
description: Implement, refactor, or diagnose Spring Boot services using their actual Boot and Spring versions. Use for dependency wiring, auto-configuration, configuration binding, transactional proxies, async execution, web integration, and Spring tests.
---

# Spring Boot Engineering

Inspect the effective Boot parent/BOM/plugin version, Spring modules, Java
release, application type, and active configuration before choosing APIs.
The main compatibility anchors are Boot 2.7/Framework 5.3 and Boot 3.x/Framework
6.x. Confirm exact patch requirements; examples are not upgrade instructions.

## Select the relevant reference

- For version compatibility, dependency management, injection, auto-configuration,
  properties, and declarative caching, read [CONFIGURATION.md](CONFIGURATION.md).
- For `@Transactional`, propagation, events, and `@Async`, read
  [TRANSACTIONS-AND-ASYNC.md](TRANSACTIONS-AND-ASYNC.md).
- For MVC/WebFlux choices, validation, test context, and operational exposure,
  read [WEB-TESTING-OPERATIONS.md](WEB-TESTING-OPERATIONS.md).

Trace the actual call through framework entry points. An annotation's presence
does not establish that its interception ran. Check the created bean, proxy,
executor/transaction manager, and relevant configuration for the source set
being exercised. Read-only diagnosis should report the evidence and proposed
repair; implement it only when the task asks for changes.

Preserve dependency alignment, wire contracts, application type, transaction
scope, and established lifecycle ownership. A request for modern Java syntax
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
