# Measure an optimization at the right boundary

## Choose the experiment

Use a microbenchmark for an isolated computation or allocation hypothesis;
use a service workload for queueing, network, database, concurrency, and tail
latency. First verify equivalent outputs and contracts. Faster code that
omits validation, changes ordering, or returns a different result has not
established an optimization of the same operation.

Keep JDK/vendor/flags, hardware or quota, dataset, concurrency, and dependency
state comparable. Separate cold startup and steady-state questions. Record
warmup, duration, repetitions, errors, and environmental noise. State whether
a result ran on Java 8/11/17/21 or only compiled for that target.

## JMH for local mechanisms

Use the project's supported JMH release and generated benchmark harness,
including its annotation processor. An ordinary timing loop or calling a
benchmark method directly does not reproduce the harness. Keep fixtures out
of measured work only when they are not part of the actual operation.
[JMH project](https://openjdk.org/projects/code-tools/jmh/).

Return the result or consume it with a JMH Blackhole so unused work is not
eliminated. Use representative runtime inputs rather than compile-time
constants; otherwise constant folding can remove the intended computation.
An added inner loop changes optimization and amortizes costs differently from
a real call; measure the real call. A minimal benchmark that satisfies both
rules:

```java
@State(Scope.Benchmark)
public class ParseBench {
    @Param({"12.50", "1234567.89"}) String input; // runtime input, so the parse is not folded

    @Benchmark
    public BigDecimal parse() {
        return new BigDecimal(input);             // returned, so the work is not dead code
    }
}
```
[dead-code sample](https://github.com/openjdk/jmh/blob/master/jmh-samples/src/main/java/org/openjdk/jmh/samples/JMHSample_08_DeadCode.java),
[constant-folding sample](https://github.com/openjdk/jmh/blob/master/jmh-samples/src/main/java/org/openjdk/jmh/samples/JMHSample_10_ConstantFold.java).

Use warmup and independent forks suited to the question; profile-guided
optimization from one benchmark can contaminate another in a shared VM.
Choose state scope and input distribution that match sharing/contention in
the intended use. Compare confidence/error ranges and allocation as well as
the headline score. A tiny difference within run-to-run variation is inconclusive.
[forking sample](https://github.com/openjdk/jmh/blob/master/jmh-samples/src/main/java/org/openjdk/jmh/samples/JMHSample_12_Forking.java).

## Service load and capacity

Specify offered rate, achieved rate, concurrency, request mix, dataset/cache
state, and resource limits. Report failures/timeouts with latency rather than
dropping them from the sample. Percentiles require compatible distributions;
averaging per-instance p99 values does not produce a fleet p99.

A closed-loop client sends less traffic when the service slows; this can
hide overloaded periods. For an arrival-rate claim, use an appropriate
scheduled/open workload and account for delayed or missed arrivals. Ensure
the generator itself is not CPU, socket, or connection limited. Include queue
time in user-visible latency and compare runs at the same offered load.

Bound test duration, traffic, data growth, and cleanup within the authorized
environment. A production load test is a separate operational action. Compare
before/after throughput, latency distribution, errors, and CPU/memory costs;
retain enough raw measurements to assess variability. Follow a microbenchmark
gain with a representative service check before claiming user impact.
