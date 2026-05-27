import type { GstMode } from "@/lib/supabase/types";

export interface GstResult {
  mode: GstMode;
  cgst: number;
  sgst: number;
  igst: number;
  labels: {
    cgst?: string;
    sgst?: string;
    igst?: string;
  };
}

export interface GstClient {
  state: string;
  is_rcm: boolean;
}

export interface GstCompany {
  state: string;
}

export function gstFor(
  client: GstClient,
  subtotal: number,
  company: GstCompany,
): GstResult {
  if (client.is_rcm) {
    return {
      mode: "RCM",
      cgst: 0,
      sgst: 0,
      igst: 0,
      labels: {
        cgst: "CGST @ 2.5% Under RCM",
        sgst: "SGST @ 2.5% Under RCM",
      },
    };
  }

  if (client.state !== company.state) {
    return {
      mode: "IGST",
      cgst: 0,
      sgst: 0,
      igst: round2(subtotal * 0.05),
      labels: { igst: "IGST @ 5%" },
    };
  }

  return {
    mode: "CGST_SGST",
    cgst: round2(subtotal * 0.025),
    sgst: round2(subtotal * 0.025),
    igst: 0,
    labels: { cgst: "CGST @ 2.5%", sgst: "SGST @ 2.5%" },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
