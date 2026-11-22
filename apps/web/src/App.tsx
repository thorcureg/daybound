import { STATS, STAT_NAMES, gameDayKey, levelFromExp } from "@daybound/rules";

/**
 * Phase 0 placeholder: proves the client imports the shared rules package.
 * The real quest board arrives in Phase 1.
 */
export function App() {
  const demoExp = 250;
  const { level, expIntoLevel, expForLevel, progress } = levelFromExp(demoExp);

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-bold tracking-wide text-gold">Daybound</h1>
      <p className="mt-1 text-sm opacity-70">Game day {gameDayKey(new Date())} · Manila, 4 AM rollover</p>

      <section className="mt-8 rounded-lg border border-parchment/20 p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">Level {level}</span>
          <span className="text-sm opacity-70">
            {expIntoLevel} / {expForLevel} EXP
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-parchment/10">
          <div className="h-full bg-gold" style={{ width: `${progress * 100}%` }} />
        </div>
      </section>

      <ul className="mt-6 grid grid-cols-5 gap-2 text-center">
        {STATS.map((stat) => (
          <li key={stat} className="rounded border border-parchment/20 py-2" title={STAT_NAMES[stat]}>
            <div className="text-xs opacity-70">{stat}</div>
            <div className="text-lg font-semibold">0</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
