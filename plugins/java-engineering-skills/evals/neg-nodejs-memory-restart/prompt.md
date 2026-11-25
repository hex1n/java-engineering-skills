---
name: "Negative: Node.js memory growth is not a Java task"
tags: ["negative", "non-java"]
runs: 3
max_turns: 8
---

Our Node.js 20 API (Express, running in Docker with a 1 GiB memory limit) is
restarted by the orchestrator every few days. `process.memoryUsage()` shows
`heapUsed` climbing from 180 MB to about 700 MB over two days, and the container
is OOM-killed shortly after. The service is started with
`node --max-old-space-size=900 server.js`. An operations colleague asks whether
to add memory, schedule a nightly restart, or both.

Give your assessment and the next evidence to collect. Do not run anything.
