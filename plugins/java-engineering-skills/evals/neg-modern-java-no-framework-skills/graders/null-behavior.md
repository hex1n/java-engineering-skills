---
type: llm
focus: last_message
---

The rewrite uses Java 21 features (a pattern-matching switch or instanceof patterns) and keeps behavior: Circle and Rect give the same areas, any other non-null object throws IllegalArgumentException with the same message, and a null shape still throws IllegalArgumentException("unknown shape: null") rather than a NullPointerException. A pattern switch without `case null` throws NullPointerException for a null selector even with a default branch, so a switch-based rewrite needs `case null` (for example `case null, default -> throw ...`) or a null check before the switch.

Pass when the rewritten code preserves the null behavior as described and the answer says why. Fail if the rewrite switches on `shape` without handling null, so a null input would now throw NullPointerException.
