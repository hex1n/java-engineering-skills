---
name: "A new test compiles but never runs under Boot 2.7"
tags: ["java-testing", "discovery"]
runs: 2
max_turns: 10
---

Our service uses Java 8 and Spring Boot 2.7.18 with `spring-boot-starter-test`
and its managed Surefire. A teammate added this test, CI is green, and they
want to merge:

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

The class compiles because `junit:junit` 4.13.2 reaches the test classpath
through another dependency. The Surefire report lists no `RefundCalculatorTest`
entry, and the build says `Tests run: 214`, the same count as before the change.
Is the test fine to merge? Do not run anything; explain and say what to change
and how to confirm.
