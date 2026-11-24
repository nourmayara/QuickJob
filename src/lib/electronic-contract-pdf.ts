import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Contract = { reference: string; content: string; party: string; acceptedAt: Date | null };
type TableRow = [label: string, value: string];

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 44;
const width = pageWidth - 2 * margin;
const bottom = pageHeight - 66;
const ink = "0.08 0.15 0.25";
const muted = "0.28 0.35 0.43";
const navy = "0.08 0.19 0.35";
const pale = "0.96 0.97 0.98";
const line = "0.86 0.89 0.92";
const yellow = "0.94 0.83 0.44";
const bodySize = 10.5;
const leading = 13.5;
const signatureHeight = 126;

const winAnsi = new Map(Array.from("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ").map((char, index) =>
  [char, [128, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 142, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 158, 159][index]],
));

function pdfText(value: string) {
  const bytes = Array.from(value, char => {
    const code = char.charCodeAt(0);
    if (char === "\u202f" || char === "\u2009" || char === "\t") return 32;
    return winAnsi.get(char) ?? (code >= 32 && code <= 255 ? code : 63);
  });
  return Buffer.from(bytes).toString("hex");
}

function exactText(value: string) {
  return "feff" + Buffer.from(value, "utf16le").swap16().toString("hex");
}

function measure(value: string, size: number) {
  let units = 0;
  for (const char of value.normalize("NFD").replace(/\p{Mark}/gu, "")) {
    if ("ilI!.,:;'’| ".includes(char)) units += 0.31;
    else if ("MW@%Œœ—".includes(char)) units += 0.95;
    else if ("mwQGO".includes(char)) units += 0.84;
    else units += /[A-Z]/.test(char) ? 0.73 : 0.59;
  }
  return units * size;
}

function wrap(value: string, maxWidth: number, size: number) {
  return value.replaceAll("\r\n", "\n").split("\n").flatMap(paragraph => {
    const lines: string[] = [];
    let rest = paragraph;
    while (measure(rest, size) > maxWidth) {
      let current = "";
      for (const char of rest) {
        if (measure(current + char, size) > maxWidth) break;
        current += char;
      }
      if (!current) break;
      const space = current.lastIndexOf(" ");
      const end = space > 0 ? space + 1 : current.length;
      lines.push(rest.slice(0, end));
      rest = rest.slice(end);
    }
    return [...lines, rest];
  });
}

function readSnapshot(content: string) {
  const fields = content.replaceAll("\r\n", "\n").split("\n\n");
  const [title, reference, parties, mission] = fields;
  const [location, schedule, pay, rate, fees, obligations, cancellation, validation] = fields.slice(-8);
  if (fields.length < 13 || !title.startsWith("QuickJob · Contrat électronique") ||
      !reference.startsWith("Référence ") || !parties.startsWith("Parties — ") || !mission.startsWith("Mission #") ||
      !location.startsWith("Lieu — ") || !schedule.endsWith("(heure de Tunis)") ||
      !pay.startsWith("Rémunération du travailleur — ") || !rate.startsWith("Taux contractuel — ") ||
      !(fees.startsWith("Frais de service — ") || fees.startsWith("Les frais de service sont à la charge du recruteur.")) ||
      !obligations.startsWith("QuickJob coordonne") || !cancellation.startsWith("Une annulation") ||
      !validation.startsWith("Le Check-out")) return null;
  return { title, reference, parties, mission, description: fields.slice(4, -8).join("\n\n"),
    location, schedule, pay, rate, fees, obligations, cancellation, validation };
}

function splitRow(value: string): TableRow {
  const separator = value.indexOf(" — ");
  return [value.slice(0, separator), value.slice(separator + 3)];
}

const acceptanceDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long", timeStyle: "short", timeZone: "Africa/Tunis",
});

export async function electronicContractPdf(contract: Contract, status: string) {
  const logo = await readFile(path.join(process.cwd(), "public", "images", "quickjob-logo-contract.jpg"));
  const snapshot = readSnapshot(contract.content);
  const contractTitle = snapshot?.title ?? "Contrat électronique QuickJob";
  const reference = snapshot?.reference ?? `Référence ${contract.reference}`;
  const partyLine = snapshot?.parties ?? contract.content.split(/\r?\n/).find(text => text.startsWith("Parties — "));
  const signer = partyLine?.match(/^Parties — QuickJob et (.*) \([^()]*\) · (?:RECRUTEUR|TRAVAILLEUR)$/u)?.[1];
  const role = contract.party === "RECRUTEUR" ? "Recruteur" : contract.party === "TRAVAILLEUR" ? "Travailleur" : contract.party;
  const pages: string[][] = [];
  let page: string[];
  let y = 0;

  function text(value: string, x: number, top: number, size = 10.5, bold = false, color = ink) {
    if (!value) return;
    page.push(`/Span << /ActualText <${exactText(value)}> >> BDC BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${x} ${pageHeight - top} Tm <${pdfText(value)}> Tj ET EMC`);
  }

  function rectangle(x: number, top: number, w: number, h: number, color: string) {
    page.push(`${color} rg ${x} ${pageHeight - top - h} ${w} ${h} re f`);
  }

  function newPage() {
    page = [];
    pages.push(page);
    rectangle(margin, 39, width, 2, navy);
    rectangle(margin, 39, 38, 2, yellow);
    if (pages.length === 1) {
      const logoDisplayWidth = 94;
      const logoDisplayHeight = logoDisplayWidth * logoHeight / logoWidth;
      page.push(`q ${logoDisplayWidth} 0 0 ${logoDisplayHeight} ${margin} ${pageHeight - 48 - logoDisplayHeight} cm /Logo Do Q`);
      text(role.toLocaleUpperCase("fr"), margin + 135, 71, 9, true, muted);
      const titles = wrap(contractTitle, width, 19);
      titles.forEach((title, index) => text(title, margin, 108 + index * 23, 19, true, navy));
      const refY = 108 + (titles.length - 1) * 23;
      text(reference, margin, refY + 20, 9.5, false, muted);
      y = refY + 36;
    } else {
      text("QuickJob · Contrat électronique", margin, 63, 10, true, navy);
      y = 88;
    }
  }

  function reserve(height: number) {
    if (y + height > bottom) newPage();
  }

  function heading(number: string, label: string) {
    reserve(52);
    rectangle(margin, y - 11, 24, 19, pale);
    text(number, margin + 5, y + 2, 9, true, navy);
    text(label, margin + 34, y + 2, 12, true, navy);
    y += 21;
  }

  function paragraph(value: string) {
    for (const textLine of wrap(value, width, bodySize)) {
      reserve(14);
      text(textLine, margin, y);
      y += leading;
    }
    y += 6;
  }

  function table(rows: TableRow[]) {
    const labelWidth = 183;
    for (const [index, [label, value]] of rows.entries()) {
      const labels = wrap(label, labelWidth - 22, 10);
      const values = wrap(value, width - labelWidth - 22, 10.5);
      const count = Math.max(labels.length, values.length);
      const height = count * 14 + 8;
      if (height <= bottom - 88) reserve(height);
      for (let i = 0; i < count; i++) {
        const first = i === 0 ? 4 : 0;
        const last = i === count - 1 ? 4 : 0;
        const rowHeight = 14 + first + last;
        reserve(rowHeight);
        if (index % 2 === 0) rectangle(margin, y, width, rowHeight, pale);
        if (i === 0) rectangle(margin, y, width, 0.55, line);
        text(labels[i] ?? "", margin + 11, y + first + 11, 10, true, muted);
        text(values[i] ?? "", margin + labelWidth + 11, y + first + 11);
        y += rowHeight;
      }
    }
    rectangle(margin, y, width, 0.55, line);
    y += 13;
  }

  newPage();
  if (snapshot) {
    heading("01", "Parties contractantes");
    paragraph(snapshot.parties);
    heading("02", "Informations sur la mission");
    table([["Mission", snapshot.mission], splitRow(snapshot.location), ["Horaires", snapshot.schedule]]);
    paragraph(snapshot.description);
    heading("03", "Conditions financières");
    const fees = snapshot.fees.split(". Total recruteur — ");
    const amounts = [splitRow(snapshot.pay), splitRow(snapshot.rate)];
    if (fees.length === 2) amounts.push(splitRow(fees[0] + "."), ["Total recruteur", fees[1]]);
    table(amounts);
    if (fees.length !== 2) paragraph(snapshot.fees);
    const closingHeight = 42 + signatureHeight +
      [snapshot.obligations, snapshot.cancellation, snapshot.validation].reduce(
        (height, clause) => height + wrap(clause, width, bodySize).length * leading + 6, 0,
      );
    if (pages.length > 1 && closingHeight <= bottom - 88) reserve(closingHeight);
    heading("04", "Conditions et obligations");
    paragraph(snapshot.obligations);
    heading("05", "Validation, paiement, annulation et litige");
    paragraph(snapshot.cancellation);
    paragraph(snapshot.validation);
  } else {
    heading("01", "Texte du contrat");
    paragraph(contract.content);
  }

  reserve(signatureHeight);
  heading(snapshot ? "06" : "02", "Signature électronique");
  table([
    ["Signataire", signer ?? "Non renseigné dans le contrat"],
    ["Rôle", role],
    ["Statut du contrat", status],
    ["Date d’acceptation", contract.acceptedAt ? `${acceptanceDate.format(contract.acceptedAt)} (heure de Tunis)` : "—"],
  ]);

  const pageCount = pages.length;
  pages.forEach((commands, index) => {
    page = commands;
    rectangle(margin, pageHeight - 49, width, 0.55, line);
    text(reference, margin, pageHeight - 32, 8.5, false, muted);
    const pageLabel = `Page ${index + 1} / ${pageCount}`;
    text(pageLabel, pageWidth - margin - measure(pageLabel, 8.5), pageHeight - 32, 8.5, false, muted);
  });
  return writePdf(pages, logo);
}

const logoWidth = 360;
const logoHeight = 158;

function writePdf(pages: string[][], logo: Buffer) {
  const pageIds = pages.map((_page, index) => 6 + index * 2);
  const objects: (string | Buffer)[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logoWidth} /Height ${logoHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`),
      logo, Buffer.from("\nendstream"),
    ]),
  ];
  for (const [index, commands] of pages.entries()) {
    const stream = commands.join("\n") + "\n";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Logo 5 0 R >> >> /Contents ${pageIds[index] + 1} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
    );
  }
  const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  let position = chunks[0].length;
  const offsets = ["0000000000 65535 f \n"];
  objects.forEach((object, index) => {
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), Buffer.from(object), Buffer.from("\nendobj\n")]);
    chunks.push(chunk);
    offsets.push(`${String(position).padStart(10, "0")} 00000 n \n`);
    position += chunk.length;
  });
  chunks.push(Buffer.from(`xref\n0 ${offsets.length}\n${offsets.join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`));
  return new Uint8Array(Buffer.concat(chunks));
}

