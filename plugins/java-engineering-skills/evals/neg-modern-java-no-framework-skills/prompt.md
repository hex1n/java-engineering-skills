---
name: "Adjacent skills stay out of a plain language modernization"
tags: ["negative", "adjacent", "use-modern-java"]
runs: 3
max_turns: 10
---

This plain Java class lives in a pricing library that now compiles with
`--release 21`. It has no framework, database, or threading code. Rewrite it
with Java 21 language features where they help, keeping its behavior,
including what happens for a null `shape`:

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

`Circle` and `Rect` are ordinary final classes with getters. Show the code; do
not run anything.
