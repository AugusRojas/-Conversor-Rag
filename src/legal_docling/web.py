from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

from flask import Flask, render_template, request
from werkzeug.utils import secure_filename

from .extractors import SUPPORTED_EXTENSIONS, extract_text
from .markdown import build_markdown

app = Flask(__name__)


@app.get("/")
def index() -> str:
    return render_template(
        "index.html",
        markdown_output=None,
        supported=", ".join(sorted(SUPPORTED_EXTENSIONS)),
    )


@app.post("/convert")
def convert() -> str:
    uploaded = request.files.get("document")
    if uploaded is None or uploaded.filename == "":
        return render_template(
            "index.html",
            markdown_output="No se seleccionó ningún archivo.",
            supported=", ".join(sorted(SUPPORTED_EXTENSIONS)),
        )

    filename = secure_filename(uploaded.filename)
    suffix = Path(filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        uploaded.save(tmp.name)
        temp_path = Path(tmp.name)

    try:
        text = extract_text(temp_path)
        markdown_output = build_markdown(text, source_name=filename)
    finally:
        temp_path.unlink(missing_ok=True)

    return render_template(
        "index.html",
        markdown_output=markdown_output,
        supported=", ".join(sorted(SUPPORTED_EXTENSIONS)),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Web UI para Legal Docling.")
    parser.add_argument("--host", default="0.0.0.0", help="Host de la aplicación")
    parser.add_argument("--port", default=8000, type=int, help="Puerto de la aplicación")
    parser.add_argument("--debug", action="store_true", help="Habilitar modo debug")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
