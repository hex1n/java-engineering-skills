---
name: "After-commit Kafka publish and a Redis dedup flag"
tags: ["regression", "messaging-reliability", "outbox"]
runs: 2
max_turns: 10
---

Spring Boot 3.2, PostgreSQL 15, spring-kafka. The order service publishes an
event after the order commits:

```java
@Transactional
public void placeOrder(Order o) {
    orderRepo.save(o);
    events.publishEvent(new OrderPlaced(UUID.randomUUID(), o.getId(), o.getItems()));
}

@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void on(OrderPlaced e) {
    kafkaTemplate.send("order-placed", e.orderId().toString(), e);
}
```

The producer has `enable.idempotence=true` and `acks=all`. The inventory
service consumes it:

```java
@KafkaListener(topics = "order-placed")
public void handle(OrderPlaced e) {
    if (Boolean.TRUE.equals(redis.opsForValue()
            .setIfAbsent("seen:" + e.eventId(), "1", Duration.ofDays(7)))) {
        inventoryService.deduct(e.items());   // @Transactional, PostgreSQL
    }
}
```

Some orders never reach inventory. The team wants to drop Redis and, inside
`deduct`, first insert into `processed_event(event_id primary key)`, catch
`DataIntegrityViolationException` and return when the event was already
processed, and otherwise deduct stock in the same transaction.

Where can an event be lost or applied twice today, is the proposed consumer
change correct, and what is the minimal correct design end to end? Do not run
anything.
