import type { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import * as cheerio from "cheerio";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

const execFileAsync = promisify(execFile);

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
    if (ocrText) {
      return [extracted, ocrText].filter(Boolean).join("\n\n").trim();
    }
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
  if (!(await hasOcrTools())) {
    return "";
  }

  const workDir = await fs.mkdtemp(join(tmpdir(), "legal-docling-"));
  const pdfPath = join(workDir, "input.pdf");
  const outputPrefix = join(workDir, "page");
  const results: string[] = [];

  try {
    await fs.writeFile(pdfPath, buffer);
    await execFileAsync("pdftoppm", ["-png", "-r", "300", "-gray", pdfPath, outputPrefix]);

    const files = (await fs.readdir(workDir))
      .filter((file) => file.startsWith("page-") && file.endsWith(".png"))
      .sort();

    for (const file of files) {
      const imagePath = join(workDir, file);
      const ocrText = await runTesseract(imagePath, ["spa", "eng"]);
      if (ocrText) {
        results.push(ocrText);
      }
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }

  return results.join("\n\n").trim();
}

async function hasOcrTools(): Promise<boolean> {
  try {
    await execFileAsync("tesseract", ["--version"]);
    await execFileAsync("pdftoppm", ["-h"]);
    return true;
  } catch (error) {
    console.warn(
      "OCR opcional no disponible. Instala tesseract y poppler (pdftoppm) para habilitarlo.",
      error
    );
    return false;
  }
}

async function runTesseract(imagePath: string, languages: string[]): Promise<string> {
  for (const language of languages) {
    try {
      const { stdout } = await execFileAsync("tesseract", [
        imagePath,
        "stdout",
        "-l",
        language,
        "--psm",
        "6"
      ]);
      if (stdout.trim()) {
        return stdout.trim();
      }
    } catch (error) {
      console.warn(`OCR falló con idioma ${language}. Intentando fallback.`, error);
    }
  }
  return "";
}
