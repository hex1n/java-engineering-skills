import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.*;
import java.util.stream.*;

public class Java8FunctionalChecks {
    interface Sized {
        int size();
        default boolean isEmpty() { return size() == 0; }
    }

    interface Left { default String label() { return "left"; } }
    interface Right { default String label() { return "right"; } }
    static class Resolved implements Left, Right {
        public String label() { return Left.super.label(); }
    }
    static class Base { public String label() { return "class"; } }
    static class ClassWins extends Base implements Left { }

    @FunctionalInterface
    interface TextRule {
        boolean accepts(String value);
        static TextRule prefixed(String prefix) {
            Objects.requireNonNull(prefix, "prefix");
            return value -> value != null && value.startsWith(prefix);
        }
    }

    public static void main(String[] args) {
        lambdaContracts();
        methodReferences();
        pipelines();
        collectors();
        parallelReduction();
        interfaceMethods();
        optionals();
        System.out.println("Java 8 functional contracts passed");
    }

    private static void lambdaContracts() {
        String prefix = "app-";
        Predicate<String> accepted = value -> value != null && value.startsWith(prefix);
        check(accepted.test("app-one") && !accepted.test(null), "predicate null policy");
        List<String> captured = new ArrayList<>();
        IntSupplier count = () -> captured.size();
        captured.add("later");
        check(count.getAsInt() == 1, "capture is not snapshot");
        Java8FunctionalChecks owner = new Java8FunctionalChecks();
        owner.checkThis();
    }

    private void checkThis() {
        Supplier<Object> lambda = () -> this;
        Supplier<Object> anonymous = new Supplier<Object>() {
            public Object get() { return this; }
        };
        check(lambda.get() == this && anonymous.get() == anonymous,
                "lambda and anonymous this differ");
    }

    private static void methodReferences() {
        Function<String, String> normalize = String::trim;
        check(normalize.apply(" a ").equals("a"), "unbound method reference");
        Supplier<List<String>> newList = ArrayList::new;
        check(newList.get() != newList.get(), "constructor called on each invocation");
        AtomicInteger created = new AtomicInteger();
        Supplier<String> factory = () -> "item-" + created.incrementAndGet();
        Supplier<String> bound = factory.get()::toString;
        check(created.get() == 1 && bound.get().equals(bound.get()) && created.get() == 1,
                "bound receiver evaluated once");
        Supplier<String> deferred = () -> factory.get().toString();
        check(created.get() == 1, "lambda creation does not invoke factory");
        check(!deferred.get().equals(deferred.get()) && created.get() == 3,
                "lambda reevaluates factory");
        String missing = null;
        Supplier<Integer> laterFailure = () -> missing.length();
        expect(NullPointerException.class, () -> {
            Supplier<Integer> immediateFailure = missing::length;
        });
        expect(NullPointerException.class, () -> laterFailure.get());
    }

    private static void pipelines() {
        List<List<String>> batches = Arrays.asList(Arrays.asList(" a ", null, ""),
                Arrays.asList("b", " a "));
        List<String> names = batches.stream().flatMap(List::stream)
                .filter(Objects::nonNull).map(String::trim).filter(name -> !name.isEmpty())
                .collect(Collectors.toCollection(ArrayList::new));
        check(names.equals(Arrays.asList("a", "b", "a")), "flatten order and duplicates");
        AtomicInteger calls = new AtomicInteger();
        Stream<Integer> once = Stream.of(1, 2, 3).filter(value -> {
            calls.incrementAndGet();
            return true;
        });
        check(calls.get() == 0, "pipeline is lazy");
        check(once.findFirst().get() == 1 && calls.get() == 1, "short circuit skips later effects");
        expect(IllegalStateException.class, () -> once.count());
    }

    private static void collectors() {
        List<String> words = Arrays.asList("bb", "a", "bb");
        Map<String, Long> frequencies = words.stream().collect(Collectors.toMap(
                Function.identity(), word -> 1L, Long::sum, LinkedHashMap::new));
        check(new ArrayList<>(frequencies.keySet()).equals(Arrays.asList("bb", "a"))
                && frequencies.get("bb") == 2L, "merge and key order");
        Map<Integer, Long> byLength = words.stream().collect(Collectors.groupingBy(
                String::length, TreeMap::new, Collectors.counting()));
        check(new ArrayList<>(byLength.keySet()).equals(Arrays.asList(1, 2))
                && byLength.get(2) == 2L, "grouping and downstream count");
        expect(IllegalStateException.class, () -> words.stream()
                .collect(Collectors.toMap(Function.identity(), String::length)));
        expect(NullPointerException.class, () -> Stream.of("a")
                .collect(Collectors.toMap(Function.identity(), word -> (String) null)));
        expect(NullPointerException.class, () -> Stream.of("a")
                .collect(Collectors.groupingBy(word -> (String) null)));
    }

    private static void parallelReduction() {
        long sequential = IntStream.rangeClosed(1, 1000).mapToLong(n -> (long) n * n).sum();
        long parallel = IntStream.rangeClosed(1, 1000).parallel().mapToLong(n -> (long) n * n).sum();
        check(sequential == 333833500L && parallel == sequential, "parallel sum equivalence");
        check(IntStream.empty().parallel().sum() == 0, "empty reduction identity");
        BinaryOperator<Integer> wrong = (a, b) -> a - b;
        check(!wrong.apply(wrong.apply(10, 3), 2).equals(wrong.apply(10, wrong.apply(3, 2))),
                "subtraction changes under regrouping");
        List<Integer> ordered = IntStream.range(0, 100).parallel().boxed()
                .collect(Collectors.toCollection(ArrayList::new));
        check(ordered.equals(IntStream.range(0, 100).boxed().collect(Collectors.toList())),
                "ordered parallel collection");
    }

    private static void interfaceMethods() {
        Sized empty = () -> 0;
        Sized present = () -> 2;
        check(empty.isEmpty() && !present.isEmpty(), "derived default method");
        check(new Resolved().label().equals("left"), "explicit default conflict resolution");
        check(new ClassWins().label().equals("class"), "class method wins");
        TextRule rule = TextRule.prefixed("app-");
        check(rule.accepts("app-one") && !rule.accepts(null) && !rule.accepts("other"),
                "interface static factory");
        expect(NullPointerException.class, () -> TextRule.prefixed(null));
    }

    private static void optionals() {
        String email = Optional.of("user").flatMap(user -> Optional.of("a@example.test"))
                .filter(address -> !address.isEmpty())
                .orElseThrow(() -> new IllegalStateException("email unavailable"));
        check(email.equals("a@example.test"), "flatMap preserves ordinary value");
        check(!Optional.of("value").map(value -> (String) null).isPresent(), "map null becomes empty");
        expect(NullPointerException.class, () -> Optional.of("value").flatMap(value -> null));
        expect(IllegalStateException.class, () -> Optional.empty()
                .orElseThrow(() -> new IllegalStateException("absent")));
    }

    private static void expect(Class<? extends Throwable> type, Runnable action) {
        try { action.run(); }
        catch (Throwable failure) {
            if (type.isInstance(failure)) return;
            throw new AssertionError("unexpected failure", failure);
        }
        throw new AssertionError("expected " + type.getSimpleName());
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
