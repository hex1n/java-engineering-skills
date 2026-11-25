---
type: llm
focus: last_message
---

Facts of the task, which you cannot see: a Spring Boot 3.5 service moved
from Java 21 to Java 25 with nothing else changed; its pods stay limited to
2 CPUs. An endpoint calls `CompletableFuture.supplyAsync(() ->
s.fetchPrice(req))` for 8 suppliers with no executor argument, each a
blocking HTTP call of about 300 ms, then joins all of them. p50 went from
about 320 ms to about 2.4 s; CPU stays low and the suppliers' latency is
unchanged.

Background you can rely on (JDK source, jdk-21-ga and jdk-25-ga
`CompletableFuture.java`): the common pool's parallelism is the CPU count
minus one, so it is 1 on 2 CPUs on both releases. On Java 8 to 24, when that
parallelism is below 2, async stages without an executor do not use the
common pool; the default executor starts a new thread for each task, so the
8 calls ran in parallel. Java 25 removed that fallback (JDK-8319447): such
stages always run on the common pool, which stays at parallelism 1 here (it
is raised to 2 only when it is 0), and a worker blocked in a plain HTTP call
is not replaced, so the 8 calls run one after another (8 x 300 ms).

Pass when both hold:

1. The answer names the cause as this change in `CompletableFuture`'s
   default async executor: on Java 21 the stages ran on a new thread each
   (thread-per-task, because the common pool's parallelism is below 2), and
   on Java 25 they run on the common pool of parallelism 1, so the blocking
   calls are serialized. Suggesting a way to confirm it (thread names,
   `defaultExecutor()`, `ForkJoinPool.getCommonPoolParallelism()`) is fine.
2. The fix passes an executor that the application owns and sizes for
   blocking I/O to `supplyAsync` (a bounded pool, a virtual-thread-per-task
   executor, or an existing Spring-managed executor), rather than depending
   on the default executor.

Fail if the answer attributes the regression to a change in container CPU
detection or `availableProcessors()`, to ForkJoin compensation threads
behaving differently, or to virtual threads; if it says or implies that on
Java 21 these stages also ran on a common pool of parallelism 1; if it says
the cause cannot be determined, or lists the real cause only as one of
several unranked guesses; or if its only fix is raising
`java.util.concurrent.ForkJoinPool.common.parallelism`. Timeouts, bulkheads
and other extra advice do not count against the answer.
