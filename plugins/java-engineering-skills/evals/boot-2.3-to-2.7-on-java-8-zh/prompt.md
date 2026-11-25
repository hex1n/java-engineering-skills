---
name: "zh: Spring Boot 2.3.12 升级到 2.7.18（JDK 8）"
tags: ["zh", "spring-boot-engineering"]
runs: 2
max_turns: 12
---

我们有个服务跑在 JDK 8 上，`spring-boot-starter-parent` 是 2.3.12.RELEASE，想升到 2.7.18，JDK 暂时不能换。项目情况：

- `application.yml` 一个文件用 `---` 分成四段；其中三段用 `spring.profiles: dev` / `spring.profiles: test` / `spring.profiles: prod`，第一段设了 `spring.profiles.active: dev`，prod 那段还设了 `spring.profiles.include: metrics`。
- 有 180 个 JUnit 4 测试类（`@RunWith(SpringRunner.class)`），CI 只看 `mvn test` 绿不绿。
- 有两个 service 互相注入（A 依赖 B，B 依赖 A）。
- 用了 springfox-swagger2 2.9.2，开了 actuator。
- 请求体用 `@Valid` 校验。

给个升级方案：哪些地方会出问题，每项怎么处理，升级完怎么验证。
