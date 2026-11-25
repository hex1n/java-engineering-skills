---
type: llm
focus: last_message
---

The answer explains the deadlock as two transactions locking the same inventory rows in different orders, and fixes it by locking in one consistent order (for example sorting by SKU or primary key, or locking all rows up front with one ordered select_for_update query), keeping transactions short, and retrying the whole transaction on a deadlock error.

Pass when the answer names the inconsistent lock order as the cause and gives a consistent ordering fix in Django/PostgreSQL terms. Fail if it frames the fix in Java, Spring, or MySQL InnoDB terms as if this were a Java service.
