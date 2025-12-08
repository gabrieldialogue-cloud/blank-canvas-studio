import { Home, MessageSquare, FileText, Settings, User, LogOut, Shield, Users, AlertCircle, PanelLeftClose, PanelLeft } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlteseLogoIcon, AlteseLogoText } from "./AlteseLogoIcon";

const menuItems = [
  { title: "Atendimentos", url: "/", icon: MessageSquare },
  { title: "Listas", url: "/orcamentos", icon: FileText },
  { title: "Contatos", url: "/contatos", icon: Users },
];

const supervisorItems = [
  { title: "Atendimentos", url: "/supervisor/atendimentos", icon: MessageSquare },
  { title: "Gestão", url: "/supervisor", icon: Shield }
];

const bottomItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Perfil", url: "/perfil", icon: User },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasPriority, setHasPriority] = useState(false);

  useEffect(() => {
    const checkRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (roles) {
          setIsSuperAdmin(roles.some(r => r.role === 'super_admin'));
          setIsSupervisor(roles.some(r => r.role === 'supervisor'));
        }

        // Verificar status online (simulado - baseado em atividade)
        const lastActivity = localStorage.getItem('lastActivity');
        if (lastActivity) {
          const diff = Date.now() - parseInt(lastActivity);
          setIsOnline(diff < 300000); // Online se atividade nos últimos 5 minutos
        }

        // Verificar prioridade (simulado - seria baseado em métricas reais)
        const priority = localStorage.getItem('userPriority');
        setHasPriority(priority === '1');
      }
    };
    checkRoles();

    // Atualizar lastActivity periodicamente
    const interval = setInterval(() => {
      localStorage.setItem('lastActivity', Date.now().toString());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    } else {
      navigate("/auth");
    }
  };

  return (
    <Sidebar className="border-r-2 border-sidebar-border bg-gradient-to-b from-sidebar-background to-sidebar-background/95">
      <SidebarContent>
        {/* Logo e botão de toggle no topo da sidebar */}
        <div className="px-4 py-4 border-b border-sidebar-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlteseLogoIcon className="h-10 w-10 drop-shadow-md" />
              {open && (
                <AlteseLogoText className="text-sidebar-foreground" />
              )}
            </div>
            <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent p-2 rounded-lg transition-colors" />
          </div>
        </div>

        {/* Status e Prioridade - apenas para vendedores */}
        {!isSuperAdmin && !isSupervisor && (
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2">
              <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'} shrink-0`} />
              {open && (
                <span className="text-xs text-sidebar-foreground">
                  {isOnline ? "Online" : "Offline"}
                </span>
              )}
            </div>
            
            {hasPriority && (
              <div className="flex items-center gap-2 rounded-lg bg-accent/20 p-2 border border-accent/30">
                <AlertCircle className="h-4 w-4 text-accent shrink-0" />
                {open && (
                  <span className="text-xs text-accent font-medium">
                    Prioridade na Fila
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 px-4 py-4 text-xs font-semibold uppercase tracking-wider">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isSupervisor ? (
                supervisorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 px-4 py-3 text-sidebar-foreground transition-all hover:bg-sidebar-accent rounded-lg mx-2"
                        activeClassName="bg-gradient-to-r from-accent to-secondary text-white font-medium shadow-md"
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 px-4 py-3 text-sidebar-foreground transition-all hover:bg-sidebar-accent rounded-lg mx-2"
                        activeClassName="bg-gradient-to-r from-accent to-secondary text-white font-medium shadow-md"
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto border-t border-sidebar-border/50 pt-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {bottomItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-4 py-3 text-sidebar-foreground transition-all hover:bg-sidebar-accent rounded-lg mx-2"
                        activeClassName="bg-gradient-to-r from-primary to-secondary text-white font-medium shadow-md"
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {isSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/super-admin"
                        className="flex items-center gap-3 px-4 py-3 text-sidebar-foreground transition-all hover:bg-destructive/20 hover:text-destructive rounded-lg mx-2"
                        activeClassName="bg-gradient-to-r from-destructive to-accent text-white font-medium shadow-md"
                      >
                        <Shield className="h-5 w-5" />
                        {open && <span>Super Admin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sidebar-foreground transition-all hover:bg-destructive/20 hover:text-destructive rounded-lg mx-2"
                    >
                      <LogOut className="h-5 w-5" />
                      {open && <span>Sair</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
