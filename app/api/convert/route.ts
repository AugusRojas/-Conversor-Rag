import { NextResponse } from "next/server";

import { extractText } from "@/lib/extractors";
import { buildMarkdown } from "@/lib/markdown";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("document");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No se seleccionó ningún archivo." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const text = await extractText(buffer, file.name || "documento");
    const markdown = buildMarkdown(text, file.name || "documento");
    return NextResponse.json({ markdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al convertir el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
