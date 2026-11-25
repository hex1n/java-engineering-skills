---
name: "zh: 提交后发 Kafka 和 Redis 去重标记"
tags: ["zh", "messaging-reliability"]
runs: 2
max_turns: 10
---

Spring Boot 3.2、PostgreSQL 15、spring-kafka。订单服务在订单提交后发事件：

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

生产者配了 `enable.idempotence=true` 和 `acks=all`。库存服务这样消费：

```java
@KafkaListener(topics = "order-placed")
public void handle(OrderPlaced e) {
    if (Boolean.TRUE.equals(redis.opsForValue()
            .setIfAbsent("seen:" + e.eventId(), "1", Duration.ofDays(7)))) {
        inventoryService.deduct(e.items());   // @Transactional，PostgreSQL
    }
}
```

现在有些订单一直没扣库存。团队打算去掉 Redis：在 `deduct` 里先往 `processed_event(event_id primary key)` 插一行，捕获 `DataIntegrityViolationException` 说明处理过了就直接返回，否则在同一个事务里扣库存。

现在的链路哪里会丢消息、哪里会重复生效？团队的消费端改法对不对？端到端最小的正确设计是什么？不要运行任何东西。
