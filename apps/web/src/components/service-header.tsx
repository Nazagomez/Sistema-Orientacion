import type { ReactElement } from "react";

/**
 * Institutional bar shown above every student screen.
 */
export function ServiceHeader(): ReactElement {
  return (
    <header className="border-b border-pink/70 bg-blush">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <p className="shrink-0 font-serif text-lg text-berry">UNA</p>
        <p className="truncate text-right text-sm text-ink/70">Orientación estudiantil</p>
      </div>
    </header>
  );
}
