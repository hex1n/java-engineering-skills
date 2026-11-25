---
name: "zh: 订单生命周期——State、带撤销的 Command 和抽象工厂方案"
tags: ["zh", "java-design"]
runs: 2
max_turns: 10
---

我们的 Spring Boot 订单服务里有个 `OrderService.advance(orderId, action)`：一个很大的 `switch`，按订单的 `status` 字符串（`CREATED`、`PAID`、`SHIPPED`、`DELIVERED`、`CANCELLED`）和动作（`pay`、`ship`、`deliver`、`cancel`）分支。每个分支都是先用 JPA 加载 `Order` 实体，检查当前状态，有副作用的就调用（pay 调 `paymentGateway.charge(...)`，ship 调 `warehouse.ship(...)`），再设置新状态并保存。服务跑两个实例，前面挂负载均衡。

团队提了一个重构方案：每个状态一个 State 类；每个动作一个 Command 类，带 `undo()`，动作前给 `Order` 实体拍一个 Memento，撤销时恢复它，方便运维回滚误操作；再用一个抽象工厂来创建这些 State 对象。

这个设计好吗？换成你会怎么做，新设计必须保证什么？给出设计思路和关键接口，不用写完整代码。
