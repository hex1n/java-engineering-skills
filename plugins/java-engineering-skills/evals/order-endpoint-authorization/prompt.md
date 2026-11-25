---
name: "Pre-release review of order endpoints"
tags: ["java-api-security", "authorization", "review"]
runs: 2
max_turns: 10
---

Please review these endpoints before release. The service is multi-tenant; each
user belongs to one tenant. Spring Security config: `/api/**` requires
authentication (JWT), nothing else.

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

`OrderRepository.findById` loads by primary key only. Order IDs are sequential.
What must change before release, and how do we test it? Do not run anything.
