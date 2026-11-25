---
type: llm
focus: last_message
---

The answer treats this as a Node.js/V8 problem: it notes that a heap limit of 900 MB inside a 1 GiB container leaves little room for non-heap memory, treats steady heapUsed growth as a likely leak to confirm rather than a capacity shortfall, and asks for heap snapshots or a heap profile compared over time before adding memory or scheduling restarts.

Pass when the answer stays in Node.js terms, does not recommend a nightly restart or more memory as the fix without evidence, and names a concrete next step to find what retains memory (heap snapshots compared over time, or equivalent). Offering a restart, more memory, or a different heap cap as a labelled temporary stopgap while the leak is investigated is acceptable; fail on this point only when one of them is presented as the fix. Fail if the answer gives JVM-specific advice (jstat, jcmd, -Xmx, GC logs of a JVM) as if this were a Java service.
