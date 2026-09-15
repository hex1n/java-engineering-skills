# Broker-specific mechanisms

Use only the relevant product section and confirm it against the deployed
release/client documentation. The cited pages are reference points, not a
request to upgrade an existing deployment.

## Kafka

Ordering is within a partition. Key partitioning, producer retries, and
consumer concurrency must preserve the required business order. Check producer
idempotence, acknowledgements, in-flight requests, retries, and broker replica
settings together rather than relying on one flag.

Kafka transactions can bind produced Kafka records and consumed offsets;
transactional consumers must use the intended isolation setting. This scope
does not include an ordinary external database transaction. Handle fencing,
abort/retry, and transactional identity lifecycle using the actual client API.

When records are processed asynchronously, commit only offsets that do not
skip unfinished earlier records in that partition. The committed offset marks
the next record to consume. Rebalance/revocation needs a policy for in-flight
work and ownership; auto-commit plus work still running can lose that work on
restart. A retry topic may relax ordering.

Sources: [Kafka delivery semantics](https://kafka.apache.org/41/design/design/),
[Producer configuration](https://kafka.apache.org/41/configuration/producer-configs/),
[KafkaConsumer contract](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html).

## RabbitMQ

Publisher confirms and consumer acknowledgements are independent. A publisher
confirmation does not say the consumer completed the business effect. Handle
unroutable messages as well as confirms (for example, the chosen mandatory-return
policy); a publish can be confirmed without reaching the intended queue.

For required work, acknowledge only after the effect is committed. A lost ack
can cause redelivery, so the handler remains idempotent. Delivery tags are scoped
to their channel; bulk acknowledgement can acknowledge other outstanding
deliveries and requires correct coordination with parallel handlers.

Choose queue durability/replication, message persistence, prefetch, and negative
acknowledgement/requeue behavior explicitly. Avoid a poison message cycling
forever. Verify dead-letter routing safety for the deployed queue type and
configuration; it is not universally loss-free by default.

Sources: [Confirms and acknowledgements](https://www.rabbitmq.com/docs/confirms),
[Dead-letter exchanges](https://www.rabbitmq.com/docs/dlx).

## RocketMQ

Transactional messages coordinate broker message visibility with a producer's
local transaction decision. The broker may check an unresolved transaction;
answer from durable local business state, including ambiguous outcomes, rather
than an in-memory boolean. Define bounded recovery and monitoring for unresolved
transactions.

This does not make downstream consumption and its database effect one transaction.
Consumers still need idempotency, retry, and failure disposition. For ordered
messages, inspect the deployed version's message-group/queue and consumption
requirements; parallelism and retry must retain the chosen scope.

Sources: [RocketMQ transaction messages](https://rocketmq.apache.org/docs/featureBehavior/04transactionmessage/),
[Ordered messages](https://rocketmq.apache.org/docs/featureBehavior/03fifomessage/).
