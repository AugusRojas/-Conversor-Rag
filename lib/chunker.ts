const headingPatterns = [
  /^(T[ÍI]TULO|CAP[ÍI]TULO|SECCI[ÓO]N|LIBRO)\b/i,
  /^(ART[ÍI]CULO|ART\.)\s+\d+/i,
  /^(DISPOSICIONES|CONSIDERANDO|RESUELVE|ANEXO)\b/i
];

export const MAX_WORDS_PER_CHUNK = 350;

export type Section = {
  title: string;
  body: string[];
};

export function splitIntoSections(text: string): Section[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const sections: Section[] = [];
  let currentTitle = "Documento";
  let currentBody: string[] = [];

  for (const line of lines) {
    if (!line) {
      if (currentBody.length > 0 && currentBody[currentBody.length - 1] !== "") {
        currentBody.push("");
      }
      continue;
    }

    if (isHeading(line)) {
      if (currentBody.length > 0) {
        sections.push({ title: currentTitle, body: currentBody });
      }
      currentTitle = line;
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentBody.length > 0) {
    sections.push({ title: currentTitle, body: currentBody });
  }

  return sections;
}

export function chunkSection(section: Section, maxWords = MAX_WORDS_PER_CHUNK): string[] {
  const paragraphs = collapseParagraphs(section.body);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    const paragraphWords = words.length;
    if (current.length > 0 && currentWords + paragraphWords > maxWords) {
      chunks.push(current.join("\n\n").trim());
      current = [];
      currentWords = 0;
    }

    current.push(paragraph);
    currentWords += paragraphWords;
  }

  if (current.length > 0) {
    chunks.push(current.join("\n\n").trim());
  }

  return chunks;
}

function isHeading(line: string): boolean {
  if (headingPatterns.some((pattern) => pattern.test(line))) {
    return true;
  }
  return line === line.toUpperCase() && line.length <= 80;
}

function collapseParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let buffer: string[] = [];

  for (const line of lines) {
    if (!line) {
      if (buffer.length > 0) {
        paragraphs.push(buffer.join(" "));
        buffer = [];
      }
      continue;
    }
    buffer.push(line);
  }

  if (buffer.length > 0) {
    paragraphs.push(buffer.join(" "));
  }

  return paragraphs;
}
