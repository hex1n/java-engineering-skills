---
name: "Order lifecycle: State, Command with undo, and Abstract Factory proposal"
tags: ["regression", "java-design", "patterns"]
runs: 2
max_turns: 10
---

Our Spring Boot order service has `OrderService.advance(orderId, action)`: a
large `switch` over the order's `status` string (`CREATED`, `PAID`,
`SHIPPED`, `DELIVERED`, `CANCELLED`) and the action (`pay`, `ship`,
`deliver`, `cancel`). Each branch loads the `Order` JPA entity, checks the
current status, calls a side effect where there is one
(`paymentGateway.charge(...)` for pay, `warehouse.ship(...)` for ship), sets
the new status and saves. Two instances of the service run behind a load
balancer.

The team proposes a refactoring: one State class per status, one Command
class per action with an `undo()` that restores a Memento of the `Order`
entity taken before the action so that operations staff can roll back a
mistaken action, and an Abstract Factory that creates the State objects.

Is this a good design? What would you do instead, and what must the new
design guarantee? Give the design and the key interfaces, not the full code.
