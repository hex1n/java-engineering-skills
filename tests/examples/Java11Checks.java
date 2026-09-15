import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Java11Checks {
    public static void main(String[] args) throws IOException {
        List<String> input = new ArrayList<>(List.of("first"));
        List<String> view = Collections.unmodifiableList(input);
        List<String> snapshot = List.copyOf(input);
        input.add("second");
        check(view.size() == 2 && snapshot.size() == 1, "view versus snapshot");
        try {
            List.copyOf(Arrays.asList("first", null));
            throw new AssertionError("copyOf accepted null");
        } catch (NullPointerException expected) { }

        check(!"\u2003".trim().isEmpty() && "\u2003".isBlank(), "whitespace differs");
        check(!"\u00a0".isBlank(), "non-breaking space is not Java whitespace");

        Path path = Files.createTempFile("java-guidelines-", ".txt");
        try {
            Files.writeString(path, "line\n", StandardCharsets.UTF_8);
            check(Files.readString(path, StandardCharsets.UTF_8).equals("line\n"), "text round trip");
            Files.write(path, new byte[] {(byte) 0xc3, (byte) 0x28});
            String replaced = new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
            check(replaced.indexOf('\ufffd') >= 0, "String replaces malformed bytes");
            try {
                Files.readString(path, StandardCharsets.UTF_8);
                throw new AssertionError("readString accepted malformed bytes");
            } catch (IOException expected) { }
        } finally {
            Files.deleteIfExists(path);
        }
        System.out.println("Java 11 contracts passed");
    }

    private static void check(boolean condition, String label) {
        if (!condition) throw new AssertionError(label);
    }
}
