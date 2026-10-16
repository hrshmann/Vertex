/** Re-mounted on every navigation, so each page eases in (see .vx-page-in in motion.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="vx-page-in">{children}</div>;
}
