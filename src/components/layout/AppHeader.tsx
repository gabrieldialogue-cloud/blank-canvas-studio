import { SidebarTrigger } from "@/components/ui/sidebar";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlteseLogoIcon, AlteseLogoHorizontal } from "./AlteseLogoIcon";

export function AppHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Faixa informativa com gradiente laranja-vermelho */}
      <div className="w-full bg-gradient-to-r from-accent via-accent to-destructive/80 px-4 py-2.5 text-center shadow-md">
        <p className="text-sm font-semibold text-white flex items-center justify-center gap-2">
          <span className="animate-pulse">⚡</span>
          Sistema híbrido IA + Vendedores para atendimento 24/7
          <span className="animate-pulse">⚡</span>
        </p>
      </div>

      <header className="sticky top-0 z-50 w-full border-b-2 border-secondary/30 bg-gradient-to-r from-primary via-primary to-secondary shadow-lg">
        <div className="flex h-16 items-center gap-4 px-6">
          <SidebarTrigger className="text-primary-foreground hover:bg-white/20 transition-colors" />
          
          <div className="flex items-center gap-3">
            <AlteseLogoHorizontal />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-white hover:bg-white/20"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Alternar tema</span>
            </Button>

            <Avatar className="h-9 w-9 border-2 border-white/30">
              <AvatarImage src="" alt="User" />
              <AvatarFallback className="bg-gradient-to-br from-accent to-accent/80 text-white font-bold">
                U
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
    </>
  );
}
