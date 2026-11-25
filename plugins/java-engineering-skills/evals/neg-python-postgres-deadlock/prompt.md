---
name: "Negative: a Python and PostgreSQL deadlock is not a Java task"
tags: ["negative", "non-java"]
runs: 3
max_turns: 8
---

Our Django 5 app on PostgreSQL 16 logs `deadlock detected` a few times a day.
Two Celery tasks update inventory for the same order lines inside
`transaction.atomic()`: one iterates the lines in the order they appear in the
cart, the other in warehouse-bin order, and each does
`Inventory.objects.select_for_update().get(sku=...)` followed by a save. What is
going on, and what should we change? Do not run anything.
