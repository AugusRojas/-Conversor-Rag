from __future__ import annotations

import argparse
from pathlib import Path

from .extractors import extract_text
from .markdown import build_markdown


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convierte documentos jurídicos a Markdown con chunking semántico.")
    parser.add_argument("input", help="Ruta del archivo a convertir (PDF/DOCX/TXT/HTML).")
    parser.add_argument("-o", "--output", help="Ruta de salida del Markdown.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output) if args.output else input_path.with_suffix(".md")

    text = extract_text(input_path)
    markdown = build_markdown(text, source_name=input_path.name)
    output_path.write_text(markdown, encoding="utf-8")

    print(f"Markdown generado en: {output_path}")


if __name__ == "__main__":
    main()
