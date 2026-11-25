---
name: messaging-reliability
description: Outbox, inbox, idempotent consumers, retries, dead letters, and ordering for Kafka, RabbitMQ, RocketMQ, or equivalent brokers in Java services. Use for duplicate or lost messages, acknowledgement and offset semantics, or database-to-broker delivery, including asks phrased as 消息重复, 消息丢失, 重复消费, 消息顺序, or 死信.
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

## Report

Close with one report in three parts, worded the same in every skill of this
plugin so that a task loading several skills still produces one report:
**Conclusion** (the answer or change and the conditions it holds under),
**Verified** (what was run or observed, with versions), and **Not verified**
(assumptions and remaining checks, each with the step that would settle it).
Put this skill's report items into those parts rather than adding sections. A
short answer can give each part in a sentence; leave out a part with nothing
in it.
