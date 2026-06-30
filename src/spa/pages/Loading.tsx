/** Article-shaped skeleton (port of src/app/(public)/loading.tsx). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4">
      <div className="h-4 w-40 rounded bg-black/[0.06]" />
      <div className="h-8 w-2/3 rounded bg-black/[0.08]" />
      <div className="h-4 w-full rounded bg-black/[0.06]" />
      <div className="h-4 w-5/6 rounded bg-black/[0.06]" />
      <div className="h-4 w-4/6 rounded bg-black/[0.06]" />
      <div className="h-48 w-full rounded-xl bg-black/[0.05]" />
    </div>
  );
}
