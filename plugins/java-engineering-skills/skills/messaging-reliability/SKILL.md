---
name: messaging-reliability
description: Implement or diagnose reliable message production and consumption, including duplicates, ordering, retries, acknowledgements, and database-to-broker delivery. Use with Kafka, RabbitMQ, RocketMQ, or equivalent backend messaging systems.
---

# Messaging Reliability

Resolve broker, Java client, and integration-framework versions plus the actual
producer/consumer configuration. Product names alone do not establish delivery,
ordering, or durability guarantees.

## Establish the delivery contract

Identify the business effect, message identity, ordering scope, durable stores,
commit/ack points, and failure recovery owner. Model a crash or lost response
between each durable step before choosing a retry or transaction mechanism.

- For duplicate handling, outbox/inbox, retry, and replay, read
  [DELIVERY.md](DELIVERY.md).
- For broker-specific confirmation, offset, and transaction semantics, read
  the relevant section of [BROKERS.md](BROKERS.md).

Choose guarantees for the whole path. A broker's exactly-once feature does not
automatically make an external SQL update, email, or HTTP call exactly once.
Preserve existing schemas, ordering keys, consumer-group behavior, and replay
compatibility unless changing them is in scope.

## Validate recovery

Exercise duplicate and concurrent delivery, crash before/after database commit,
lost publish/ack responses, poison messages, consumer restart/rebalance, and
replay where relevant. Assert both business state and delivery progress. Use
the actual broker/configuration before claiming end-to-end delivery guarantees;
mock acknowledgements only test local control flow.

Report the enforced guarantee, remaining duplicate/loss windows, and recovery
procedure. Distinguish producer acceptance, broker persistence, consumer
acknowledgement, and business completion.
