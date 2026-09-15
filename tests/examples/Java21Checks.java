import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;

public class Java21Checks {
    record Point(int x, int y) { }
    record FailingPoint(int x) {
        public int x() { throw new IllegalStateException("accessor failed"); }
    }

    public static void main(String[] args) throws Exception {
        check(label(null).equals("missing"), "null dispatch");
        check(label("text").equals("text") && label(7).equals("7"), "type dispatch");
        Object point = new Point(3, 4);
        check(point instanceof Point(int x, int y) && x + y == 7, "record pattern");
        FailingPoint failing = new FailingPoint(1);
        try {
            failing.x();
            throw new AssertionError("direct accessor did not fail");
        } catch (IllegalStateException expected) { }
        try {
            Object candidate = failing;
            if (candidate instanceof FailingPoint(int x)) {
                throw new AssertionError("pattern accessor did not fail");
            }
            throw new AssertionError("record did not match");
        } catch (MatchException expected) {
            check(expected.getCause() instanceof IllegalStateException,
                    "pattern wraps accessor failure");
        }

        List<String> original = new ArrayList<>(List.of("a", "b"));
        List<String> reversed = original.reversed();
        check(original.getFirst().equals("a") && reversed.getFirst().equals("b"), "reverse view");
        reversed.set(0, "changed");
        check(original.getLast().equals("changed"), "reverse view writes through");
        try {
            new ArrayList<>().getFirst();
            throw new AssertionError("empty getFirst succeeded");
        } catch (NoSuchElementException expected) { }

        AtomicBoolean completed = new AtomicBoolean();
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<Boolean> virtual = executor.submit(() -> Thread.currentThread().isVirtual());
            check(virtual.get(), "virtual thread factory");
            executor.submit(() -> completed.set(true));
        }
        check(completed.get(), "close waits for owned tasks");
        System.out.println("Java 21 contracts passed");
    }

    private static String label(Object value) {
        return switch (value) {
            case null -> "missing";
            case String text -> text;
            case Integer number -> Integer.toString(number);
            default -> "other";
        };
    }

    private static void check(boolean condition, String label) {
        if (!condition) throw new AssertionError(label);
    }
}
