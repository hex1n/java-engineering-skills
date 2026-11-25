---
name: "zh: 新加的测试能编译但在 Boot 2.7 下没跑"
tags: ["zh", "java-testing"]
runs: 2
max_turns: 10
---

我们服务是 Java 8 + Spring Boot 2.7.18，用 `spring-boot-starter-test` 和它管理的 Surefire。同事加了下面这个测试，CI 是绿的，想合进去：

```java
import org.junit.Test;
import static org.junit.Assert.assertEquals;

public class RefundCalculatorTest {
    @Test
    public void refundsHalfAfterThirtyDays() {
        assertEquals(new BigDecimal("50.00"), new RefundCalculator().refund(new BigDecimal("100.00"), 31));
    }
}
```

能编译是因为 `junit:junit` 4.13.2 通过别的依赖带进了测试 classpath。Surefire 报告里没有 `RefundCalculatorTest`，构建输出 `Tests run: 214`，和改之前一样。这个测试能合吗？不要运行任何东西，解释一下，说说要改什么、怎么确认。
