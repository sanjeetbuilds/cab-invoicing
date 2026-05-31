"use client";

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
        <TabsTrigger value="company">Company</TabsTrigger>
        <TabsTrigger value="numbering">Numbering</TabsTrigger>
        <TabsTrigger value="terms">Terms</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
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
