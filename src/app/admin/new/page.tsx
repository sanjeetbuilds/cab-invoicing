import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { CreateCompanyForm } from "./create-company-form";

export const metadata = { title: "New company" };

export default function NewCompanyPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New company"
        description="Creates the company and, depending on the owner's email, either sends an invite or adds them immediately."
      />
      <CreateCompanyForm />
      <p className="text-xs text-muted-foreground">
        <Link href="/admin" className="underline">
          ← Back to companies
        </Link>
      </p>
    </div>
  );
}
