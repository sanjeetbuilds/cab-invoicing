/**
 * Share a server-rendered PDF with the recipient as an attached FILE,
 * not as a URL — so WhatsApp / Mail / Drive see the chosen filename
 * (Invoice_2037_Bharti_Foundation.pdf) instead of the Vercel URL.
 *
 * Strategy:
 *   1. Fetch the PDF route to get the bytes.
 *   2. Wrap them in a File so the OS sees an explicit name.
 *   3. If the browser supports Web Share Level 2 (mobile Chrome / Safari
 *      / Edge), call navigator.share({ files }) — the system share sheet
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

  // Fallback — trigger a download. The recipient then attaches the
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
