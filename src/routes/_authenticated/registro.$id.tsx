import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/nap/AppHeader";
import { GoogleMapCanvas } from "@/components/nap/GoogleMapCanvas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchNap, signedPhotoUrls } from "@/lib/naps";

export const Route = createFileRoute("/_authenticated/registro/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de caja NAP | Dovanet" },
      {
        name: "description",
        content:
          "Detalle de la reparación de una caja NAP: ubicación GPS, técnico, trabajo realizado, observaciones y fotografías.",
      },
      { property: "og:title", content: "Ficha de caja NAP | Dovanet" },
      {
        property: "og:description",
        content: "Detalle completo de una caja NAP reparada por Dovanet.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DetallePage,
});

function DetallePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: nap, isLoading } = useQuery({ queryKey: ["nap", id], queryFn: () => fetchNap(id) });
  const { data: fotos = [] } = useQuery({
    queryKey: ["nap-fotos", id, nap?.fotos],
    queryFn: () => signedPhotoUrls(nap?.fotos ?? []),
    enabled: !!nap,
  });

  async function eliminar() {
    if (!confirm("¿Eliminar este registro? No se puede deshacer.")) return;
    const { error } = await supabase.from("naps").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar", { description: error.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["naps"] });
    toast.success("Registro eliminado");
    navigate({ to: "/mapa" });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/mapa">
            <ArrowLeft className="size-4" /> Volver al mapa
          </Link>
        </Button>

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Cargando ficha…</p>}
        {!isLoading && !nap && (
          <p className="mt-8 text-sm text-muted-foreground">No encontramos este registro.</p>
        )}

        {nap && (
          <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight">
                  {nap.codigo || "NAP sin código"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {nap.direccion} · {nap.localidad}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{nap.fecha}</Badge>
                {user?.id === nap.user_id && (
                  <Button variant="outline" size="sm" onClick={eliminar}>
                    <Trash2 className="size-4" /> Eliminar
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <GoogleMapCanvas
                markers={[{ id: nap.id, lat: nap.lat, lng: nap.lng }]}
                selectedId={nap.id}
                center={{ lat: nap.lat, lng: nap.lng }}
                zoom={17}
                className="h-72"
              />
              <div className="space-y-4">
                <Field label="Técnico" value={nap.tecnico} />
                {nap.tecnico_2 && <Field label="Técnico 2" value={nap.tecnico_2} />}
                <Field
                  label="Coordenadas GPS"
                  value={`${nap.lat.toFixed(6)}, ${nap.lng.toFixed(6)}`}
                  mono
                />
                <Field label="Trabajo realizado" value={nap.trabajo_realizado} />
                <Field label="Observaciones" value={nap.observaciones || "—"} />
                <a
                  className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={`https://www.google.com/maps/search/?api=1&query=${nap.lat},${nap.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir en Google Maps
                </a>
              </div>
            </div>

            <h2 className="mt-10 font-display text-lg font-semibold">
              Fotografías ({nap.fotos.length})
            </h2>
            {fotos.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Sin fotografías cargadas.</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {fotos.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt={`Fotografía ${i + 1} de la caja NAP en ${nap.direccion}`}
                      loading="lazy"
                      className="aspect-4/3 w-full rounded-lg border object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={mono ? "font-mono text-sm" : "text-sm whitespace-pre-line"}>{value}</p>
    </div>
  );
}
