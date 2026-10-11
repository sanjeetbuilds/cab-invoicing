/**
 * The home page brings its own full header, nav, and footer (it's a
 * complete self-contained design), so this layout adds nothing on top
 * of it — unlike (marketing), which supplies a shared thin header for
 * /privacy, /terms, and /contact.
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
