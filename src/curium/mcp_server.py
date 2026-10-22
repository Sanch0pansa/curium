from typing import Literal, TypedDict

from mcp.server.mcpserver import MCPServer

from curium import storage
from curium.models import Index, Lesson

mcp = MCPServer("curium")


class LessonSpec(TypedDict):
    file: str
    title: str
    has_exam: bool
    has_practice: bool


@mcp.tool()
def create_course(
    course: str, title: str, goal: str, exam: str, lessons: list[LessonSpec]
) -> str:
    index = Index(
        title=title,
        goal=goal,
        exam=exam,
        lessons=[
            Lesson(
                file=lesson["file"],
                title=lesson["title"],
                is_read=False,
                is_examinated=False if lesson["has_exam"] else None,
                practice_completed=False if lesson["has_practice"] else None,
            )
            for lesson in lessons
        ],
    )
    storage.index_path(course).parent.mkdir(parents=True, exist_ok=True)
    storage.write_index(course, index)
    return f"courses/{course}/index.json"


@mcp.tool()
def set_lesson_status(
    course: str,
    lesson: int,
    field: Literal["is_read", "is_examinated", "practice_completed"],
    value: bool,
) -> Lesson:
    index = storage.read_index(course)
    index["lessons"][lesson - 1][field] = value
    storage.write_index(course, index)
    if value:
        storage.log_action(course, lesson, field)
    return index["lessons"][lesson - 1]


@mcp.tool()
def get_lesson_status(course: str, lesson: int) -> Lesson:
    return storage.read_index(course)["lessons"][lesson - 1]


if __name__ == "__main__":
    mcp.run()
