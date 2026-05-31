import "server-only";
import ExcelJS from "exceljs";
import { INDIA_STATES } from "@/lib/india-states";
import { normalizeVehicleNumber } from "@/lib/vehicle-format";
import type { CarType, TripMode, Ownership } from "@/lib/supabase/types";
import type {
  ImportClientRow,
  ImportRateCardRow,
  ImportVehicleRow,
  ParsedWorkbook,
  PreviewRow,
} from "./types";

const CAR_TYPES: CarType[] = [
  "Dzire",
  "Sonet",
  "Crysta",
  "Innova",
  "Ertiga",
  "Other",
];
const MODES: TripMode[] = ["local", "outstation", "transfer", "package"];
const OWNERSHIPS: Ownership[] = ["own", "attached"];

// Common state misspellings we silently auto-fix.
const STATE_ALIASES: Record<string, string> = {
  hariyana: "Haryana",
  haryana: "Haryana",
  maharastra: "Maharashtra",
  maharashtra: "Maharashtra",
  delhi: "Delhi",
  punjab: "Punjab",
  rajasthan: "Rajasthan",
  rajashthan: "Rajasthan",
  up: "Uttar Pradesh",
  "uttar pradesh": "Uttar Pradesh",
  uttarpradesh: "Uttar Pradesh",
  mp: "Madhya Pradesh",
  "madhya pradesh": "Madhya Pradesh",
  karnataka: "Karnataka",
  karnatka: "Karnataka",
  tamilnadu: "Tamil Nadu",
  "tamil nadu": "Tamil Nadu",
  westbengal: "West Bengal",
  "west bengal": "West Bengal",
  bengal: "West Bengal",
  gujarat: "Gujarat",
  gujrat: "Gujarat",
  kerala: "Kerala",
  telangana: "Telangana",
  andhra: "Andhra Pradesh",
  "andhra pradesh": "Andhra Pradesh",
};

function normalizeState(raw: string): { value: string; fixed: string | null } {
  const trimmed = raw.trim();
  // Exact match — keep as-is.
  if ((INDIA_STATES as readonly string[]).includes(trimmed)) {
    return { value: trimmed, fixed: null };
  }
  // Alias / casing lookup.
  const alias = STATE_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return {
      value: alias,
      fixed: trimmed !== alias ? `State '${trimmed}' → '${alias}'` : null,
    };
  }
  // Case-insensitive direct match against the canonical list.
  const ciMatch = (INDIA_STATES as readonly string[]).find(
    (s) => s.toLowerCase() === trimmed.toLowerCase(),
  );
  if (ciMatch) {
    return {
      value: ciMatch,
      fixed: trimmed !== ciMatch ? `State '${trimmed}' → '${ciMatch}'` : null,
    };
  }
  return { value: trimmed, fixed: null };
}

function isValidState(s: string): boolean {
  return (INDIA_STATES as readonly string[]).includes(s);
}

function normalizeCarType(
  raw: string,
): { value: CarType; fixed: string | null } | null {
  const trimmed = raw.trim();
  const match = CAR_TYPES.find(
    (t) => t.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!match) return null;
  return {
    value: match,
    fixed: trimmed !== match ? `Car type '${trimmed}' → '${match}'` : null,
  };
}

function normalizeMode(
  raw: string,
): { value: TripMode; fixed: string | null } | null {
  const trimmed = raw.trim().toLowerCase();
  const match = MODES.find((m) => m === trimmed);
  if (!match) return null;
  return {
    value: match,
    fixed: raw.trim() !== match ? `Mode '${raw.trim()}' → '${match}'` : null,
  };
}

function normalizeOwnership(
  raw: string,
): { value: Ownership; fixed: string | null } | null {
  const trimmed = raw.trim().toLowerCase();
  const match = OWNERSHIPS.find((o) => o === trimmed);
  if (!match) return null;
  return {
    value: match,
    fixed:
      raw.trim().toLowerCase() !== raw.trim()
        ? `Ownership '${raw.trim()}' → '${match}'`
        : null,
  };
}

function parseYesNo(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (raw == null) return fallback;
  const s = String(raw).trim().toLowerCase();
  if (s === "yes" || s === "y" || s === "true" || s === "1") return true;
  if (s === "no" || s === "n" || s === "false" || s === "0") return false;
  return fallback;
}

function cellString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString();
  // ExcelJS sometimes returns { result: ... } for formula cells.
  const obj = value as { result?: unknown; text?: unknown };
  if (obj.result != null) return cellString(obj.result);
  if (obj.text != null) return cellString(obj.text);
  return String(value);
}

function cellNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse the Clients sheet. Header row at row 1; data starts row 2.
 * Expected columns (order-tolerant via header lookup):
 *   Name, GSTIN, State, Address, Contact Person, Phone, Email,
 *   RCM (Yes/No), Notes
 */
function parseClientsSheet(
  ws: ExcelJS.Worksheet | undefined,
): PreviewRow<ImportClientRow>[] {
  if (!ws) return [];
  const headers = readHeaders(ws);
  const out: PreviewRow<ImportClientRow>[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const get = (key: string) =>
      cellString(row.getCell(headers[key.toLowerCase()] ?? -1).value).trim();

    const name = get("name");
    if (!name) return; // empty row, skip silently

    const fixes: string[] = [];
    const errors: string[] = [];

    const stateRaw = get("state");
    const { value: state, fixed: stateFix } = normalizeState(stateRaw);
    if (stateFix) fixes.push(stateFix);
    if (!state) errors.push("State is required.");
    else if (!isValidState(state))
      errors.push(
        `State '${state}' isn't a valid Indian state. Check the Notes sheet for the full list.`,
      );

    const gstinRaw = get("gstin");
    const gstin = gstinRaw ? gstinRaw.replace(/\s+/g, "").toUpperCase() : null;
    if (gstinRaw && gstin && gstin !== gstinRaw.toUpperCase()) {
      fixes.push(`GSTIN spaces stripped`);
    }

    const phone = get("phone");
    const email = get("email");
    const contact = get("contact person");
    const bookedBy = [contact, phone, email]
      .filter(Boolean)
      .join(" · ");

    out.push({
      sheetRow: rowNumber,
      data: {
        name,
        gstin,
        state,
        address: get("address") || null,
        default_booked_by: bookedBy || null,
        is_rcm: parseYesNo(row.getCell(headers["rcm (yes/no)"] ?? headers["rcm"] ?? -1).value, false),
        notes: get("notes") || null,
      },
      fixes,
      errors,
    });
  });

  return out;
}

function parseVehiclesSheet(
  ws: ExcelJS.Worksheet | undefined,
): PreviewRow<ImportVehicleRow>[] {
  if (!ws) return [];
  const headers = readHeaders(ws);
  const out: PreviewRow<ImportVehicleRow>[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (key: string) =>
      cellString(row.getCell(headers[key.toLowerCase()] ?? -1).value).trim();

    const rawNumber = get("number");
    if (!rawNumber) return;

    const fixes: string[] = [];
    const errors: string[] = [];

    const number = normalizeVehicleNumber(rawNumber);
    if (number !== rawNumber.toUpperCase().trim()) {
      fixes.push(`Vehicle number '${rawNumber}' → '${number}'`);
    }
    if (!number) errors.push("Vehicle number is required.");

    const typeRaw = get("type");
    const carType = typeRaw ? normalizeCarType(typeRaw) : null;
    if (!typeRaw) errors.push("Type is required.");
    else if (!carType)
      errors.push(
        `Type '${typeRaw}' isn't valid. Use Dzire, Sonet, Crysta, Innova, Ertiga, or Other.`,
      );
    if (carType?.fixed) fixes.push(carType.fixed);

    const ownershipRaw = get("ownership") || get("ownership (own/attached)");
    const ownership = ownershipRaw ? normalizeOwnership(ownershipRaw) : null;
    if (!ownershipRaw) errors.push("Ownership is required (Own or Attached).");
    else if (!ownership)
      errors.push(`Ownership '${ownershipRaw}' isn't valid. Use Own or Attached.`);
    if (ownership?.fixed) fixes.push(ownership.fixed);

    out.push({
      sheetRow: rowNumber,
      data: {
        number,
        type: carType?.value ?? ("Other" as CarType),
        ownership: ownership?.value ?? ("attached" as Ownership),
        vendor_name: get("vendor name") || null,
        active: parseYesNo(
          row.getCell(headers["active (yes/no)"] ?? headers["active"] ?? -1).value,
          true,
        ),
      },
      fixes,
      errors,
    });
  });

  return out;
}

function parseRateCardsSheet(
  ws: ExcelJS.Worksheet | undefined,
): PreviewRow<ImportRateCardRow>[] {
  if (!ws) return [];
  const headers = readHeaders(ws);
  const out: PreviewRow<ImportRateCardRow>[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (key: string) =>
      cellString(row.getCell(headers[key.toLowerCase()] ?? -1).value).trim();
    const getNum = (key: string) =>
      cellNumber(row.getCell(headers[key.toLowerCase()] ?? -1).value);

    const clientName = get("client name");
    if (!clientName) return;

    const fixes: string[] = [];
    const errors: string[] = [];

    const typeRaw = get("car type");
    const carType = typeRaw ? normalizeCarType(typeRaw) : null;
    if (!typeRaw) errors.push("Car Type is required.");
    else if (!carType) errors.push(`Car Type '${typeRaw}' isn't valid.`);
    if (carType?.fixed) fixes.push(carType.fixed);

    const modeRaw = get("mode") || get("mode (local/outstation/transfer/package)");
    const mode = modeRaw ? normalizeMode(modeRaw) : null;
    if (!modeRaw) errors.push("Mode is required.");
    else if (!mode) errors.push(`Mode '${modeRaw}' isn't valid.`);
    if (mode?.fixed) fixes.push(mode.fixed);

    const isFixed = mode?.value === "transfer" || mode?.value === "package";
    const planName = get("plan name") || get("plan name (for transfer/package only)");
    if (isFixed && !planName) {
      errors.push("Plan Name is required for Transfer/Package modes.");
    }

    const fixedPrice = getNum("fixed price ₹") ?? getNum("fixed price");
    if (isFixed && (fixedPrice == null || fixedPrice <= 0)) {
      errors.push("Fixed Price is required for Transfer/Package modes.");
    }

    const baseRate = getNum("base rate ₹") ?? getNum("base rate");
    const baseKms = getNum("base km") ?? getNum("base kms");
    const baseHours = getNum("base hr") ?? getNum("base hours");
    const extraKm = getNum("extra km ₹") ?? getNum("extra km");
    const extraHour = getNum("extra hour ₹") ?? getNum("extra hour");
    const night = getNum("night ₹") ?? getNum("night");
    const perKm = getNum("per km ₹") ?? getNum("per km") ?? getNum("per km ₹ (outstation only)");
    let driverTa = getNum("driver ta ₹/day") ?? getNum("driver ta");

    if (mode?.value === "local") {
      if (baseRate == null) errors.push("Base Rate required for Local.");
      if (baseKms == null) errors.push("Base km required for Local.");
      if (baseHours == null) errors.push("Base hr required for Local.");
    }
    if (mode?.value === "outstation") {
      if (perKm == null) errors.push("Per km required for Outstation.");
    }

    // Default Driver TA to 0 for fixed-price if blank.
    if (isFixed && driverTa == null) {
      driverTa = 0;
      fixes.push("Driver TA defaulted to 0 (Transfer/Package).");
    }

    out.push({
      sheetRow: rowNumber,
      data: {
        client_name: clientName,
        car_type: carType?.value ?? ("Other" as CarType),
        mode: mode?.value ?? ("local" as TripMode),
        plan_name: isFixed ? planName || null : null,
        base_rate: mode?.value === "local" ? baseRate : null,
        base_kms: mode?.value === "local" ? baseKms : null,
        base_hours: mode?.value === "local" ? baseHours : null,
        extra_km: mode?.value === "local" ? extraKm : null,
        extra_hour: mode?.value === "local" ? extraHour : null,
        night: mode?.value === "local" ? night : null,
        per_km: mode?.value === "outstation" ? perKm : null,
        fixed_price: isFixed ? fixedPrice : null,
        driver_ta: driverTa,
        notes: get("notes") || null,
      },
      fixes,
      errors,
    });
  });

  return out;
}

function readHeaders(ws: ExcelJS.Worksheet): Record<string, number> {
  const headers: Record<string, number> = {};
  const row = ws.getRow(1);
  row.eachCell((cell, colNumber) => {
    const key = cellString(cell.value).trim().toLowerCase();
    if (key) headers[key] = colNumber;
  });
  return headers;
}

/**
 * Parse a Buffer of bytes (uploaded .xlsx) into a preview-ready
 * structure. Throws on a fundamentally malformed file. Per-row
 * problems become PreviewRow.errors entries.
 */
export async function parseWorkbookBuffer(
  buf: Buffer,
  scope: "clients" | "vehicles" | "rate_cards" | "all",
): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);

  const topErrors: string[] = [];
  const clientsSheet = wb.getWorksheet("Clients");
  const vehiclesSheet = wb.getWorksheet("Vehicles");
  const rateCardsSheet = wb.getWorksheet("Rate Cards");
  // Single-entity uploads usually have a single un-named sheet — fall
  // back to the first worksheet when the named one isn't found.
  const fallback = wb.worksheets[0];

  let clients: PreviewRow<ImportClientRow>[] = [];
  let vehicles: PreviewRow<ImportVehicleRow>[] = [];
  let rateCards: PreviewRow<ImportRateCardRow>[] = [];

  if (scope === "clients" || scope === "all") {
    clients = parseClientsSheet(clientsSheet ?? (scope === "clients" ? fallback : undefined));
  }
  if (scope === "vehicles" || scope === "all") {
    vehicles = parseVehiclesSheet(vehiclesSheet ?? (scope === "vehicles" ? fallback : undefined));
  }
  if (scope === "rate_cards" || scope === "all") {
    rateCards = parseRateCardsSheet(rateCardsSheet ?? (scope === "rate_cards" ? fallback : undefined));
  }

  if (
    scope === "all" &&
    clients.length === 0 &&
    vehicles.length === 0 &&
    rateCards.length === 0
  ) {
    topErrors.push(
      "Workbook had no recognizable Clients / Vehicles / Rate Cards sheets. Use the template above.",
    );
  }

  return { clients, vehicles, rateCards, topErrors };
}
