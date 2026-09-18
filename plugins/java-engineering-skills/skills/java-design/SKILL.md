---
name: java-design
description: Choose a Java module interface or GoF pattern from concrete variation, lifecycle, and caller contracts. Use for extensibility asks, pattern selection, or structural refactoring that must keep public contracts, including asks phrased as 设计模式, 扩展性, 接口怎么设计, or 解耦.
---

# Java Design

Choose a design from the change it must support and the behavior it must keep.
Use Java syntax and libraries supported by the module's effective compiler
release and runtime; examples here work with Java 8 unless stated otherwise.

## Work from the contract

1. Read the module's callers, implementations, and tests. Write the change
   pressure as three lines, each pointing at a class or method: what varies
   independently, which invariant spans more than one operation, and who owns
   each piece of state or resource. Done when every line names code, not a
   category.
2. Describe the smallest useful interface, including failure modes, ordering,
   mutability, thread safety, and lifecycle. Keep implementation decisions
   behind that interface when callers do not need them.
3. Read [pattern selection](PATTERNS.md) when comparing named patterns;
   read [application examples](APPLICATION.md) when introducing or refactoring
   a strategy, decorator, state machine, factory, or template method.
4. Compare the simplest direct implementation with the pattern candidate.
   Choose the extra abstraction only when it reduces a demonstrated source
   of coupling, repeated decisions, or likely change across actual callers.
   A small fixed switch is a valid result.
5. For implementation requests, change the selected module and its callers,
   then test observable behavior across its interface. For design-only asks,
   return the recommendation, rejected alternative, tradeoff, and next check.

Before replacing inheritance, public types, constructors, or dependency
injection wiring, establish compatibility requirements and ownership. Preserve
existing public/serialized contracts unless their migration is requested.

## Completion evidence

Name the change pressure resolved, the interface callers now use, and any
remaining lifecycle or compatibility cost. Test each actual implementation
against shared contract cases rather than asserting the chosen class layout.
Pattern names are a vocabulary for explaining a decision, not completion goals.
