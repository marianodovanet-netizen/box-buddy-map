import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppHeader } from "@/components/nap/AppHeader";
import { NapForm } from "@/components/nap/NapForm";
import { fetchNap } from "@/lib/naps";

type NuevaSearch = { copiar?: string; estado?: string };

export const Route = createFileRoute("/_authenticated/nueva")({
  validateSearch: (search: Record<string, unknown>): NuevaSearch => ({
    ...(typeof search["copiar"] === "string" && search["copiar"]
      ? { copiar: search["copiar"] }
      : {}),
    ...(search["estado"] === "pendiente" ? { estado: "pendiente" } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Registrar caja NAP reparada | Dovanet" },
      {
        name: "description",
        content:
          "Cargá una caja NAP reparada con coordenadas GPS, dirección, trabajo realizado y fotografías del equipo técnico de Dovanet.",
      },
      { property: "og:title", content: "Registrar caja NAP reparada | Dovanet" },
      {
        property: "og:description",
        content: "Formulario para registrar una caja NAP reparada con GPS y fotos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NuevaNapPage,
});

function NuevaNapPage() {
  const { copiar } = Route.useSearch();

  const { data: origen } = useQuery({
    queryKey: ["nap", copiar],
    queryFn: () => fetchNap(copiar!),
    enabled: !!copiar,
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {copiar ? "Duplicar caja NAP" : "Registrar caja NAP reparada"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {copiar
            ? "Los datos vienen del registro original: ajustá lo que cambie y guardá."
            : "Marcá la ubicación, describí el trabajo y sumá las fotos de la intervención."}
        </p>

        <NapForm mode="crear" initial={origen ?? null} />
      </main>
    </div>
  );
}
