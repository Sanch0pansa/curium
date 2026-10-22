import json
from datetime import date
from pathlib import Path

from pydantic import TypeAdapter

from curium.models import Index

ROOT = Path(__file__).parents[2] / "courses"
HISTORY = ROOT / "history.jsonl"

index_adapter = TypeAdapter(Index)


def index_path(course: str) -> Path:
    return ROOT / course / "index.json"


def course_ids() -> list[str]:
    return [path.parent.name for path in sorted(ROOT.glob("*/index.json"))]


def read_index(course: str) -> Index:
    return index_adapter.validate_json(index_path(course).read_text())


def write_index(course: str, index: Index) -> None:
    with index_path(course).open("w") as file:
        json.dump(index, file, ensure_ascii=False, indent=2)


def read_lesson_text(course: str, file: str) -> str:
    return (ROOT / course / file).read_text()


def log_action(course: str, lesson: int, field: str) -> None:
    entry = {"date": date.today().isoformat(), "course": course, "lesson": lesson, "field": field}
    with HISTORY.open("a") as file:
        file.write(json.dumps(entry) + "\n")


def read_history() -> list[dict[str, str | int]]:
    if not HISTORY.exists():
        return []
    return [json.loads(line) for line in HISTORY.read_text().splitlines()]
