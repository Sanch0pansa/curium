from collections.abc import MutableMapping, Sequence
from typing import Any, override

from markdown_it import MarkdownIt
from markdown_it.common.utils import escapeHtml
from markdown_it.renderer import RendererHTML
from markdown_it.token import Token
from markdown_it.utils import OptionsDict
from mdit_py_plugins.dollarmath import dollarmath_plugin

from curium.models import LessonContent

PRACTICE_HEADING = "## Практика"


class MermaidRenderer(RendererHTML):
    @override
    def fence(
        self,
        tokens: Sequence[Token],
        idx: int,
        options: OptionsDict,
        env: MutableMapping[str, Any],
    ) -> str:
        token = tokens[idx]
        if token.info.strip() == "mermaid":
            return f'<pre class="mermaid">{escapeHtml(token.content)}</pre>\n'
        return super().fence(tokens, idx, options, env)


markdown = (
    MarkdownIt("commonmark", {"html": True}, renderer_cls=MermaidRenderer)
    .enable("table")
    .use(dollarmath_plugin)
)


def render_lesson(text: str) -> LessonContent:
    body, heading, practice = text.partition(PRACTICE_HEADING)
    return {
        "body": markdown.render(body),
        "practice": markdown.render(practice) if heading else None,
    }
