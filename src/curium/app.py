from collections.abc import Callable
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from curium import courses, storage

STATIC = Path(__file__).parent / "static"

app = FastAPI()


def or_not_found[**P, R](
    action: Callable[P, R], *args: P.args, **kwargs: P.kwargs
) -> R:
    try:
        return action(*args, **kwargs)
    except (FileNotFoundError, IndexError):
        raise HTTPException(404)


@app.get("/api/courses")
def list_courses():
    return courses.list_courses()


@app.get("/api/activity")
def get_activity():
    return courses.activity()


@app.get("/api/courses/{course}")
def get_course(course: str):
    index = or_not_found(storage.read_index, course)
    return {**index, **courses.progress(index)}


@app.get("/api/courses/{course}/lessons/{number}")
def get_lesson(course: str, number: int):
    return or_not_found(courses.read_lesson, course, number)


class ReadState(BaseModel):
    is_read: bool


@app.put("/api/courses/{course}/lessons/{number}/read")
def set_read(course: str, number: int, state: ReadState):
    or_not_found(courses.set_read, course, number, state.is_read)


app.mount("/files", StaticFiles(directory=storage.ROOT, check_dir=False))
app.mount("/static", StaticFiles(directory=STATIC))


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")
