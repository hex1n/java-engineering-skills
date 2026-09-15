---
name: jvm-performance
description: Diagnose Java service CPU, latency, allocation, GC, memory, or thread bottlenecks and verify performance changes. Use for profiling, JVM incident evidence, capacity regressions, or JMH benchmark design.
---

# JVM Performance

Define the symptom and measurement window before choosing a tool: latency
distribution, completed throughput, errors, CPU, memory, or blocked progress.
Record workload, service build, JDK vendor/update, collector, JVM flags, and
CPU/memory limits. Keep production and test/runtime differences explicit.

- For version-compatible tools, bounded recordings, and collection impact,
  read [COLLECTION.md](COLLECTION.md).
- For CPU, waits, allocation, heap/native memory, and GC interpretation,
  read [DIAGNOSIS.md](DIAGNOSIS.md).
- For JMH, realistic load, and before/after comparisons, read
  [MEASUREMENT.md](MEASUREMENT.md).

Start with existing metrics, traces, recordings, and logs. Form a hypothesis
that predicts an observation; collect the smallest evidence that distinguishes
it from a competing explanation. A busy thread, large heap, or frequent GC
alone does not establish the cause of user-visible latency.

Use the target JVM's supported diagnostic tools and options. Java 8 update and
vendor differences matter for JFR and container awareness; Java 21 examples
are not a universal command set. Match the actual process/container namespace,
identity, output location, and collection budget before attaching.

Diagnostic inspection does not authorize a production restart, flag change,
heap dump, or unbounded load. Use existing task authorization for concrete
collection actions; distinguish plans from commands actually executed. Dumps
and recordings can contain application data and command-line secrets, so
limit collection and retention to the task's approved evidence scope.

## Close the evidence loop

For diagnosis, report observations, best-supported cause, alternatives, and
the next discriminating check. For an authorized repair, change the implicated
mechanism and compare the same workload and correctness outcomes. Report
measurement uncertainty, resource tradeoffs, and runtime coverage; a benchmark
win alone does not establish a service-level improvement.
