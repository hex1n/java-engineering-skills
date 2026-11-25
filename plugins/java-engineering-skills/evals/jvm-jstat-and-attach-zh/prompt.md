---
name: "zh: JVM 排查：attach 失败、jstat 百分比、CMS FGC"
tags: ["zh", "jvm-performance"]
runs: 2
max_turns: 10
---

运维同事发来下面这段，问是该加内存还是重启：

"有台机器上的 Java 服务感觉不太对。我用 root 登上去：
1. `jcmd <pid> GC.heap_info` 报 `Unable to open socket file: target process not responding or HotSpot VM not loaded`，是不是 JVM 卡死了？
2. `jstat -gcutil <pid>` 输出：S0 11.30  S1 0.00  E 69.64  O 18.61  M 93.49  CCS 89.92  YGC 228  YGCT 6.673  FGC 8  FGCT 0.459  GCT 7.132。元空间 93% 是不是快溢出了？8 次 Full GC 有问题吗？
3. 启动参数里有 -Xmx2g -XX:+UseConcMarkSweepGC -XX:MaxMetaspaceSize=512m -Xloggc:/logs/gc.log 和 -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=8000。
4. 是 JDK 8，跑在 Docker 里。"

给出你的判断，以及下一步该收集哪些证据。不要执行任何命令，根据给出的信息推理。
