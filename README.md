# Java Engineering Skills

面向 **Java 8–21 后端工程**的 AI 编程助手插件：按项目实际版本和技术栈，
指导语言写法、模块设计、并发、Spring Boot、缓存、消息、数据库、测试、
接口安全与 JVM 性能诊断。

数据库专题聚焦 **MySQL / InnoDB**：表设计、索引、SQL 优化、事务与迁移，
以 8.0/8.4 为主并注明 5.7 老项目的兼容边界。

这是一个独立的 **Codex / Claude Code 插件**。两个入口共用十个 skill 和
按需读取的参考资料。仓库、marketplace 与插件标识统一为
`java-engineering-skills`，展示名称为 **Java Engineering Skills**。

完整范围及职责划分见 [SKILLS.md](SKILLS.md)；其他值得扩展的方向见
[ROADMAP.md](ROADMAP.md)。

## 解决什么问题

Agent 可能沿用旧写法，也可能直接采用超出项目版本的新特性。例如，开发机器
安装 JDK 21，但 Maven 配置 `release=8` 时，生成 record 或 `List.of` 都不合适。

本插件先区分编译工具链、语言/API 目标和运行时要求，再提供适用规则。它尤其
关注“能编译，但改变了行为”的替换：

- `Stream.toList()` 返回不可修改列表，不能随意替换下游会修改的集合。
- `List.copyOf()` 是快照，不能直接代替需要反映原集合变化的只读视图。
- record 会影响构造器、访问器、相等性、序列化和框架使用方式。
- 虚拟线程适合大量阻塞任务，采用时仍需保留下游限流、取消和生命周期约束。

工程专题继续检查运行时机制：设计模式是否减少真实耦合，Spring 事务是否
经过代理，Redis 租约能否防止过期持有者写入，消息重投是否重复业务效果，
数据库约束是否覆盖多实例并发，测试是否实际执行了目标机制，接口是否检查
资源权限，以及性能结论是否由可比较的测量支持。

## 工作方式

指导内容以**有适用条件和证据的最佳实践**为准：说明版本、使用前提、取舍、
失败条件及验证方法。正确性要求、条件性方案和兼容示例分别表述；新特性、
设计模式或常见配置不会仅因流行而成为默认要求。来源与验证不足的结论不能
写成保证。具体准入要求见 [贡献规范](CONTRIBUTING.md#recommendation-quality)，
已执行的验证及缺口见 [验证记录](VALIDATION.md)。

1. 根据当前任务选择相关 skill，确认 Java、框架、客户端和服务端的实际版本。
2. 建立需要保持的业务契约、状态归属和失败语义。
3. 按需读取相应参考，选择有证据支持的实现，并验证关键并发或故障窗口。

现代 Java skill 包含 32 条精选规则，其中 13 条以 Java 8 为最低版本，覆盖
Lambda、方法引用、Stream、收集器、并行流、接口默认/静态方法和 Optional 等。
每条标注首次稳定版本；preview 和 incubator 特性
不作为默认建议。规则通过 Markdown 分层读取，版本解析由 agent 检查构建配置
完成，**没有自动解析 Maven/Gradle 的 CLI**。使用插件不需要额外安装运行时；
编译和测试 Java 项目仍需项目要求的工具链。

## 本地安装

先进入本仓库根目录。以下命令会修改相应工具的插件配置；创建仓库本身不会安装插件。

### Codex

```sh
codex plugin marketplace add .
codex plugin add java-engineering-skills@java-engineering-skills
```

安装后在新任务中使用：

```text
使用 use-modern-java，按当前模块的 Java 版本改进这段代码，保持原有行为。
```

### Claude Code

```sh
claude plugin marketplace add .
claude plugin install java-engineering-skills@java-engineering-skills
```

在新会话中显式调用：

```text
/java-engineering-skills:use-modern-java
```

开发时也可以直接加载本地插件：

```sh
claude --plugin-dir ./plugins/java-engineering-skills
```

从 GitHub 安装时，marketplace 添加命令中的 `.` 可替换为仓库地址
`https://github.com/hex1n/java-engineering-skills`。

插件格式依据：[OpenAI 插件打包文档](https://developers.openai.com/plugins/build/plugins)、
[Claude Code 插件参考](https://code.claude.com/docs/en/plugins-reference)和
[marketplace 文档](https://code.claude.com/docs/en/plugin-marketplaces)。

## 目录

```text
.agents/plugins/marketplace.json       Codex marketplace
.claude-plugin/marketplace.json        Claude Code marketplace
plugins/java-engineering-skills/
  .codex-plugin/plugin.json            Codex 插件清单
  .claude-plugin/plugin.json           Claude Code 插件清单
  skills/
    use-modern-java/                  Java 8–21 语言与标准库
    java-design/                      设计模式与模块契约
    java-concurrency/                 JVM 并发与锁
    redis-engineering/                缓存、原子操作与租约
    messaging-reliability/            消息与业务效果
    spring-boot-engineering/          Spring Boot 框架机制
    database-transactions/            MySQL 表设计、索引、SQL 与事务
    java-testing/                     JUnit、Mockito、集成与故障验证
    java-api-security/                接口契约与访问控制
    jvm-performance/                  JVM 诊断与性能测量
SKILLS.md                             技能范围与职责
ROADMAP.md                            后续扩展评估
scripts/check.mjs                       离线结构与引用检查
scripts/check-examples.mjs              编译与契约示例验证
tests/examples/                        Java 8/11/17/21 验证样例
```

## 验证与维护

仓库脚本需要 Node.js 22+，仅使用内置模块，无需安装 npm 依赖。

```sh
node scripts/check.mjs
node --test tests/*.test.mjs
claude plugin validate ./plugins/java-engineering-skills
claude plugin validate ./.claude-plugin/marketplace.json
```

离线检查覆盖两个插件清单及 marketplace 的对应关系、所有 skill 的包内引用、
未被入口引用的资料，以及现代 Java 规则索引与正文的版本一致性。
它不代替 agent 行为评测或 Java/框架/中间件集成测试。
新增规则和评测方法见 [CONTRIBUTING.md](CONTRIBUTING.md)。
各版本实际执行的检查及未覆盖范围见 [VALIDATION.md](VALIDATION.md)。

指定本机已有 JDK，可以编译并执行部分关键契约样例：

```sh
node scripts/check-examples.mjs --jdk /path/to/jdk21-or-newer
node scripts/check-examples.mjs --jdk /path/to/jdk8 --release 8
```

第一条命令按 Java 8、11、17、21 的目标版本分别编译，均在指定 JDK 上执行。
这不代表已在四个版本的运行时分别完成验证；脚本会输出实际使用的版本。

## 来源与许可

结构受到 [JetBrains/go-modern-guidelines](https://github.com/JetBrains/go-modern-guidelines)
启发：版本敏感的指导、短索引和按需解释。Java 规则独立编写，依据各条规则
链接的 OpenJDK JEP 与 Java SE 官方文档；本项目不隶属于 JetBrains。

[Apache-2.0](LICENSE)。
