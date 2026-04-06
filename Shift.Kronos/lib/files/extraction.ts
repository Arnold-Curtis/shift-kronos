import { getServerEnv } from "@/lib/env";
import { SupportedExtractionKind } from "@/lib/files/schemas";

type ExtractedFileText = {
  kind: SupportedExtractionKind;
  text: string | null;
};

function normalizeExtractedText(input: string) {
  return input.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim().slice(0, 50000);
}

function classifyExtraction(contentType: string) {
  const lower = contentType.toLowerCase();

  if (lower.startsWith("text/") || lower === "application/json") {
    return "text" as const;
  }

  if (lower === "application/pdf") {
    return "pdf" as const;
  }

  return "unsupported" as const;
}

async function extractPdfText(buffer: Buffer) {
  const env = getServerEnv();

  if (env.PHASE5_FAKE_PDF_EXTRACTION === "1") {
    return "Fake extracted PDF text for test mode.";
  }

  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return result.text;
}

export async function extractFileText(file: { contentType: string; buffer: Buffer }) : Promise<ExtractedFileText> {
  const kind = classifyExtraction(file.contentType);

  if (kind === "unsupported") {
    return {
      kind,
      text: null,
    };
  }

  if (kind === "text") {
    return {
      kind,
      text: normalizeExtractedText(file.buffer.toString("utf8")),
    };
  }

  const pdfText = await extractPdfText(file.buffer);

  return {
    kind,
    text: normalizeExtractedText(pdfText),
  };
}
