// Frozen snapshot of Sanjeet's HTML-prototype data export, used by the
// one-shot seed action. Mirrors prototype-data.json at the repo root.
// Keep this in sync if the source JSON changes (or wire the JSON import in
// later if cross-dir imports prove safe in Vercel's bundler).

export interface SeedClient {
  seedId: string;
  name: string;
  gstin: string;
  address: string;
  state: string;
  is_rcm: boolean;
  default_booked_by: string;
}

export interface SeedVehicle {
  seedId: string;
  number: string;
  type: "Dzire" | "Sonet" | "Crysta" | "Innova" | "Ertiga" | "Other";
  ownership: "own" | "attached";
}

export interface SeedRateCard {
  seedId: string;
  client_seed_id: string;
  car_type: string;
  mode: "local" | "outstation";
  base_rate?: number;
  base_kms?: number;
  base_hours?: number;
  extra_km?: number;
  extra_hour?: number;
  night?: number;
  per_km?: number;
  driver_ta?: number;
}

export const PROTOTYPE_CLIENTS: SeedClient[] = [
  {
    seedId: "cl_paras",
    name: "Paras RE Facilities Management Pvt Ltd",
    gstin: "06AAECP5013H1ZQ",
    address: "",
    state: "Haryana",
    is_rcm: true,
    default_booked_by: "Mr. Rakesh Verma",
  },
  {
    seedId: "cl_fhpl",
    name: "Family Health Plan Insurance TPA Ltd",
    gstin: "06AAACF1740R1ZH",
    address: "",
    state: "Haryana",
    is_rcm: true,
    default_booked_by: "Ms. Gagandeep",
  },
  {
    seedId: "cl_bharti",
    name: "Bharti Foundation",
    gstin: "",
    address: "",
    state: "Haryana",
    is_rcm: false,
    default_booked_by: "Mr. Vinod Kumar",
  },
  {
    seedId: "cl_metalman",
    name: "Metalman Auto Ltd",
    gstin: "07AABCM5441M2ZA",
    address:
      "JMK Tower, 1st Floor, 44/5, NH 8, Kapashehra Estate, (Ggn-Delhi Border), ND- 110037",
    state: "Delhi",
    is_rcm: false,
    default_booked_by: "Mr. Sunny Pandey",
  },
];

export const PROTOTYPE_VEHICLES: SeedVehicle[] = [
  { seedId: "v_9083", number: "HR 26 ED 9083", type: "Sonet",  ownership: "own" },
  { seedId: "v_6253", number: "HR 55 AZ 6253", type: "Crysta", ownership: "own" },
  { seedId: "v_6403", number: "HR 26 CD 6403", type: "Dzire",  ownership: "attached" },
  { seedId: "v_3874", number: "HR 26 BE 3874", type: "Dzire",  ownership: "attached" },
  { seedId: "v_8630", number: "HR 26 BX 8630", type: "Dzire",  ownership: "own" },
  { seedId: "v_703",  number: "HR 26 CG 0703", type: "Dzire",  ownership: "attached" },
  { seedId: "v_6281", number: "HR 26 AT 6281", type: "Dzire",  ownership: "attached" },
  { seedId: "v_8053", number: "HR 26 BS 8053", type: "Dzire",  ownership: "attached" },
  { seedId: "v_6131", number: "HR 26 CN 6131", type: "Dzire",  ownership: "attached" },
  { seedId: "v_4972", number: "HR 26 AG 4972", type: "Dzire",  ownership: "attached" },
];

export const PROTOTYPE_RATE_CARDS: SeedRateCard[] = [
  { seedId: "wcgeqdpp", client_seed_id: "cl_paras",    car_type: "Sonet",  mode: "outstation", per_km: 15, driver_ta: 300 },
  { seedId: "3ea0l3lt", client_seed_id: "cl_paras",    car_type: "Crysta", mode: "outstation", per_km: 24, driver_ta: 300 },
  { seedId: "7ilpy1nl", client_seed_id: "cl_fhpl",     car_type: "Sonet",  mode: "local",      base_rate: 1500, base_kms: 80, base_hours: 8, extra_km: 15, extra_hour: 100, night: 300, driver_ta: 300 },
  { seedId: "hneumihd", client_seed_id: "cl_fhpl",     car_type: "Dzire",  mode: "local",      base_rate: 1500, base_kms: 80, base_hours: 8, extra_km: 15, extra_hour: 100, night: 300, driver_ta: 300 },
  { seedId: "xn8pdvd3", client_seed_id: "cl_bharti",   car_type: "Dzire",  mode: "local",      base_rate: 1400, base_kms: 80, base_hours: 8, extra_km: 14, extra_hour: 100, night: 300, driver_ta: 300 },
  { seedId: "37rqjxrm", client_seed_id: "cl_bharti",   car_type: "Dzire",  mode: "outstation", per_km: 14, driver_ta: 300 },
  { seedId: "lx72vquk", client_seed_id: "cl_metalman", car_type: "Dzire",  mode: "local",      base_rate: 1500, base_kms: 80, base_hours: 8, extra_km: 15, extra_hour: 150, night: 300, driver_ta: 300 },
  { seedId: "2vrr6z5z", client_seed_id: "cl_metalman", car_type: "Sonet",  mode: "local",      base_rate: 1600, base_kms: 80, base_hours: 8, extra_km: 16, extra_hour: 150, night: 300, driver_ta: 300 },
  { seedId: "mys0kfmh", client_seed_id: "cl_metalman", car_type: "Crysta", mode: "local",      base_rate: 2400, base_kms: 80, base_hours: 8, extra_km: 24, extra_hour: 200, night: 300, driver_ta: 300 },
];
