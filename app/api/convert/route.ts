import { NextResponse } from "next/server";

import { extractTextWithDiagnostics } from "@/lib/extractors";
import { buildMarkdown } from "@/lib/markdown";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("document");

  const validFiles = files.filter((item) => item instanceof File) as File[];
  if (validFiles.length === 0) {
    return NextResponse.json({ error: "No se seleccionó ningún archivo." }, { status: 400 });
  }
  if (validFiles.length > 5) {
    return NextResponse.json(
      { error: "Máximo 5 archivos por carga." },
      { status: 400 }
    );
  }

  try {
    const results = [];
    for (const file of validFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = file.name || "documento";
      const { text, diagnostics } = await extractTextWithDiagnostics(buffer, filename);
      const markdown = buildMarkdown(text, filename);
      results.push({ filename, markdown, diagnostics });
    }
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al convertir el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
