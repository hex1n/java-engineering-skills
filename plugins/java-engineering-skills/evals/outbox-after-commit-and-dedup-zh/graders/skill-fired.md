---
type: tool_used
tool: Skill
input_match: '"skill"\s*:\s*"(?:[\w-]+:)?messaging-reliability"'
min: 1
---

Lost events between a database commit and a Kafka publish, plus consumer
deduplication, should invoke messaging-reliability.
