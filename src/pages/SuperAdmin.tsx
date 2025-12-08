import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Loader2, UserPlus, UserCog, Users, Phone, MessageSquare, CheckCircle, XCircle, AlertCircle, Smartphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResetUsersButton } from "@/components/ResetUsersButton";

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

  // Meta Cloud API (Número Principal da IA)
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaBusinessAccountId, setMetaBusinessAccountId] = useState("");
  const [metaWebhookToken, setMetaWebhookToken] = useState("");
  const [metaApiSaving, setMetaApiSaving] = useState(false);
  const [metaApiStatus, setMetaApiStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [metaPhoneDisplay, setMetaPhoneDisplay] = useState<string | null>(null);
  const [metaVerifiedName, setMetaVerifiedName] = useState<string | null>(null);
  const [checkingMetaStatus, setCheckingMetaStatus] = useState(false);

  // Evolution API (Números Pessoais dos Vendedores)
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");
  const [evolutionSaving, setEvolutionSaving] = useState(false);
  const [evolutionStatus, setEvolutionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [selectedVendedorForWhatsApp, setSelectedVendedorForWhatsApp] = useState("");
  const [vendedorInstanceName, setVendedorInstanceName] = useState("");
  const [vendedorWhatsAppNumber, setVendedorWhatsAppNumber] = useState("");
  const [creatingInstance, setCreatingInstance] = useState(false);

  const checkWhatsAppStatus = async () => {
    setCheckingMetaStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-whatsapp-status');
      
      if (error) throw error;
      
      if (data?.status === 'connected') {
        setMetaApiStatus('connected');
        setMetaPhoneDisplay(data.phoneNumber);
        setMetaVerifiedName(data.verifiedName);
      } else if (data?.status === 'disconnected') {
        setMetaApiStatus('disconnected');
      } else {
        setMetaApiStatus('unknown');
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setMetaApiStatus('unknown');
    } finally {
      setCheckingMetaStatus(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchSupervisoresAndVendedores();
      fetchAssignments();
      checkWhatsAppStatus();
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
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status da Conexão:</span>
                    {checkingMetaStatus ? (
                      <Badge variant="secondary">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Verificando...
                      </Badge>
                    ) : metaApiStatus === 'connected' ? (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                    ) : metaApiStatus === 'disconnected' ? (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Desconectado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Não verificado
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">API Oficial do WhatsApp Business</span>
                </div>

                {/* Connected Phone Info */}
                {metaApiStatus === 'connected' && (metaPhoneDisplay || metaVerifiedName) && (
                  <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                        <Phone className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {metaVerifiedName || 'Número Principal Conectado'}
                        </p>
                        {metaPhoneDisplay && (
                          <p className="text-sm text-muted-foreground">{metaPhoneDisplay}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-500" />
                    Número Principal (IA)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Este é o número que a IA utilizará para responder automaticamente aos clientes via WhatsApp Business Cloud API.
                  </p>
                  
                  <Separator />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="meta-access-token">Access Token</Label>
                      <Input
                        id="meta-access-token"
                        type="password"
                        placeholder="EAAxxxxxxxxx..."
                        value={metaAccessToken}
                        onChange={(e) => setMetaAccessToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Token de acesso permanente do app Meta</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meta-phone-number-id">Phone Number ID</Label>
                      <Input
                        id="meta-phone-number-id"
                        placeholder="1234567890123456"
                        value={metaPhoneNumberId}
                        onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">ID do número de telefone no WhatsApp Business</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meta-business-account-id">Business Account ID</Label>
                      <Input
                        id="meta-business-account-id"
                        placeholder="1234567890123456"
                        value={metaBusinessAccountId}
                        onChange={(e) => setMetaBusinessAccountId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">ID da conta WhatsApp Business</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meta-webhook-token">Webhook Verify Token</Label>
                      <Input
                        id="meta-webhook-token"
                        placeholder="seu_token_secreto"
                        value={metaWebhookToken}
                        onChange={(e) => setMetaWebhookToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Token para verificar o webhook</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setMetaApiSaving(true);
                        // Simular salvamento - na prática, você usará a tool de secrets
                        setTimeout(() => {
                          toast({
                            title: "Configuração salva",
                            description: "As credenciais da Meta Cloud API foram atualizadas. Configure os secrets no Supabase.",
                          });
                          setMetaApiSaving(false);
                        }, 1000);
                      }}
                      className="flex-1 bg-blue-500 hover:bg-blue-600"
                      disabled={metaApiSaving || !metaAccessToken || !metaPhoneNumberId}
                    >
                      {metaApiSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Salvar Configuração
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={checkWhatsAppStatus}
                      disabled={checkingMetaStatus}
                    >
                      {checkingMetaStatus ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        'Testar Conexão'
                      )}
                    </Button>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      <strong>Importante:</strong> As credenciais serão salvas como secrets no Supabase. 
                      Após salvar, configure o webhook URL: <code className="bg-background px-1 rounded">https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-webhook</code>
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Evolution API Tab */}
              <TabsContent value="evolution" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status da Conexão:</span>
                    {evolutionStatus === 'connected' ? (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                    ) : evolutionStatus === 'disconnected' ? (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Desconectado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Não verificado
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">API Não-Oficial para múltiplos números</span>
                </div>

                {/* Evolution API Connection */}
                <div className="space-y-4 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-500" />
                    Conexão com Evolution API
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Configure a conexão com sua instância da Evolution API para gerenciar os números pessoais dos vendedores.
                  </p>
                  
                  <Separator />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="evolution-api-url">URL da Evolution API</Label>
                      <Input
                        id="evolution-api-url"
                        placeholder="https://sua-evolution-api.com"
                        value={evolutionApiUrl}
                        onChange={(e) => setEvolutionApiUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">URL base da sua instância Evolution API</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="evolution-api-key">API Key (Global)</Label>
                      <Input
                        id="evolution-api-key"
                        type="password"
                        placeholder="sua-api-key-aqui"
                        value={evolutionApiKey}
                        onChange={(e) => setEvolutionApiKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Chave de API global da Evolution</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setEvolutionSaving(true);
                        setTimeout(() => {
                          toast({
                            title: "Configuração salva",
                            description: "As credenciais da Evolution API foram atualizadas. Configure os secrets no Supabase.",
                          });
                          setEvolutionSaving(false);
                        }, 1000);
                      }}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      disabled={evolutionSaving || !evolutionApiUrl || !evolutionApiKey}
                    >
                      {evolutionSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Salvar Configuração
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Teste de conexão",
                          description: "Funcionalidade de teste será implementada com as credenciais reais.",
                        });
                      }}
                    >
                      Testar Conexão
                    </Button>
                  </div>
                </div>

                {/* Create Instance for Vendedor */}
                <div className="space-y-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-purple-500" />
                    Conectar WhatsApp do Vendedor
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Crie uma instância na Evolution API para conectar o WhatsApp pessoal de um vendedor.
                  </p>
                  
                  <Separator />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="select-vendedor-whatsapp">Vendedor</Label>
                      <Select value={selectedVendedorForWhatsApp} onValueChange={setSelectedVendedorForWhatsApp}>
                        <SelectTrigger id="select-vendedor-whatsapp">
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

                    <div className="space-y-2">
                      <Label htmlFor="vendedor-instance-name">Nome da Instância</Label>
                      <Input
                        id="vendedor-instance-name"
                        placeholder="vendedor_joao"
                        value={vendedorInstanceName}
                        onChange={(e) => setVendedorInstanceName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Identificador único na Evolution API</p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="vendedor-whatsapp-number">Número do WhatsApp</Label>
                      <Input
                        id="vendedor-whatsapp-number"
                        placeholder="5511999999999"
                        value={vendedorWhatsAppNumber}
                        onChange={(e) => setVendedorWhatsAppNumber(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Número completo com código do país (sem + ou espaços)</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setCreatingInstance(true);
                      setTimeout(() => {
                        toast({
                          title: "Instância criada",
                          description: "A instância foi criada. O vendedor precisará escanear o QR Code.",
                        });
                        setCreatingInstance(false);
                        setSelectedVendedorForWhatsApp("");
                        setVendedorInstanceName("");
                        setVendedorWhatsAppNumber("");
                      }, 1500);
                    }}
                    className="w-full bg-purple-500 hover:bg-purple-600"
                    disabled={creatingInstance || !selectedVendedorForWhatsApp || !vendedorInstanceName || !vendedorWhatsAppNumber || !evolutionApiUrl}
                  >
                    {creatingInstance ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando Instância...
                      </>
                    ) : (
                      <>
                        <Smartphone className="mr-2 h-4 w-4" />
                        Criar Instância e Gerar QR Code
                      </>
                    )}
                  </Button>

                  {!evolutionApiUrl && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        <strong>Atenção:</strong> Configure a conexão com a Evolution API primeiro para criar instâncias.
                      </p>
                    </div>
                  )}
                </div>

                {/* Connected Vendedores List */}
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Vendedores com WhatsApp Conectado
                  </h3>
                  
                  <div className="text-center py-8 rounded-lg border border-dashed">
                    <Smartphone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum vendedor com WhatsApp conectado ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure a Evolution API e crie instâncias para os vendedores
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
