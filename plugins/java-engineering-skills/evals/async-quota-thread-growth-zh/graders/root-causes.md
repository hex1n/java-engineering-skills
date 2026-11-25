---
type: llm
focus: last_message
---

Facts of the task, which you cannot see: a Java 17 service in pods limited to
2 vCPUs keeps per-tenant quota in a `ConcurrentHashMap<String, Integer>` and
reserves it with `get`, a comparison, then `put(tenant, left - units)`. It
then calls `CompletableFuture.supplyAsync(() -> pricingClient.price(...))`
with no executor argument; a declared `Executors.newFixedThreadPool(16)` is
never used. The pricing call blocks for 200 ms, up to 30 s when the pricing
service is slow. Callers use `get(2, TimeUnit.SECONDS)`. Symptoms: quota is
oversold; on 2 vCPUs the thread count climbs into the hundreds during
slowdowns; on 8 vCPUs the thread count stays flat and latency rises.

Background you can rely on: the common pool's parallelism is the CPU count
minus one, so it is 1 on 2 vCPUs. When that parallelism is below 2,
`CompletableFuture`'s default async executor on Java 8 to 24 starts a new
thread for every task instead of using the common pool. On 8 vCPUs the
common pool (parallelism 7) is used, so tasks queue behind blocked workers.

Pass when all three hold:

1. Oversell: the `get`-then-`put` sequence is check-then-act and not atomic
   even on a `ConcurrentHashMap`; the fix makes the check and the decrement
   one atomic step per tenant (`compute`/`computeIfPresent` that refuses when
   insufficient, a `replace(key, old, new)` or `AtomicInteger` CAS loop, or
   one lock over the whole check-and-update).
2. Thread growth: the answer attributes the growth on 2 vCPUs to the default
   async executor creating a thread per task because the common pool's
   parallelism is below 2, each thread living as long as its slow pricing
   call; and the flat thread count on 8 vCPUs to the common pool being used.
   The fix passes an explicit executor to `supplyAsync` whose threads and
   queued work are both bounded (or whose admission is otherwise limited, for
   example a semaphore or bulkhead), with defined behaviour when full. Passing
   the existing `newFixedThreadPool(16)` alone is not enough, because its queue
   is unbounded.
3. Timeout: `get(2, SECONDS)` bounds only the caller's wait; the pricing call
   keeps running and holding its thread, so the answer sets a timeout on the
   HTTP call itself (connect/read or request timeout) within the caller's
   budget.

Fail if the thread growth is explained as the common pool adding threads,
as ForkJoin compensation, as the fixed pool growing, or as tasks queuing on a
single common-pool thread; or if the oversell fix is only "use
`ConcurrentHashMap`", `volatile`, or `LongAdder`.
