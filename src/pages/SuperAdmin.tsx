import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Loader2, UserPlus, UserCog, Users } from "lucide-react";
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
  const [vendedorEspecialidade, setVendedorEspecialidade] = useState("");
  const [vendedorLoading, setVendedorLoading] = useState(false);

  // Assignment management
  const [supervisores, setSupervisores] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [selectedVendedor, setSelectedVendedor] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (authenticated) {
      fetchSupervisoresAndVendedores();
      fetchAssignments();
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
    try {
      const { data, error } = await supabase
        .from('vendedor_supervisor')
        .select(`
          id,
          vendedor_id,
          supervisor_id,
          vendedor:usuarios!vendedor_supervisor_vendedor_id_fkey(id, nome, email),
          supervisor:usuarios!vendedor_supervisor_supervisor_id_fkey(id, nome, email)
        `);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Erro ao carregar atribuições",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
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

      const { error } = await supabase
        .from('vendedor_supervisor')
        .insert({
          supervisor_id: selectedSupervisor,
          vendedor_id: selectedVendedor,
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
      const { error } = await supabase
        .from('vendedor_supervisor')
        .delete()
        .eq('id', assignmentId);

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
          especialidade_marca: vendedorEspecialidade,
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
      setVendedorEspecialidade("");

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
              Vendedores recebem e gerenciam atendimentos de sua especialidade
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
              <div className="space-y-2">
                <Label htmlFor="vendedor-especialidade">Especialidade/Marca</Label>
                <Input
                  id="vendedor-especialidade"
                  placeholder="Ex: Toyota, Honda, Chevrolet"
                  value={vendedorEspecialidade}
                  onChange={(e) => setVendedorEspecialidade(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Marca de veículos que este vendedor irá atender
                </p>
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
              
              {dataLoading ? (
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
      </div>
    </div>
  );
}
