---
name: "zh: 从现有代码和测试证据解释 Spring 装配"
tags: ["zh", "spring-boot-engineering"]
runs: 2
max_turns: 12
---

只分析现有代码和证据，不要改文件，也不要启动服务。
服务用 Java 8、Boot 2.7.18 和它管理的 Spring 依赖。下面的片段省略了 import 和无关方法。两个配置类都会被应用扫描到。运行时 `storage.mode=remote`。

```java
@Configuration
@ConfigurationProperties(prefix = "storage")
class StorageProperties {
    private String mode;
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
}

@Configuration
@ConditionalOnProperty(name = "storage.mode", havingValue = "remote")
@EnableConfigurationProperties(StorageProperties.class)
class RemoteStorageConfiguration {}

@Configuration
class ClientConfiguration {
    @Bean("publicCatalog") CatalogClient publicCatalog() { return new PublicClient(); }
    @Bean("internalCatalog") CatalogClient internalCatalog() { return new InternalClient(); }
}

@RestController
class CatalogController {
    @Resource(name = "publicCatalog") private CatalogClient client;
}

@Service
class CatalogFacade {
    CatalogFacade(StorageProperties properties, CatalogClient gateway) { /* ... */ }
}
```

两个 client 都不是 primary。facade 和 controller 面向的是同一类调用方。目前的验证只有编译通过，外加一个直接 `new CatalogFacade(new StorageProperties(), mockClient)` 的普通单元测试。没有应用启动的结果；测试环境的远程服务今天不可用。

解释一下 facade 的依赖是由什么决定的，现有证据能不能证明装配是对的。推荐一个最小但有用的下一步验证，并说明它能证明什么。是不是得等远程服务恢复才能回答这些问题？

另外，服务里有个没加注解的 `LabelFormatter`，有个纯函数 `String normalize(String input)`。它的测试覆盖了 null、空白和大小写归一化，都有真实的输入输出断言。评估这个方法的归一化行为，需要同样的验证吗？
