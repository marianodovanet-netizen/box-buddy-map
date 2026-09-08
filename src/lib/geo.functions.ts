import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

type GeocodeResult = {
  direccion: string;
  localidad: string;
};

/** Reverse geocoding: turns coordinates into a street address + locality. */
export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => coordsSchema.parse(input))
  .handler(async ({ data }): Promise<GeocodeResult> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) {
      throw new Error("Faltan las credenciales de Google Maps");
    }

    const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=es`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Geocoding failed [${response.status}]: ${body}`);
      throw new Error(`No se pudo obtener la dirección [${response.status}]`);
    }

    const payload = (await response.json()) as {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name: string; types: string[] }>;
      }>;
    };

    const first = payload.results?.[0];
    if (!first) return { direccion: "", localidad: "" };

    const components = first.address_components ?? [];
    const pick = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name ?? "";

    const localidad =
      pick("locality") ||
      pick("administrative_area_level_2") ||
      pick("sublocality") ||
      pick("administrative_area_level_1");

    return {
      direccion: first.formatted_address ?? "",
      localidad,
    };
  });
