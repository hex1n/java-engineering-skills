---
name: "CompletableFuture fan-out slows down after moving from Java 21 to Java 25 on 2 CPUs"
tags: ["discriminating", "java-concurrency", "executors"]
runs: 3
max_turns: 10
---

We moved our Spring Boot 3.5 quote service from Java 21 to Java 25: same code,
same dependencies, same base image except the JDK, and the pods keep their
limit of 2 CPUs. Since the switch, `/quote` p50 latency went from about 320 ms
to about 2.4 s; CPU usage on the pods stays low and the suppliers' own latency
dashboards are unchanged. The endpoint does this:

```java
public List<Price> quote(QuoteRequest req) {
    List<CompletableFuture<Price>> futures = suppliers.stream()          // 8 suppliers
            .map(s -> CompletableFuture.supplyAsync(() -> s.fetchPrice(req))) // blocking HTTP call, ~300 ms
            .toList();
    return futures.stream().map(CompletableFuture::join).toList();
}
```

Explain what changed between the two runs and give the fix. Do not run anything.
