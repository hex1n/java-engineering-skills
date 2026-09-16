# Compatible and bounded evidence collection

## Start without attaching

Read the evidence that needs no attach first: the GC log named by `-Xloggc`
(Java 8) or `-Xlog:gc*:file=…` (unified logging, JDK 9+) in the live command
line, `/proc/<pid>/status` and `limits`, and the cgroup memory and CPU files.
Also inspect stdout/stderr and service-manager or container logs: Java 8's
`-verbose:gc`, `-XX:+PrintGC`, or `-XX:+PrintGCDetails` can emit GC events
without `-Xloggc`, and unified logging can target stdout/stderr. Check actual
logging configuration and output destinations before reporting missing GC
evidence. Together these sources
answer full-collection counts, pause lengths, promotion failures, resident
size, thread and descriptor counts, and whether a memory limit exists at all.
Two Java 8 GC-log traps:

- Phase lines are spelled differently with and without `-XX:+PrintGCDetails`
  (the `java` tool page documents neither form), so read the spellings out of
  the log in hand before counting collector cycles.
- `-Xloggc` alone stamps events with seconds since the first GC; alignment with
  application logs needs `-XX:+PrintGCDateStamps`, which is off by default.

[Java 8 GC logging options](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/java.html),
[unified logging](https://openjdk.org/jeps/158).

## Resolve tools from the running JVM

Use the matching JDK/vendor tool distribution where available and inspect
`jcmd <pid> help` plus help for the selected command. The JDK tool
documentation does not promise that one release's tools work against another
release's JVM. `jcmd` must run on the target's machine with the effective user
and group that launched the JVM. Check attach permissions,
PID/container namespaces, VM implementation, and writable target-side paths.
Commands shown here are HotSpot examples, not portable across all JVMs.
[jcmd](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html).

`jcmd` requires the same machine and the same effective user and group that
launched the JVM. A mismatched identity can answer with `Unable to open socket
file: target process not responding or HotSpot VM not loaded`, but so can a
hung VM, a stale attach file, or `-XX:+DisableAttachMechanism`: check identity
and namespace before concluding that the JVM is unresponsive. Running as root,
`jstat` can still read the JVM's per-user performance-counter file when the
attach handshake fails, which shows the VM is alive; as another unprivileged
user both tools fail, so the pair discriminates nothing there. Inside a container,
enter the target's mount and PID namespaces with the target's uid and gid, and
use the PID as the target sees it; the JDK path from `/proc/<pid>/exe` exists
only inside that mount namespace. Diagnostic commands also differ by release:
`GC.heap_info` is absent from JDK 8's
[command list](https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/tooldescr006.html)
and answers `Unknown diagnostic command` there, so take heap and metaspace
sizes from `jstat -gc` on that release. Report any JDWP or
JMX agent in the JVM flags that is bound to all interfaces; it is an exposure
regardless of the performance question.
[jstat](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jstat.html).

JFR was integrated into OpenJDK 11; Java 8 availability depends on the vendor
and update/backport. Verify capabilities instead of automatically adding old
commercial-feature flags. Event streaming is a separate JDK 14 feature and
must not be assumed in Java 8/11. Event types/settings also vary by release.
[JFR integration](https://openjdk.org/jeps/328),
[event streaming](https://openjdk.org/jeps/349).

## Pick a bounded collection

For an authorized local HotSpot process, first inspect the chosen profile's
enabled events. Profiles can include host process metadata (`jdk.SystemProcess`),
environment/system properties, and JVM arguments. Attaching only to one PID
does not confine every event's data to that application. Start from the target
JDK's profile, disable events outside the permitted evidence scope, and save
the reviewed JFC configuration. Filtering a recording afterward reduces retained
data but does not prevent its initial collection.
[JDK 21 default event configuration](https://github.com/openjdk/jdk21u/blob/master/src/jdk.jfr/share/conf/jfr/default.jfc).

Concurrent recordings share event collection and combine settings. Disabling
an event in this task's profile does not exclude it when another recording
enables it; a distinct recording name is a lifecycle handle, not data isolation.
Inspect all active recording settings and account for recordings that may start
during the interval. If the combined scope cannot meet the collection boundary,
use an isolated reproduction or other suitable evidence; do not stop another
owner's recording merely to make this profile fit.
[JFR setting combination](https://docs.oracle.com/en/java/javase/21/docs/api/jdk.jfr/jdk/jfr/SettingControl.html#combine(java.util.Set)).

Replace the placeholders below with the verified PID, reviewed profile, and
a new target-writable output path. First inspect supported help:

```text
jcmd <pid> help JFR.start
jcmd <pid> JFR.check
jcmd <pid> JFR.start name=task-profile settings=<reviewed-profile.jfc> duration=30s filename=<path>/task.jfr
```

Use an explicit name so later dump/stop actions affect only this task's
recording. Check existing recordings and avoid overwriting evidence. `default`
and `profile` settings collect different evidence with different overhead;
choose event settings needed by the hypothesis, and bound duration and disk
usage. Inspect the resulting recording's interval/events before interpreting
an absent event as proof that a mechanism did not occur.

Thread snapshots can reveal owners and waiting stacks. `GC.class_histogram`
and `GC.heap_dump` can have high impact; a heap dump can request a full GC
unless options change that behavior. Inspect command help, storage capacity,
latency impact, and data scope before using them.
[jcmd commands and impact](https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html).

## Native memory and platform evidence

Native Memory Tracking needs startup configuration such as
`-XX:NativeMemoryTracking=summary`; it cannot be enabled retroactively through
a routine attach command. If already enabled, take a baseline and a later
summary diff during a comparable workload. NMT accounts for selected HotSpot
allocations, not every third-party native allocation or all process memory.
Reserved virtual space, committed memory, and resident memory are distinct.
[NMT scope](https://docs.oracle.com/en/java/javase/21/vm/native-memory-tracking.html).

Collect existing process/container memory and CPU quota/throttling evidence
alongside JVM metrics. A host CPU percentage can hide a saturated container
quota. GC logging syntax differs between Java 8 and unified logging in newer
JDKs; inspect existing configuration and version documentation before proposing
a restart to add flags. Preserve timestamps/timezones and units when joining
logs with latency evidence.
