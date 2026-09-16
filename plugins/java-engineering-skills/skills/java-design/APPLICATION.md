# Applying patterns without changing contracts

## Strategy and construction

For shipping prices that vary by carrier, start with one operation whose
inputs, currency/rounding rules, and failures are explicit:

```java
interface ShippingQuote {
    BigDecimal quote(Parcel parcel);
}

final class Checkout {
    private final ShippingQuote shipping;

    Checkout(ShippingQuote shipping) {
        this.shipping = Objects.requireNonNull(shipping);
    }

    BigDecimal shippingPrice(Parcel parcel) {
        return shipping.quote(parcel);
    }
}
```

Application wiring selects the implementation. Introduce a registry only when
selection is dynamic; validate duplicate keys and specify an unknown-carrier
response:

```java
final class ShippingQuotes {
    private final Map<String, ShippingQuote> byCarrier;

    ShippingQuotes(Map<String, ShippingQuote> byCarrier) {
        this.byCarrier = Collections.unmodifiableMap(new LinkedHashMap<>(byCarrier));
    }

    ShippingQuote forCarrier(String carrier) {
        ShippingQuote quote = byCarrier.get(carrier);
        if (quote == null) {
            throw new IllegalArgumentException("no shipping quote for carrier " + carrier);
        }
        return quote;
    }
}
```

One `Map` makes a duplicate carrier impossible at construction; an unknown
carrier fails at lookup, and the test names both cases. A strategy does not need a corresponding abstract factory, builder,
and singleton. A factory earns its place when it owns a real construction
protocol or compatible family of objects.

Verify common cases and policy-specific rounding/error cases through
`ShippingQuote`. Preserve the existing constructor/API for external callers
or plan its explicit migration. This illustrative domain fragment assumes
`Parcel` is the existing model and imports from `java.math` and `java.util`.

## Decorator and proxy

Wrapping a client for metrics can preserve its method contract, but wrapping
it for retries changes the number and timing of effects. Define which
exceptions qualify, whether the operation is idempotent, and the total deadline.
Retry around a transaction can differ from transaction around retry.

A proxy may intercept calls only through its entry point; for a Spring-managed
object, interception depends on the invocation path (spring-boot-engineering).
Preserve resource ownership when
wrapping `Closeable` objects; test wrapper order and failure propagation.

Sources: [Java FilterInputStream wrapper contract](https://docs.oracle.com/javase/8/docs/api/java/io/FilterInputStream.html),
[Spring proxy semantics](https://docs.spring.io/spring-framework/reference/core/aop/proxying.html).

## State and command

For an order lifecycle, write allowed transitions such as
`CREATED -> PAID -> SHIPPED` with their preconditions before choosing enum or
state classes. Specify duplicate commands, terminal states, and concurrent
transitions. A database-backed transition needs an atomic conditional update
or equivalent concurrency mechanism (database-transactions).

An undo command needs an actual inverse or compensation contract. Publishing
an event, charging an external service, or shipping a parcel cannot be undone
by restoring an in-memory memento. Test invalid transitions and repeated or
stale commands alongside successful transitions.

## Template method and composition

Use a template method when subclasses are intentionally constrained to a stable
algorithm order. Document which steps can be overridden and which invariants
each must preserve. Prefer injected steps when callers need independent
combinations; avoid protected mutable state as an implicit communication channel.

Source: [GoF pattern catalog](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-9780201633610).
