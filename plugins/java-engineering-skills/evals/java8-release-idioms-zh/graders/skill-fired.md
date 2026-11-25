---
type: tool_used
tool: Skill
input_match: '"skill"\s*:\s*"(?:[\w-]+:)?use-modern-java"'
min: 1
---

A rewrite of Java code for a module compiled with release 8 should invoke use-modern-java, even though the developer's JDK is newer.
