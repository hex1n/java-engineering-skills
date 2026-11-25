---
name: "zh: Spring Boot 2.6.0 下的 Kafka 生产者默认值"
tags: ["zh", "messaging-reliability"]
runs: 3
max_turns: 12
---

我们的订单服务用 Spring Boot 2.6.0，`spring-kafka` 和 `kafka-clients` 都用 Boot 管理的版本，没有覆盖。`application.yml` 里生产者这段是：

```yaml
spring:
  kafka:
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      properties:
        linger.ms: 5
```

同一个订单的事件都用订单号做 key。设计文档写着："Kafka 3.0 起默认开启幂等和 `acks=all`，所以重试不会让同一订单的事件重复或乱序，我们什么都不用配。"现在有同事想加 `max.in.flight.requests.per.connection: 10` 来提吞吐。

设计文档的说法对这个服务成立吗？同事的改动安全吗？请说清楚具体该配什么、怎么确认。不要运行任何东西。
