import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

      <header className="w-full border-b-2 border-secondary/30 bg-gradient-to-r from-primary via-primary to-secondary shadow-lg relative overflow-hidden">
        {/* Fundo texturizado */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '30px 30px'
        }}></div>
        
        <div className="flex h-14 items-center justify-end gap-4 px-6 relative z-10">
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
      </header>
    </>
  );
}
