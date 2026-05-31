"use client";

import { Building2, FileText, Hash, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Company, Role } from "@/lib/supabase/types";
import { CompanyForm } from "./company-form";
import { BrandingForm } from "./branding-form";
import { NumberingForm } from "./numbering-form";
import { TermsForm } from "./terms-form";
import { TeamSection } from "./team-section";
import type { TeamMemberRow } from "./page";

export function SettingsTabs({
  company,
  currentRole,
  members,
}: {
  company: Company;
  currentRole: Role;
  members: TeamMemberRow[];
}) {
  return (
    <Tabs defaultValue="company">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="company">
          <Building2 className="text-[#4f46e5]" />
          Company
        </TabsTrigger>
        <TabsTrigger value="numbering">
          <Hash className="text-[#4f46e5]" />
          Numbering
        </TabsTrigger>
        <TabsTrigger value="terms">
          <FileText className="text-[#4f46e5]" />
          Terms
        </TabsTrigger>
        <TabsTrigger value="team">
          <Users className="text-[#4f46e5]" />
          Team
        </TabsTrigger>
      </TabsList>

      <TabsContent value="company" className="pt-4 flex flex-col gap-6">
        <CompanyForm company={company} />
        <BrandingForm company={company} />
      </TabsContent>
      <TabsContent value="numbering" className="pt-4">
        <NumberingForm company={company} />
      </TabsContent>
      <TabsContent value="terms" className="pt-4">
        <TermsForm company={company} />
      </TabsContent>
      <TabsContent value="team" className="pt-4">
        <TeamSection currentRole={currentRole} members={members} />
      </TabsContent>
    </Tabs>
  );
}
