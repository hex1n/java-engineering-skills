---
name: messaging-reliability
description: Outbox, inbox, idempotent producers and consumers, retries, dead letters, and ordering for Kafka, RabbitMQ, RocketMQ, or equivalent brokers in Java services. Use for duplicate or lost messages, acknowledgement and offset semantics, database-to-broker delivery, or checking producer and consumer settings against the client version's defaults (acks, enable.idempotence, retries, max.in.flight.requests.per.connection, publisher confirms, auto-commit), including asks phrased as 消息重复, 消息丢失, 重复消费, 消息顺序, 死信, 生产者幂等, acks 配置, or Kafka 默认配置.
---

# Messaging Reliability

Resolve broker, Java client, and integration-framework versions plus the actual
producer/consumer configuration. Product names alone do not establish delivery,
ordering, or durability guarantees.

## Establish the delivery contract

Identify the business effect, message identity, ordering scope, durable stores,
commit/ack points, and failure recovery owner. Before choosing a retry or
transaction mechanism, write one row per durable step on the path (for
example DB commit, publish, broker persist, consume, ack, business effect):

| Step | A crash or lost response right after it leaves | Who or what recovers it |
|---|---|---|

A row whose recovery cell is empty is a loss or duplicate window to fix or
report.

- For duplicate handling, outbox/inbox, retry, and replay, read
  [DELIVERY.md](DELIVERY.md).
- For broker-specific confirmation, offset, and transaction semantics, read
  the relevant section of [BROKERS.md](BROKERS.md). Read it before stating
  what a client default or a producer/consumer setting does (`acks`,
  idempotence, retries, in-flight limits, confirms, auto-commit), even when
  the question only asks you to judge a pasted config: defaults differ by
  client release, and some releases do not behave as their release notes say.

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
