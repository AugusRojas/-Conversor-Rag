from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from .chunker import Section, chunk_section, split_into_sections


@dataclass
class Chunk:
    title: str
    text: str


def build_markdown(text: str, source_name: str) -> str:
    sections = split_into_sections(text)
    chunks: list[Chunk] = []
    for section in sections:
        for chunk in chunk_section(section):
            chunks.append(Chunk(title=section.title, text=chunk))

    header = _build_header(source_name, len(chunks))
    body = "\n\n".join(_render_chunk(chunk) for chunk in chunks)
    return f"{header}\n\n{body}".strip()


def _build_header(source_name: str, total_chunks: int) -> str:
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    return (
        f"# Documento jurídico convertido\n\n"
        f"- Fuente: `{source_name}`\n"
        f"- Fecha de conversión: {timestamp}\n"
        f"- Total de chunks: {total_chunks}"
    )


def _render_chunk(chunk: Chunk) -> str:
    return (
        f"{chunk.title}\n\n"
        f"{chunk.text}\n\n"
        f"---"
    )
