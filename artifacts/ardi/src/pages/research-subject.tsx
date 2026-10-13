import { LiveResearch } from "@/features/intelligence/components/live-research";

export default function ResearchSubject() {
  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          Step 1 · Research
        </p>
        <h1 className="mt-2 text-3xl font-bold">Look up a name or company</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          This asks the connected research service and shows the sources it returns.
          If that service is not set up, you will see that here. Website lookup does
          not need it.
        </p>
      </header>
      <LiveResearch />
    </main>
  );
}
