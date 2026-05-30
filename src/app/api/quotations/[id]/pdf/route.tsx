import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuotationPdf } from "@/lib/pdf/quotation-pdf";
import { quotationFilename } from "@/lib/filename";
import type {
  Client,
  Company,
  Membership,
  Quotation,
  QuotationLine,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Not signed in.", { status: 401 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<Pick<Membership, "company_id">>();
  if (!membership) return new NextResponse("No company.", { status: 403 });

  const [{ data: q }, { data: lines }, { data: company }] = await Promise.all([
    admin
      .from("quotations")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Quotation>(),
    admin
      .from("quotation_lines")
      .select("*")
      .eq("quotation_id", id)
      .order("sort_order", { ascending: true })
      .returns<QuotationLine[]>(),
    admin
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .maybeSingle<Company>(),
  ]);

  if (!q) return new NextResponse("Quotation not found.", { status: 404 });
  if (!company) return new NextResponse("Company not found.", { status: 500 });

  let clientName = q.client_name;
  if (q.client_id) {
    const { data } = await admin
      .from("clients")
      .select("name")
      .eq("id", q.client_id)
      .maybeSingle<Pick<Client, "name">>();
    clientName = data?.name ?? q.client_name;
  }

  const buffer = await renderToBuffer(
    <QuotationPdf
      company={company}
      quotation={q}
      lines={lines ?? []}
      clientName={clientName}
    />,
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quotationFilename(q.number, clientName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
