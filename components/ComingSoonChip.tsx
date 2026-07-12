/** Non-interactive "coming soon" chip — honest roadmap visibility, no fake
 *  functionality. Mirrors the desktop Sidebar's ComingSoonRow stubs. */
export default function ComingSoonChip({ label }: { label: string }) {
  return (
    <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-border-soft px-3 py-1 text-meta text-text-faint">
      {label}
      <span className="text-[10px] font-semibold uppercase tracking-wide">Soon</span>
    </span>
  );
}
