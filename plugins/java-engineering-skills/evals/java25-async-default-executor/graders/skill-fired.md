---
type: tool_used
tool: Skill
input_match: '"skill"\s*:\s*"(?:[\w-]+:)?java-concurrency"'
min: 1
---

A CompletableFuture executor regression inside one JVM should invoke
java-concurrency.
