"""Regression checks for independently distributable multi-skill packages."""

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILLS = Path("plugins/java-engineering-skills/skills")


class PackageChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="java-plugin-check-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "repo"
        shutil.copytree(ROOT, self.root, ignore=shutil.ignore_patterns(".git", "__pycache__", ".venv"))

    def check(self):
        return subprocess.run([sys.executable, str(self.root / "scripts/check.py")],
                              capture_output=True, text=True)

    def test_current_package(self):
        result = self.check()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_new_skill_cannot_depend_on_sibling_reference(self):
        entry = self.root / SKILLS / "java-design/SKILL.md"
        with entry.open("a") as stream:
            stream.write("\n[Required material](../java-concurrency/TASKS.md)\n")
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Skill link escapes package", result.stderr)

    def test_unlinked_reference_is_rejected(self):
        (self.root / SKILLS / "redis-engineering/UNUSED.md").write_text("# Forgotten guidance\n")
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unreachable skill references", result.stderr)

    def test_non_modern_java_entry_is_validated(self):
        entry = self.root / SKILLS / "messaging-reliability/SKILL.md"
        entry.write_text(entry.read_text().replace("name: messaging-reliability", "name: unrelated", 1))
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Skill name differs", result.stderr)

    def test_links_inside_nested_references_are_checked(self):
        entry = self.root / SKILLS / "spring-boot-engineering/CONFIGURATION.md"
        with entry.open("a") as stream:
            stream.write("\n[Details](MISSING.md)\n")
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Missing link target", result.stderr)


if __name__ == "__main__":
    unittest.main()
