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
import { Shield, MessageSquare, Bot, Zap, AlertTriangle } from "lucide-react";

export default function SuperAdmin() {
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
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="ia" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bot className="h-4 w-4 mr-2" />
              Agente IA
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-success data-[state=active]:text-success-foreground">
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
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
                  WhatsApp - Número Principal (IA)
                </CardTitle>
                <CardDescription>
                  Número principal que a IA atende automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-principal">Número Principal</Label>
                  <Input
                    id="whatsapp-principal"
                    placeholder="+55 11 98765-4321"
                  />
                  <p className="text-xs text-muted-foreground">
                    Número principal onde a IA responde automaticamente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp-api-type">Tipo de API</Label>
                  <select
                    id="whatsapp-api-type"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="oficial">WhatsApp Business API (Oficial)</option>
                    <option value="nao-oficial">API Não Oficial (Baileys, etc)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp-token">Token/Credentials</Label>
                  <Textarea
                    id="whatsapp-token"
                    placeholder="Cole aqui as credenciais da API..."
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>

                <Button className="w-full bg-success hover:bg-success/90">
                  Salvar Número Principal
                </Button>
              </CardContent>
            </Card>

            <Card className="border-accent bg-gradient-to-br from-accent/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-accent" />
                  WhatsApp - Números Pessoais (Vendedores)
                </CardTitle>
                <CardDescription>
                  Configure os números pessoais dos vendedores (sem IA)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Configuração Individual
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cada vendedor deve configurar seu número pessoal nas suas próprias
                        configurações. Aqui você apenas visualiza e gerencia as integrações.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API para Números Pessoais</Label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2">
                    <option value="oficial">WhatsApp Business API (Oficial)</option>
                    <option value="nao-oficial">API Não Oficial</option>
                  </select>
                </div>

                <Button className="w-full bg-accent hover:bg-accent/90">
                  Salvar Configuração
                </Button>
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
