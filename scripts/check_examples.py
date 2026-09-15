#!/usr/bin/env python3
"""Compile selected compatibility examples and execute them on an explicit JDK."""

import argparse
import os
import re
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jdk", required=True, type=Path, help="JDK home; no toolchain is downloaded")
    parser.add_argument("--release", type=int, action="append", choices=[8, 11, 17, 21],
                        help="Target to check (repeatable); defaults to all four")
    args = parser.parse_args()
    suffix = ".exe" if os.name == "nt" else ""
    javac = args.jdk / "bin" / ("javac" + suffix)
    java = args.jdk / "bin" / ("java" + suffix)
    releases = args.release or [8, 11, 17, 21]
    try:
        compiler = subprocess.run([str(javac), "-version"], check=True, capture_output=True, text=True)
        version = compiler.stdout.strip() or compiler.stderr.strip()
        match = re.search(r"javac (?:1\.)?(\d+)", version)
        if not match:
            parser.error("Unrecognized compiler version: " + version)
        major = int(match.group(1))
        if max(releases) > major:
            parser.error("Compiler {} cannot target {}; select --release explicitly".format(major, max(releases)))
        runtime = subprocess.run([str(java), "-version"], check=True, capture_output=True, text=True)
        print("Compiler:", version, flush=True)
        print("Execution runtime:", (runtime.stderr or runtime.stdout).splitlines()[0], flush=True)
        with tempfile.TemporaryDirectory(prefix="java-guidelines-examples-") as temp:
            for release in releases:
                name = "Java{}Checks".format(release)
                out = Path(temp) / str(release)
                out.mkdir()
                flags = ["-source", "8", "-target", "8"] if major == 8 else ["--release", str(release)]
                subprocess.run([str(javac), *flags, "-encoding", "UTF-8", "-d", str(out),
                                str(ROOT / "tests/examples" / (name + ".java"))], check=True)
                subprocess.run([str(java), "-cp", str(out), name], check=True, timeout=30)
        print("PASS: target compatibility and selected behavior checks")
        print("Only the named execution runtime was exercised, not every target JDK.")
    except (OSError, subprocess.SubprocessError) as error:
        parser.exit(1, "FAIL: {}\n".format(error))


if __name__ == "__main__":
    main()
