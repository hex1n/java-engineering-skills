---
type: llm
focus: last_message
---

The judge sees only the answer, so these facts from the task are given here. In a Java 8, Spring Boot 2.7.18 service using MyBatis over MySQL InnoDB, OrderController calls orderService.placeOrder(req) on the injected bean. placeOrder is public and annotated @Transactional(rollbackFor = Exception.class). Inside one try block it inserts the order, runs an UPDATE that deducts stock only when enough stock exists, and throws OutOfStockException (a RuntimeException) when that update changes no row. A catch (Exception e) in the same method logs the exception and returns Result.fail(...). The user reports that a failed Result comes back but the order row stays, and asked why, for the smallest correct fix, and how to prove it, without running anything.

Pass when the answer does all of these, in any order or format:
1. Names the cause: the exception is caught inside placeOrder, the method returns normally, so the transaction interceptor sees no exception and commits; rollbackFor only applies to an exception that leaves the method.
2. Gives a fix that makes the failure reach the transaction boundary: let the exception leave the transactional method and build the failed Result outside it (controller, exception handler, or another bean that calls it), or mark the current transaction rollback-only inside the catch (for example TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()). Either is enough; offering both is fine.
3. Proposes a proof that calls placeOrder through the Spring bean with a real transaction manager and database, triggers the out-of-stock path, and then checks committed state (no order row, or an unchanged count), with the test itself not wrapped in a rolling-back test transaction.

Fail if the answer does any of these:
- Gives rollbackFor, a checked exception, self-invocation, a non-public method, or the table engine as the cause. Listing them as assumptions to confirm or as other ways the same symptom could arise does not fail.
- Gives only a fix that leaves the catch swallowing the exception without marking rollback-only, such as changing rollbackFor or noRollbackFor, adding REQUIRES_NEW, or moving code to another bean.
- Offers as proof only a mocked unit test, or only an assertion on the returned Result.
- Proposes a test that runs inside a rolling-back @Transactional test transaction without addressing that.

Mentioning extra checks, alternatives, caveats, or unknowns does not fail an answer. No particular test API, exception type, or format is required.
