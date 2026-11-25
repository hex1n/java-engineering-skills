---
type: tool_used
tool: Skill
input_match: '"skill"\s*:\s*"(?:[\w-]+:)?spring-boot-engineering"'
min: 1
---

A transaction that commits despite a rollback rule depends on how the Spring
transaction interceptor sees the exception and should invoke
spring-boot-engineering.
