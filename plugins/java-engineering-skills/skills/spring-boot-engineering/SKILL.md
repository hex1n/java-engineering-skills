---
name: spring-boot-engineering
description: Explain, design, review, diagnose, or implement behavior that depends on Spring bean wiring, configuration, proxies, lifecycle, or the web stack. Use when @Transactional, @Async, or @Cacheable does not take effect, including a transaction that does not roll back or leaves writes committed after an exception (self-invocation, non-public methods, checked exceptions and rollbackFor, exceptions caught inside the method). Covers Spring Boot version compatibility and tests of framework behavior, including asks phrased as 事务不生效, 事务不回滚, @Transactional 失效, 循环依赖, Bean 注入失败, 配置不生效, or Spring Boot 升级.
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

## Check the common causes first

When behavior differs from what an annotation suggests, check these before
deeper tracing:

- The call reaches the bean through its proxy: no self-invocation, and the
  method is not private or final.
- Rollback rules: by default a checked exception does not roll back a
  `@Transactional` method, and rollback rules apply only to an exception that
  leaves the method; one caught inside it lets the transaction commit.
- An `@Async` method returning `void` reports failures only to the
  `AsyncUncaughtExceptionHandler`.
- More than one candidate bean without `@Primary` or `@Qualifier`.
- The condition, profile, or property that registers the bean is active.

## Select the relevant reference

- For an upgrade across Boot lines or a question about what a version change
  breaks, read [CONFIGURATION.md](CONFIGURATION.md) before answering, including
  [Lines before 2.7](CONFIGURATION.md#lines-before-27) when the start is
  earlier than 2.7. Do this even when another skill, such as java-testing,
  already covers part of the question: that skill does not carry the per-line
  property, test-starter, and path-matching changes.
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

## Report

Close with one report in three parts, worded the same in every skill of this
plugin so that a task loading several skills still produces one report:
**Conclusion** (the answer or change and the conditions it holds under),
**Verified** (what was run or observed, with versions), and **Not verified**
(assumptions and remaining checks, each with the step that would settle it).
Put this skill's report items into those parts rather than adding sections. A
short answer can give each part in a sentence; leave out a part with nothing
in it.
