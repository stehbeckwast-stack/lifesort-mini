import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

function findDate(text: string) {
  const fullDate = text.match(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/);
  if (fullDate) return fullDate[0];

  const shortDate = text.match(/\b\d{1,2}\.\d{1,2}\b/);
  if (shortDate) return shortDate[0];

  const lower = text.toLowerCase();

  if (lower.includes("heute")) return "Heute";
  if (lower.includes("morgen")) return "Morgen";
  if (lower.includes("montag")) return "Montag";
  if (lower.includes("dienstag")) return "Dienstag";
  if (lower.includes("mittwoch")) return "Mittwoch";
  if (lower.includes("donnerstag")) return "Donnerstag";
  if (lower.includes("freitag")) return "Freitag";
  if (lower.includes("samstag")) return "Samstag";
  if (lower.includes("sonntag")) return "Sonntag";

  return "Kein Datum";
}

function findTime(text: string) {
  const time = text.match(/\b([0-2]?\d[:.]?\d{0,2})\s*uhr\b/i);
  if (!time) return "Keine Uhrzeit";

  return `${time[1].replace(".", ":")} Uhr`;
}

function findLocation(text: string) {
  const knownLocations = [
    "Dorfen",
    "Schwindegg",
    "Wasentegernbach",
    "Boldenkow",
    "Kreta",
    "Erding",
    "München",
    "Pleiskirchen",
    "Walpertskirchen",
    "Landshut",
    "Mühldorf",
    "Altötting",
    "Taufkirchen",
    "Bergham",
    "Daheim",
    "Vilsbiburg",
  ];

  for (const loc of knownLocations) {
    if (text.toLowerCase().includes(loc.toLowerCase())) return loc;
  }

  const pattern = text.match(/\b(?:in|nach|bei|auf)\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]+)/);
  if (pattern?.[1]) return pattern[1];

  return "Kein Ort";
}

function findAction(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("rechnung")) return "Rechnung prüfen";
  if (lower.includes("angebot")) return "Angebot prüfen";
  if (lower.includes("baustelle")) return "Baustelle prüfen";
  if (lower.includes("termin")) return "Termin";
  if (lower.includes("anrufen") || lower.includes("rückruf")) return "Telefonat";
  if (lower.includes("zahlung") || lower.includes("bezahlen")) return "Zahlung";
  if (lower.includes("brief")) return "Brief prüfen";

  return "Datei prüfen";
}

function findProject(text: string, action: string) {
  const lower = text.toLowerCase();

  if (lower.includes("rechnung") || lower.includes("angebot") || lower.includes("zahlung")) {
    return "Büro";
  }

  if (lower.includes("baustelle") || lower.includes("haus")) {
    return "Haus";
  }

  if (lower.includes("arzt") || lower.includes("urlaub") || lower.includes("privat")) {
    return "Privat";
  }

  if (action === "Rechnung prüfen") return "Büro";

  return "Inbox";
}

function findPriority(text: string) {
  const lower = text.toLowerCase();

  if (
    lower.includes("dringend") ||
    lower.includes("mahnung") ||
    lower.includes("fällig") ||
    lower.includes("sofort")
  ) {
    return "Hoch";
  }

  if (
    lower.includes("rechnung") ||
    lower.includes("termin") ||
    lower.includes("zahlbar") ||
    lower.includes("bis")
  ) {
    return "Mittel";
  }

  return "Normal";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei erhalten." },
        { status: 400 }
      );
    }

    let extractedText = "";
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();

    if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parser = new PDFParse({ data: buffer });
const pdfData = await parser.getText();
extractedText = pdfData.text || "";
await parser.destroy();
    }

    const analysisBase = `${fileName}\n${extractedText}`;
    const action = findAction(analysisBase);
    const project = findProject(analysisBase, action);
    const priority = findPriority(analysisBase);
    const date = findDate(analysisBase);
    const time = findTime(analysisBase);
    const location = findLocation(analysisBase);

    let title = `Datei prüfen: ${fileName}`;

    if (action === "Rechnung prüfen") {
      title = `Rechnung prüfen: ${fileName}`;
    }

    if (action === "Zahlung") {
      title = `Zahlung prüfen: ${fileName}`;
    }

    if (action === "Termin") {
      title = `Termin aus Datei prüfen: ${fileName}`;
    }

    if (action === "Baustelle prüfen") {
      title = `Baustellenunterlage prüfen: ${fileName}`;
    }

    return NextResponse.json({
      task: {
        title,
        project,
        priority,
        date,
        time,
        person: "Keine Person",
        company: "Keine Firma",
        location,
        action,
      },
      extractedText: extractedText.slice(0, 2000),
      note: extractedText
        ? "PDF wurde ausgelesen und analysiert."
        : "Datei wurde empfangen. Für Bilder ist OCR noch nicht aktiviert.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Analyse fehlgeschlagen.",
        details: String(error),
      },
      { status: 500 }
    );
  }
}