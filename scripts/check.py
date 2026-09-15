#!/usr/bin/env python3
"""Offline packaging and rule-reference checks; Python standard library only."""

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins" / "java-engineering-skills"
SKILLS = PLUGIN / "skills"
SKILL = SKILLS / "use-modern-java"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def without_fences(text):
    return re.sub(r"^```[^\n]*\n.*?^```\s*$", "", text, flags=re.M | re.S)


def anchors(text):
    headings = re.findall(r"^#{1,6}\s+(.+)$", without_fences(text), re.M)
    return {
        re.sub(r"[^\w\s-]", "", title.lower()).replace(" ", "-")
        for title in headings
    }


def check_manifests():
    codex = read_json(PLUGIN / ".codex-plugin/plugin.json")
    claude = read_json(PLUGIN / ".claude-plugin/plugin.json")
    for key in ("name", "version", "description", "license", "author"):
        require(codex[key] == claude[key], "Plugin metadata differs: " + key)
    require(codex["name"] == PLUGIN.name, "Plugin directory/name mismatch")
    require(re.fullmatch(r"\d+\.\d+\.\d+", codex["version"]), "Invalid version")
    require(codex["skills"] == "./skills/", "Unexpected skill root")
    require((ROOT / "LICENSE").is_file(), "Missing license file")
    require((PLUGIN / "LICENSE").read_bytes() == (ROOT / "LICENSE").read_bytes(),
            "Distributed plugin must include the repository license")
    markets = [
        read_json(ROOT / ".agents/plugins/marketplace.json"),
        read_json(ROOT / ".claude-plugin/marketplace.json"),
    ]
    require(markets[0]["name"] == markets[1]["name"], "Marketplace names differ")
    for market in markets:
        require(len(market["plugins"]) == 1, "Expected one plugin")
        entry = market["plugins"][0]
        require(entry["name"] == PLUGIN.name, "Marketplace plugin name mismatch")
        source = entry["source"]
        if isinstance(source, dict):
            require(source["source"] == "local", "Expected local plugin source")
            require(entry["policy"]["installation"] == "AVAILABLE", "Unexpected installation policy")
            require(entry["policy"]["authentication"] == "ON_INSTALL", "Unexpected authentication policy")
            require(entry["category"] == "Developer Tools", "Unexpected category")
            source = source["path"]
        require(source.startswith("./"), "Source path must be relative")
        require((ROOT / source).resolve() == PLUGIN, "Marketplace resolves to wrong plugin")


def local_links(path):
    text = without_fences(path.read_text(encoding="utf-8"))
    for target in re.findall(r"\[[^\]\n]+\]\(([^\s)]+)\)", text):
        if not re.match(r"[a-z]+://", target):
            yield target


def check_links(skill_dirs):
    count = 0
    for path in ROOT.rglob("*.md"):
        if ".git" in path.parts:
            continue
        owner = next((skill for skill in skill_dirs if skill in path.parents), None)
        for target in local_links(path):
            filename, _, anchor = target.partition("#")
            resolved = (path.parent / filename).resolve() if filename else path
            require(ROOT in resolved.parents, "Link escapes repository: " + target)
            if owner:
                require(owner in resolved.parents, "Skill link escapes package: " + target)
            require(resolved.is_file(), "Missing link target: " + str(resolved))
            if anchor:
                require(anchor in anchors(resolved.read_text(encoding="utf-8")),
                        "Missing anchor: " + target)
            count += 1
    return count


def check_skills():
    skill_dirs = sorted(path for path in SKILLS.iterdir() if path.is_dir())
    require(skill_dirs, "No skills packaged")
    for skill in skill_dirs:
        entry = skill / "SKILL.md"
        require(entry.is_file(), "Missing skill entry: " + skill.name)
        text = entry.read_text(encoding="utf-8")
        frontmatter = re.match(r"\A---\n(.*?)\n---(?:\n|$)", text, re.S)
        require(frontmatter, "Missing frontmatter: " + skill.name)
        fields = frontmatter.group(1)
        require(re.search(r"^name: " + re.escape(skill.name) + r"$", fields, re.M),
                "Skill name differs from directory: " + skill.name)
        require(re.search(r"^description: \S.+$", fields, re.M),
                "Missing description: " + skill.name)
        require("[TODO:" not in text, "Unfinished skill scaffold: " + skill.name)
        documents = set(skill.rglob("*.md"))
        reached, pending = set(), [entry]
        while pending:
            path = pending.pop()
            if path in reached:
                continue
            reached.add(path)
            for link in local_links(path):
                filename = link.partition("#")[0]
                target = (path.parent / filename).resolve() if filename else path
                if target in documents and target not in reached:
                    pending.append(target)
        orphaned = documents - reached
        require(not orphaned, "Unreachable skill references: " +
                ", ".join(str(path.relative_to(skill)) for path in sorted(orphaned)))
    return skill_dirs


def check_rules():
    index = (SKILL / "INDEX.md").read_text(encoding="utf-8")
    rows = re.findall(r"^\| (\d+) \| \[([^]]+)\]\(([^)#]+)#([^)]+)\) \|", index, re.M)
    require(rows, "Empty rule index")
    ids = [row[1] for row in rows]
    require(len(set(ids)) == len(ids), "Duplicate rule ID")
    versions = [int(row[0]) for row in rows]
    require(versions == sorted(versions, reverse=True), "Index must be newest first")
    documented = set()
    for path in SKILL.glob("JAVA*.md"):
        text = path.read_text(encoding="utf-8")
        for section in re.split(r"^## ", text, flags=re.M)[1:]:
            rule_id, _, body = section.partition("\n")
            rule_id = rule_id.strip()
            require(rule_id not in documented, "Duplicate rule detail: " + rule_id)
            documented.add(rule_id)
            row = next((item for item in rows if item[1] == rule_id), None)
            require(row is not None, "Unindexed rule: " + rule_id)
            version, _, filename, anchor = row
            require(filename == path.name and anchor == rule_id, "Misrouted rule: " + rule_id)
            require(8 <= int(version) <= 21, "Out-of-scope Java version: " + version)
            require("**Minimum: Java " + version + ".**" in body,
                    "Version mismatch: " + rule_id)
            require("```java" in body, "Missing example: " + rule_id)
            require(re.search(r"https://(?:openjdk\.org|docs\.oracle\.com)/", body),
                    "Missing primary source: " + rule_id)
    require(documented == set(ids), "Index and rule details differ")
    entry = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    require(entry.startswith("---\nname: use-modern-java\ndescription: "), "Invalid skill frontmatter")
    require("[TODO:" not in entry, "Unfinished skill scaffold")
    return len(rows)


def main():
    try:
        check_manifests()
        skill_dirs = check_skills()
        links = check_links(skill_dirs)
        rules = check_rules()
    except (ValueError, KeyError, OSError) as error:
        print("FAIL:", error, file=sys.stderr)
        return 1
    print("PASS: Codex and Claude plugin/marketplace paths and metadata")
    print("PASS: {} independently contained skills; all Markdown references reachable".format(len(skill_dirs)))
    print("PASS: {} local links; {} versioned rules with examples and sources".format(links, rules))
    print("Scope: offline structure checks; no agent behavior or Java compilation executed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
