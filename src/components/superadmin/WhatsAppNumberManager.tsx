import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, 
  Smartphone, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Loader2, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  Building,
  User
} from "lucide-react";

interface Vendedor {
  id: string;
  nome: string;
  email: string;
}

interface WhatsAppNumber {
  id: string;
  number_type: 'principal' | 'pessoal';
  api_type: 'meta' | 'evolution';
  is_active: boolean;
  name: string;
  phone_display: string | null;
  phone_number_id: string | null;
  verified_name: string | null;
  evolution_instance_name: string | null;
  evolution_phone_number: string | null;
  evolution_status: string | null;
  vendedor_id: string | null;
  vendedor?: { nome: string } | null;
  created_at: string;
}

interface WhatsAppNumberManagerProps {
  vendedores: Vendedor[];
}

export function WhatsAppNumberManager({ vendedores }: WhatsAppNumberManagerProps) {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formNumberType, setFormNumberType] = useState<'principal' | 'pessoal'>('principal');
  const [formApiType, setFormApiType] = useState<'meta' | 'evolution'>('meta');
  const [formName, setFormName] = useState('');
  const [formVendedorId, setFormVendedorId] = useState('');
  
  // Meta specific
  const [formAccessToken, setFormAccessToken] = useState('');
  const [formPhoneNumberId, setFormPhoneNumberId] = useState('');
  const [formBusinessAccountId, setFormBusinessAccountId] = useState('');
  const [formWebhookToken, setFormWebhookToken] = useState('');
  
  // Evolution specific
  const [formEvolutionInstance, setFormEvolutionInstance] = useState('');
  const [formEvolutionPhone, setFormEvolutionPhone] = useState('');
  const [evolutionInstances, setEvolutionInstances] = useState<string[]>([]);

  useEffect(() => {
    fetchNumbers();
    fetchEvolutionInstances();
  }, []);

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select(`
          *,
          vendedor:usuarios!whatsapp_numbers_vendedor_id_fkey(nome)
        `)
        .order('number_type', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNumbers(data || []);
    } catch (error) {
      console.error('Error fetching numbers:', error);
      toast({
        title: "Erro ao carregar números",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvolutionInstances = async () => {
    try {
      const { data: config } = await supabase
        .from('evolution_config')
        .select('*')
        .eq('is_connected', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (config) {
        const response = await fetch(`${config.api_url}/instance/fetchInstances`, {
          headers: { 'apikey': config.api_key },
        });
        
        if (response.ok) {
          const instances = await response.json();
          setEvolutionInstances(instances.map((i: any) => i.name || i.instanceName).filter(Boolean));
        }
      }
    } catch (error) {
      console.error('Error fetching Evolution instances:', error);
    }
  };

  const getWebhookUrl = () => {
    return 'https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-webhook';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência",
    });
  };

  const saveNumber = async () => {
    // Validation
    if (!formName) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (formNumberType === 'pessoal' && !formVendedorId) {
      toast({ title: "Vendedor é obrigatório para número pessoal", variant: "destructive" });
      return;
    }

    if (formApiType === 'meta' && (!formAccessToken || !formPhoneNumberId)) {
      toast({ title: "Access Token e Phone Number ID são obrigatórios para Meta API", variant: "destructive" });
      return;
    }

    if (formApiType === 'evolution' && !formEvolutionInstance) {
      toast({ title: "Instância Evolution é obrigatória", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // If Meta API, validate credentials first
      let phoneDisplay = null;
      let verifiedName = null;

      if (formApiType === 'meta') {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${formPhoneNumberId}?fields=display_phone_number,verified_name`,
          {
            headers: { 'Authorization': `Bearer ${formAccessToken}` },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          toast({
            title: "Credenciais Meta inválidas",
            description: error.error?.message || "Verifique o Access Token e Phone Number ID",
            variant: "destructive",
          });
          return;
        }

        const phoneInfo = await response.json();
        phoneDisplay = phoneInfo.display_phone_number;
        verifiedName = phoneInfo.verified_name;
      }

      const insertData: any = {
        number_type: formNumberType,
        api_type: formApiType,
        name: formName,
        is_active: true,
        vendedor_id: formNumberType === 'pessoal' ? formVendedorId : null,
      };

      if (formApiType === 'meta') {
        insertData.phone_number_id = formPhoneNumberId;
        insertData.access_token = formAccessToken;
        insertData.business_account_id = formBusinessAccountId || null;
        insertData.webhook_verify_token = formWebhookToken || null;
        insertData.phone_display = phoneDisplay;
        insertData.verified_name = verifiedName;
      } else {
        insertData.evolution_instance_name = formEvolutionInstance;
        insertData.evolution_phone_number = formEvolutionPhone || null;
        insertData.evolution_status = 'pending';
      }

      const { error } = await supabase
        .from('whatsapp_numbers')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Número cadastrado",
        description: `${formName} foi adicionado com sucesso`,
      });

      // Reset form
      resetForm();
      fetchNumbers();
    } catch (error) {
      console.error('Error saving number:', error);
      toast({
        title: "Erro ao salvar número",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status alterado",
        description: `Número ${!currentStatus ? 'ativado' : 'desativado'}`,
      });

      fetchNumbers();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: "Erro ao alterar status",
        variant: "destructive",
      });
    }
  };

  const deleteNumber = async (id: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Número removido",
      });

      fetchNumbers();
    } catch (error) {
      console.error('Error deleting number:', error);
      toast({
        title: "Erro ao remover número",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setFormNumberType('principal');
    setFormApiType('meta');
    setFormName('');
    setFormVendedorId('');
    setFormAccessToken('');
    setFormPhoneNumberId('');
    setFormBusinessAccountId('');
    setFormWebhookToken('');
    setFormEvolutionInstance('');
    setFormEvolutionPhone('');
  };

  const principalNumbers = numbers.filter(n => n.number_type === 'principal');
  const pessoalNumbers = numbers.filter(n => n.number_type === 'pessoal');

  return (
    <div className="space-y-6">
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
          Configure esta URL como webhook na Meta ou Evolution API para receber mensagens.
        </p>
      </div>

      {/* Add Number Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Números WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            {principalNumbers.length} principal(is), {pessoalNumbers.length} pessoal(is)
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-primary">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Número
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Cadastrar Novo Número
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Number Type and API Type */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo do Número *</Label>
                <Select value={formNumberType} onValueChange={(v: 'principal' | 'pessoal') => setFormNumberType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Número Principal (Empresa)
                      </div>
                    </SelectItem>
                    <SelectItem value="pessoal">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Número Pessoal (Vendedor)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de API *</Label>
                <Select value={formApiType} onValueChange={(v: 'meta' | 'evolution') => setFormApiType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Meta Cloud API (Oficial)
                      </div>
                    </SelectItem>
                    <SelectItem value="evolution">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Evolution API
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Name and Vendedor (for personal) */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome Identificador *</Label>
                <Input
                  placeholder="Ex: Atendimento Principal, WhatsApp João..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {formNumberType === 'pessoal' && (
                <div className="space-y-2">
                  <Label>Vendedor *</Label>
                  <Select value={formVendedorId} onValueChange={setFormVendedorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.nome} ({v.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Meta API Fields */}
            {formApiType === 'meta' && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Credenciais Meta Cloud API</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Access Token *</Label>
                    <Input
                      type="password"
                      placeholder="EAAxxxxxxxxx..."
                      value={formAccessToken}
                      onChange={(e) => setFormAccessToken(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number ID *</Label>
                    <Input
                      placeholder="1234567890123456"
                      value={formPhoneNumberId}
                      onChange={(e) => setFormPhoneNumberId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Account ID</Label>
                    <Input
                      placeholder="1234567890123456"
                      value={formBusinessAccountId}
                      onChange={(e) => setFormBusinessAccountId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook Verify Token</Label>
                    <Input
                      placeholder="seu_token_secreto"
                      value={formWebhookToken}
                      onChange={(e) => setFormWebhookToken(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Evolution API Fields */}
            {formApiType === 'evolution' && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Configuração Evolution API</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Instância Evolution *</Label>
                    <Select value={formEvolutionInstance} onValueChange={setFormEvolutionInstance}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a instância" />
                      </SelectTrigger>
                      <SelectContent>
                        {evolutionInstances.map((instance) => (
                          <SelectItem key={instance} value={instance}>
                            {instance}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {evolutionInstances.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma instância encontrada. Configure a Evolution API primeiro.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Telefone</Label>
                    <Input
                      placeholder="5511999999999"
                      value={formEvolutionPhone}
                      onChange={(e) => setFormEvolutionPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={saveNumber}
                className="flex-1"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Cadastrar Número
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Numbers List - Principal */}
      <div className="space-y-3">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Building className="h-4 w-4 text-blue-500" />
          Números Principais
        </h4>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : principalNumbers.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-dashed">
            <Building className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum número principal cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {principalNumbers.map((number) => (
              <NumberCard 
                key={number.id} 
                number={number} 
                onToggle={toggleStatus} 
                onDelete={deleteNumber} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Numbers List - Personal */}
      <div className="space-y-3">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <User className="h-4 w-4 text-green-500" />
          Números Pessoais
        </h4>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pessoalNumbers.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-dashed">
            <User className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum número pessoal cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pessoalNumbers.map((number) => (
              <NumberCard 
                key={number.id} 
                number={number} 
                onToggle={toggleStatus} 
                onDelete={deleteNumber} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NumberCard({ 
  number, 
  onToggle, 
  onDelete 
}: { 
  number: WhatsAppNumber; 
  onToggle: (id: string, status: boolean) => void; 
  onDelete: (id: string) => void;
}) {
  const isEvolution = number.api_type === 'evolution';
  const isPrincipal = number.number_type === 'principal';

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
        number.is_active
          ? isPrincipal
            ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10'
            : 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
          : 'border-muted bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
          number.is_active
            ? isPrincipal ? 'bg-blue-500/20' : 'bg-green-500/20'
            : 'bg-muted'
        }`}>
          {isEvolution ? (
            <Smartphone className={`h-5 w-5 ${
              number.is_active
                ? isPrincipal ? 'text-blue-500' : 'text-green-500'
                : 'text-muted-foreground'
            }`} />
          ) : (
            <Phone className={`h-5 w-5 ${
              number.is_active
                ? isPrincipal ? 'text-blue-500' : 'text-green-500'
                : 'text-muted-foreground'
            }`} />
          )}
        </div>
        <div>
          <p className="font-medium text-foreground flex items-center gap-2">
            {number.name}
            <Badge variant="outline" className={`text-xs ${
              isEvolution ? 'border-purple-500 text-purple-500' : 'border-blue-500 text-blue-500'
            }`}>
              {isEvolution ? 'Evolution' : 'Meta'}
            </Badge>
          </p>
          <p className="text-sm text-muted-foreground">
            {number.verified_name || number.phone_display || number.evolution_phone_number || number.evolution_instance_name}
          </p>
          {number.vendedor && (
            <p className="text-xs text-muted-foreground">
              Vendedor: {number.vendedor.nome}
            </p>
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
          onClick={() => onToggle(number.id, number.is_active)}
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
          onClick={() => onDelete(number.id)}
          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
