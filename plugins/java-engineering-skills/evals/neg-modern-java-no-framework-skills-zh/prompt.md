---
name: "zh: 纯语言现代化改写时相邻 skill 不抢答"
tags: ["zh", "use-modern-java"]
runs: 3
max_turns: 10
---

这个普通 Java 类在一个定价库里，库现在用 `--release 21` 编译，没有框架、数据库或多线程代码。请在有帮助的地方用 Java 21 的语言特性重写它，行为保持不变，包括 `shape` 为 null 时的表现：

```java
public final class Areas {
    public static double area(Object shape) {
        if (shape instanceof Circle) {
            Circle c = (Circle) shape;
            return Math.PI * c.getRadius() * c.getRadius();
        } else if (shape instanceof Rect) {
            Rect r = (Rect) shape;
            return r.getWidth() * r.getHeight();
        }
        throw new IllegalArgumentException("unknown shape: " + shape);
    }
}
```

`Circle` 和 `Rect` 是带 getter 的普通 final 类。给出代码就行，不要运行任何东西。
