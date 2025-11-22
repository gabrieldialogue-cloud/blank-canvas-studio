import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Atendimentos from "./pages/Atendimentos";
import Orcamentos from "./pages/Orcamentos";
import PosVenda from "./pages/PosVenda";
import Configuracoes from "./pages/Configuracoes";
import Perfil from "./pages/Perfil";
import SuperAdmin from "./pages/SuperAdmin";
import Supervisor from "./pages/Supervisor";
import Contatos from "./pages/Contatos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/atendimentos" element={<Atendimentos />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/pos-venda" element={<PosVenda />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/perfil" element={<Perfil />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/supervisor" element={<Supervisor />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
