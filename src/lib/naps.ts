import { supabase } from "@/integrations/supabase/client";

export type Nap = {
  id: string;
  user_id: string;
  codigo: string | null;
  tecnico: string;
  fecha: string;
  localidad: string;
  direccion: string;
  trabajo_realizado: string;
  observaciones: string | null;
  lat: number;
  lng: number;
  fotos: string[];
  created_at: string;
  updated_at: string;
};

export async function fetchNaps(): Promise<Nap[]> {
  const { data, error } = await supabase
    .from("naps")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Nap[];
}

export async function fetchNap(id: string): Promise<Nap> {
  const { data, error } = await supabase.from("naps").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Nap;
}

export async function signedPhotoUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage.from("nap-fotos").createSignedUrls(paths, 3600);
  if (error) throw error;
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean);
}

export async function uploadPhotos(userId: string, files: File[]): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("nap-fotos").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
    });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}
