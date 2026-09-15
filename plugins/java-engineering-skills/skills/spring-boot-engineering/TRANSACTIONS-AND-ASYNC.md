# Interception and execution boundaries

## Transactional proxies

In the usual proxy mode, a call must cross the proxy for transaction advice to
run. Self-invocation, including calling a private annotated method, does not
start a transaction merely because `@Transactional` is present. Proxy type and
framework version also affect which methods can be advised.

Place the cohesive operation on an appropriate managed collaborator or use a
deliberate `TransactionTemplate` boundary; avoid self-injection solely to hide
the design problem. Test through the managed entry point and assert database
state on failure.

```java
// Java 8-compatible shape; existing repository details are omitted.
@Service
class OrderWriter {
    @Transactional(rollbackFor = IOException.class)
    public void save(Order order) throws IOException {
        // The whole required database mutation belongs inside this boundary.
    }
}
```

Use rollback rules that match the error contract. Default rules normally roll
back for unchecked exceptions/errors, not every checked exception; inspect
explicit and global overrides. Catching an exception can prevent the interceptor
from seeing it, while an inner failure may already mark the transaction
rollback-only.

Source: [Transactional annotation semantics](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html).

## Propagation and resource ownership

`REQUIRED` commonly joins the existing physical transaction. An inner
rollback-only result can make outer commit fail even if its exception was
caught. `REQUIRES_NEW` uses an independent transaction and can consume an
additional connection while the outer transaction retains resources; evaluate
pool capacity and locks before using it for every helper call.

`NESTED` depends on transaction-manager/savepoint support and is not equivalent
to an independent committed transaction. Choose the manager explicitly when
multiple data sources exist. `readOnly` is not a universal enforcement barrier
against writes. Keep slow external calls outside a database transaction when
the required consistency can be expressed without holding its resources.

Source: [Spring propagation](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html).

## Events and asynchronous work

`@TransactionalEventListener` can coordinate a callback with a transaction
phase, but is not a durable queue. An `AFTER_COMMIT` publisher can be lost if
the process dies after the commit. For required cross-system delivery, persist
replayable publication intent in the transaction and relay it with duplicate
handling. Ordinary database work performed after commit needs its own valid
transaction boundary when a new commit is required.

In an imperative after-commit callback, the original transactional resources
may still be bound. Default `REQUIRED` can join that completed transaction
without a further commit. For a database write that must commit from this
callback, use an actually intercepted `REQUIRES_NEW` boundary or explicitly
configured equivalent, accounting for its connection/lock cost. This still
does not make the callback durable or let its failure undo the original commit.
[Spring 5.3 after-commit resource semantics](https://docs.spring.io/spring-framework/docs/5.3.31/javadoc-api/org/springframework/transaction/support/TransactionSynchronization.html#afterCommit()).

`@Async` also normally requires proxy interception; self-invocation stays local.
Thread-bound imperative transactions do not propagate to a new worker thread.
Define the executor, queue/rejection behavior, failure observation, and required
context propagation. Reactive transaction context follows different mechanisms
and needs the chosen reactive transaction manager/pipeline.

Sources: [Transaction-bound events](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html),
[Spring task execution](https://docs.spring.io/spring-framework/reference/integration/scheduling.html).
