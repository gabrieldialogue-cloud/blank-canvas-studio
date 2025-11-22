import { Home, MessageSquare, FileText, TrendingUp, Settings, User, LogOut, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlteseLogoIcon, AlteseLogoText } from "./AlteseLogoIcon";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Atendimentos", url: "/atendimentos", icon: MessageSquare },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  { title: "Pós-venda", url: "/pos-venda", icon: TrendingUp },
];

const bottomItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Perfil", url: "/perfil", icon: User },
  { title: "Super Admin", url: "/super-admin", icon: Shield, restricted: true },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

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
        {/* Logo no topo da sidebar */}
        <div className="px-4 py-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2">
            <AlteseLogoIcon className="h-10 w-10 drop-shadow-md" />
            {open && (
              <AlteseLogoText className="text-sidebar-foreground" />
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 px-4 py-4 text-xs font-semibold uppercase tracking-wider">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
              ))}
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
                        className={`flex items-center gap-3 px-4 py-3 text-sidebar-foreground transition-all rounded-lg mx-2 ${
                          item.restricted ? "hover:bg-destructive/20 hover:text-destructive" : "hover:bg-sidebar-accent"
                        }`}
                        activeClassName={`${
                          item.restricted
                            ? "bg-gradient-to-r from-destructive to-accent text-white"
                            : "bg-gradient-to-r from-primary to-secondary text-white"
                        } font-medium shadow-md`}
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
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
