import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

public class Java17Checks {
    sealed interface Lookup permits Found, Missing { }
    record Found(String value) implements Lookup { }
    record Missing() implements Lookup { }
    record Values(List<String> items) { }

    public static void main(String[] args) {
        Object value = new Found("ok");
        check(value instanceof Found found && found.value().equals("ok"), "instanceof binding");
        List<String> shared = new ArrayList<>();
        Values holder = new Values(shared);
        shared.add("visible");
        check(holder.items().size() == 1, "record is shallow");
        check(new Found("ok").equals(value), "record equality");

        List<String> names = Stream.of("member", null).toList();
        check(names.get(1) == null, "toList permits null");
        try {
            names.add("guest");
            throw new AssertionError("toList returned mutable list");
        } catch (UnsupportedOperationException expected) { }

        String text = """
            SELECT id
            FROM account
            WHERE active = ?
            """;
        check(text.equals("SELECT id\nFROM account\nWHERE active = ?\n"), "text block bytes");
        int priority = switch ("FAST") {
            case "FAST" -> 1;
            case "NORMAL" -> 2;
            default -> 3;
        };
        check(priority == 1, "switch expression");
        System.out.println("Java 17 contracts passed");
    }

    private static void check(boolean condition, String label) {
        if (!condition) throw new AssertionError(label);
    }
}
