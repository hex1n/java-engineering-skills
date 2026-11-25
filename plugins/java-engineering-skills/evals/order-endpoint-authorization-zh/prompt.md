---
name: "zh: 订单接口上线前评审"
tags: ["zh", "java-api-security"]
runs: 2
max_turns: 10
---

上线前帮忙看下这几个接口。服务是多租户的，每个用户属于一个租户。Spring Security 配置只有：`/api/**` 需要认证（JWT），没有别的。

```java
@RestController
@RequestMapping("/api/orders")
class OrderController {
    @GetMapping("/{orderId}")
    OrderDto get(@PathVariable long orderId, @AuthenticationPrincipal UserPrincipal me) {
        return orders.findById(orderId);
    }

    @GetMapping("/export")
    List<OrderDto> export(@RequestParam long tenantId, @RequestParam String month) {
        return orders.findByTenantAndMonth(tenantId, month);
    }
}
```

`OrderRepository.findById` 只按主键查。订单 ID 是自增的。上线前必须改什么，怎么测？不要运行任何东西。
