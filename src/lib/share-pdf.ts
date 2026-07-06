/**
 * Share a server-rendered PDF with the recipient as an attached FILE,
 * not as a URL, so WhatsApp / Mail / Drive see the chosen filename
 * (Invoice_2037_Bharti_Foundation.pdf) instead of the Vercel URL.
 *
 * Strategy:
 *   1. Fetch the PDF route to get the bytes.
 *   2. Wrap them in a File so the OS sees an explicit name.
 *   3. If the browser supports Web Share Level 2 (mobile Chrome / Safari
 *      / Edge), call navigator.share({ files }), the system share sheet
 *      treats it as a file attachment.
 *   4. Otherwise (desktop Firefox, older browsers), fall back to a
 *      regular download triggered by an <a download="…"> click.
 *
 * Callers handle their own toast messages; this function just returns
 * an action label so the caller can report what happened.
 */
export async function sharePdf(args: {
  url: string;
  filename: string;
  title?: string;
}): Promise<"shared" | "downloaded"> {
  const res = await fetch(args.url, { credentials: "same-origin" });
  if (!res.ok) {
    throw new Error(`PDF download failed (HTTP ${res.status}).`);
  }
  const blob = await res.blob();
  const file = new File([blob], args.filename, { type: "application/pdf" });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      files: [file],
      title: args.title ?? args.filename,
    });
    return "shared";
  }

  // Fallback, trigger a download. The recipient then attaches the
  // downloaded file manually, but it lands with the correct filename.
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = args.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return "downloaded";
}

/**
 * Fetch several server-rendered PDFs and wrap each in a named File, so a
 * later navigator.share() / download sees the real filenames. Sequential so
 * we can report progress and not hammer the PDF route with N parallel
 * server renders. Throws on the first failure with the offending filename.
 */
export async function fetchPdfsAsFiles(
  items: { url: string; filename: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<File[]> {
  const files: File[] = [];
  let done = 0;
  for (const it of items) {
    const res = await fetch(it.url, { credentials: "same-origin" });
    if (!res.ok) {
      throw new Error(`Couldn't prepare ${it.filename} (HTTP ${res.status}).`);
    }
    const blob = await res.blob();
    files.push(new File([blob], it.filename, { type: "application/pdf" }));
    onProgress?.(++done, items.length);
  }
  return files;
}

/** True when the browser can hand these files to the OS share sheet. */
export function canShareFiles(files: File[]): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

/**
 * Open the OS share sheet for already-fetched files (WhatsApp / Mail / Drive
 * see them as attachments). MUST be called straight from a user gesture, or
 * the browser rejects it with NotAllowedError; that is why the caller fetches
 * first and then calls this on a tap.
 */
export async function shareFiles(files: File[], title?: string): Promise<void> {
  await navigator.share({ files, title });
}

/**
 * Trigger a plain download of already-fetched files, each with its own
 * filename. The desktop / unsupported fallback for bulk share. A small gap
 * between clicks keeps the browser from dropping later downloads.
 */
export async function downloadFiles(files: File[]): Promise<void> {
  for (const file of files) {
    const objectUrl = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    await new Promise((r) => setTimeout(r, 250));
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

/**
 * Download a server-rendered PDF directly with the chosen filename, on
 * both desktop and mobile. Fetches the bytes and triggers a regular
 * <a download> click, so it never depends on an embedded frame.
 */
export async function downloadPdf(args: {
  url: string;
  filename: string;
}): Promise<void> {
  const res = await fetch(args.url, { credentials: "same-origin" });
  if (!res.ok) {
    throw new Error(`PDF download failed (HTTP ${res.status}).`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = args.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
