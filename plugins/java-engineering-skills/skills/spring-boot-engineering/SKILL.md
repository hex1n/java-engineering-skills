---
name: spring-boot-engineering
description: Explain, design, review, diagnose, or implement behavior that depends on Spring bean wiring, configuration, proxies, lifecycle, or the web stack. Covers Spring Boot version compatibility and tests of framework behavior.
---

# Spring Boot Engineering

Establish the framework mechanism the question or decision depends on, using
the relevant Boot/Spring versions, Java release, application type, and active
configuration. Follow registration or call paths far enough to distinguish
the plausible outcomes; annotation presence alone does not establish behavior.
The main compatibility anchors are Boot 2.7/Framework 5.3, which requires
Java 8, and Boot 3.x/Framework 6.x, which requires Java 17; per-line details
are in CONFIGURATION.md. Confirm exact patch requirements; examples are not
upgrade instructions.

## Select the relevant reference

- For version compatibility, dependency management, injection, auto-configuration,
  properties, and declarative caching, read [CONFIGURATION.md](CONFIGURATION.md).
- For `@Transactional`, propagation, events, and `@Async`, read
  [TRANSACTIONS-AND-ASYNC.md](TRANSACTIONS-AND-ASYNC.md).
- For MVC/WebFlux choices, validation, test evidence, and operational exposure,
  read [WEB-TESTING-OPERATIONS.md](WEB-TESTING-OPERATIONS.md).

For proxy-mediated behavior, trace the relevant caller through the managed
bean and its advice, including the selected manager or executor. Use
[interception boundaries](TRANSACTIONS-AND-ASYNC.md) to distinguish an
annotation's intended effect from the invocation that actually reaches it.

When proposing or making a change, preserve the affected dependency versions,
bean selection, web stack, transaction boundaries, and resource ownership,
or explain the intended difference. A request for modern Java syntax
does not by itself require a Boot major-version migration or an MVC-to-reactive
rewrite. For Boot 4+, resolve the matching official documentation before
transferring older configuration or annotation behavior.

## Evidence

Match evidence to the claim, whether explaining existing behavior, reviewing
a design, diagnosing a failure, or validating an implementation. Source and
configuration can support a conditional explanation; runtime claims need the
relevant mechanism exercised. Choose the smallest check that retains the
conditions that could change the answer, using
[test boundaries](WEB-TESTING-OPERATIONS.md#choose-a-test-boundary).
Distinguish inferred behavior from observed results and limit conclusions to
the versions, configuration, and execution paths the evidence covers.
