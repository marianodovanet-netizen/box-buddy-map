export const LOCALIDADES = [
  "BELLA VISTA",
  "CAMPO HERRERA",
  "CHAÑARITO",
  "FAMAILLÁ",
  "LOS AGUIRRES",
  "LULES",
  "SAN PABLO",
];

export const TECNICOS = [
  "ACEVEDO GASTON",
  "AQUINO OMAR",
  "BARRIONUEVO MANUEL",
  "BLANCO JUAN PABLO",
  "CAROL SEBASTIAN",
  "FERNANDEZ MAURO",
  "GONZALEZ EMANUEL",
  "GONZALEZ SANTIAGO",
  "GUCHEA MIGUEL",
  "PEREZ EMANUEL",
  "RITTI JESUS",
  "ROBLES BRUNO",
  "VERA LEONEL",
];

export type EstadoNap = "pendiente" | "en_curso" | "finalizada";

export const ESTADOS: { value: EstadoNap; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_curso", label: "En curso" },
  { value: "finalizada", label: "Finalizada" },
];

export function estadoLabel(value: string): string {
  return ESTADOS.find((e) => e.value === value)?.label ?? value;
}

// Distinct marker colours so each locality is recognisable at a glance.
const LOCALIDAD_COLORS: Record<string, string> = {
  "BELLA VISTA": "#1d4ed8",
  "CAMPO HERRERA": "#0d9488",
  CHAÑARITO: "#b91c1c",
  FAMAILLÁ: "#7c3aed",
  "LOS AGUIRRES": "#ea580c",
  LULES: "#15803d",
  "SAN PABLO": "#be185d",
};

const FALLBACK_COLORS = ["#0369a1", "#4d7c0f", "#a16207", "#9333ea", "#0f766e", "#c2410c"];

export function colorForLocalidad(localidad: string): string {
  const known = LOCALIDAD_COLORS[localidad];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < localidad.length; i += 1) hash = (hash * 31 + localidad.charCodeAt(i)) % 9973;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]!;
}

export function directionsUrl(nap: {
  lat: number;
  lng: number;
  direccion?: string | null;
  localidad?: string | null;
}): string {
  const destination = `${nap.lat},${nap.lng}`;
  const params = new URLSearchParams({ api: "1", destination });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
