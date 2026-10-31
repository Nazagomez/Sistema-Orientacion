import type { ReactElement } from "react";

/**
 * Confirmation shown once, after the request is stored as pending.
 */
export function RequestSent(): ReactElement {
  return (
    <section className="rounded-3xl bg-white px-5 py-10 shadow-[0_10px_30px_rgb(234_126_163_/_0.12)] sm:px-8 md:px-10">
      <h1 className="font-serif text-3xl text-ink md:text-4xl">Solicitud enviada</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/80">
        La solicitud fue enviada correctamente. Quedó en estado pendiente. La
        respuesta llegará a su correo institucional.
      </p>
    </section>
  );
}
