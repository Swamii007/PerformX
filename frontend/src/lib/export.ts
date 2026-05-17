import * as XLSX from "xlsx";

export function exportToXLSX(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = "Report"
) {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-width columns
  const colWidths = Object.keys(data[0]).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] ?? "").length)) + 2
  }));
  ws["!cols"] = colWidths;

  // Style header row
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A5F" } },
      alignment: { horizontal: "center" }
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportMultiSheetXLSX(
  sheets: Array<{ name: string; data: Record<string, unknown>[] }>,
  filename: string
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    if (!sheet.data.length) continue;
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    const colWidths = Object.keys(sheet.data[0]).map(key => ({
      wch: Math.max(key.length, ...sheet.data.map(row => String(row[key] ?? "").length)) + 2
    }));
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
