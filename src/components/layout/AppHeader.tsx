import { SidebarTrigger } from "@/components/ui/sidebar";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Faixa informativa laranja - estilo Altese */}
      <div className="w-full bg-accent px-4 py-2 text-center">
        <p className="text-sm font-medium text-accent-foreground">
          ⚡ Sistema híbrido IA + Vendedores para atendimento 24/7
        </p>
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-border bg-primary">
        <div className="flex h-16 items-center gap-4 px-6">
          <SidebarTrigger className="text-primary-foreground hover:bg-primary/90" />
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground">
                <span className="text-2xl font-bold text-primary">A</span>
              </div>
              <span className="text-xl font-bold text-primary-foreground">
                ALTESE
              </span>
            </div>
            <span className="hidden md:inline text-sm font-medium text-primary-foreground/80">
              AI Sales Sync
            </span>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-primary-foreground hover:bg-primary/90"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Alternar tema</span>
            </Button>

            <Avatar className="h-9 w-9">
              <AvatarImage src="" alt="User" />
              <AvatarFallback className="bg-accent text-accent-foreground">
                U
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
    </>
  );
}
