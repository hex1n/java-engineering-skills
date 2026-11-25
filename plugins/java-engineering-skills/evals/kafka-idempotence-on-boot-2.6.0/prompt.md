---
name: "Kafka producer defaults on Spring Boot 2.6.0"
tags: ["messaging-reliability", "kafka", "discriminating"]
runs: 3
max_turns: 12
---

Our order service is on Spring Boot 2.6.0 with the Boot-managed `spring-kafka`
and `kafka-clients` versions (no overrides). The producer section of
`application.yml` is:

```yaml
spring:
  kafka:
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      properties:
        linger.ms: 5
```

Events for one order use the order id as the key. The design doc says: "Kafka
3.0 turned on idempotence and `acks=all` by default, so retries cannot
duplicate or reorder events within an order, and we don't need to configure
anything." A colleague now wants to add
`max.in.flight.requests.per.connection: 10` to raise throughput.

Is the design doc's claim right for this service, and is the colleague's change
safe? Say exactly what to configure and how to confirm it. Do not run anything.
