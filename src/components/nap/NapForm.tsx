import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Crosshair, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { GoogleMapCanvas } from "@/components/nap/GoogleMapCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode } from "@/lib/geo.functions";
import { ESTADOS, LOCALIDADES, TECNICOS } from "@/lib/naps-constants";
import { signedPhotoUrls, uploadPhotos, type Nap } from "@/lib/naps";

export function parseCoordinates(text: string): { lat: number; lng: number } | null {
  const cleaned = text
    .trim()
    .replace(/[\u00b0\u2019\u201d\u0027]/g, " ")
    .replace(/[NS]/gi, (m) => (m.toUpperCase() === "S" ? "-" : ""))
    .replace(/[EW]/gi, (m) => (m.toUpperCase() === "W" ? "-" : ""));
  const parts = cleaned.split(/[,;\s]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

type Props = {
  /** "crear" inserts a new record; "editar" updates napId. */
  mode: "crear" | "editar";
  napId?: string;
  /** Prefills the form: the record being edited, or the one being duplicated. */
  initial?: Nap | null;
  /** Keep existing photos (edit) or start empty (duplicate). */
  keepPhotos?: boolean;
  /** Initial state for new records ("pendiente" for boxes still to repair). */
  defaultEstado?: string;
};

export function NapForm({
  mode,
  napId,
  initial = null,
  keepPhotos = false,
  defaultEstado = "finalizada",
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, nombre } = useAuth();
  const geocode = useServerFn(reverseGeocode);

  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [coordText, setCoordText] = useState("");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fotosExistentes, setFotosExistentes] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [codigo, setCodigo] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [tecnico2, setTecnico2] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [localidad, setLocalidad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [trabajo, setTrabajo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [estado, setEstado] = useState<string>("finalizada");
  const [hydrated, setHydrated] = useState(false);

  // Load values from the record being edited or duplicated (once).
  useEffect(() => {
    if (!initial || hydrated) return;
    setCodigo(initial.codigo ?? "");
    setTecnico(initial.tecnico);
    setTecnico2(initial.tecnico_2 ?? "");
    setLocalidad(initial.localidad);
    setDireccion(initial.direccion);
    setTrabajo(initial.trabajo_realizado);
    setObservaciones(initial.observaciones ?? "");
    setEstado(initial.estado ?? "finalizada");
    setPin({ lat: initial.lat, lng: initial.lng });
    setCenter({ lat: initial.lat, lng: initial.lng });
    if (mode === "editar") setFecha(initial.fecha);
    if (keepPhotos) {
      setFotosExistentes(initial.fotos);
      void signedPhotoUrls(initial.fotos).then(setPreviews);
    }
    setHydrated(true);
  }, [initial, hydrated, keepPhotos, mode]);

  // Keep the coordinate text input in sync with the selected pin.
  useEffect(() => {
    setCoordText(pin ? `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}` : "");
  }, [pin]);

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
      const nuevas = files.length > 0 ? await uploadPhotos(user.id, files) : [];
      const payload = {
        codigo: codigo.trim() || null,
        tecnico: tecnico.trim() || nombre,
        tecnico_2: tecnico2 || null,
        fecha,
        localidad: localidad.trim(),
        direccion: direccion.trim(),
        trabajo_realizado: trabajo.trim(),
        observaciones: observaciones.trim() || null,
        estado,
        lat: pin.lat,
        lng: pin.lng,
        fotos: [...fotosExistentes, ...nuevas],
      };

      let id = napId;
      if (mode === "editar" && napId) {
        const { error } = await supabase.from("naps").update(payload).eq("id", napId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("naps")
          .insert({ ...payload, user_id: user.id })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }

      await queryClient.invalidateQueries({ queryKey: ["naps"] });
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["nap", id] });
        await queryClient.invalidateQueries({ queryKey: ["nap-historial", id] });
      }
      toast.success(mode === "editar" ? "Registro actualizado" : "NAP registrada");
      if (id) navigate({ to: "/registro/$id", params: { id } });
    } catch (err) {
      toast.error("No pudimos guardar la NAP", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
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
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
            Usar mi ubicación
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="coordenadas">Coordenadas (lat, lng)</Label>
          <Input
            id="coordenadas"
            value={coordText}
            placeholder="-34.603722, -58.381592"
            onChange={(e) => {
              const value = e.target.value;
              setCoordText(value);
              const parsed = parseCoordinates(value);
              if (parsed) {
                setPin(parsed);
                setCenter(parsed);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Podés escribir o pegar las coordenadas, o elegir el punto en el mapa.
          </p>
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
            <Select value={tecnico} onValueChange={setTecnico} required>
              <SelectTrigger id="tecnico" className="w-full">
                <SelectValue placeholder="Seleccionar técnico" />
              </SelectTrigger>
              <SelectContent>
                {TECNICOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Label htmlFor="tecnico2">Técnico 2 (opcional)</Label>
          <Select
            value={tecnico2 || "none"}
            onValueChange={(v) => setTecnico2(v === "none" ? "" : v)}
          >
            <SelectTrigger id="tecnico2" className="w-full">
              <SelectValue placeholder="Sin segundo técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin segundo técnico</SelectItem>
              {TECNICOS.filter((t) => t !== tecnico).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="localidad">Localidad</Label>
          <Select value={localidad} onValueChange={setLocalidad} required>
            <SelectTrigger id="localidad" className="w-full">
              <SelectValue placeholder="Seleccionar localidad" />
            </SelectTrigger>
            <SelectContent>
              {LOCALIDADES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado del trabajo</Label>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger id="estado" className="w-full">
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((url, i) => (
                <div key={url} className="relative">
                  <img
                    src={url}
                    alt={`Fotografía ${i + 1} de la caja NAP`}
                    className="aspect-4/3 w-full rounded-md border object-cover"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="absolute right-1 top-1 h-6 px-2 text-xs"
                    onClick={() => {
                      setFotosExistentes((prev) => prev.filter((_, idx) => idx !== i));
                      setPreviews((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Input
            id="fotos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <p className="text-xs text-muted-foreground">{files.length} foto(s) nueva(s)</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {mode === "editar" ? "Guardar cambios" : "Guardar registro"}
        </Button>
      </div>
    </form>
  );
}
