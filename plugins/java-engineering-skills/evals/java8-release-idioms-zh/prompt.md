---
name: "zh: 编译目标是 Java 8 的模块，用现代写法改写方法"
tags: ["zh", "use-modern-java"]
runs: 2
max_turns: 10
---

我本机是 JDK 21，模块的 `pom.xml` 里设了 `<maven.compiler.release>8</maven.compiler.release>`，生产还跑在 Java 8。帮我把这个方法改成更现代的写法，给出结果，不要改构建配置。

```java
public List<String> activeEmails(List<User> users) {
    List<String> result = new ArrayList<>();
    for (User user : users) {
        if (user.isActive() && user.getEmail() != null) {
            result.add(user.getEmail().toLowerCase());
        }
    }
    return result;
}
```

有两个调用方会往返回的 list 里追加元素（`emails.add(ADMIN_EMAIL)`）。另外说说你怎么确认改写是安全的。
