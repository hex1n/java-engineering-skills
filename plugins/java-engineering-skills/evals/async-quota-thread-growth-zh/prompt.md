---
name: "zh: 2 核容器上的配额检查与 CompletableFuture"
tags: ["zh", "java-concurrency"]
runs: 2
max_turns: 10
---

我们的 Java 17 服务跑在 Kubernetes 上，每个 pod 限制 2 个 vCPU。下面这个方法先扣租户的配额，再去询价：

```java
private final ConcurrentHashMap<String, Integer> remaining = new ConcurrentHashMap<>();
private final ExecutorService pricingPool = Executors.newFixedThreadPool(16);

public CompletableFuture<Quote> reserve(String tenant, int units) {
    Integer left = remaining.get(tenant);
    if (left == null || left < units) {
        return CompletableFuture.failedFuture(new QuotaExceeded(tenant));
    }
    remaining.put(tenant, left - units);
    // 阻塞的 HTTP 调用：平时 200 ms，询价服务变慢时最长 30 s
    return CompletableFuture.supplyAsync(() -> pricingClient.price(tenant, units));
}
```

调用方写的是 `reserve(...).get(2, TimeUnit.SECONDS)`，超时就当作“稍后重试”。

线上有两个问题：租户有时拿到的额度超过配额；询价服务一变慢，pod 的线程数就涨到几百，最后被 OOM kill。8 核的预发集群上线程数不涨，只是延迟变高。请解释这两个问题，并给出最小的正确改法。不要运行任何东西。
