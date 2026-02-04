import type { Buffer } from "node:buffer";
import * as cheerio from "cheerio";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export const supportedExtensions = [".pdf", ".docx", ".txt", ".md", ".html", ".htm"];

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const extension = getExtension(filename);
  if (!supportedExtensions.includes(extension)) {
    throw new Error(
      `Extensión no soportada: ${extension}. Soportadas: ${supportedExtensions.join(", ")}`
    );
  }

  if (extension === ".pdf") {
    return extractPdf(buffer);
  }
  if (extension === ".docx") {
    return extractDocx(buffer);
  }
  if (extension === ".html" || extension === ".htm") {
    return extractHtml(buffer.toString("utf-8"));
  }

  return buffer.toString("utf-8");
}

function getExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text.trim();
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

function extractHtml(html: string): string {
  const $ = cheerio.load(html);
  $("script, style").remove();
  const text = $.root().text();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}
