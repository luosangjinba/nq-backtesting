#!/usr/bin/env python3
"""Reconcile one managed Replay Lab site with an existing Caddyfile."""

from __future__ import annotations

import argparse
import fnmatch
import ipaddress
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path


MANAGED_FRAGMENT = "/etc/caddy/replay-lab.Caddyfile"
MANAGED_MARKER_START = "# BEGIN REPLAY LAB MANAGED IMPORT"
MANAGED_MARKER_END = "# END REPLAY LAB MANAGED IMPORT"


@dataclass(frozen=True)
class Block:
    """A complete top-level Caddy block."""

    start: int
    end: int
    header: str
    text: str


def structural_text(line: str) -> str:
    """Return braces and tokens outside comments and quoted strings."""
    result: list[str] = []
    quote = ""
    escaped = False
    for character in line:
        if escaped:
            escaped = False
            continue
        if quote and character == "\\":
            escaped = True
            continue
        if character in {'"', "'", "`"}:
            if quote == character:
                quote = ""
            elif not quote:
                quote = character
            continue
        if character == "#" and not quote:
            break
        if not quote:
            result.append(character)
    return "".join(result)


def top_level_blocks(lines: list[str]) -> list[Block]:
    """Parse balanced top-level blocks without interpreting directives."""
    blocks: list[Block] = []
    depth = 0
    start: int | None = None
    header = ""
    for index, line in enumerate(lines):
        source = structural_text(line)
        if depth == 0 and "{" in source:
            start = index
            header = source.split("{", 1)[0].strip()
        depth += source.count("{") - source.count("}")
        if depth < 0:
            raise ValueError(f"unbalanced closing brace on line {index + 1}")
        if start is not None and depth == 0:
            text = "\n".join(lines[start:index + 1])
            blocks.append(Block(start, index, header, text))
            start = None
    if depth != 0 or start is not None:
        raise ValueError("unbalanced Caddy block")
    return blocks


def replay_site(text: str) -> bool:
    """Identify a legacy or current Replay Lab proxy site by owned ports."""
    has_web = re.search(r"reverse_proxy(?:\s+\S+)?\s+127\.0\.0\.1:8007\b", text)
    has_data = "127.0.0.1:8766" in text and (
        "/v7/market-data" in text or "/v4/" in text or "@market_data" in text
    )
    return bool(has_web and has_data)


def header_owns_host(header: str, public_host: str) -> bool:
    """Return whether a site label directly names the requested host."""
    labels = re.split(r"[\s,]+", header.strip())
    accepted = {public_host, f"https://{public_host}", f"http://{public_host}"}
    return any(label.rstrip("/") in accepted for label in labels if label)


def remove_owned_sites(lines: list[str], public_host: str) -> tuple[list[str], int]:
    """Remove old Replay sites and reject a foreign owner of the new host."""
    removed: set[int] = set()
    count = 0
    for block in top_level_blocks(lines):
        if not block.header:
            continue
        if replay_site(block.text):
            removed.update(range(block.start, block.end + 1))
            count += 1
            continue
        if header_owns_host(block.header, public_host):
            raise ValueError(
                f"requested public host is owned by an unmanaged Caddy site: {public_host}"
            )
    return [line for index, line in enumerate(lines) if index not in removed], count


def import_pattern(line: str) -> str | None:
    """Read the first path argument from a top-level import directive."""
    match = re.match(r"^\s*import\s+(?:\"([^\"]+)\"|'([^']+)'|(\S+))", line)
    if not match:
        return None
    return next(value for value in match.groups() if value is not None)


def pattern_covers_fragment(pattern: str, fragment: str, base_dir: str) -> bool:
    """Resolve a Caddy import path/glob against the source configuration."""
    candidate = pattern if os.path.isabs(pattern) else os.path.join(base_dir, pattern)
    normalized = os.path.normpath(candidate)
    return normalized == fragment or fnmatch.fnmatch(fragment, normalized)


def import_is_glob(line: str) -> bool:
    """Return whether an import uses filesystem wildcard expansion."""
    pattern = import_pattern(line) or ""
    return any(character in pattern for character in "*?[")


def reconcile_imports(lines: list[str], fragment: str, base_dir: str) -> list[str]:
    """Ensure the managed fragment is imported exactly once."""
    cleaned = [line for line in lines if line.strip() not in {MANAGED_MARKER_START, MANAGED_MARKER_END}]
    covered: list[int] = []
    for index, line in enumerate(cleaned):
        pattern = import_pattern(line)
        if pattern and pattern_covers_fragment(pattern, fragment, base_dir):
            covered.append(index)
    glob_coverage = [
        index
        for index in covered
        if import_is_glob(cleaned[index])
    ]
    if len(glob_coverage) > 1:
        raise ValueError("multiple Caddy import globs include the Replay Lab fragment")
    if glob_coverage:
        return [line for index, line in enumerate(cleaned) if index not in covered or index == glob_coverage[0]]
    if covered:
        cleaned = [line for index, line in enumerate(cleaned) if index not in covered]
    while cleaned and not cleaned[-1].strip():
        cleaned.pop()
    cleaned.extend(["", MANAGED_MARKER_START, f"import {fragment}", MANAGED_MARKER_END])
    return cleaned


def reconcile_default_sni(
    lines: list[str], public_host: str, managed_evidence: bool
) -> list[str]:
    """Create, retain, or safely migrate the global direct-IP default SNI."""
    blocks = top_level_blocks(lines)
    global_block = next((block for block in blocks if not block.header), None)
    if global_block is None:
        return ["{", f"  default_sni {public_host}", "}", "", *lines]
    result = list(lines)
    found = False
    for index in range(global_block.start + 1, global_block.end):
        match = re.match(r"^(\s*)default_sni\s+(\S+)", result[index])
        if not match:
            continue
        found = True
        existing = match.group(2)
        if existing != public_host:
            try:
                existing_is_ipv4 = ipaddress.ip_address(existing).version == 4
            except ValueError:
                existing_is_ipv4 = False
            if not managed_evidence or not existing_is_ipv4:
                raise ValueError(f"unmanaged default_sni conflicts with public IP: {existing}")
        result[index] = f"{match.group(1)}default_sni {public_host}"
    if not found:
        result.insert(global_block.start + 1, f"  default_sni {public_host}")
    return result


def reconcile(
    source: str,
    public_host: str,
    fragment: str,
    base_dir: str,
    existing_fragment: str,
    manage_default_sni: bool,
) -> tuple[str, int]:
    """Return one idempotent shared-host Caddy configuration."""
    original_lines = source.splitlines()
    original_managed = replay_site(source) or replay_site(existing_fragment)
    original_managed = original_managed or fragment in source
    without_sites, removed_count = remove_owned_sites(original_lines, public_host)
    caddy_lines = without_sites
    if manage_default_sni:
        caddy_lines = reconcile_default_sni(
            without_sites, public_host, original_managed or removed_count > 0
        )
    reconciled = reconcile_imports(caddy_lines, fragment, base_dir)
    return "\n".join(reconciled).rstrip() + "\n", removed_count


def parse_arguments() -> argparse.Namespace:
    """Parse the standalone reconciliation command."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--public-host", required=True)
    parser.add_argument("--fragment", default=MANAGED_FRAGMENT)
    parser.add_argument("--base-dir", default="/etc/caddy")
    parser.add_argument("--existing-fragment")
    parser.add_argument("--manage-default-sni", action="store_true")
    return parser.parse_args()


def main() -> int:
    """Reconcile files and report the detected deployment transition."""
    arguments = parse_arguments()
    source = Path(arguments.input).read_text(encoding="utf-8")
    existing_fragment = ""
    if arguments.existing_fragment and Path(arguments.existing_fragment).is_file():
        existing_fragment = Path(arguments.existing_fragment).read_text(encoding="utf-8")
    try:
        output, removed = reconcile(
            source,
            arguments.public_host,
            os.path.normpath(arguments.fragment),
            arguments.base_dir,
            existing_fragment,
            arguments.manage_default_sni,
        )
    except ValueError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    Path(arguments.output).write_text(output, encoding="utf-8")
    transition = "legacy-managed-site-migrated" if removed else "shared-layout-reconciled"
    print(f"INFO: Caddy transition: {transition}; removed managed site blocks: {removed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
