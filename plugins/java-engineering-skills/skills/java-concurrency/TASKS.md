# Tasks, deadlines, and overload

## Executor capacity and ownership

Choose capacity from CPU work, blocking time, downstream limits, and acceptable
queue delay. Define queue size and rejection behavior together.
`Executors.newFixedThreadPool` and `newSingleThreadExecutor` queue without
bound; `newCachedThreadPool` creates threads without bound. Construct
`ThreadPoolExecutor` directly with a sized queue (`ArrayBlockingQueue` or
`LinkedBlockingQueue(capacity)`), a `ThreadFactory` that names threads after
the pool, and a chosen `RejectedExecutionHandler`; `maximumPoolSize` takes
effect only once that bounded queue is full.
[Executors factory methods](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/Executors.html).

`CallerRunsPolicy` can execute work on a request/event-loop thread and break
latency or thread-confinement assumptions; after shutdown it discards tasks.
Silent discard combined with `submit` can leave a returned future without a
completion. For required work, make admission failure explicit and observable.
Test both saturation and shutdown rejection paths.

Keep shared executors under application lifecycle management. Locally owned
executors need a completion/shutdown contract. `ExecutorService.close()` is
available from Java 19 and waits for termination; wrapping an async-returning
method in try-with-resources can make return wait for its work.

Sources: [ThreadPoolExecutor](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ThreadPoolExecutor.html),
[ExecutorService.close](https://docs.oracle.com/en/java/javase/19/docs/api/java.base/java/util/concurrent/ExecutorService.html).

## CompletableFuture and cancellation

Non-async continuation stages may run on the completing thread. Async stages
without an explicit executor normally use the common pool. Assign blocking or
context-sensitive work to an appropriate owned executor; `ThreadLocal`, logging,
security, and transaction context do not follow arbitrary task submission by
assumption.

`get(timeout)` limits the caller's wait, not the operation's lifetime.
Java 9's `orTimeout` completes a future exceptionally, but likewise does not
prove the underlying I/O stopped. `CompletableFuture.cancel(true)` does not
interrupt its computation like a conventional interruptible task handle.
Keep cancellation handles and configure the actual operation's timeouts.
`allOf` completion also does not imply automatic cancellation of sibling work.

Pass a remaining total budget into downstream operations rather than restarting
the full timeout at each retry or stage. Use monotonic elapsed-time measurement
for in-process budgets. Decide whether sibling failure cancels, awaits, or
collects the other tasks. Preserve causes when translating `ExecutionException`
or `CompletionException`, and observe failures from submitted tasks.

Sources: [Java 8 CompletableFuture](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/CompletableFuture.html),
[Java 9 timeout methods](https://docs.oracle.com/javase/9/docs/api/java/util/concurrent/CompletableFuture.html).

## Context on reused threads

Capture the required context at the submission boundary and install it for the
task through the framework's supported decorator or a scoped wrapper. Copy only
the intended values; captured mutable state is not a stable snapshot. On every
exit, including failure, restore the previous context for a nested scope or
remove it when this task owns the previously absent value. Unconditional clearing
can destroy an outer caller's context, including under caller-runs execution.

InheritableThreadLocal copies initial values at thread creation, not at every
executor submission. A pool worker can therefore retain an earlier parent's
context. ThreadLocal propagation is not transaction propagation and does not
grant authority to a client-supplied tenant. Test two tasks with different
contexts on one reused worker, a throwing task, and nested restoration; inspect
the next task's context after completion. Choose a wrapper that understands the
specific context API's empty/unset semantics.

Sources: [Java 8 ThreadLocal](https://docs.oracle.com/javase/8/docs/api/java/lang/ThreadLocal.html),
[Java 8 InheritableThreadLocal](https://docs.oracle.com/javase/8/docs/api/java/lang/InheritableThreadLocal.html).

## Virtual threads

Stable Java 21 virtual threads suit many blocking tasks, not additional CPU
parallelism. Use one per task instead of a virtual-thread pool, while preserving
separate admission/queue limits and limits on database or remote-service use.

On Java 21, long blocking synchronized regions and some native calls can pin a
carrier; measure those paths before changing locks. Virtual threads are daemon
threads, so establish who waits for completion. Test cancellation and shutdown
with the real blocking client: closing a scoped executor may still wait after
`Future.get` times out. Do not recommend preview structured concurrency for a
Java 21 project whose task and build do not opt into preview.

Source: [JEP 444](https://openjdk.org/jeps/444).
