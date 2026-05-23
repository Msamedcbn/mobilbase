export default function Loading() {
  return (
    <section className="space-y-4">
      <div className="skeleton h-8 w-48" />
      <div className="panel p-4 space-y-3">
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-5 w-full" />
        <div className="skeleton h-5 w-5/6" />
      </div>
    </section>
  );
}
