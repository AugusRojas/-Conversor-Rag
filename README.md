# Legal Docling

Conversor de documentos jurídicos (PDF, DOCX, TXT, HTML) a **Markdown** con **chunking semántico**. La idea es generar un Markdown limpio y segmentado por secciones (títulos, capítulos, artículos, etc.) y, cuando no hay encabezados, cortar por párrafos manteniendo la coherencia.

## Características

- Extracción de texto desde PDF/DOCX/TXT/HTML.
- Detección de encabezados legales típicos (TÍTULO, CAPÍTULO, ARTÍCULO, SECCIÓN, etc.).
- Chunking por sección y por tamaño máximo de palabras.
- Salida en Markdown con metadatos y separadores de chunks.
- Interfaz web en Next.js para subir documentos y descargar el Markdown.

## Instalación

### Backend (CLI)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

### Web (Next.js)

```bash
npm install
```

## Uso (CLI)

```bash
legal-docling ./documento.pdf -o salida.md
```

También puedes usar el módulo directamente:

```bash
python -m legal_docling.cli ./documento.docx -o salida.md
```

## Uso (Web)

```bash
npm run dev
```

Luego abre `http://localhost:3000` en tu navegador.

## Notas

- Si el documento no tiene encabezados claros, el chunking se hace por párrafos manteniendo límites de palabras.
- La extracción de PDF puede variar según el documento.
