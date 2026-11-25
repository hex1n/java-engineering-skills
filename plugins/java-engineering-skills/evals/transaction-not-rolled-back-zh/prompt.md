---
name: "zh: 转账失败后扣款没有回滚"
tags: ["zh", "spring-boot-engineering"]
runs: 2
max_turns: 10
---

Java 8，Spring Boot 2.7.18，MySQL InnoDB，DAO 基于 `JdbcTemplate`。抛出 `InsufficientFundsException` 之后，转出账户的钱还是被扣了。为什么？最小的正确修法是什么？怎么证明？

```java
@Service
public class TransferService {
    public void transfer(long from, long to, BigDecimal amount) throws InsufficientFundsException {
        doTransfer(from, to, amount);
    }

    @Transactional
    public void doTransfer(long from, long to, BigDecimal amount) throws InsufficientFundsException {
        accountDao.debit(from, amount);              // UPDATE account SET balance = balance - ?
        if (accountDao.balance(from).signum() < 0) {
            throw new InsufficientFundsException(from);   // extends Exception
        }
        accountDao.credit(to, amount);
    }
}
```

Controller 调的是 `transferService.transfer(...)`。不要运行任何东西。
