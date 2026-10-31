import type { ReactElement } from "react";

type UnderlineFieldProps = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly type?: "text" | "email" | "tel";
  readonly autoComplete?: string;
  readonly onChange?: (value: string) => void;
};

/**
 * Label and single-line input with a bottom rule, matching the student form.
 */
export function UnderlineField({
  id,
  label,
  value,
  error,
  readOnly = false,
  type = "text",
  autoComplete,
  onChange,
}: UnderlineFieldProps): ReactElement {
  const borderClass = error ? "border-danger" : "border-rose focus:border-berry";
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        readOnly={readOnly}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        className={`mt-2 w-full border-0 border-b bg-transparent px-0 py-2 text-base text-ink outline-none ${borderClass} ${readOnly ? "cursor-default" : ""}`}
      />
      {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : null}
    </label>
  );
}
