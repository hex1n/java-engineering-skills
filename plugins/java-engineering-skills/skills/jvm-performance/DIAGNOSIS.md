# Attribute the symptom to a mechanism

## CPU and latency

Correlate the same time window across completed requests, latency, process
CPU, quota/throttling, and stack samples. CPU samples identify where observed
CPU time went; their percentages are relative to the sampled population, not
automatically a fraction of wall-clock latency. Warmup/JIT, GC, serialization,
application loops, and native calls are competing explanations.

For low CPU with high latency, inspect queue wait, connection acquisition,
lock contention, downstream I/O, and scheduler delay. A thread in RUNNABLE
may be waiting in native I/O; a single snapshot is insufficient attribution.
Repeated stacks plus lock-owner/wait-event evidence distinguish a slow owner
from a deadlock or ordinary idle workers. Measure service time separately from
queue time before increasing worker or connection counts.
[JVM diagnostic tools](https://docs.oracle.com/en/java/javase/21/troubleshoot/diagnostic-tools.html).

On Java 21 virtual threads, confirm that the chosen dump/profiler represents
virtual threads and carrier behavior. Blocking under `synchronized` can pin
a carrier in this release; ordinary supported blocking I/O can unmount.
Increasing carriers is not proof of fixing the contended resource. Check
actual pinning events and the relevant code path before changing locks.
Later JDK improvements do not establish Java 21 behavior.
[Java 21 virtual threads](https://openjdk.org/jeps/444).

## Allocation, retention, and memory limits

Separate allocation rate, live retained heap, heap committed/max, and process
resident/container memory. A rising sawtooth before GC does not prove a leak.
Compare post-collection live occupancy under equivalent traffic and cache
state. A class histogram counts instances/bytes but does not explain retention;
use paths to GC roots and retained-size evidence when a heap investigation is
justified. Distinguish intentional bounded caches from unbounded retention.

Classify the actual failure: Java heap exhaustion, metaspace, direct/native
allocation, inability to create a thread, or an OS/container kill. Stable Java
heap with rising RSS calls for native/direct buffers, thread stacks, mapped
memory, native libraries, and accounting investigation. A kill may leave no
Java OutOfMemoryError or heap dump. Increasing Xmx consumes headroom and can
make a container memory limit failure worse.
[Memory investigation](https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html).

NMT growth can narrow a HotSpot category but its totals need not equal RSS.
Inspect buffer-pool metrics and native evidence for gaps; do not subtract two
different accounting bases and label the remainder a proven leak. Changing
NMT startup configuration requires a separate authorized restart decision.

## GC interpretation and candidate fixes

Compare allocation throughput, live set, pause distribution, concurrent GC
CPU, and allocation stalls under the actual collector. Frequent young
collections can be compatible with healthy latency. A low pause target is
not a hard latency bound; total response time also includes queues and I/O.
Collector/heap tuning trades CPU, memory, and pauses, and cannot remove
unbounded retention or an overloaded downstream service.
[GC tuning context](https://docs.oracle.com/en/java/javase/21/gctuning/introduction-garbage-collection-tuning.html).

Tie a candidate change to a falsifiable prediction: bounded cache should
stabilize retained entries, lower allocation should reduce allocated bytes
per operation, or shorter lock ownership should reduce wait time. Preserve
functional results, cancellation, ordering, and capacity limits while testing.
