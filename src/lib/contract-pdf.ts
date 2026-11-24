import "server-only";

export function contractPdf(content: string) {
  const lines = content.replaceAll("\r", "").split("\n").flatMap(line => {
    const wrapped: string[] = [];
    let remaining = line;
    while (remaining.length > 80) {
      const space = remaining.lastIndexOf(" ", 80);
      const cut = space > 0 ? space : 80;
      wrapped.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut).trimStart();
    }
    return [...wrapped, remaining];
  });
  const pageCount = Math.ceil(lines.length / 48);
  const pages = Array.from({ length: pageCount }, (_, index) => 4 + index * 2);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pageCount} /Kids [${pages.map(id => `${id} 0 R`).join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
  ];
  for (const [index, id] of pages.entries()) {
    const text = lines.slice(index * 48, (index + 1) * 48).map(line => {
      const printable = line.replace(/[’‘]/g, "'").replace(/[—–]/g, "-").replace(/[\u202f\u2009]/g, " ")
        .replace(/[^\x20-\x7e\xa0-\xff€œŒ]/g, "?").replaceAll("€", "\x80").replaceAll("œ", "\x9c").replaceAll("Œ", "\x8c");
      return `<${Buffer.from(printable, "latin1").toString("hex")}> Tj T*`;
    }).join("\n");
    const stream = `BT /F1 10 Tf 15 TL 48 790 Td\n${text}\nET\n`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    );
  }
  let document = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = document.length;
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = document.length;
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) document += `${String(offset).padStart(10, "0")} 00000 n \n`;
  return `${document}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}
