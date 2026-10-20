from typing import TypedDict


class Lesson(TypedDict):
    file: str
    title: str
    is_read: bool
    is_examinated: bool | None
    practice_completed: bool | None


class Index(TypedDict):
    title: str
    goal: str
    exam: str
    lessons: list[Lesson]


class Progress(TypedDict):
    done: int
    total: int


class CourseSummary(Progress):
    id: str
    title: str
    goal: str
    lessons: list[Lesson]


class LessonContent(TypedDict):
    body: str
    practice: str | None
