export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-[rgb(var(--border))] bg-vx-radial">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-3 vx-muted max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}
