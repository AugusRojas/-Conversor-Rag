import { chunkSection, splitIntoSections } from "./chunker";

export type Chunk = {
  title: string;
  index: number;
  text: string;
};

export function buildMarkdown(text: string, sourceName: string): string {
  const sections = splitIntoSections(text);
  const chunks: Chunk[] = [];
  let chunkIndex = 1;

  for (const section of sections) {
    for (const chunk of chunkSection(section)) {
      chunks.push({ title: section.title, index: chunkIndex, text: chunk });
      chunkIndex += 1;
    }
  }

  const header = buildHeader(sourceName, chunks.length);
  const body = chunks.map(renderChunk).join("\n\n");
  return `${header}\n\n${body}`.trim();
}

function buildHeader(sourceName: string, totalChunks: number): string {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  return [
    "# Documento jurídico convertido",
    "",
    `- Fuente: \`${sourceName}\``,
    `- Fecha de conversión: ${timestamp}`,
    `- Total de chunks: ${totalChunks}`
  ].join("\n");
}

function renderChunk(chunk: Chunk): string {
  return [
    `## Chunk ${chunk.index}`,
    "",
    `**Sección:** ${chunk.title}`,
    "",
    chunk.text,
    "",
    "---"
  ].join("\n");
}
