---
name: "A transfer leaves the debit committed after a failure"
tags: ["regression", "spring-boot-engineering", "transactions", "proxy"]
runs: 2
max_turns: 10
---

Java 8, Spring Boot 2.7.18, MySQL InnoDB, `JdbcTemplate`-based DAO. After an
`InsufficientFundsException`, the source account stays debited. Why, and what
is the smallest correct fix? How would you prove it?

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

Controllers call `transferService.transfer(...)`. Do not run anything.
