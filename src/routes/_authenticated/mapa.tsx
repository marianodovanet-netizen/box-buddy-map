import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar, Camera, MapPin, Search, User, X } from "lucide-react";

import { AppHeader } from "@/components/nap/AppHeader";
import { GoogleMapCanvas } from "@/components/nap/GoogleMapCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchNaps, type Nap } from "@/lib/naps";
import { LOCALIDADES, TECNICOS } from "@/lib/naps-constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa de cajas NAP reparadas | Dovanet" },
      {
        name: "description",
        content:
          "Mapa interactivo con todas las cajas NAP reparadas por el equipo técnico de Dovanet, con fecha, localidad y fotografías.",
      },
      { property: "og:title", content: "Mapa de cajas NAP reparadas | Dovanet" },
      {
        property: "og:description",
        content: "Todas las cajas NAP reparadas de Dovanet ubicadas en un mapa interactivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapaPage,
});

function MapaPage() {
  const [q, setQ] = useState("");
  const [localidadFilter, setLocalidadFilter] = useState<string>("");
  const [tecnicoFilter, setTecnicoFilter] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: naps = [], isLoading } = useQuery({ queryKey: ["naps"], queryFn: fetchNaps });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return naps.filter((n) => {
      const matchesText =
        !term ||
        [n.codigo, n.tecnico, n.localidad, n.direccion, n.trabajo_realizado]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      const matchesLocalidad = !localidadFilter || n.localidad === localidadFilter;
      const matchesTecnico = !tecnicoFilter || n.tecnico === tecnicoFilter;
      return matchesText && matchesLocalidad && matchesTecnico;
    });
  }, [naps, q, localidadFilter, tecnicoFilter]);

  const markers = filtered.map((n) => ({
    id: n.id,
    lat: n.lat,
    lng: n.lng,
    title: n.codigo ?? n.direccion,
  }));

  const selectedNap = filtered.find((n) => n.id === selected) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Cajas NAP reparadas
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Cargando registros…" : `${naps.length} registro(s) en total`}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por localidad, técnico, código…"
                className="pl-9"
              />
            </div>
            <Select value={localidadFilter} onValueChange={setLocalidadFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todas las localidades" />
              </SelectTrigger>
              <SelectContent>
                {LOCALIDADES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tecnicoFilter} onValueChange={setTecnicoFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Todos los técnicos" />
              </SelectTrigger>
              <SelectContent>
                {TECNICOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(localidadFilter || tecnicoFilter || q) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLocalidadFilter("");
                  setTecnicoFilter("");
                  setQ("");
                }}
              >
                <X className="size-4" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <GoogleMapCanvas
            markers={markers}
            selectedId={selected}
            onMarkerClick={setSelected}
            fitToMarkers
            className="h-[420px] lg:h-[640px]"
          />

          <div className="flex max-h-[640px] flex-col gap-3 overflow-y-auto pr-1">
            {selectedNap && <SelectedCard nap={selectedNap} />}
            {filtered.length === 0 && !isLoading && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Todavía no hay cajas NAP registradas.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/nueva">Registrar la primera</Link>
                </Button>
              </div>
            )}
            {filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelected(n.id)}
                className={cn(
                  "rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50",
                  selected === n.id && "border-primary ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{n.codigo || "NAP sin código"}</span>
                  <Badge variant="secondary">{n.localidad}</Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{n.direccion}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {n.fecha}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User className="size-3.5" />
                    {n.tecnico}
                  </span>
                  {n.fotos.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Camera className="size-3.5" />
                      {n.fotos.length}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function SelectedCard({ nap }: { nap: Nap }) {
  return (
    <div className="rounded-xl border bg-accent/40 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="size-4 text-primary" />
        {nap.codigo || "NAP seleccionada"}
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{nap.trabajo_realizado}</p>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {nap.lat.toFixed(6)}, {nap.lng.toFixed(6)}
      </p>
      <Button asChild size="sm" className="mt-3">
        <Link to="/registro/$id" params={{ id: nap.id }}>
          Ver ficha completa
        </Link>
      </Button>
    </div>
  );
}
