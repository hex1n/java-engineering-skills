---
name: "zh: 用 Redis 锁保护扣款调用"
tags: ["zh", "redis-engineering"]
runs: 2
max_turns: 10
---

我们的 Java 服务有四个实例在给订单扣款。为了防止重复扣款，把支付调用包在一个 Redis 锁里：

```java
String token = UUID.randomUUID().toString();
Boolean ok = redis.opsForValue().setIfAbsent("lock:charge:" + orderId, token, Duration.ofSeconds(30));
if (!Boolean.TRUE.equals(ok)) return;
try {
    paymentGateway.charge(orderId, amount);   // 一般 2 秒，支付方重试时最长 60 秒
    orderDao.markPaid(orderId);
} finally {
    redis.delete("lock:charge:" + orderId);
}
```

Redis 是一主一从加自动故障切换。这样安全吗？不安全的话，最小的正确改法是什么？不要运行任何东西。
