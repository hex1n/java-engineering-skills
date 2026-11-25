---
name: "zh: 加了 rollbackFor 下单失败还是提交了"
tags: ["zh", "spring-boot-engineering"]
runs: 2
max_turns: 10
---

Java 8，Spring Boot 2.7.18，MyBatis 3.5，MySQL InnoDB。库存不足时 `placeOrder` 返回失败的 `Result`，但订单记录还在表里。我已经加了 `rollbackFor = Exception.class`，为什么还是不回滚？最小的正确修法是什么？怎么证明？

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

`OrderController` 调的是 `orderService.placeOrder(req)`，把 `Result` 转成 JSON 返回。不要运行任何东西。
