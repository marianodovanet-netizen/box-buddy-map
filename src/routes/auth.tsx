import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso técnicos | Dovanet NAP" },
      {
        name: "description",
        content:
          "Ingreso para técnicos de Dovanet: registrá cajas NAP reparadas con GPS, fotos y detalle del trabajo.",
      },
      { property: "og:title", content: "Acceso técnicos | Dovanet NAP" },
      {
        property: "og:description",
        content: "Ingreso para técnicos de Dovanet al registro de cajas NAP reparadas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/mapa" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("No pudimos ingresar", { description: error.message });
      return;
    }
    navigate({ to: "/mapa" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error("No pudimos crear la cuenta", { description: error.message });
      return;
    }
    toast.success("Cuenta creada", { description: "Ya podés empezar a registrar NAP." });
    navigate({ to: "/mapa" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No pudimos ingresar con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/mapa" });
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <MapPin className="size-6" /> Dovanet
        </Link>
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Cada NAP reparada, ubicada y documentada.
          </h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Coordenadas GPS, fotografías del trabajo y detalle de la intervención en un único
            registro que todo el equipo puede consultar en el mapa.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">Uso interno · Equipo técnico Dovanet</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold">Acceso de técnicos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresá para ver el mapa y cargar reparaciones.
          </p>

          <Tabs defaultValue="login" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={signIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tecnico@dovanet.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Ingresar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del técnico</Label>
                  <Input
                    id="nombre"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Correo</Label>
                  <Input
                    id="email2"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Contraseña</Label>
                  <Input
                    id="password2"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Crear cuenta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google}>
            Continuar con Google
          </Button>
        </div>
      </section>
    </main>
  );
}
