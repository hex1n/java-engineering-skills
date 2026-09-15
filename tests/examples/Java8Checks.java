import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

public class Java8Checks {
    public static void main(String[] args) {
        Instant timestamp = Instant.ofEpochMilli(1234);
        check(Date.from(timestamp).getTime() == 1234, "instant bridge");
        check(Base64.getEncoder().encodeToString(new byte[] {1, 2, 3}).equals("AQID"), "base64");

        Map<String, List<String>> groups = new HashMap<>();
        groups.put("key", null);
        groups.computeIfAbsent("key", k -> new ArrayList<>()).add("value");
        check(groups.get("key").equals(Arrays.asList("value")), "null map initialization");

        AtomicInteger calls = new AtomicInteger();
        String cached = Optional.of("cached").orElseGet(() -> {
            calls.incrementAndGet();
            return "fallback";
        });
        check(cached.equals("cached") && calls.get() == 0, "lazy fallback");

        List<String> names = Arrays.asList("member", null).stream()
            .collect(Collectors.toCollection(ArrayList::new));
        names.add("guest");
        check(names.size() == 3 && names.get(1) == null, "mutable null-tolerant result");
        System.out.println("Java 8 contracts passed");
    }

    private static void check(boolean condition, String label) {
        if (!condition) throw new AssertionError(label);
    }
}
