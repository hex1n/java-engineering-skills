---
type: llm
focus: last_message
---

Spring Boot 2.6.0 manages kafka-clients 3.0.0. Kafka 3.0 documents idempotence and acks=all as the new producer defaults, but in 3.0.0 and 3.1.0 idempotence stays off unless enable.idempotence is set explicitly (KAFKA-13598, fixed in 3.0.1, 3.1.1 and 3.2.0). So on this service the design doc's claim does not hold: retries can duplicate or reorder events. With idempotence relying on the default, a conflicting setting such as max.in.flight.requests.per.connection above 5 disables it silently; with enable.idempotence=true set explicitly, the same setting fails at startup with a ConfigException.

Pass when the answer (1) says idempotence is not actually on for the client this Boot release resolves, either naming the kafka-clients 3.0.0 or 3.1.0 defect or stating that this client line leaves idempotence off unless it is set explicitly; (2) tells them to set enable.idempotence=true and acks=all explicitly; (3) rejects max.in.flight of 10 because idempotence requires 5 or fewer; and (4) confirms from the effective producer configuration the client logs at startup (or the resolved kafka-clients version), not from the YAML file. Fail if the answer accepts that the Kafka 3.0 defaults already give idempotence on this service, or only says "check the version" without stating that 3.0.0 leaves idempotence off.
