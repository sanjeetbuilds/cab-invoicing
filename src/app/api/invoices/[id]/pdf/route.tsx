import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";
import { invoiceFilename } from "@/lib/filename";
import type {
  Company,
  Invoice,
  InvoiceLine,
  Membership,
} from "@/lib/supabase/types";

// Force dynamic — auth + DB lookup per request.
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "invoices";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";

  // Auth via the user session, then drop to admin for the actual fetch
  // (the user is already authorised by membership).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Not signed in.", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: membership, error: mErr } = await admin
    .from("memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<Pick<Membership, "company_id" | "role">>();
  if (mErr) return new NextResponse(mErr.message, { status: 500 });
  if (!membership) return new NextResponse("No company.", { status: 403 });

  const [
    { data: invoice, error: invErr },
    { data: lines, error: linesErr },
    { data: company, error: cErr },
  ] = await Promise.all([
    admin
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("company_id", membership.company_id)
      .maybeSingle<Invoice>(),
    admin
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true })
      .returns<InvoiceLine[]>(),
    admin
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .maybeSingle<Company>(),
  ]);

  if (invErr) return new NextResponse(invErr.message, { status: 500 });
  if (linesErr) return new NextResponse(linesErr.message, { status: 500 });
  if (cErr) return new NextResponse(cErr.message, { status: 500 });
  if (!invoice) return new NextResponse("Invoice not found.", { status: 404 });
  if (!company) return new NextResponse("Company not found.", { status: 500 });

  const cachePath = `${membership.company_id}/${invoice.id}.pdf`;
  const fullNumber = `${company.invoice_prefix ?? ""}${invoice.invoice_number}`;
  // Recipient-facing filename: "Invoice_2037_Bharti_Foundation.pdf".
  const downloadName = invoiceFilename(fullNumber, invoice.client_name);

  // Try to serve from cache first.
  if (!fresh) {
    const { data: cached } = await admin.storage
      .from(STORAGE_BUCKET)
      .download(cachePath);
    if (cached) {
      const buf = Buffer.from(await cached.arrayBuffer());
      return pdfResponse(buf, downloadName);
    }
  }

  // Render fresh.
  const buffer = await renderToBuffer(
    <InvoicePdf
      company={company}
      invoice={invoice}
      lines={lines ?? []}
    />,
  );

  // Cache to storage — best-effort. Don't fail the request if the bucket
  // is missing or storage is misconfigured.
  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(cachePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) {
    console.warn(
      `[invoice-pdf] could not cache to storage (${cachePath}): ${uploadErr.message}`,
    );
  }

  return pdfResponse(buffer, downloadName);
}

function pdfResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
