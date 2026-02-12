"use client";

import { useState } from "react";

const supported = [".pdf", ".docx", ".txt", ".md", ".html", ".htm"].join(", ");

export default function HomePage() {
  const [results, setResults] = useState<
    Array<{
      filename: string;
      markdown: string;
      diagnostics?: {
        parser: string;
        ocrUsed: boolean;
        ocrLanguage?: string;
        notes: string[];
      };
    }> | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResults(null);

    const formData = new FormData(event.currentTarget);
    const fileList = formData.getAll("document").filter((entry) => entry instanceof File) as File[];
    if (fileList.length === 0 || fileList.every((file) => file.size === 0)) {
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
      setResults(payload.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const downloadMarkdown = (filename: string, markdown: string) => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filename.replace(/\.[^/.]+$/, "")}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyMarkdown = async (markdown: string) => {
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
            multiple
            required
          />
          <p className="hint">
            Formatos soportados: {supported}. Máximo 5 archivos por carga.
          </p>
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

        {results && (
          <div className="output">
            <h2>Resultados</h2>
            {results.map((result) => (
              <div key={result.filename}>
                <h3>{result.filename}</h3>
                {result.diagnostics && (
                  <p className="hint">
                    Método: {result.diagnostics.parser}
                    {result.diagnostics.ocrUsed
                      ? ` | OCR: sí (${result.diagnostics.ocrLanguage ?? "desconocido"})`
                      : " | OCR: no"}
                    {result.diagnostics.notes.length > 0
                      ? ` | ${result.diagnostics.notes.join(" ")}`
                      : ""}
                  </p>
                )}
                <textarea value={result.markdown} readOnly />
                <div>
                  <button
                    type="button"
                    onClick={() => downloadMarkdown(result.filename, result.markdown)}
                  >
                    Descargar Markdown
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => copyMarkdown(result.markdown)}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
