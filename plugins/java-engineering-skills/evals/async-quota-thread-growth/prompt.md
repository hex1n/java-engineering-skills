---
name: "Quota check and CompletableFuture on a 2-vCPU container"
tags: ["regression", "java-concurrency", "executors"]
runs: 2
max_turns: 10
---

Our Java 17 service runs in Kubernetes pods limited to 2 vCPUs. This method
reserves a tenant's quota and then prices the request:

```java
private final ConcurrentHashMap<String, Integer> remaining = new ConcurrentHashMap<>();
private final ExecutorService pricingPool = Executors.newFixedThreadPool(16);

public CompletableFuture<Quote> reserve(String tenant, int units) {
    Integer left = remaining.get(tenant);
    if (left == null || left < units) {
        return CompletableFuture.failedFuture(new QuotaExceeded(tenant));
    }
    remaining.put(tenant, left - units);
    // blocking HTTP call: 200 ms normally, up to 30 s when the pricing service is slow
    return CompletableFuture.supplyAsync(() -> pricingClient.price(tenant, units));
}
```

Callers do `reserve(...).get(2, TimeUnit.SECONDS)` and treat a timeout as
"try again later".

Two problems in production: tenants sometimes get more units than their
quota, and when the pricing service slows down the pods' thread count climbs
into the hundreds until they are OOM-killed. On the 8-vCPU staging cluster the
thread count stays flat and latency gets worse instead. Explain both problems
and give the minimal correct change. Do not run anything.
