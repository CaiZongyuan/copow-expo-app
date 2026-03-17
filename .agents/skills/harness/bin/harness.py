#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Optional


def utc_now() -> dt.datetime:
    return dt.datetime.now(tz=dt.timezone.utc)


def iso_z(value: dt.datetime) -> str:
    value = value.astimezone(dt.timezone.utc).replace(microsecond=0)
    return value.isoformat().replace("+00:00", "Z")


def parse_iso(value: Any) -> Optional[dt.datetime]:
    if not isinstance(value, str) or not value.strip():
        return None
    s = value.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        parsed = dt.datetime.fromisoformat(s)
    except Exception:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def default_state() -> dict[str, Any]:
    return {
        "version": 2,
        "created": iso_z(utc_now()),
        "session_config": {
            "concurrency_mode": "exclusive",
            "max_tasks_per_session": 20,
            "max_sessions": 50,
        },
        "tasks": [],
        "session_count": 0,
        "last_session": None,
    }


def tasks_path(root: Path) -> Path:
    return root / "harness-tasks.json"


def progress_path(root: Path) -> Path:
    return root / "harness-progress.txt"


def marker_path(root: Path) -> Path:
    return root / ".harness-active"


def load_state(root: Path) -> dict[str, Any]:
    path = tasks_path(root)
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("harness-tasks.json must be a JSON object")
    return data


def atomic_write_state(root: Path, state: dict[str, Any]) -> None:
    path = tasks_path(root)
    bak = path.with_name(f"{path.name}.bak")
    tmp = path.with_name(f"{path.name}.tmp")
    if path.exists():
        shutil.copy2(path, bak)
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def lockdir_for_root(root: Path) -> Path:
    h = hashlib.sha256(str(root).encode("utf-8")).hexdigest()[:16]
    return Path("/tmp") / f"harness-{h}.lock"


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def _read_pid(lockdir: Path) -> Optional[int]:
    try:
        raw = (lockdir / "pid").read_text("utf-8").strip()
        return int(raw) if raw else None
    except Exception:
        return None


def acquire_lock(lockdir: Path, timeout_seconds: float = 5.0) -> None:
    deadline = time.time() + timeout_seconds
    missing_pid_since: Optional[float] = None
    while True:
        try:
            lockdir.mkdir(mode=0o700)
            (lockdir / "pid").write_text(str(os.getpid()), encoding="utf-8")
            return
        except FileExistsError:
            pid = _read_pid(lockdir)
            if pid is None:
                if missing_pid_since is None:
                    missing_pid_since = time.time()
                if time.time() - missing_pid_since < 1.0:
                    if time.time() >= deadline:
                        raise TimeoutError("lock busy (pid missing)")
                    time.sleep(0.05)
                    continue
            else:
                missing_pid_since = None
                if _pid_alive(pid):
                    if time.time() >= deadline:
                        raise TimeoutError(f"lock busy (pid={pid})")
                    time.sleep(0.05)
                    continue

            stale = lockdir.with_name(f"{lockdir.name}.stale.{os.getpid()}.{int(time.time())}")
            try:
                lockdir.rename(stale)
            except Exception:
                if time.time() >= deadline:
                    raise TimeoutError("lock contention")
                time.sleep(0.05)
                continue
            shutil.rmtree(stale, ignore_errors=True)
            missing_pid_since = None
            continue


def release_lock(lockdir: Path) -> None:
    shutil.rmtree(lockdir, ignore_errors=True)


def append_progress(root: Path, message: str) -> None:
    ts = iso_z(utc_now())
    line = f"[{ts}] {message}".rstrip() + "\n"
    progress_path(root).parent.mkdir(parents=True, exist_ok=True)
    with progress_path(root).open("a", encoding="utf-8") as f:
        f.write(line)


def priority_rank(value: Any) -> int:
    return {"P0": 0, "P1": 1, "P2": 2}.get(str(value or ""), 9)


def task_attempts(task: dict[str, Any]) -> int:
    try:
        return int(task.get("attempts") or 0)
    except Exception:
        return 0


def task_max_attempts(task: dict[str, Any]) -> int:
    try:
        v = task.get("max_attempts")
        return int(v) if v is not None else 3
    except Exception:
        return 3


def completed_ids(tasks: list[dict[str, Any]]) -> set[str]:
    return {str(t.get("id", "")) for t in tasks if str(t.get("status", "")) == "completed"}


def deps_completed(task: dict[str, Any], done: set[str]) -> bool:
    deps = task.get("depends_on") or []
    if not isinstance(deps, list):
        return False
    return all(str(d) in done for d in deps)


def eligible_tasks(tasks: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    done = completed_ids(tasks)
    pending = [t for t in tasks if str(t.get("status", "")) == "pending" and deps_completed(t, done)]
    retryable = [
        t for t in tasks
        if str(t.get("status", "")) == "failed"
        and task_attempts(t) < task_max_attempts(t)
        and deps_completed(t, done)
    ]

    def key(t: dict[str, Any]) -> tuple[int, str]:
        return (priority_rank(t.get("priority")), str(t.get("id", "")))

    pending.sort(key=key)
    retryable.sort(key=key)
    return pending, retryable


def pick_next(pending: list[dict[str, Any]], retryable: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
    return pending[0] if pending else (retryable[0] if retryable else None)


def status_counts(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for t in tasks:
        s = str(t.get("status") or "pending")
        counts[s] = counts.get(s, 0) + 1
    return counts


def get_concurrency_mode(state: dict[str, Any]) -> str:
    cfg = state.get("session_config") or {}
    if not isinstance(cfg, dict):
        return "exclusive"
    return str(cfg.get("concurrency_mode") or "exclusive")


def reap_stale_leases(tasks: list[dict[str, Any]], now: dt.datetime) -> bool:
    changed = False
    for t in tasks:
        if str(t.get("status", "")) != "in_progress":
            continue
        exp = parse_iso(t.get("lease_expires_at"))
        if exp is None or exp > now:
            continue
        t["attempts"] = task_attempts(t) + 1
        err = f"[LEASE_EXPIRED] claimed_by={t.get('claimed_by')}"
        log = t.get("error_log")
        if isinstance(log, list):
            log.append(err)
        else:
            t["error_log"] = [err]
        t["status"] = "failed"
        for k in ("claimed_by", "lease_expires_at", "claimed_at"):
            t.pop(k, None)
        changed = True
    return changed


def git_head(root: Path) -> Optional[str]:
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except Exception:
        return None
    if proc.returncode != 0:
        return None
    sha = proc.stdout.strip()
    return sha if sha else None


def resolve_root(arg_root: Optional[str]) -> Path:
    if arg_root:
        return Path(arg_root).expanduser().resolve()
    env_root = os.environ.get("HARNESS_STATE_ROOT")
    if env_root:
        return Path(env_root).expanduser().resolve()
    return Path.cwd().resolve()


def ensure_initialized(root: Path) -> None:
    if not tasks_path(root).is_file():
        raise FileNotFoundError(f"missing {tasks_path(root)} (run: harness init)")
    if not progress_path(root).is_file():
        raise FileNotFoundError(f"missing {progress_path(root)} (run: harness init)")


def cmd_init(args: argparse.Namespace) -> int:
    root = resolve_root(args.root)
    root.mkdir(parents=True, exist_ok=True)

    if not tasks_path(root).exists():
        atomic_write_state(root, default_state())
    if not progress_path(root).exists():
        progress_path(root).write_text("", encoding="utf-8")
    marker_path(root).touch(exist_ok=True)

    if args.json:
        print(json.dumps({"ok": True, "root": str(root)}, ensure_ascii=False))
    else:
        print(f"OK: initialized harness at {root}")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    root = resolve_root(args.root)
    ensure_initialized(root)
    state = load_state(root)
    tasks_raw = state.get("tasks") or []
    tasks = [t for t in tasks_raw if isinstance(t, dict)] if isinstance(tasks_raw, list) else []

    pending, retryable = eligible_tasks(tasks)
    next_task = pick_next(pending, retryable)
    counts = status_counts(tasks)

    payload: dict[str, Any] = {
        "root": str(root),
        "counts": counts,
        "total": len(tasks),
        "concurrency_mode": get_concurrency_mode(state),
        "next": None,
    }
    if next_task is not None:
        payload["next"] = {
            "id": str(next_task.get("id") or ""),
            "title": str(next_task.get("title") or ""),
            "status": str(next_task.get("status") or ""),
            "priority": str(next_task.get("priority") or ""),
        }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    parts = [f"total={payload['total']}"]
    for k in sorted(counts.keys()):
        parts.append(f"{k}={counts[k]}")
    hint = ""
    if payload["next"]:
        n = payload["next"]
        hint = f" next={n['id']}{(': ' + n['title']) if n['title'] else ''}"
    print(f"HARNESS: {' '.join(parts)}{hint}")
    return 0


def _next_task_id(existing: list[dict[str, Any]]) -> str:
    ids = [str(t.get("id") or "") for t in existing]
    nums = []
    for tid in ids:
        if tid.startswith("task-"):
            try:
                nums.append(int(tid.split("-", 1)[1]))
            except Exception:
                continue
    n = (max(nums) + 1) if nums else 1
    return f"task-{n:03d}"


def cmd_add(args: argparse.Namespace) -> int:
    root = resolve_root(args.root)
    ensure_initialized(root)

    lockdir = lockdir_for_root(root)
    acquire_lock(lockdir)
    try:
        state = load_state(root)
        tasks_raw = state.get("tasks") or []
        if not isinstance(tasks_raw, list):
            raise ValueError("tasks must be a list")
        tasks: list[dict[str, Any]] = [t for t in tasks_raw if isinstance(t, dict)]

        tid = args.id.strip() if args.id else _next_task_id(tasks)
        if any(str(t.get("id") or "") == tid for t in tasks):
            raise ValueError(f"task id already exists: {tid}")

        depends_on = [s.strip() for s in (args.depends_on or []) if s.strip()]
        task: dict[str, Any] = {
            "id": tid,
            "title": args.title.strip(),
            "status": "pending",
            "priority": args.priority,
            "depends_on": depends_on,
            "attempts": 0,
            "max_attempts": args.max_attempts,
            "started_at_commit": None,
            "validation": {"command": args.validation, "timeout_seconds": args.timeout_seconds},
            "on_failure": {"cleanup": None},
            "error_log": [],
            "checkpoints": [],
            "completed_at": None,
        }
        tasks.append(task)
        state["tasks"] = tasks
        atomic_write_state(root, state)
    finally:
        release_lock(lockdir)

    append_progress(root, f'ADD [{tid}] {args.title.strip()}')
    out = {"ok": True, "task_id": tid, "root": str(root)}
    if args.json:
        print(json.dumps(out, ensure_ascii=False))
    else:
        print(f"OK: added {tid}")
    return 0


def cmd_claim(args: argparse.Namespace) -> int:
    root = resolve_root(args.root)
    ensure_initialized(root)
    worker_id = (args.worker_id or os.environ.get("HARNESS_WORKER_ID") or "").strip()

    lockdir = lockdir_for_root(root)
    acquire_lock(lockdir)
    try:
        state = load_state(root)
        tasks_raw = state.get("tasks") or []
        if not isinstance(tasks_raw, list):
            raise ValueError("tasks must be a list")
        tasks: list[dict[str, Any]] = [t for t in tasks_raw if isinstance(t, dict)]

        mode = get_concurrency_mode(state)
        if mode == "concurrent" and not worker_id:
            raise ValueError("missing worker id (use --worker-id or HARNESS_WORKER_ID) in concurrent mode")

        if mode != "concurrent":
            in_progress = [t for t in tasks if str(t.get("status", "")) == "in_progress"]
            if in_progress:
                tid = str(in_progress[0].get("id") or "")
                title = str(in_progress[0].get("title") or "").strip()
                out = {
                    "ok": True,
                    "claimed": False,
                    "reason": "task already in_progress (exclusive mode)",
                    "in_progress": {"id": tid, "title": title},
                    "root": str(root),
                }
                if args.json:
                    print(json.dumps(out, ensure_ascii=False))
                else:
                    print(f"HARNESS: task already in_progress: {tid}{(': ' + title) if title else ''}")
                return 0

        if mode == "concurrent":
            if reap_stale_leases(tasks, utc_now()):
                state["tasks"] = tasks
                atomic_write_state(root, state)

        pending, retryable = eligible_tasks(tasks)
        next_task = pick_next(pending, retryable)
        if next_task is None:
            out = {"ok": True, "claimed": False, "reason": "no eligible tasks", "root": str(root)}
            if args.json:
                print(json.dumps(out, ensure_ascii=False))
            else:
                print("HARNESS: no eligible tasks")
            return 0

        tid = str(next_task.get("id") or "")
        title = str(next_task.get("title") or "").strip()
        base = git_head(root)

        lease_exp: Optional[str] = None
        if mode == "concurrent":
            lease_seconds = int(args.lease_seconds)
            lease_exp = iso_z(utc_now() + dt.timedelta(seconds=lease_seconds)) if lease_seconds > 0 else None

        next_task["status"] = "in_progress"
        if worker_id:
            next_task["claimed_by"] = worker_id
            next_task["claimed_at"] = iso_z(utc_now())
        if lease_exp:
            next_task["lease_expires_at"] = lease_exp
        if base:
            next_task["started_at_commit"] = base

        state["tasks"] = tasks
        atomic_write_state(root, state)
    finally:
        release_lock(lockdir)

    append_progress(root, f"CLAIM [{tid}] {title}{(' worker=' + worker_id) if worker_id else ''}{(' base=' + base) if base else ''}")
    out = {
        "ok": True,
        "claimed": True,
        "root": str(root),
        "task": {
            "id": tid,
            "title": title,
            "claimed_by": worker_id or None,
            "lease_expires_at": lease_exp,
            "started_at_commit": base,
        },
    }
    if args.json:
        print(json.dumps(out, ensure_ascii=False))
    else:
        print(f"OK: claimed {tid}{(': ' + title) if title else ''}")
    return 0


def cmd_complete(args: argparse.Namespace) -> int:
    root = resolve_root(args.root)
    ensure_initialized(root)

    lockdir = lockdir_for_root(root)
    acquire_lock(lockdir)
    try:
        state = load_state(root)
        tasks_raw = state.get("tasks") or []
        if not isinstance(tasks_raw, list):
            raise ValueError("tasks must be a list")
        tasks: list[dict[str, Any]] = [t for t in tasks_raw if isinstance(t, dict)]

        task = next((t for t in tasks if str(t.get("id") or "") == args.id), None)
        if task is None:
            raise ValueError(f"task not found: {args.id}")

        task["status"] = "completed"
        task["completed_at"] = iso_z(utc_now())
        for k in ("claimed_by", "lease_expires_at", "claimed_at"):
            task.pop(k, None)
        state["tasks"] = tasks
        atomic_write_state(root, state)
    finally:
        release_lock(lockdir)

    append_progress(root, f"COMPLETE [{args.id}]")
    out = {"ok": True, "root": str(root), "task_id": args.id}
    if args.json:
        print(json.dumps(out, ensure_ascii=False))
    else:
        print(f"OK: completed {args.id}")
    return 0


def cmd_renew(args: argparse.Namespace) -> int:
    root = resolve_root(args.root)
    ensure_initialized(root)
    worker_id = (args.worker_id or os.environ.get("HARNESS_WORKER_ID") or "").strip()
    if not worker_id:
        raise ValueError("missing worker id (use --worker-id or HARNESS_WORKER_ID)")

    lockdir = lockdir_for_root(root)
    acquire_lock(lockdir)
    try:
        state = load_state(root)
        tasks_raw = state.get("tasks") or []
        if not isinstance(tasks_raw, list):
            raise ValueError("tasks must be a list")
        tasks: list[dict[str, Any]] = [t for t in tasks_raw if isinstance(t, dict)]

        task = next((t for t in tasks if str(t.get("id") or "") == args.id), None)
        if task is None:
            raise ValueError(f"task not found: {args.id}")
        if str(task.get("status") or "") != "in_progress":
            raise ValueError(f"task not in_progress: {args.id}")

        claimed_by = str(task.get("claimed_by") or "").strip()
        if claimed_by and claimed_by != worker_id:
            raise ValueError(f"task owned by other worker: claimed_by={claimed_by}")

        lease_seconds = int(args.lease_seconds)
        exp = iso_z(utc_now() + dt.timedelta(seconds=lease_seconds)) if lease_seconds > 0 else None
        task["claimed_by"] = worker_id
        if exp:
            task["lease_expires_at"] = exp

        state["tasks"] = tasks
        atomic_write_state(root, state)
    finally:
        release_lock(lockdir)

    append_progress(root, f"RENEW [{args.id}] worker={worker_id}{(' exp=' + exp) if exp else ''}")
    out = {"ok": True, "root": str(root), "task_id": args.id, "worker_id": worker_id, "lease_expires_at": exp}
    if args.json:
        print(json.dumps(out, ensure_ascii=False))
    else:
        print(f"OK: renewed {args.id}")
    return 0


def cmd_fail(args: argparse.Namespace) -> int:
    root = resolve_root(args.root)
    ensure_initialized(root)

    lockdir = lockdir_for_root(root)
    acquire_lock(lockdir)
    try:
        state = load_state(root)
        tasks_raw = state.get("tasks") or []
        if not isinstance(tasks_raw, list):
            raise ValueError("tasks must be a list")
        tasks: list[dict[str, Any]] = [t for t in tasks_raw if isinstance(t, dict)]

        task = next((t for t in tasks if str(t.get("id") or "") == args.id), None)
        if task is None:
            raise ValueError(f"task not found: {args.id}")

        task["status"] = "failed"
        task["attempts"] = task_attempts(task) + 1
        msg = args.error.strip() if args.error else "[FAILED]"
        log = task.get("error_log")
        if isinstance(log, list):
            log.append(msg)
        else:
            task["error_log"] = [msg]
        for k in ("claimed_by", "lease_expires_at", "claimed_at"):
            task.pop(k, None)
        state["tasks"] = tasks
        atomic_write_state(root, state)
    finally:
        release_lock(lockdir)

    append_progress(root, f"FAIL [{args.id}] {args.error.strip() if args.error else ''}".rstrip())
    out = {"ok": True, "root": str(root), "task_id": args.id}
    if args.json:
        print(json.dumps(out, ensure_ascii=False))
    else:
        print(f"OK: failed {args.id}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="harness", add_help=True)
    p.add_argument("--root", help="harness state root (default: HARNESS_STATE_ROOT or cwd)")
    p.add_argument("--json", action="store_true", help="machine-readable JSON output")

    sub = p.add_subparsers(dest="cmd", required=True)

    s_init = sub.add_parser("init", help="initialize harness files in root")
    s_init.set_defaults(fn=cmd_init)

    s_status = sub.add_parser("status", help="print task summary and next eligible task")
    s_status.set_defaults(fn=cmd_status)

    s_add = sub.add_parser("add", help="add a pending task")
    s_add.add_argument("--id", help="task id (default: auto task-XXX)")
    s_add.add_argument("--title", required=True, help="task title")
    s_add.add_argument("--priority", default="P1", help="P0|P1|P2 (default: P1)")
    s_add.add_argument("--depends-on", action="append", dest="depends_on", help="dependency task id (repeatable)")
    s_add.add_argument("--validation", default="", help="validation command (recommended)")
    s_add.add_argument("--timeout-seconds", type=int, default=300, help="validation timeout seconds")
    s_add.add_argument("--max-attempts", type=int, default=3, help="max attempts (default: 3)")
    s_add.set_defaults(fn=cmd_add)

    s_claim = sub.add_parser("claim", help="claim next eligible task")
    s_claim.add_argument("--worker-id", help="worker identity (or HARNESS_WORKER_ID)")
    s_claim.add_argument("--lease-seconds", type=int, default=1800, help="lease seconds (concurrent mode)")
    s_claim.set_defaults(fn=cmd_claim)

    s_renew = sub.add_parser("renew", help="renew lease for an in_progress task (concurrent mode)")
    s_renew.add_argument("id", help="task id")
    s_renew.add_argument("--worker-id", help="worker identity (or HARNESS_WORKER_ID)")
    s_renew.add_argument("--lease-seconds", type=int, default=1800, help="lease seconds")
    s_renew.set_defaults(fn=cmd_renew)

    s_complete = sub.add_parser("complete", help="mark task completed")
    s_complete.add_argument("id", help="task id")
    s_complete.set_defaults(fn=cmd_complete)

    s_fail = sub.add_parser("fail", help="mark task failed")
    s_fail.add_argument("id", help="task id")
    s_fail.add_argument("--error", default="", help="error message to append to error_log")
    s_fail.set_defaults(fn=cmd_fail)

    return p


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.fn(args))
    except Exception as e:
        if getattr(args, "json", False):
            print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
        else:
            sys.stderr.write(f"ERROR: {e}\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
