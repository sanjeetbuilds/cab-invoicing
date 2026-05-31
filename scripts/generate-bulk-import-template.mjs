/**
 * One-shot generator for the bulk-import Excel template.
 *
 *   node scripts/generate-bulk-import-template.mjs
 *
 * Writes /public/templates/bulk-import-template.xlsx with four sheets:
 *   Clients · Vehicles · Rate Cards · Notes
 * Required columns are marked with *. Sample rows are tagged
 * "SAMPLE, DELETE BEFORE UPLOAD" in the first column so users don't
 * accidentally import them.
 *
 * Re-run whenever the import schema changes.
 */
import path from "node:path";
import fs from "node:fs/promises";
import ExcelJS from "exceljs";

const OUT_DIR = path.join(process.cwd(), "public", "templates");
const OUT_FILE = path.join(OUT_DIR, "bulk-import-template.xlsx");

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEEF2FF" }, // indigo-50
};
const HEADER_FONT = { bold: true, color: { argb: "FF1E1B4B" } };
const SAMPLE_FONT = { italic: true, color: { argb: "FF6B7280" } };

function applyHeaderRow(ws) {
  const row = ws.getRow(1);
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });
  row.height = 22;
  row.commit();
}

function applySampleRow(row) {
  row.eachCell((cell) => {
    cell.font = SAMPLE_FONT;
  });
  row.commit();
}

const wb = new ExcelJS.Workbook();
wb.creator = "EasyBills";
wb.created = new Date();

// ───────────────── Clients ─────────────────
{
  const ws = wb.addWorksheet("Clients");
  ws.columns = [
    { header: "Name*",            key: "name",     width: 30 },
    { header: "GSTIN",            key: "gstin",    width: 18 },
    { header: "State*",           key: "state",    width: 18 },
    { header: "Address",          key: "address",  width: 32 },
    { header: "Contact Person",   key: "contact",  width: 22 },
    { header: "Phone",            key: "phone",    width: 16 },
    { header: "Email",            key: "email",    width: 26 },
    { header: "RCM (Yes/No)",     key: "rcm",      width: 14 },
    { header: "Notes",            key: "notes",    width: 28 },
  ];
  applyHeaderRow(ws);
  applySampleRow(
    ws.addRow({
      name: "SAMPLE, DELETE BEFORE UPLOAD",
      gstin: "",
      state: "Haryana",
      address: "",
      contact: "Mr. Vinod Kumar",
      phone: "",
      email: "",
      rcm: "No",
      notes: "",
    }),
  );
  applySampleRow(
    ws.addRow({
      name: "SAMPLE, DELETE BEFORE UPLOAD",
      gstin: "07ABCDE1234F1Z5",
      state: "Delhi",
      address: "",
      contact: "Ms. Priya",
      phone: "",
      email: "",
      rcm: "No",
      notes: "",
    }),
  );
}

// ───────────────── Vehicles ─────────────────
{
  const ws = wb.addWorksheet("Vehicles");
  ws.columns = [
    { header: "Number*",                     key: "number",     width: 18 },
    { header: "Type*",                       key: "type",       width: 14 },
    { header: "Ownership* (Own/Attached)",   key: "ownership",  width: 22 },
    { header: "Vendor Name",                 key: "vendor",     width: 26 },
    { header: "Active (Yes/No)",             key: "active",     width: 14 },
  ];
  applyHeaderRow(ws);
  applySampleRow(
    ws.addRow({
      number: "HR 26 ED 9083",
      type: "Sonet",
      ownership: "Own",
      vendor: "",
      active: "Yes",
    }),
  );
  applySampleRow(
    ws.addRow({
      number: "HR 26 CD 6403",
      type: "Dzire",
      ownership: "Attached",
      vendor: "Vendor Pvt Ltd",
      active: "Yes",
    }),
  );
}

// ───────────────── Rate Cards ─────────────────
{
  const ws = wb.addWorksheet("Rate Cards");
  ws.columns = [
    { header: "Client Name*",                              key: "client",     width: 30 },
    { header: "Car Type*",                                 key: "car",        width: 12 },
    { header: "Mode* (Local/Outstation/Transfer/Package)", key: "mode",       width: 32 },
    { header: "Plan Name (for Transfer/Package only)",     key: "plan",       width: 28 },
    { header: "Base Rate ₹",                               key: "base_rate",  width: 14 },
    { header: "Base km",                                   key: "base_km",    width: 10 },
    { header: "Base hr",                                   key: "base_hr",    width: 10 },
    { header: "Extra km ₹",                                key: "extra_km",   width: 12 },
    { header: "Extra hour ₹",                              key: "extra_hr",   width: 14 },
    { header: "Night ₹",                                   key: "night",      width: 10 },
    { header: "Per km ₹ (Outstation only)",                key: "per_km",     width: 22 },
    { header: "Fixed Price ₹ (Transfer/Package only)",     key: "fixed",      width: 32 },
    { header: "Driver TA ₹/day",                           key: "driver_ta",  width: 16 },
    { header: "Notes",                                     key: "notes",      width: 24 },
  ];
  applyHeaderRow(ws);
  applySampleRow(
    ws.addRow({
      client: "SAMPLE, DELETE BEFORE UPLOAD",
      car: "Dzire",
      mode: "Local",
      plan: "",
      base_rate: 1400,
      base_km: 80,
      base_hr: 8,
      extra_km: 14,
      extra_hr: 100,
      night: 300,
      per_km: "",
      fixed: "",
      driver_ta: 300,
      notes: "",
    }),
  );
  applySampleRow(
    ws.addRow({
      client: "SAMPLE, DELETE BEFORE UPLOAD",
      car: "Crysta",
      mode: "Outstation",
      plan: "",
      base_rate: "",
      base_km: "",
      base_hr: "",
      extra_km: "",
      extra_hr: "",
      night: "",
      per_km: 24,
      fixed: "",
      driver_ta: 300,
      notes: "",
    }),
  );
  applySampleRow(
    ws.addRow({
      client: "SAMPLE, DELETE BEFORE UPLOAD",
      car: "Dzire",
      mode: "Transfer",
      plan: "Airport T1 Drop",
      base_rate: "",
      base_km: "",
      base_hr: "",
      extra_km: "",
      extra_hr: "",
      night: "",
      per_km: "",
      fixed: 1200,
      driver_ta: 0,
      notes: "",
    }),
  );
}

// ───────────────── Notes ─────────────────
{
  const ws = wb.addWorksheet("Notes");
  ws.columns = [{ header: "Bulk import notes", key: "n", width: 100 }];
  applyHeaderRow(ws);
  const notes = [
    "Required columns are marked with *. Delete the sample rows before uploading.",
    "",
    "VALID VALUES, Mode: Local, Outstation, Transfer, Package",
    "VALID VALUES, Ownership: Own, Attached",
    "VALID VALUES, Car Type: Dzire, Sonet, Crysta, Innova, Ertiga, Other",
    "VALID VALUES, Yes/No fields accept Yes, No, Y, N, True, False, 1, 0.",
    "",
    "REQUIRED PER MODE (Rate Cards):",
    "  • Local      → Base Rate, Base km, Base hr, Extra km, Extra hour, Night, Driver TA",
    "  • Outstation → Per km, Driver TA",
    "  • Transfer   → Plan Name, Fixed Price, Driver TA (default 0)",
    "  • Package    → Plan Name, Fixed Price, Driver TA (default 0)",
    "",
    "AUTO-FIXES the app will apply (and flag in the preview):",
    "  • State case: 'haryana' → 'Haryana'. Common misspellings recognized.",
    "  • Vehicle number: 'HR26AG4972' → 'HR 26 AG 4972'.",
    "  • GSTIN: uppercase + strip spaces.",
    "  • Yes/No / Mode / Ownership / Car Type: case-insensitive.",
    "",
    "RATE CARD CLIENT LINKING:",
    "  Each row's 'Client Name' must match either an existing client in EasyBills",
    "  OR a row in the Clients sheet of this same upload. Otherwise the rate",
    "  card row will be flagged 'needs attention' and skipped.",
    "",
    "INDIAN STATES (28 + 8 UTs):",
    "  Andhra Pradesh, Arunachal Pradesh, Assam, Bihar, Chhattisgarh, Goa,",
    "  Gujarat, Haryana, Himachal Pradesh, Jharkhand, Karnataka, Kerala,",
    "  Madhya Pradesh, Maharashtra, Manipur, Meghalaya, Mizoram, Nagaland,",
    "  Odisha, Punjab, Rajasthan, Sikkim, Tamil Nadu, Telangana, Tripura,",
    "  Uttar Pradesh, Uttarakhand, West Bengal, Andaman and Nicobar Islands,",
    "  Chandigarh, Dadra and Nagar Haveli and Daman and Diu, Delhi, Jammu",
    "  and Kashmir, Ladakh, Lakshadweep, Puducherry.",
  ];
  for (const line of notes) ws.addRow([line]);
}

await fs.mkdir(OUT_DIR, { recursive: true });
await wb.xlsx.writeFile(OUT_FILE);
console.log(`✓ wrote ${OUT_FILE}`);
