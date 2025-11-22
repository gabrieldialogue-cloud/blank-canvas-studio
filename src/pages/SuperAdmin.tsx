import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, MessageSquare, Bot, Zap, AlertTriangle, User, Loader2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

export default function SuperAdmin() {
  const { toast } = useToast();
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchVendedores();
  }, []);

  const fetchVendedores = async () => {
    try {
      setLoading(true);
      console.log('Fetching vendedores...');
      
      const { data, error } = await supabase.functions.invoke('manage-vendedor', {
        body: { action: 'list' },
      });

      console.log('Response:', data, error);

      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }

      if (!data || !data.vendedores) {
        console.error('Invalid response format:', data);
        throw new Error('Formato de resposta inválido');
      }

      console.log(`Loaded ${data.vendedores.length} vendedores`);
      setVendedores(data.vendedores || []);
    } catch (error) {
      console.error('Error fetching vendedores:', error);
      toast({
        title: 'Erro ao carregar vendedores',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVendedor = async (vendedor: any, enable: boolean) => {
    try {
      setActionLoading(vendedor.user_id);

      const especialidade = enable ? prompt('Digite a especialidade/marca do vendedor (ex: Toyota, Honda):') : null;
      
      if (enable && !especialidade) {
        toast({
          title: 'Ação cancelada',
          description: 'Especialidade é obrigatória',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('manage-vendedor', {
        body: {
          action: enable ? 'enable' : 'disable',
          user_id: vendedor.user_id,
          nome: vendedor.nome,
          email: vendedor.email,
          especialidade_marca: especialidade,
        },
      });

      if (error) throw error;

      toast({
        title: enable ? 'Vendedor habilitado' : 'Vendedor desabilitado',
        description: data.message,
      });

      fetchVendedores();
    } catch (error) {
      console.error('Error toggling vendedor:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-destructive to-accent shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Super Admin</h1>
                <p className="text-muted-foreground">
                  Configurações técnicas e integrações do sistema
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-destructive text-destructive-foreground px-4 py-2 text-sm">
            Acesso Restrito
          </Badge>
        </div>

        <Tabs defaultValue="ia" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
            <TabsTrigger value="ia" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bot className="h-4 w-4 mr-2" />
              Agente IA
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-success data-[state=active]:text-success-foreground">
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="vendedores" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <User className="h-4 w-4 mr-2" />
              Vendedores
            </TabsTrigger>
            <TabsTrigger value="sistema" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Zap className="h-4 w-4 mr-2" />
              Sistema
            </TabsTrigger>
          </TabsList>

          {/* Configurações do Agente IA */}
          <TabsContent value="ia" className="space-y-6">
            <Card className="border-primary bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Configuração do Agente IA
                </CardTitle>
                <CardDescription>
                  Configure o comportamento e personalidade do agente IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ai-provider">Provedor de IA</Label>
                  <Input
                    id="ai-provider"
                    placeholder="Ex: OpenAI, Anthropic, Lovable AI"
                    defaultValue="Lovable AI"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provedor de serviço de inteligência artificial
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-model">Modelo IA</Label>
                  <Input
                    id="ai-model"
                    placeholder="Ex: google/gemini-2.5-flash"
                    defaultValue="google/gemini-2.5-flash"
                  />
                  <p className="text-xs text-muted-foreground">
                    Modelo específico a ser utilizado
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="system-prompt">Prompt do Sistema</Label>
                  <Textarea
                    id="system-prompt"
                    placeholder="Digite o prompt que define o comportamento da IA..."
                    className="min-h-[200px] font-mono text-sm"
                    defaultValue={`Você é um assistente virtual da Altese, especializada em autopeças.

Suas responsabilidades:
1. Identificar o veículo do cliente (marca, modelo, ano, placa, chassi)
2. Identificar a necessidade (peça específica, problema, garantia, reembolso)
3. Coletar todas as informações necessárias
4. Encaminhar para o vendedor especializado da marca com resumo completo
5. Nunca gerar links de pagamento (apenas vendedores podem)

Tom: Profissional, prestativo e eficiente.`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-api-key">API Key (Criptografada)</Label>
                  <Input
                    id="ai-api-key"
                    type="password"
                    placeholder="••••••••••••••••••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    Chave de API para autenticação com o provedor de IA
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="space-y-0.5">
                    <Label>Modo de Distribuição Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      IA distribui automaticamente por marca do veículo
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90">
                  Salvar Configurações de IA
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configurações WhatsApp */}
          <TabsContent value="whatsapp" className="space-y-6">
            <Card className="border-success bg-gradient-to-br from-success/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-success" />
                  WhatsApp Business API (Oficial)
                </CardTitle>
                <CardDescription>
                  Configure a integração com a API oficial do WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Configuração Atual
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Secrets configuradas: Access Token, Phone Number ID, Business Account ID, Webhook Verify Token
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="phone-number-id">Phone Number ID</Label>
                  <Input
                    id="phone-number-id"
                    placeholder="Ex: 123456789012345"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    ID do número de telefone configurado no Meta Business
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-account-id">Business Account ID</Label>
                  <Input
                    id="business-account-id"
                    placeholder="Ex: 987654321098765"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    ID da conta comercial do WhatsApp Business
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-webhook`}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText('https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-webhook');
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure esta URL no painel do Meta Business para receber webhooks
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Status da Integração</Label>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                    <span className="text-sm text-muted-foreground">Configurada (verifique no Meta Business)</span>
                  </div>
                </div>

                <Button className="w-full bg-success hover:bg-success/90">
                  Testar Conexão
                </Button>
              </CardContent>
            </Card>

            <Card className="border-accent bg-gradient-to-br from-accent/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-accent" />
                  Documentação e Ajuda
                </CardTitle>
                <CardDescription>
                  Recursos para configurar o WhatsApp Business API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Configuração no Meta Business
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        1. Configure o webhook URL no painel do Meta Business<br/>
                        2. Use o Verify Token configurado nas secrets<br/>
                        3. Ative as permissões de mensagens<br/>
                        4. Teste a integração enviando uma mensagem
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Links Úteis</Label>
                  <div className="space-y-2">
                    <a
                      href="https://developers.facebook.com/docs/whatsapp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      → Documentação WhatsApp Business API
                    </a>
                    <a
                      href="https://business.facebook.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      → Meta Business Suite
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gerenciamento de Vendedores */}
          <TabsContent value="vendedores" className="space-y-6">
            <Card className="border-secondary bg-gradient-to-br from-secondary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-secondary" />
                  Gerenciar Vendedores
                </CardTitle>
                <CardDescription>
                  Habilite ou desabilite contas de vendedores para receber atendimentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : vendedores.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma conta encontrada no Auth
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verifique os logs da edge function ou crie contas via Supabase Auth
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vendedores.map((vendedor) => (
                      <div
                        key={vendedor.user_id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{vendedor.nome}</h4>
                            {vendedor.habilitado ? (
                              <Badge className="bg-success text-success-foreground">
                                Habilitado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Desabilitado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{vendedor.email}</p>
                        </div>
                        
                        <Button
                          variant={vendedor.habilitado ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleVendedor(vendedor, !vendedor.habilitado)}
                          disabled={actionLoading === vendedor.user_id}
                          className={vendedor.habilitado ? "" : "bg-success hover:bg-success/90"}
                        >
                          {actionLoading === vendedor.user_id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processando...
                            </>
                          ) : vendedor.habilitado ? (
                            'Desabilitar'
                          ) : (
                            'Habilitar'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-accent" />
                  Informações Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <p className="text-sm text-foreground">
                    <strong>Habilitado:</strong> O vendedor pode receber atendimentos automaticamente distribuídos pela IA
                  </p>
                </div>
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <p className="text-sm text-foreground">
                    <strong>Desabilitado:</strong> O vendedor não receberá novos atendimentos, mas mantém acesso ao sistema
                  </p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm text-foreground">
                    <strong>Criar contas:</strong> Use o Supabase Auth ou a função create-vendedor para criar novas contas
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configurações do Sistema */}
          <TabsContent value="sistema" className="space-y-6">
            <Card className="border-accent bg-gradient-to-br from-accent/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Configurações Gerais do Sistema
                </CardTitle>
                <CardDescription>
                  Parâmetros avançados de funcionamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="timeout-ia">Timeout da IA (segundos)</Label>
                  <Input
                    id="timeout-ia"
                    type="number"
                    defaultValue="30"
                    placeholder="30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo máximo de espera por resposta da IA
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-tentativas">Máximo de Tentativas</Label>
                  <Input
                    id="max-tentativas"
                    type="number"
                    defaultValue="3"
                    placeholder="3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tentativas de reenvio em caso de falha
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="space-y-0.5">
                    <Label>Logs Detalhados</Label>
                    <p className="text-sm text-muted-foreground">
                      Registrar todas as interações para debug
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 p-4">
                  <div className="space-y-0.5">
                    <Label>Fallback Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Encaminhar para humano se IA falhar
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Button className="w-full bg-accent hover:bg-accent/90">
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
