import { NextResponse } from "next/server";
import * as pdfParse from "pdf-parse";

function detectDate(text: string) {
  const fullDate = text.match(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/);
  if (fullDate) return fullDate[0];

  const shortDate = text.match(/\b\d{1,2}\.\d{1,2}\b/);
  if (shortDate) return shortDate[0];

  if (/heute/i.test(text)) return "Heute";
  if (/morgen/i.test(text)) return "Morgen";

  return "Kein Datum";
}

function detectAmount(text: string) {
  const amount = text.match(/\b\d{1,4}[,.]\d{2}\s?€\b/);
  return amount ? amount[0] : "";
}

function detectCompany(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const companyLine = lines.find((line) =>
    /(gmbh|ag|kg|ug|firma|rechnung|kanzlei|praxis|service|handel|bau|holz)/i.test(
      line
    )
  );

  return companyLine || "Keine Firma";
}

function detectAction(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("rechnung")) return "Rechnung prüfen";
  if (lower.includes("mahnung")) return "Mahnung prüfen";
  if (lower.includes("angebot")) return "Angebot prüfen";
  if (lower.includes("termin")) return "Termin prüfen";
  if (lower.includes("vertrag")) return "Vertrag prüfen";
  if (lower.includes("bescheid")) return "Bescheid prüfen";

  return "Dokument prüfen";
}

function detectProject(text: string) {
  const lower = text.toLowerCase();

  if (
    lower.includes("rechnung") ||
    lower.includes("betrag") ||
    lower.includes("zahlung") ||
    lower.includes("iban")
  ) {
    return "Finanzen";
  }

  if (
    lower.includes("vertrag") ||
    lower.includes("bescheid") ||
    lower.includes("versicherung")
  ) {
    return "Dokumente";
  }

  if (lower.includes("termin") || lower.includes("datum")) {
    return "Termine";
  }

  return "Inbox";
}

function detectPriority(text: string) {
  const lower = text.toLowerCase();

  if (
    lower.includes("mahnung") ||
    lower.includes("frist") ||
    lower.includes("dringend") ||
    lower.includes("sofort")
  ) {
    return "Hoch";
  }

  if (
    lower.includes("rechnung") ||
    lower.includes("zahlung") ||
    lower.includes("termin")
  ) {
    return "Mittel";
  }

  return "Normal";
}

function createTitle(text: string, fileName: string, fileType: string) {
  const action = detectAction(text);
  const company = detectCompany(text);
  const amount = detectAmount(text);

  if (text.trim().length > 20) {
    if (company !== "Keine Firma" && amount) {
      return `${action}: ${company} (${amount})`;
    }

    if (company !== "Keine Firma") {
      return `${action}: ${company}`;
    }

    return action;
  }

  if (fileType.startsWith("image/")) return "Foto / Brief prüfen";

  return `Datei prüfen: ${
    fileName.length > 24 ? fileName.slice(0, 24) + "..." : fileName
  }`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const ocrText = String(formData.get("ocrText") || "");

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei erhalten." },
        { status: 400 }
      );
    }

    let extractedText = ocrText;

    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await (pdfParse as any)(buffer);
      extractedText = result.text || "";
    }

    const task = {
      title: createTitle(extractedText, file.name, file.type),
      project: detectProject(extractedText),
      priority: detectPriority(extractedText),
      date: detectDate(extractedText),
      time: "Keine Uhrzeit",
      person: "Keine Person",
      company: detectCompany(extractedText),
      location: "Kein Ort",
      action: detectAction(extractedText),
    };

    return NextResponse.json({
      task,
      extractedText,
      note:
        extractedText.trim().length > 20
          ? "Dokument wurde per OCR/Textanalyse ausgewertet."
          : "Datei empfangen, aber kein verwertbarer Text erkannt.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Analyse fehlgeschlagen.",
        detail: String(error),
      },
      { status: 500 }
    );
  }
}