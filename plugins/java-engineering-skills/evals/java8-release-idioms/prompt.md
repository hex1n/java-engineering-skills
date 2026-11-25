---
name: "Modernize a method in a module compiled for Java 8 on a JDK 21 workstation"
tags: ["regression", "use-modern-java", "version", "behavior"]
runs: 2
max_turns: 10
---

My laptop runs JDK 21. The module's `pom.xml` sets
`<maven.compiler.release>8</maven.compiler.release>` and production still runs
Java 8. Please rewrite this method in a more modern style and show the result;
do not change the build.

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

Two callers append to the returned list (`emails.add(ADMIN_EMAIL)`). Tell me
how you would check that the rewrite is safe.
