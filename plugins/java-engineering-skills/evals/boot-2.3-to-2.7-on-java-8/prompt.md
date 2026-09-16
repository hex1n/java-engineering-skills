---
name: "Spring Boot 2.3.12 to 2.7.18 upgrade on JDK 8"
tags: ["spring-boot-engineering", "upgrade"]
runs: 2
max_turns: 12
---

We have a service on JDK 8 with `spring-boot-starter-parent` 2.3.12.RELEASE and want to upgrade to 2.7.18; the JDK cannot change yet. Facts about the project:

- `application.yml` is one file split into four documents with `---`; three of them use `spring.profiles: dev` / `spring.profiles: test` / `spring.profiles: prod`, the first document sets `spring.profiles.active: dev`, and the prod document also sets `spring.profiles.include: metrics`.
- There are 180 JUnit 4 test classes (`@RunWith(SpringRunner.class)`); CI only checks whether `mvn test` is green.
- Two services inject each other (A depends on B, B depends on A).
- springfox-swagger2 2.9.2 is used and actuator is enabled.
- Request bodies are validated with `@Valid`.

Give the upgrade plan: what will break, how to handle each item, and how to verify the result.
