---
name: "rollbackFor is set but a failed order still commits"
tags: ["regression", "spring-boot-engineering", "transactions", "proxy"]
runs: 2
max_turns: 10
---

Java 8, Spring Boot 2.7.18, MyBatis 3.5 over MySQL InnoDB. When stock runs
out, `placeOrder` returns a failed `Result`, but the order row is still in the
table. I already added `rollbackFor = Exception.class`. Why does it still not
roll back, what is the smallest correct fix, and how would you prove it?

```java
@Service
public class OrderService {
    @Transactional(rollbackFor = Exception.class)
    public Result<Long> placeOrder(OrderRequest req) {
        try {
            Order order = Order.from(req);
            orderMapper.insert(order);
            int updated = inventoryMapper.deduct(req.getSku(), req.getQty()); // ... WHERE stock >= ?
            if (updated == 0) {
                throw new OutOfStockException(req.getSku()); // extends RuntimeException
            }
            return Result.ok(order.getId());
        } catch (Exception e) {
            log.error("place order failed", e);
            return Result.fail(e.getMessage());
        }
    }
}
```

`OrderController` calls `orderService.placeOrder(req)` and returns the
`Result` as JSON. Do not run anything.
