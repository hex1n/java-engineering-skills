---
type: llm
focus: last_message
---

Facts of the task, which you cannot see: an order service advances an order
through `CREATED`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED` with actions
`pay`, `ship`, `deliver`, `cancel`, today in one `switch`. Each branch loads
the `Order` JPA entity, checks the status, calls `paymentGateway.charge` (pay)
or `warehouse.ship` (ship), sets the new status and saves. Two service
instances run. The team proposes one State class per status, one Command per
action whose `undo()` restores a Memento of the `Order` entity, and an
Abstract Factory that creates the State objects.

Pass when all three hold:

1. Proportion: the answer starts from an explicit table of allowed
   transitions (for example an enum of statuses with a map from status and
   action to the next status, or equivalent), and treats the Abstract Factory
   as unjustified and per-status State classes as optional until per-state
   behaviour actually grows. Keeping or recommending State classes is fine if
   the answer says what would justify them; recommending the Abstract Factory
   is not.
2. Undo: restoring a Memento of the entity cannot reverse a charge or a
   shipment that already happened outside the service. Reversal needs explicit
   compensating actions (refund, cancel or return the shipment) with their own
   transitions, failure handling and audit, or is not offered.
3. Concurrency and repeats: with two instances, load-check-save lets two
   requests act on the same order at once. The answer requires an atomic
   status transition, either a conditional update (`UPDATE ... SET status = ?
   WHERE id = ? AND status = ?` with an affected-row check) or optimistic
   locking (`@Version`) with the conflict handled, and handles a repeated
   action, at least for pay, with an idempotency key sent to the payment
   provider or an equivalent guard so a retry does not charge twice.

Fail if the answer endorses the Memento-based `undo()` for charge or ship,
recommends the full State + Command + Abstract Factory set as proposed, or
gives no mechanism against concurrent transitions.
