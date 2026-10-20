import { getOptionalViewer } from "@/lib/optional-viewer";
import { ContactBlock } from "@/components/help/contact-block";
import { HelpSearch } from "./help-search";

export const metadata = { title: "Help" };

export default async function HelpHomePage() {
  const viewer = await getOptionalViewer();

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-10 px-4 py-8 sm:py-10">
      <HelpSearch />
      <ContactBlock
        company={viewer.companyName ?? "-"}
        userName={viewer.name ?? "-"}
        userEmail={viewer.email ?? "-"}
        pageLabel="Help home"
      />
    </div>
  );
}
