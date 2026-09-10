import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppHeader } from "@/components/nap/AppHeader";
import { NapForm } from "@/components/nap/NapForm";
import { fetchNap } from "@/lib/naps";

export const Route = createFileRoute("/_authenticated/editar/$id")({
  head: () => ({
    meta: [
      { title: "Editar caja NAP | Dovanet" },
      {
        name: "description",
        content:
          "Actualizá los datos de una caja NAP reparada de Dovanet: ubicación, estado del trabajo, observaciones y fotografías.",
      },
      { property: "og:title", content: "Editar caja NAP | Dovanet" },
      {
        property: "og:description",
        content: "Actualizá los datos de una caja NAP reparada de Dovanet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditarNapPage,
});

function EditarNapPage() {
  const { id } = Route.useParams();
  const { data: nap, isLoading } = useQuery({ queryKey: ["nap", id], queryFn: () => fetchNap(id) });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Editar caja NAP</h1>
        <p className="text-sm text-muted-foreground">
          Cada cambio queda registrado en el historial de la ficha.
        </p>
        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Cargando registro…</p>}
        {nap && <NapForm mode="editar" napId={id} initial={nap} keepPhotos />}
      </main>
    </div>
  );
}
