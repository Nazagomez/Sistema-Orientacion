import { useState, type ReactElement } from "react";
import { HealthStatus } from "../components/health-status";
import { RequestForm } from "../components/request-form";
import { RequestSent } from "../components/request-sent";
import { ServiceHeader } from "../components/service-header";

/**
 * The only student screen: the orientation form, then a short confirmation.
 */
export function RequestPage(): ReactElement {
  const [isSent, setIsSent] = useState(false);
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-blush text-ink">
      <ServiceHeader />
      <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
        {isSent ? <RequestSent /> : <RequestForm onSubmitted={() => setIsSent(true)} />}
      </main>
      <footer className="px-4 py-4 text-center">
        <HealthStatus />
      </footer>
    </div>
  );
}
