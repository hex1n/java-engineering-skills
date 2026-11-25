---
name: "Redis lock guarding a payment call"
tags: ["regression", "redis-engineering", "locks", "idempotency"]
runs: 2
max_turns: 10
---

Four instances of our Java service charge orders. To stop double charging we
wrap the payment call in a Redis lock:

```java
String token = UUID.randomUUID().toString();
Boolean ok = redis.opsForValue().setIfAbsent("lock:charge:" + orderId, token, Duration.ofSeconds(30));
if (!Boolean.TRUE.equals(ok)) return;
try {
    paymentGateway.charge(orderId, amount);   // usually 2 s, up to 60 s on provider retries
    orderDao.markPaid(orderId);
} finally {
    redis.delete("lock:charge:" + orderId);
}
```

Redis is a primary with one replica and automatic failover. Is this safe? If
not, what is the minimal correct change? Do not run anything.
