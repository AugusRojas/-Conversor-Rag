"use client";

import { useState } from "react";

const supported = [".pdf", ".docx", ".txt", ".md", ".html", ".htm"].join(", ");

export default function HomePage() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMarkdown(null);

    const formData = new FormData(event.currentTarget);
    const file = formData.get("document") as File | null;
    if (!file || file.size === 0) {
      setError("No se seleccionó ningún archivo.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Error al convertir el archivo.");
      }
      const payload = await response.json();
      setMarkdown(payload.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const downloadMarkdown = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "documento.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyMarkdown = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    alert("Markdown copiado al portapapeles.");
  };

  return (
    <main>
      <header>
        <h1>Legal Docling</h1>
        <p>Convierte PDFs y documentos jurídicos a Markdown con segmentación semántica.</p>
      </header>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="document">Selecciona un archivo</label>
          <input
            id="document"
            name="document"
            type="file"
            accept={supported}
            required
          />
          <p className="hint">Formatos soportados: {supported}</p>
          <button type="submit" disabled={loading}>
            {loading ? "Convirtiendo..." : "Convertir a Markdown"}
          </button>
        </form>

        {error && (
          <div className="output">
            <h2>Error</h2>
            <p className="hint">{error}</p>
          </div>
        )}

        {markdown && (
          <div className="output">
            <h2>Resultado</h2>
            <textarea value={markdown} readOnly />
            <div>
              <button type="button" onClick={downloadMarkdown}>
                Descargar Markdown
              </button>
              <button type="button" className="secondary" onClick={copyMarkdown}>
                Copiar
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
