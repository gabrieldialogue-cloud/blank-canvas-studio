import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Loader2, UserPlus, UserCog, Users, Phone, MessageSquare, CheckCircle, XCircle, AlertCircle, Smartphone, Trash2, Plus, Copy, ExternalLink, ToggleLeft, ToggleRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResetUsersButton } from "@/components/ResetUsersButton";
import { EvolutionInstanceManager } from "@/components/superadmin/EvolutionInstanceManager";

const ADMIN_EMAIL = "gabriel.dialogue@gmail.com";
const ADMIN_PASSWORD = "0409L@ve";

export default function SuperAdmin() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Supervisor form
  const [supervisorNome, setSupervisorNome] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [supervisorSenha, setSupervisorSenha] = useState("");
  const [supervisorLoading, setSupervisorLoading] = useState(false);

  // Vendedor form
  const [vendedorNome, setVendedorNome] = useState("");
  const [vendedorEmail, setVendedorEmail] = useState("");
  const [vendedorSenha, setVendedorSenha] = useState("");
  const [vendedorLoading, setVendedorLoading] = useState(false);

  // Assignment management
  const [supervisores, setSupervisores] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [selectedVendedor, setSelectedVendedor] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Meta Cloud API (Múltiplos Números Oficiais)
  const [metaNumbers, setMetaNumbers] = useState<any[]>([]);
  const [metaNumbersLoading, setMetaNumbersLoading] = useState(false);
  const [newMetaName, setNewMetaName] = useState("");
  const [newMetaAccessToken, setNewMetaAccessToken] = useState("");
  const [newMetaPhoneNumberId, setNewMetaPhoneNumberId] = useState("");
  const [newMetaBusinessAccountId, setNewMetaBusinessAccountId] = useState("");
  const [newMetaWebhookToken, setNewMetaWebhookToken] = useState("");
  const [metaApiSaving, setMetaApiSaving] = useState(false);
  const [showAddMetaForm, setShowAddMetaForm] = useState(false);


  // Get dynamic webhook URL based on current site
  const getWebhookUrl = () => {
    const supabaseUrl = 'https://ptwrrcqttnvcvlnxsvut.supabase.co';
    return `${supabaseUrl}/functions/v1/whatsapp-webhook`;
  };

  const fetchMetaNumbers = async () => {
    setMetaNumbersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-credentials', {
        body: { action: 'list_meta_numbers' },
      });

      if (error) throw error;
      setMetaNumbers(data?.data || []);
    } catch (error) {
      console.error('Error fetching Meta numbers:', error);
      toast({
        title: "Erro ao carregar números",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setMetaNumbersLoading(false);
    }
  };

  const saveMetaCredentials = async () => {
    if (!newMetaName || !newMetaAccessToken || !newMetaPhoneNumberId) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, Access Token e Phone Number ID são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setMetaApiSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-credentials', {
        body: {
          action: 'save_meta_credentials',
          credentials: {
            name: newMetaName,
            accessToken: newMetaAccessToken,
            phoneNumberId: newMetaPhoneNumberId,
            businessAccountId: newMetaBusinessAccountId,
            webhookToken: newMetaWebhookToken,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Número cadastrado",
          description: data.message,
        });
        // Clear form and refresh list
        setNewMetaName("");
        setNewMetaAccessToken("");
        setNewMetaPhoneNumberId("");
        setNewMetaBusinessAccountId("");
        setNewMetaWebhookToken("");
        setShowAddMetaForm(false);
        fetchMetaNumbers();
      } else {
        toast({
          title: "Erro na validação",
          description: data?.message || "Erro ao validar credenciais",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving Meta credentials:', error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setMetaApiSaving(false);
    }
  };

  const deleteMetaNumber = async (numberId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-credentials', {
        body: { action: 'delete_meta_number', numberId },
      });

      if (error) throw error;

      toast({
        title: "Número removido",
        description: data?.message || "Número removido com sucesso",
      });
      fetchMetaNumbers();
    } catch (error) {
      console.error('Error deleting Meta number:', error);
      toast({
        title: "Erro ao remover",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const toggleMetaNumberStatus = async (numberId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-credentials', {
        body: { action: 'toggle_meta_number_status', numberId },
      });

      if (error) throw error;

      toast({
        title: "Status alterado",
        description: data?.message,
      });
      fetchMetaNumbers();
    } catch (error) {
      console.error('Error toggling Meta number status:', error);
      toast({
        title: "Erro ao alterar status",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const migrateMainNumber = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-credentials', {
        body: { action: 'migrate_main_number' },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Número migrado",
          description: data.message,
        });
        await fetchMetaNumbers();
        return true;
      } else {
        toast({
          title: "Erro na migração",
          description: data?.message || "Erro desconhecido",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error migrating main number:', error);
      toast({
        title: "Erro ao migrar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      return false;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência",
    });
  };


  useEffect(() => {
    if (authenticated) {
      fetchSupervisoresAndVendedores();
      fetchAssignments();
      fetchMetaNumbers();
    }
  }, [authenticated]);

  const fetchSupervisoresAndVendedores = async () => {
    try {
      setDataLoading(true);

      // Fetch supervisores
      const { data: supervisorData, error: supervisorError } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('role', 'supervisor');

      if (supervisorError) throw supervisorError;
      setSupervisores(supervisorData || []);

      // Fetch vendedores
      const { data: vendedorData, error: vendedorError } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('role', 'vendedor');

      if (vendedorError) throw vendedorError;
      setVendedores(vendedorData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setDataLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-vendedor-assignment', {
        body: { action: 'list' },
      });

      if (error) throw error;
      
      if (data?.success && data?.data) {
        setAssignments(data.data);
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Erro ao carregar atribuições",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleAssignVendedor = async () => {
    if (!selectedSupervisor || !selectedVendedor) {
      toast({
        title: "Seleção incompleta",
        description: "Selecione supervisor e vendedor",
        variant: "destructive",
      });
      return;
    }
  
    try {
      setAssignmentLoading(true);
  
      const { error } = await supabase.functions.invoke('manage-vendedor-assignment', {
        body: {
          action: 'assign',
          supervisor_id: selectedSupervisor,
          vendedor_id: selectedVendedor,
        },
      });
  
      if (error) throw error;
  
      toast({
        title: "Vendedor atribuído",
        description: "Atribuição criada com sucesso",
      });
  
      setSelectedSupervisor("");
      setSelectedVendedor("");
      fetchAssignments();
    } catch (error) {
      console.error('Error assigning vendedor:', error);
      toast({
        title: "Erro ao atribuir vendedor",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setAssignmentLoading(false);
    }
  };
  
  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-vendedor-assignment', {
        body: {
          action: 'unassign',
          assignment_id: assignmentId,
        },
      });
  
      if (error) throw error;
  
      toast({
        title: "Atribuição removida",
        description: "Vendedor desatribuído com sucesso",
      });
  
      fetchAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: "Erro ao remover atribuição",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      toast({
        title: "Autenticado com sucesso",
        description: "Bem-vindo ao painel Super Admin",
      });
    } else {
      toast({
        title: "Credenciais inválidas",
        description: "Email ou senha incorretos",
        variant: "destructive",
      });
    }
    
    setAuthLoading(false);
  };

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupervisorLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-supervisor', {
        body: {
          nome: supervisorNome,
          email: supervisorEmail,
          senha: supervisorSenha,
        },
      });

      if (error) throw error;

      toast({
        title: "Supervisor criado com sucesso",
        description: `${supervisorNome} foi cadastrado no sistema`,
      });

      // Reset form
      setSupervisorNome("");
      setSupervisorEmail("");
      setSupervisorSenha("");

      // Refresh lists
      fetchSupervisoresAndVendedores();
    } catch (error) {
      console.error('Error creating supervisor:', error);
      toast({
        title: "Erro ao criar supervisor",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSupervisorLoading(false);
    }
  };

  const handleCreateVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendedorLoading(true);
 
    try {
      const { data, error } = await supabase.functions.invoke('create-vendedor', {
        body: {
          nome: vendedorNome,
          email: vendedorEmail,
          senha: vendedorSenha,
          especialidade_marca: 'Sem especialidade definida',
        },
      });
 
      if (error) throw error;
 
      toast({
        title: "Vendedor criado com sucesso",
        description: `${vendedorNome} foi cadastrado no sistema`,
      });
 
      // Reset form
      setVendedorNome("");
      setVendedorEmail("");
      setVendedorSenha("");
 
      // Refresh lists
      fetchSupervisoresAndVendedores();
    } catch (error) {
      console.error('Error creating vendedor:', error);
      toast({
        title: "Erro ao criar vendedor",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setVendedorLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-2xl border-destructive">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-destructive to-accent shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Super Admin
            </CardTitle>
            <CardDescription>
              Acesso restrito. Insira suas credenciais de administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-destructive hover:bg-destructive/90"
                disabled={authLoading}
              >
                {authLoading ? "Autenticando..." : "Acessar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-destructive to-accent shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Super Admin</h1>
              <p className="text-muted-foreground">
                Gerenciamento de contas e usuários do sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ResetUsersButton />
            <Badge className="bg-destructive text-destructive-foreground px-4 py-2 text-sm">
              Acesso Restrito
            </Badge>
          </div>
        </div>

        {/* Create Supervisor Card */}
        <Card className="border-primary bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Criar Conta de Supervisor
            </CardTitle>
            <CardDescription>
              Supervisores podem visualizar todos os atendimentos e gerenciar vendedores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSupervisor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supervisor-nome">Nome Completo</Label>
                <Input
                  id="supervisor-nome"
                  placeholder="Ex: João Silva"
                  value={supervisorNome}
                  onChange={(e) => setSupervisorNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supervisor-email">Email</Label>
                <Input
                  id="supervisor-email"
                  type="email"
                  placeholder="supervisor@exemplo.com"
                  value={supervisorEmail}
                  onChange={(e) => setSupervisorEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supervisor-senha">Senha</Label>
                <Input
                  id="supervisor-senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={supervisorSenha}
                  onChange={(e) => setSupervisorSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={supervisorLoading}
              >
                {supervisorLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Supervisor
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Create Vendedor Card */}
        <Card className="border-success bg-gradient-to-br from-success/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-success" />
              Criar Conta de Vendedor
            </CardTitle>
            <CardDescription>
              Vendedores receberão uma especialidade definida depois pelo supervisor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateVendedor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendedor-nome">Nome Completo</Label>
                <Input
                  id="vendedor-nome"
                  placeholder="Ex: Maria Santos"
                  value={vendedorNome}
                  onChange={(e) => setVendedorNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendedor-email">Email</Label>
                <Input
                  id="vendedor-email"
                  type="email"
                  placeholder="vendedor@exemplo.com"
                  value={vendedorEmail}
                  onChange={(e) => setVendedorEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendedor-senha">Senha</Label>
                <Input
                  id="vendedor-senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={vendedorSenha}
                  onChange={(e) => setVendedorSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-success hover:bg-success/90"
                disabled={vendedorLoading}
              >
                {vendedorLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Vendedor
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Assignment Management Card */}
        <Card className="border-accent bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Atribuir Vendedores a Supervisores
            </CardTitle>
            <CardDescription>
              Gerencie a hierarquia de vendedores e supervisores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assignment Form */}
            <div className="space-y-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
              <h3 className="font-semibold text-foreground">Nova Atribuição</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="select-supervisor">Supervisor</Label>
                  <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                    <SelectTrigger id="select-supervisor">
                      <SelectValue placeholder="Selecione um supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisores.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.nome} ({sup.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="select-vendedor">Vendedor</Label>
                  <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                    <SelectTrigger id="select-vendedor">
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((vend) => (
                        <SelectItem key={vend.id} value={vend.id}>
                          {vend.nome} ({vend.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleAssignVendedor}
                className="w-full bg-accent hover:bg-accent/90"
                disabled={assignmentLoading || !selectedSupervisor || !selectedVendedor}
              >
                {assignmentLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atribuindo...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Atribuir Vendedor
                  </>
                )}
              </Button>
            </div>

            {/* Current Assignments */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Atribuições Atuais</h3>
              
              {assignmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 rounded-lg border border-dashed">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma atribuição cadastrada
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-primary" />
                          <span className="font-medium text-foreground">
                            {assignment.supervisor?.nome || 'N/A'}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <User className="h-4 w-4 text-success" />
                          <span className="font-medium text-foreground">
                            {assignment.vendedor?.nome || 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supervisor: {assignment.supervisor?.email || 'N/A'} | 
                          Vendedor: {assignment.vendedor?.email || 'N/A'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* WhatsApp API Configuration Section */}
        <Card className="border-blue-500/50 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Configuração das APIs WhatsApp
            </CardTitle>
            <CardDescription>
              Configure as conexões com WhatsApp para o número principal (IA) e números pessoais dos vendedores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="meta-cloud" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="meta-cloud" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Meta Cloud API
                </TabsTrigger>
                <TabsTrigger value="evolution" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Evolution API
                </TabsTrigger>
              </TabsList>

              {/* Meta Cloud API Tab */}
              <TabsContent value="meta-cloud" className="space-y-4 mt-4">
                {/* Webhook URL Info */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-blue-500" />
                        Webhook URL (para todos os números)
                      </h4>
                      <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded mt-1 block break-all">
                        {getWebhookUrl()}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getWebhookUrl())}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Configure esta URL como webhook em todos os números no painel da Meta.
                  </p>
                </div>

                {/* Numbers List Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Números Cadastrados</h3>
                    <p className="text-sm text-muted-foreground">
                      {metaNumbers.filter(n => n.is_active).length} ativo(s) de {metaNumbers.length} total
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowAddMetaForm(!showAddMetaForm)}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Número
                  </Button>
                </div>

                {/* Add New Number Form */}
                {showAddMetaForm && (
                  <div className="space-y-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4 text-blue-500" />
                      Adicionar Novo Número Meta
                    </h3>
                    
                    <Separator />
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="new-meta-name">Nome Identificador *</Label>
                        <Input
                          id="new-meta-name"
                          placeholder="Ex: Atendimento Principal, Vendas, Suporte..."
                          value={newMetaName}
                          onChange={(e) => setNewMetaName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Nome para identificar este número no sistema</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-meta-access-token">Access Token *</Label>
                        <Input
                          id="new-meta-access-token"
                          type="password"
                          placeholder="EAAxxxxxxxxx..."
                          value={newMetaAccessToken}
                          onChange={(e) => setNewMetaAccessToken(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Token de acesso permanente do app Meta</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-meta-phone-number-id">Phone Number ID *</Label>
                        <Input
                          id="new-meta-phone-number-id"
                          placeholder="1234567890123456"
                          value={newMetaPhoneNumberId}
                          onChange={(e) => setNewMetaPhoneNumberId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">ID do número de telefone no WhatsApp Business</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-meta-business-account-id">Business Account ID</Label>
                        <Input
                          id="new-meta-business-account-id"
                          placeholder="1234567890123456"
                          value={newMetaBusinessAccountId}
                          onChange={(e) => setNewMetaBusinessAccountId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">ID da conta WhatsApp Business (opcional)</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-meta-webhook-token">Webhook Verify Token</Label>
                        <Input
                          id="new-meta-webhook-token"
                          placeholder="seu_token_secreto"
                          value={newMetaWebhookToken}
                          onChange={(e) => setNewMetaWebhookToken(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Token para verificar o webhook (opcional)</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveMetaCredentials}
                        className="flex-1 bg-blue-500 hover:bg-blue-600"
                        disabled={metaApiSaving || !newMetaName || !newMetaAccessToken || !newMetaPhoneNumberId}
                      >
                        {metaApiSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Validando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Validar e Cadastrar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddMetaForm(false);
                          setNewMetaName("");
                          setNewMetaAccessToken("");
                          setNewMetaPhoneNumberId("");
                          setNewMetaBusinessAccountId("");
                          setNewMetaWebhookToken("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Numbers List */}
                {metaNumbersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : metaNumbers.length === 0 ? (
                  <div className="text-center py-8 rounded-lg border border-dashed">
                    <Phone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum número Meta cadastrado
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em "Adicionar Número" para cadastrar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {metaNumbers.map((number) => (
                      <div
                        key={number.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          number.is_main 
                            ? 'border-blue-500/50 bg-blue-500/10'
                            : number.is_active 
                              ? 'border-success/30 bg-success/5' 
                              : 'border-muted bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            number.is_main
                              ? 'bg-blue-500/20'
                              : number.is_active 
                                ? 'bg-success/20' 
                                : 'bg-muted'
                          }`}>
                            <Phone className={`h-5 w-5 ${
                              number.is_main
                                ? 'text-blue-500'
                                : number.is_active 
                                  ? 'text-success' 
                                  : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-2">
                              {number.name}
                              {number.is_main && (
                                <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                                  Principal
                                </Badge>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {number.verified_name || number.phone_display}
                            </p>
                            {number.phone_display && number.verified_name && (
                              <p className="text-xs text-muted-foreground">{number.phone_display}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={number.is_active ? "default" : "secondary"} className={number.is_active ? "bg-success" : ""}>
                            {number.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (number.is_main) {
                                // Migrate to database first, then toggle
                                const migrated = await migrateMainNumber();
                                if (migrated) {
                                  // After migration, the list will refresh and we can toggle the new DB entry
                                  toast({
                                    title: "Número migrado para o banco",
                                    description: "Agora você pode gerenciar este número pela interface. Clique novamente para alterar o status.",
                                  });
                                }
                              } else {
                                toggleMetaNumberStatus(number.id);
                              }
                            }}
                            title={number.is_active ? "Desativar" : "Ativar"}
                          >
                            {number.is_active ? (
                              <ToggleRight className="h-4 w-4 text-success" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (number.is_main) {
                                // Migrate to database first, then delete
                                const migrated = await migrateMainNumber();
                                if (migrated) {
                                  toast({
                                    title: "Número migrado para o banco",
                                    description: "Agora você pode gerenciar este número pela interface. Clique novamente para excluir.",
                                  });
                                }
                              } else {
                                deleteMetaNumber(number.id);
                              }
                            }}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Evolution API Tab */}
              <TabsContent value="evolution" className="mt-4">
                <EvolutionInstanceManager vendedores={vendedores} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
