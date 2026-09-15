# Pattern selection

The names below use the conventional GoF vocabulary. The selection criteria
and simpler alternatives are this plugin's engineering guidance; this is not
a requirement to implement the catalog in a project.

## Creational patterns

| Pattern | Concrete pressure | Simpler alternative or limit |
|---|---|---|
| Factory Method | An established extension point lets subtypes decide what to construct. | A constructor, supplier, or factory function when no subtype protocol is needed. |
| Abstract Factory | A family of collaborators must remain mutually compatible. | Inject individual collaborators when they do not form a consistency unit. |
| Builder | Construction has many optional inputs or staged validation. | A constructor/static factory for a small invariant; validate before exposing a built object. |
| Prototype | Existing configured objects are the useful starting point for new ones. | Explicit copy construction with a defined shallow/deep ownership contract. |
| Singleton | Exactly one instance per defined owner is part of the model. | Dependency injection with explicit scope; one JVM object does not mean one cluster owner. |

## Structural patterns

| Pattern | Concrete pressure | Simpler alternative or limit |
|---|---|---|
| Adapter | An external collaborator has a mismatched interface or error model. | Direct calls when conversion is trivial and local. |
| Bridge | Two independently varying dimensions would multiply subclasses. | One implementation until both dimensions actually vary. |
| Composite | Leaves and nested groups need the same recursive operations. | A flat collection when there is no recursive structure. |
| Decorator | Optional behaviors compose around the same interface. | A local function for one fixed behavior; define wrapper ordering. |
| Facade | Callers repeatedly coordinate a complex subsystem protocol. | Preserve direct access when the facade merely renames every underlying operation. |
| Flyweight | Many repeated immutable values cause measured memory pressure. | Ordinary values until profiling justifies sharing and retention costs. |
| Proxy | Access, locality, or loading must be controlled without changing the caller interface. | Explicit calls when hidden interception would obscure failures or latency. |

## Behavioral patterns

| Pattern | Concrete pressure | Simpler alternative or limit |
|---|---|---|
| Chain of Responsibility | Ordered handlers may consume or pass a request. | A direct branch list for a short fixed policy; specify no-match behavior. |
| Command | An operation must be queued, recorded, retried, or undone. | A method/lambda for immediate work; durable commands need identity and versioning. |
| Interpreter | A small stable domain grammar needs repeated evaluation. | A parser/library for a substantial language; bound expression cost. |
| Iterator | Traversal should hide a representation. | Existing collection iteration; define mutation and resource-closure semantics. |
| Mediator | Many peers depend on one another's coordination protocol. | A cohesive application service; avoid a mediator that owns all business logic. |
| Memento | State snapshots support a defined restoration operation. | An explicit immutable snapshot; specify external effects that cannot be undone. |
| Observer | One state change has multiple independent local reactions. | Direct calls for required ordered work; a callback list is not durable messaging. |
| State | Allowed behavior and transitions depend on lifecycle state. | Enum plus transition table for a small fixed state machine. |
| Strategy | Several algorithms vary behind one operation contract. | A function, enum, or switch until policies need independent behavior/lifecycle. |
| Template Method | A genuinely stable algorithm skeleton has controlled extension steps. | Composition when step ordering or the skeleton itself varies. |
| Visitor | Operations grow across a relatively stable set of element types. | Pattern matching at a supported Java release, or methods on the model. |

## Check the cost before adopting

- Distinguish selection from execution: a strategy registry must define unknown
  and duplicate keys; decorators must define order and ownership of closure.
- Shared instances must be safe for concurrent callers. Dependency injection
  does not make mutable fields thread-safe.
- Preserve identity, equality, checked exceptions, and serialization when
  replacing class hierarchies or introducing generated proxies.
- Keep a public extension interface only when consumers need to implement it.
  Internal composition can remain private to the module.

Sources: [GoF book and contents, Addison-Wesley](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-9780201633610),
[Java 8 functional interfaces](https://docs.oracle.com/javase/8/docs/api/java/util/function/package-summary.html).
