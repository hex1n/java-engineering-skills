---
name: "JVM triage: failed attach, jstat percentages, CMS FGC"
tags: ["jvm-performance", "diagnosis"]
runs: 2
max_turns: 10
---

An operations colleague sent this and asks whether to add memory or restart:

"A Java service on one host feels off. I logged in as root:
1. `jcmd <pid> GC.heap_info` fails with `Unable to open socket file: target process not responding or HotSpot VM not loaded` — is the JVM hung?
2. `jstat -gcutil <pid>` prints: S0 11.30  S1 0.00  E 69.64  O 18.61  M 93.49  CCS 89.92  YGC 228  YGCT 6.673  FGC 8  FGCT 0.459  GCT 7.132 — is metaspace at 93% about to overflow? Are 8 full GCs a problem?
3. Startup flags include -Xmx2g -XX:+UseConcMarkSweepGC -XX:MaxMetaspaceSize=512m -Xloggc:/logs/gc.log and -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=8000.
4. It is JDK 8 running in Docker."

Give your assessment and the next evidence to collect. Do not run any commands; reason from the information given.
