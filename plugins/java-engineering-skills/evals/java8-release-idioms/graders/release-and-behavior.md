---
type: llm
criteria: "The rewrite compiles under release 8: it uses no var, List.of, Stream.toList(), records, Optional.isEmpty, or other API added after Java 8. It keeps the returned list mutable for the callers that append, for example with Collectors.toCollection(ArrayList::new) or by keeping the loop, rather than relying on Collectors.toList(), whose mutability is unspecified. It keeps the null filter, the active filter, order, and the existing toLowerCase() call. Verification compiles with release 8 (or javac --release 8) and exercises a caller that appends; it does not treat compiling on JDK 21 without the release setting as proof."
focus: "release-8 API boundary and preserved mutability"
target: last_message
---

Pass when the rewritten method stays within Java 8 APIs, keeps the result
mutable and the filtering and order unchanged, and the verification names the
release-8 compile and an appending caller. Keeping the loop with a short reason
is also a pass. Fail if the answer uses any post-8 syntax or API, returns an
unmodifiable or unspecified-mutability list without addressing the appending
callers, proposes raising the compiler release, or offers a JDK 21 build alone
as evidence of compatibility.
