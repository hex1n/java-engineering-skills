# 技能范围与选择

插件包含十个可独立使用的 skill。按当前任务选择；Java 语言兼容性、框架行为
和中间件机制可能同时相关，但无需每次加载所有资料。

| Skill | 主要职责 | 关键内容 |
|---|---|---|
| [use-modern-java](plugins/java-engineering-skills/skills/use-modern-java/SKILL.md) | 语言与标准库版本兼容 | Java 8–21 的 32 条规则，含函数式接口、方法引用、Stream、默认方法及版本判断 |
| [java-design](plugins/java-engineering-skills/skills/java-design/SKILL.md) | 模块设计与模式选择 | GoF 23 种模式的选型索引、接口契约、组合与继承、状态转换 |
| [java-concurrency](plugins/java-engineering-skills/skills/java-concurrency/SKILL.md) | JVM 内并发正确性 | 可见性、原子性、锁、并发容器、有界队列、任务上下文、异步和虚拟线程 |
| [redis-engineering](plugins/java-engineering-skills/skills/redis-engineering/SKILL.md) | 缓存和 Redis 协作机制 | 一致性、缓存击穿、TTL 写入语义、Lua/事务、租约、集群和序列化 |
| [messaging-reliability](plugins/java-engineering-skills/skills/messaging-reliability/SKILL.md) | 消息与业务效果的可靠性 | 幂等、outbox/inbox、重试、解码失败、顺序、Kafka/RabbitMQ/RocketMQ |
| [spring-boot-engineering](plugins/java-engineering-skills/skills/spring-boot-engineering/SKILL.md) | Spring 容器与框架机制 | Boot 2.1–2.7 版本线变更、3.x、自动配置、事务代理、声明式缓存、异步、Web 与测试 |
| [database-transactions](plugins/java-engineering-skills/skills/database-transactions/SKILL.md) | MySQL / InnoDB 设计与持久化 | 表设计、约束、索引、SQL、事务、迁移和副本读取一致性；OceanBase 4.2 MySQL 模式差异 |
| [java-testing](plugins/java-engineering-skills/skills/java-testing/SKILL.md) | 测试方案与执行 | JUnit、Mockito 与 mock/stub/fake/spy、Testcontainers、事务验证、异步和故障注入 |
| [java-api-security](plugins/java-engineering-skills/skills/java-api-security/SKILL.md) | 接口契约与访问控制 | HTTP/RPC、认证与资源授权、租户隔离、幂等接口、输入与资源限制 |
| [jvm-performance](plugins/java-engineering-skills/skills/jvm-performance/SKILL.md) | 性能诊断与优化验证 | JFR/jcmd、CPU 与等待、堆与原生内存、GC、JMH 与负载测量 |

## 相邻职责如何协作

- **Java 锁、数据库锁、Redis 租约**分别保护不同范围。共享对象竞争看并发
  skill，多个进程更新数据库看数据库 skill，Redis 协作看 Redis skill。
- **Spring 事务**负责实际代理调用、传播和事务管理器；数据库 skill 负责
  MySQL 的表结构、索引、SQL、隔离与约束；消息 skill 负责数据库与 broker
  的提交间隙。数据库资料以 8.0/8.4 为主，按需检查 5.7 迁移边界。
- **设计模式**负责选择抽象。具体实现仍遵守相应框架、并发或存储的契约。
- **测试**负责选择证据边界、组织与执行验证；具体事务、锁和消息机制由各
  专题解释。测试 skill 自带必要边界说明，可独立使用。
- **接口安全**负责调用者、资源、租户与协议契约；Spring 专题负责实际容器
  与代理配置，数据库和消息专题负责持久化及投递机制。
- **性能诊断**负责测量、归因和优化对照；并发专题负责共享状态的正确性。
  监控指标可以提供诊断线索，但不单独证明因果关系。

按实际技术栈继续扩展的条件见 [后续扩展评估](ROADMAP.md)。

每个 skill 都包含自己的必要前提和参考资料，不要求调用另一个 skill 才能工作。
公共源码只在插件中维护一份，由 Codex 和 Claude Code 共同加载。
