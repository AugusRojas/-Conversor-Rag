from __future__ import annotations

import re
from dataclasses import dataclass

HEADING_PATTERNS = [
    re.compile(r"^(T[ÍI]TULO|CAP[ÍI]TULO|SECCI[ÓO]N|LIBRO)\b", re.IGNORECASE),
    re.compile(r"^(ART[ÍI]CULO|ART\.)\s+\d+", re.IGNORECASE),
    re.compile(r"^(DISPOSICIONES|CONSIDERANDO|RESUELVE|ANEXO)\b", re.IGNORECASE),
]

MAX_CHARS_PER_CHUNK = 3800
CHUNK_OVERLAP = 400


@dataclass
class Section:
    title: str
    body: list[str]


def split_into_sections(text: str) -> list[Section]:
    lines = [line.strip() for line in text.splitlines()]
    sections: list[Section] = []
    current_title = "Documento"
    current_body: list[str] = []

    for line in lines:
        if not line:
            if current_body and current_body[-1] != "":
                current_body.append("")
            continue

        if _is_heading(line):
            if current_body:
                sections.append(Section(title=current_title, body=current_body))
            current_title = line
            current_body = []
        else:
            current_body.append(line)

    if current_body:
        sections.append(Section(title=current_title, body=current_body))

    return sections


def chunk_section(
    section: Section,
    max_chars: int = MAX_CHARS_PER_CHUNK,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    paragraphs = _collapse_paragraphs(section.body)
    chunks: list[str] = []
    current: list[str] = []
    current_chars = 0

    for paragraph in paragraphs:
        paragraph_chars = len(paragraph)
        separator_chars = 2 if current else 0
        if current and current_chars + separator_chars + paragraph_chars > max_chars:
            chunk_text = "\n\n".join(current).strip()
            chunks.append(chunk_text)
            overlap_text = chunk_text[-overlap:].strip()
            current = [overlap_text] if overlap_text else []
            current_chars = len(overlap_text)

        current.append(paragraph)
        current_chars += (2 if len(current) > 1 else 0) + paragraph_chars

    if current:
        chunks.append("\n\n".join(current).strip())

    return chunks


def _is_heading(line: str) -> bool:
    if any(pattern.search(line) for pattern in HEADING_PATTERNS):
        return True
    if line.isupper() and len(line) <= 80:
        return True
    return False


def _collapse_paragraphs(lines: list[str]) -> list[str]:
    paragraphs: list[str] = []
    buffer: list[str] = []
    for line in lines:
        if not line:
            if buffer:
                paragraphs.append(" ".join(buffer))
                buffer = []
            continue
        buffer.append(line)

    if buffer:
        paragraphs.append(" ".join(buffer))

    return paragraphs
