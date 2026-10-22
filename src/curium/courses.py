from collections import Counter
from datetime import date, timedelta

from curium import storage
from curium.models import CourseSummary, Index, LessonContent, Progress
from curium.render import render_lesson


def progress(index: Index) -> Progress:
    states: list[bool] = []
    for lesson in index["lessons"]:
        states.append(lesson["is_read"])
        if lesson["is_examinated"] is not None:
            states.append(lesson["is_examinated"])
        if lesson["practice_completed"] is not None:
            states.append(lesson["practice_completed"])
    return Progress(done=sum(states), total=len(states))


def list_courses() -> list[CourseSummary]:
    summaries: list[CourseSummary] = []
    for course in storage.course_ids():
        index = storage.read_index(course)
        summaries.append(
            {
                "id": course,
                "title": index["title"],
                "goal": index["goal"],
                "lessons": index["lessons"],
                **progress(index),
            }
        )
    return summaries


def read_lesson(course: str, number: int) -> LessonContent:
    index = storage.read_index(course)
    file = index["lessons"][number]["file"]
    return render_lesson(storage.read_lesson_text(course, file))


def set_read(course: str, number: int, is_read: bool) -> None:
    index = storage.read_index(course)
    index["lessons"][number]["is_read"] = is_read
    storage.write_index(course, index)
    if is_read:
        storage.log_action(course, number + 1, "is_read")


def activity() -> dict[str, object]:
    days = Counter(str(entry["date"]) for entry in storage.read_history())
    day = date.today()
    if str(day) not in days:
        day -= timedelta(days=1)
    streak = 0
    while str(day) in days:
        streak += 1
        day -= timedelta(days=1)
    return {"days": days, "streak": streak}
