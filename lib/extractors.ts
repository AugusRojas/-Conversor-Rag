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

export type ExtractionDiagnostics = {
  parser: "pdf-parse" | "ocr" | "plain";
  ocrUsed: boolean;
  ocrLanguage?: string;
  notes: string[];
};

export type ExtractionResult = {
  text: string;
  diagnostics: ExtractionDiagnostics;
};

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const result = await extractTextWithDiagnostics(buffer, filename);
  return result.text;
}

export async function extractTextWithDiagnostics(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult> {
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
    return {
      text: await extractDocx(buffer),
      diagnostics: { parser: "plain", ocrUsed: false, notes: ["Extracción DOCX nativa."] }
    };
  }
  if (extension === ".html" || extension === ".htm") {
    return {
      text: extractHtml(buffer.toString("utf-8")),
      diagnostics: { parser: "plain", ocrUsed: false, notes: ["Extracción HTML nativa."] }
    };
  }

  return {
    text: buffer.toString("utf-8"),
    diagnostics: { parser: "plain", ocrUsed: false, notes: ["Lectura directa de texto."] }
  };
}

function getExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const data = await pdfParse(buffer);
    const extracted = data.text.trim();
    if (shouldRunOcr(extracted, data.numpages)) {
      const ocrResult = await extractPdfWithOcr(buffer);
      if (ocrResult.text) {
        return {
          text: [extracted, ocrResult.text].filter(Boolean).join("\n\n").trim(),
          diagnostics: {
            parser: "pdf-parse",
            ocrUsed: true,
            ocrLanguage: ocrResult.language,
            notes: ["pdf-parse devolvió poco texto, se complementó con OCR.", ...ocrResult.notes]
          }
        };
      }
      return {
        text: extracted,
        diagnostics: {
          parser: "pdf-parse",
          ocrUsed: false,
          notes: [
            "pdf-parse devolvió poco texto, pero OCR no pudo ejecutarse o no devolvió contenido.",
            ...ocrResult.notes
          ]
        }
      };
    }
    return {
      text: extracted,
      diagnostics: {
        parser: "pdf-parse",
        ocrUsed: false,
        notes: ["Extracción PDF nativa exitosa. OCR no fue necesario."]
      }
    };
  } catch (error) {
    console.warn("Fallo pdf-parse, se intentará OCR directo.", error);

    const ocrResult = await extractPdfWithOcr(buffer);
    if (ocrResult.text) {
      return {
        text: ocrResult.text,
        diagnostics: {
          parser: "ocr",
          ocrUsed: true,
          ocrLanguage: ocrResult.language,
          notes: ["pdf-parse falló, se resolvió con OCR directo.", ...ocrResult.notes]
        }
      };
    }

    throw new Error(
      "No se pudo extraer texto del PDF. El parser falló y OCR no devolvió contenido. Verifica si el PDF está dañado o instala OCR (tesseract + pdftoppm)."
    );
  }
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

async function extractPdfWithOcr(
  buffer: Buffer
): Promise<{ text: string; language?: string; notes: string[] }> {
  if (!(await hasOcrTools())) {
    return { text: "", notes: ["No se detectaron herramientas OCR en PATH."] };
  }

  const workDir = await fs.mkdtemp(join(tmpdir(), "legal-docling-"));
  const pdfPath = join(workDir, "input.pdf");
  const outputPrefix = join(workDir, "page");
  const results: string[] = [];
  let detectedLanguage: string | undefined;

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
        results.push(ocrText.text);
      }
      if (ocrText?.language) {
        detectedLanguage = ocrText.language;
      }
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }

  return {
    text: results.join("\n\n").trim(),
    language: detectedLanguage,
    notes: results.length > 0 ? ["OCR ejecutado correctamente."] : ["OCR no devolvió texto."]
  };
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

async function runTesseract(
  imagePath: string,
  languages: string[]
): Promise<{ text: string; language?: string } | null> {
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
        return { text: stdout.trim(), language };
      }
    } catch (error) {
      console.warn(`OCR falló con idioma ${language}. Intentando fallback.`, error);
    }
  }
  return null;
}
