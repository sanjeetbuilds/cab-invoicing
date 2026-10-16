/**
 * Shown in every admin-created-account email and the "Copy login details"
 * text. One setting so it can be renamed later without hunting through
 * templates — temporarily "Cab Invoicing" pending the final product name.
 */
export const PLATFORM_BRAND_NAME = "Cab Invoicing";

/**
 * Platform-operator contact shown to users who have no company, whose
 * company is suspended, or who aren't registered yet. Edit these to your
 * real details before going live.
 */
export const SUPPORT_CONTACT = "support@yourcompany.example";

/** Digits only, country code included, no "+" or spaces — e.g. "919876543210". */
export const SUPPORT_WHATSAPP_NUMBER = "910000000000";

export function supportWhatsAppLink(message?: string): string {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
