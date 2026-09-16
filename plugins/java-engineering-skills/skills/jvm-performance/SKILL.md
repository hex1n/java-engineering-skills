---
name: jvm-performance
description: Diagnose Java service CPU, latency, allocation, GC, or memory problems and verify performance changes. Use for profiling, blocked-thread and GC pause evidence, JVM incident triage, capacity regressions, or JMH benchmark design.
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

Step 1, before any attach: from the live command line take `-Xmx`, `-Xloggc`,
and any `-agentlib:jdwp` or `jmxremote` flag; read `/proc/<pid>/status`
(VmRSS, Threads), `/proc/<pid>/limits`, and the cgroup memory limit and CPU
quota files (COLLECTION.md, "Start without attaching"). Done when you can
state RSS against the limit, the full-GC count and longest pause from the GC
log, and whether the process was CPU-throttled in the window. Then write the
hypothesis as "if <cause>, then <metric> shows <value> during <window>", name
the one alternative that predicts a different value, and collect only the
evidence that separates the two. A busy thread, large heap, or frequent GC
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
