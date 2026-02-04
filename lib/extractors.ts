import type { Buffer } from "node:buffer";
import * as cheerio from "cheerio";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { createCanvas } from "canvas";
import { createWorker } from "tesseract.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

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
  const extracted = data.text.trim();
  if (shouldRunOcr(extracted, data.numpages)) {
    const ocrText = await extractPdfWithOcr(buffer);
    return [extracted, ocrText].filter(Boolean).join("\n\n").trim();
  }
  return extracted;
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

function shouldRunOcr(text: string, pages: number | undefined): boolean {
  if (!text) {
    return true;
  }
  if (!pages || pages <= 0) {
    return text.length < 200;
  }
  const avgCharsPerPage = text.length / pages;
  return avgCharsPerPage < 80;
}

async function extractPdfWithOcr(buffer: Buffer): Promise<string> {
  const pdf = await getDocument({ data: buffer }).promise;
  const worker = await createWorker("spa");
  const results: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context, viewport }).promise;

      const imageBuffer = canvas.toBuffer("image/png");
      const {
        data: { text }
      } = await worker.recognize(imageBuffer);
      if (text.trim()) {
        results.push(text.trim());
      }
    }
  } finally {
    await worker.terminate();
  }

  return results.join("\n\n").trim();
}
