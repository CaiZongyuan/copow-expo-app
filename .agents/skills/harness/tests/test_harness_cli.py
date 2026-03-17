#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


HARNESS_BIN = Path(__file__).resolve().parents[1] / "bin" / "harness.py"


def run_harness(args: list[str], *, cwd: Path) -> tuple[int, str, str]:
    proc = subprocess.run(
        [sys.executable, str(HARNESS_BIN), *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=10,
    )
    return proc.returncode, proc.stdout.strip(), proc.stderr.strip()


class TestHarnessCli(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = Path(tempfile.mkdtemp(prefix="harness-cli-"))

    def tearDown(self) -> None:
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_init_creates_files(self) -> None:
        code, out, err = run_harness(["--root", str(self.tmpdir), "--json", "init"], cwd=self.tmpdir)
        self.assertEqual(code, 0, msg=(out, err))
        self.assertTrue((self.tmpdir / "harness-tasks.json").is_file())
        self.assertTrue((self.tmpdir / "harness-progress.txt").is_file())
        self.assertTrue((self.tmpdir / ".harness-active").is_file())

        data = json.loads((self.tmpdir / "harness-tasks.json").read_text("utf-8"))
        self.assertEqual(data.get("version"), 2)
        self.assertEqual(data.get("tasks"), [])

    def test_add_claim_complete_dependency_order(self) -> None:
        code, out, err = run_harness(["--root", str(self.tmpdir), "--json", "init"], cwd=self.tmpdir)
        self.assertEqual(code, 0, msg=(out, err))

        code, out, err = run_harness(
            ["--root", str(self.tmpdir), "--json", "add", "--title", "First", "--validation", "true"],
            cwd=self.tmpdir,
        )
        self.assertEqual(code, 0, msg=(out, err))
        task1 = json.loads(out)["task_id"]
        self.assertEqual(task1, "task-001")

        code, out, err = run_harness(
            [
                "--root",
                str(self.tmpdir),
                "--json",
                "add",
                "--title",
                "Second",
                "--depends-on",
                "task-001",
                "--validation",
                "true",
            ],
            cwd=self.tmpdir,
        )
        self.assertEqual(code, 0, msg=(out, err))
        task2 = json.loads(out)["task_id"]
        self.assertEqual(task2, "task-002")

        code, out, err = run_harness(["--root", str(self.tmpdir), "--json", "status"], cwd=self.tmpdir)
        self.assertEqual(code, 0, msg=(out, err))
        status = json.loads(out)
        self.assertEqual(status["counts"].get("pending"), 2)
        self.assertEqual(status["next"]["id"], "task-001")

        code, out, err = run_harness(["--root", str(self.tmpdir), "--json", "claim"], cwd=self.tmpdir)
        self.assertEqual(code, 0, msg=(out, err))
        claim = json.loads(out)
        self.assertTrue(claim["claimed"])
        self.assertEqual(claim["task"]["id"], "task-001")

        # Exclusive mode: cannot claim another while in_progress exists
        code, out, err = run_harness(["--root", str(self.tmpdir), "--json", "claim"], cwd=self.tmpdir)
        self.assertEqual(code, 0, msg=(out, err))
        claim2 = json.loads(out)
        self.assertFalse(claim2["claimed"])
        self.assertEqual(claim2["reason"], "task already in_progress (exclusive mode)")

        code, out, err = run_harness(["--root", str(self.tmpdir), "--json", "complete", "task-001"], cwd=self.tmpdir)
        self.assertEqual(code, 0, msg=(out, err))

        code, out, err = run_harness(["--root", str(self.tmpdir), "--json", "claim"], cwd=self.tmpdir)
        self.assertEqual(code, 0, msg=(out, err))
        claim3 = json.loads(out)
        self.assertTrue(claim3["claimed"])
        self.assertEqual(claim3["task"]["id"], "task-002")

