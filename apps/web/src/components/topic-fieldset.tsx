import type { ReactElement } from "react";
import { ORIENTATION_TOPICS } from "../lib/orientation-topics";

type TopicFieldsetProps = {
  readonly selected: readonly string[];
  readonly error?: string;
  readonly onToggle: (code: string) => void;
};

/**
 * Multi-select list of orientation topics from the institutional form.
 */
export function TopicFieldset({ selected, error, onToggle }: TopicFieldsetProps): ReactElement {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-ink">Temas que le gustaría trabajar</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ORIENTATION_TOPICS.map((topic) => (
          <label key={topic.code} className="flex items-start gap-3 text-sm leading-snug text-ink">
            <input
              type="checkbox"
              name="temas"
              value={topic.code}
              checked={selected.includes(topic.code)}
              onChange={() => onToggle(topic.code)}
              className="mt-0.5 accent-berry"
            />
            <span>{topic.label}</span>
          </label>
        ))}
      </div>
      {error ? <span className="mt-2 block text-sm text-danger">{error}</span> : null}
    </fieldset>
  );
}
