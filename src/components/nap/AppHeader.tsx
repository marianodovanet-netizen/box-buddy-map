import { Link, useNavigate } from "@tanstack/react-router";
import { Clock, LogOut, MapPin, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const { nombre } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4">
        <Link to="/mapa" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <MapPin className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Dovanet <span className="text-muted-foreground">· NAP</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 sm:flex">
          <Link
            to="/mapa"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
          >
            Mapa y registros
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground md:inline">{nombre}</span>
          <Button asChild size="sm">
            <Link to="/nueva">
              <Plus className="size-4" />
              Nueva NAP
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cerrar sesión"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
