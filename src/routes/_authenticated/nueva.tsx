import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Crosshair, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/nap/AppHeader";
import { GoogleMapCanvas } from "@/components/nap/GoogleMapCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode } from "@/lib/geo.functions";
import { uploadPhotos } from "@/lib/naps";

export const Route = createFileRoute("/_authenticated/nueva")({
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, nombre } = useAuth();
  const geocode = useServerFn(reverseGeocode);

  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [codigo, setCodigo] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [localidad, setLocalidad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [trabajo, setTrabajo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  async function applyPoint(lat: number, lng: number) {
    setPin({ lat, lng });
    setCenter({ lat, lng });
    try {
      const result = await geocode({ data: { lat, lng } });
      if (result.direccion) setDireccion(result.direccion);
      if (result.localidad) setLocalidad(result.localidad);
    } catch {
      // Address lookup is a convenience: the technician can type it manually.
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Este dispositivo no permite ubicación GPS");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        void applyPoint(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        toast.error("No pudimos obtener tu ubicación", {
          description: "Permití el acceso al GPS o marcá el punto en el mapa.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!pin) {
      toast.error("Falta la ubicación", { description: "Usá el GPS o tocá el mapa." });
      return;
    }
    setSaving(true);
    try {
      const fotos = files.length > 0 ? await uploadPhotos(user.id, files) : [];
      const { data, error } = await supabase
        .from("naps")
        .insert({
          user_id: user.id,
          codigo: codigo.trim() || null,
          tecnico: tecnico.trim() || nombre,
          fecha,
          localidad: localidad.trim(),
          direccion: direccion.trim(),
          trabajo_realizado: trabajo.trim(),
          observaciones: observaciones.trim() || null,
          lat: pin.lat,
          lng: pin.lng,
          fotos,
        })
        .select("id")
        .single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["naps"] });
      toast.success("NAP registrada");
      navigate({ to: "/registro/$id", params: { id: data.id } });
    } catch (err) {
      toast.error("No pudimos guardar la NAP", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Registrar caja NAP reparada
        </h1>
        <p className="text-sm text-muted-foreground">
          Marcá la ubicación, describí el trabajo y sumá las fotos de la intervención.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            <GoogleMapCanvas
              pin={pin}
              {...(center ? { center } : {})}
              onPick={(lat, lng) => void applyPoint(lat, lng)}
              zoom={16}
              className="h-[360px] lg:h-[520px]"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
                {locating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Crosshair className="size-4" />
                )}
                Usar mi ubicación
              </Button>
              <span className="font-mono text-xs text-muted-foreground">
                {pin ? `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}` : "Sin coordenadas"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código de la NAP</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="NAP-014"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tecnico">Técnico</Label>
                <Input
                  id="tecnico"
                  value={tecnico}
                  onChange={(e) => setTecnico(e.target.value)}
                  placeholder={nombre || "Nombre"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="localidad">Localidad</Label>
              <Input
                id="localidad"
                required
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                required
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trabajo">Trabajo realizado</Label>
              <Textarea
                id="trabajo"
                required
                rows={4}
                value={trabajo}
                onChange={(e) => setTrabajo(e.target.value)}
                placeholder="Cambio de splitter, resplice de fibra…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observaciones</Label>
              <Textarea
                id="obs"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fotos">Fotografías</Label>
              <Input
                id="fotos"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {files.length} foto(s) seleccionada(s)
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Guardar registro
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
