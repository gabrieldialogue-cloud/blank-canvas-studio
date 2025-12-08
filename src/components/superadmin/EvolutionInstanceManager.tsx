import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Smartphone,
  Trash2,
  Plus,
  RefreshCw,
  Link,
  QrCode,
  Wifi,
  WifiOff,
  PowerOff,
  User,
  Unplug,
  Plug,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EvolutionInstance {
  name?: string; // Evolution API returns "name" for instance name
  instanceName?: string;
  instanceId?: string;
  id?: string;
  owner?: string;
  ownerJid?: string;
  profileName?: string;
  profilePictureUrl?: string;
  profilePicUrl?: string;
  status?: string;
  state?: string;
  serverUrl?: string;
  apikey?: string;
  number?: string;
  connectionStatus?: 'open' | 'close' | 'connecting' | 'unknown';
  instance?: {
    instanceName?: string;
    state?: string;
    owner?: string;
    profileName?: string;
    profilePictureUrl?: string;
  };
}

interface Vendedor {
  id: string;
  nome: string;
  email: string;
}

interface VendedorAssociation {
  usuario_id: string;
  evolution_instance_name: string | null;
  evolution_status: string | null;
  usuario?: {
    nome: string;
    email: string;
  };
}

interface Props {
  vendedores: Vendedor[];
}

export function EvolutionInstanceManager({ vendedores }: Props) {
  const { toast } = useToast();
  
  // Evolution API connection state
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");
  const [evolutionStatus, setEvolutionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [evolutionSaving, setEvolutionSaving] = useState(false);
  const [evolutionLoading, setEvolutionLoading] = useState(true);
  const [evolutionConfigId, setEvolutionConfigId] = useState<string | null>(null);
  
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [vendedorAssociations, setVendedorAssociations] = useState<VendedorAssociation[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingInstance, setCreatingInstance] = useState(false);
  
  // Polling
  const [pollingEnabled, setPollingEnabled] = useState(true);
  
  // Create instance form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [selectedVendedor, setSelectedVendedor] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // QR Code dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [currentQrCode, setCurrentQrCode] = useState<string | null>(null);
  const [currentInstanceName, setCurrentInstanceName] = useState("");
  const [loadingQr, setLoadingQr] = useState(false);

  // Associate dialog
  const [associateDialogOpen, setAssociateDialogOpen] = useState(false);
  const [instanceToAssociate, setInstanceToAssociate] = useState<string>("");
  const [vendedorToAssociate, setVendedorToAssociate] = useState("");
  const [associating, setAssociating] = useState(false);

  // Load saved Evolution config on mount
  useEffect(() => {
    loadEvolutionConfig();
    loadVendedorAssociations();
  }, []);

  // Polling for instance status updates
  useEffect(() => {
    if (evolutionStatus !== 'connected' || !pollingEnabled) return;

    const pollInterval = setInterval(() => {
      fetchInstances(true); // silent refresh
    }, 10000); // every 10 seconds

    return () => clearInterval(pollInterval);
  }, [evolutionStatus, pollingEnabled, evolutionApiUrl, evolutionApiKey]);

  const loadEvolutionConfig = async () => {
    setEvolutionLoading(true);
    try {
      console.log('Loading Evolution config from database...');
      const { data, error } = await supabase
        .from('evolution_config' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('Evolution config result:', { data, error });

      if (error) {
        console.error('Error loading Evolution config:', error);
        throw error;
      }

      if (data) {
        const config = data as any;
        console.log('Found Evolution config:', { 
          id: config.id, 
          is_connected: config.is_connected,
          api_url: config.api_url ? 'set' : 'not set'
        });
        
        setEvolutionConfigId(config.id);
        setEvolutionApiUrl(config.api_url);
        setEvolutionApiKey(config.api_key);
        
        // Only set as connected if the config says so
        if (config.is_connected) {
          setEvolutionStatus('connected');
          // Fetch instances with stored credentials
          fetchInstancesWithCredentials(config.api_url, config.api_key);
        } else {
          setEvolutionStatus('disconnected');
        }
      } else {
        console.log('No Evolution config found in database');
        setEvolutionStatus('unknown');
      }
    } catch (error) {
      console.error('Error loading Evolution config:', error);
      setEvolutionStatus('unknown');
    } finally {
      setEvolutionLoading(false);
    }
  };

  const fetchInstancesWithCredentials = async (apiUrl: string, apiKey: string) => {
    if (!apiUrl || !apiKey) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: {
          action: 'list_instances',
          evolutionApiUrl: apiUrl,
          evolutionApiKey: apiKey,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const instanceList = data.instances || [];
        setInstances(instanceList);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVendedorAssociations = async () => {
    try {
      const { data, error } = await supabase
        .from('config_vendedores')
        .select(`
          usuario_id,
          evolution_instance_name,
          evolution_status,
          usuarios:usuario_id (nome, email)
        ` as any);

      if (error) throw error;
      setVendedorAssociations((data as any) || []);
    } catch (error) {
      console.error('Error loading vendedor associations:', error);
    }
  };

  const saveEvolutionCredentials = async () => {
    if (!evolutionApiUrl || !evolutionApiKey) {
      toast({
        title: "Campos obrigatórios",
        description: "URL e API Key são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setEvolutionSaving(true);
    try {
      // Validate connection first
      const { data: validateData, error: validateError } = await supabase.functions.invoke('manage-whatsapp-credentials', {
        body: {
          action: 'save_evolution_credentials',
          credentials: {
            apiUrl: evolutionApiUrl,
            apiKey: evolutionApiKey,
          },
        },
      });

      if (validateError) throw validateError;

      if (!validateData?.success) {
        setEvolutionStatus('disconnected');
        toast({
          title: "Erro na conexão",
          description: validateData?.message || "Erro ao conectar com Evolution API",
          variant: "destructive",
        });
        return;
      }

      // Credentials are now saved by the edge function, just reload config to get the ID
      await loadEvolutionConfig();

      setEvolutionStatus('connected');
      toast({
        title: "Conexão estabelecida",
        description: validateData.message,
      });
      
      fetchInstancesWithCredentials(evolutionApiUrl, evolutionApiKey);
    } catch (error) {
      console.error('Error saving Evolution credentials:', error);
      setEvolutionStatus('disconnected');
      toast({
        title: "Erro ao conectar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setEvolutionSaving(false);
    }
  };

  const disconnectEvolution = async () => {
    if (!confirm('Tem certeza que deseja desconectar da Evolution API? Todas as instâncias ficarão inacessíveis.')) return;

    try {
      if (evolutionConfigId) {
        await supabase
          .from('evolution_config' as any)
          .update({ is_connected: false })
          .eq('id', evolutionConfigId);
      }

      setEvolutionStatus('disconnected');
      setInstances([]);
      
      toast({
        title: "Desconectado",
        description: "Evolution API desconectada. As instâncias não estão mais acessíveis.",
      });
    } catch (error) {
      console.error('Error disconnecting Evolution:', error);
      toast({
        title: "Erro ao desconectar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const fetchInstances = useCallback(async (silent = false) => {
    if (!evolutionApiUrl || !evolutionApiKey) return;
    
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: {
          action: 'list_instances',
          evolutionApiUrl,
          evolutionApiKey,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const instanceList = data.instances || [];
        setInstances(instanceList);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
      if (!silent) {
        toast({
          title: "Erro ao carregar instâncias",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [evolutionApiUrl, evolutionApiKey, toast]);

  const fetchQrCode = async (instanceName: string) => {
    setLoadingQr(true);
    setCurrentInstanceName(instanceName);
    setQrDialogOpen(true);
    setCurrentQrCode(null);

    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: {
          action: 'get_qr_code',
          evolutionApiUrl,
          evolutionApiKey,
          instanceData: { instanceName },
        },
      });

      if (error) throw error;

      if (data?.success && data.qrCode) {
        setCurrentQrCode(data.qrCode);
      } else {
        toast({
          title: "QR Code não disponível",
          description: data?.pairingCode 
            ? `Use o código de pareamento: ${data.pairingCode}` 
            : "A instância pode já estar conectada",
        });
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast({
        title: "Erro ao obter QR Code",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoadingQr(false);
    }
  };

  const createInstance = async () => {
    if (!newInstanceName) {
      toast({
        title: "Nome obrigatório",
        description: "Defina um nome para a instância",
        variant: "destructive",
      });
      return;
    }

    setCreatingInstance(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: {
          action: 'create_instance',
          evolutionApiUrl,
          evolutionApiKey,
          instanceData: {
            vendedorId: selectedVendedor || null,
            instanceName: newInstanceName,
            phoneNumber: phoneNumber || null,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: data.alreadyExists ? "Instância encontrada" : "Instância criada",
          description: data.message,
        });
        
        if (data.qrCode) {
          setCurrentQrCode(data.qrCode);
          setCurrentInstanceName(newInstanceName);
          setQrDialogOpen(true);
        }

        setNewInstanceName("");
        setSelectedVendedor("");
        setPhoneNumber("");
        setShowCreateForm(false);
        fetchInstances();
        loadVendedorAssociations();
      } else {
        toast({
          title: "Erro ao criar instância",
          description: data?.message || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating instance:', error);
      toast({
        title: "Erro ao criar instância",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setCreatingInstance(false);
    }
  };

  const deleteInstance = async (instanceName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a instância "${instanceName}"?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: {
          action: 'delete_instance',
          evolutionApiUrl,
          evolutionApiKey,
          instanceData: { instanceName },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Instância deletada",
          description: `A instância "${instanceName}" foi removida`,
        });
        fetchInstances();
        
        // Clear association for any vendedor using this instance
        try {
          await (supabase as any)
            .from('config_vendedores')
            .update({ evolution_instance_name: null, evolution_status: 'disconnected' })
            .eq('evolution_instance_name', instanceName);
        } catch (clearError) {
          console.error('Error clearing association:', clearError);
        }
        
        loadVendedorAssociations();
      } else {
        toast({
          title: "Erro ao deletar",
          description: data?.message || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast({
        title: "Erro ao deletar instância",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const disconnectInstance = async (instanceName: string) => {
    if (!confirm(`Tem certeza que deseja desconectar a instância "${instanceName}"? O WhatsApp será deslogado.`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: {
          action: 'logout_instance',
          evolutionApiUrl,
          evolutionApiKey,
          instanceData: { instanceName },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Instância desconectada",
          description: `O WhatsApp da instância "${instanceName}" foi deslogado`,
        });
        fetchInstances();
      } else {
        toast({
          title: "Erro ao desconectar",
          description: data?.message || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error disconnecting instance:', error);
      toast({
        title: "Erro ao desconectar instância",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const restartInstance = async (instanceName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: {
          action: 'restart_instance',
          evolutionApiUrl,
          evolutionApiKey,
          instanceData: { instanceName },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Instância reiniciada",
          description: `A instância "${instanceName}" foi reiniciada`,
        });
        fetchInstances();
      } else {
        toast({
          title: "Erro ao reiniciar",
          description: data?.message || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error restarting instance:', error);
      toast({
        title: "Erro ao reiniciar instância",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const associateInstanceToVendedor = async () => {
    if (!instanceToAssociate || !vendedorToAssociate) {
      toast({
        title: "Seleção incompleta",
        description: "Selecione uma instância e um vendedor",
        variant: "destructive",
      });
      return;
    }

    setAssociating(true);
    try {
      const { error } = await supabase
        .from('config_vendedores')
        .update({
          evolution_instance_name: instanceToAssociate,
          evolution_status: 'connected',
        } as any)
        .eq('usuario_id', vendedorToAssociate);

      if (error) throw error;

      toast({
        title: "Instância associada",
        description: `A instância foi vinculada ao vendedor com sucesso`,
      });

      setAssociateDialogOpen(false);
      setInstanceToAssociate("");
      setVendedorToAssociate("");
      loadVendedorAssociations();
    } catch (error) {
      console.error('Error associating instance:', error);
      toast({
        title: "Erro ao associar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setAssociating(false);
    }
  };

  const getConnectionStatusColor = (instance: EvolutionInstance) => {
    const state = instance.connectionStatus || instance.instance?.state || instance.state;
    switch (state) {
      case 'open':
        return 'bg-success text-success-foreground';
      case 'close':
        return 'bg-destructive text-destructive-foreground';
      case 'connecting':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getConnectionStatusLabel = (instance: EvolutionInstance) => {
    const state = instance.connectionStatus || instance.instance?.state || instance.state;
    switch (state) {
      case 'open':
        return 'Conectado';
      case 'close':
        return 'Desconectado';
      case 'connecting':
        return 'Conectando...';
      default:
        return 'Desconhecido';
    }
  };

  const getAssociatedVendedor = (instanceName: string) => {
    return vendedorAssociations.find(a => a.evolution_instance_name === instanceName);
  };

  if (evolutionLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Evolution API Connection */}
      <div className="space-y-4 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-foreground">Conexão Evolution API</h3>
          </div>
          <div className="flex items-center gap-2">
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
                Não configurado
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="evolution-api-url">URL da Evolution API</Label>
            <Input
              id="evolution-api-url"
              placeholder="https://sua-evolution-api.com"
              value={evolutionApiUrl}
              onChange={(e) => setEvolutionApiUrl(e.target.value)}
              disabled={evolutionStatus === 'connected'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="evolution-api-key">API Key (Global)</Label>
            <Input
              id="evolution-api-key"
              type="password"
              placeholder="sua-api-key-aqui"
              value={evolutionApiKey}
              onChange={(e) => setEvolutionApiKey(e.target.value)}
              disabled={evolutionStatus === 'connected'}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {evolutionStatus === 'connected' ? (
            <Button
              onClick={disconnectEvolution}
              variant="destructive"
              className="flex-1"
            >
              <Unplug className="mr-2 h-4 w-4" />
              Desconectar da Evolution API
            </Button>
          ) : (
            <Button
              onClick={saveEvolutionCredentials}
              className="flex-1 bg-green-500 hover:bg-green-600"
              disabled={evolutionSaving || !evolutionApiUrl || !evolutionApiKey}
            >
              {evolutionSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Plug className="mr-2 h-4 w-4" />
                  Conectar à Evolution API
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Instances Management - Only show when connected */}
      {evolutionStatus === 'connected' && (
        <>
          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Instâncias WhatsApp</h3>
              <p className="text-sm text-muted-foreground">
                {instances.length} instância(s) • Atualização automática: {pollingEnabled ? 'Ativa' : 'Pausada'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPollingEnabled(!pollingEnabled)}
                title={pollingEnabled ? "Pausar atualização automática" : "Ativar atualização automática"}
              >
                {pollingEnabled ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchInstances()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="bg-green-500 hover:bg-green-600"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nova Instância
              </Button>
            </div>
          </div>

          {/* Create Instance Form */}
          {showCreateForm && (
            <div className="space-y-4 p-4 rounded-lg border border-green-500/30 bg-green-500/5">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Criar Nova Instância</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="instance-name">Nome da Instância *</Label>
                  <Input
                    id="instance-name"
                    placeholder="vendedor_joao"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Identificador único (sem espaços)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="associate-vendedor">Associar a Vendedor (opcional)</Label>
                  <Select value={selectedVendedor || "none"} onValueChange={(v) => setSelectedVendedor(v === "none" ? "" : v)}>
                    <SelectTrigger id="associate-vendedor">
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {vendedores.map((vend) => (
                        <SelectItem key={vend.id} value={vend.id}>
                          {vend.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone-number">Número do WhatsApp (opcional)</Label>
                  <Input
                    id="phone-number"
                    placeholder="5511999999999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Número com código do país (sem + ou espaços)</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={createInstance}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  disabled={creatingInstance || !newInstanceName}
                >
                  {creatingInstance ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Criar Instância
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Instances List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8 rounded-lg border border-dashed">
              <Smartphone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma instância encontrada
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em "Nova Instância" para criar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {instances.map((instance) => {
                // Evolution API returns "name" for instance name, not "instanceName"
                const instanceName = instance.name || instance.instanceName || instance.instance?.instanceName || '';
                const isConnected = instance.connectionStatus === 'open' || instance.instance?.state === 'open';
                const profileName = instance.profileName || instance.instance?.profileName;
                const ownerNumber = instance.number || instance.ownerJid?.replace('@s.whatsapp.net', '') || instance.owner || instance.instance?.owner;
                const profilePicture = instance.profilePicUrl || instance.profilePictureUrl || instance.instance?.profilePictureUrl;
                const associatedVendedor = getAssociatedVendedor(instanceName);
                
                return (
                  <div
                    key={instanceName || instance.instanceId}
                    className={`p-4 rounded-lg border transition-colors ${
                      isConnected 
                        ? 'border-success/30 bg-success/5' 
                        : 'border-muted bg-card hover:bg-accent/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Instance info */}
                      <div className="flex items-start gap-3 flex-1">
                        {/* Profile picture or icon */}
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${
                          isConnected ? 'bg-success/20' : 'bg-muted'
                        }`}>
                          {profilePicture ? (
                            <img 
                              src={profilePicture} 
                              alt={profileName || instanceName}
                              className="h-full w-full object-cover"
                            />
                          ) : isConnected ? (
                            <Wifi className="h-6 w-6 text-success" />
                          ) : (
                            <WifiOff className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">
                              {instanceName}
                            </p>
                            <Badge className={getConnectionStatusColor(instance)} variant="secondary">
                              {getConnectionStatusLabel(instance)}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-col gap-0.5 mt-1">
                            {profileName && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="text-foreground font-medium">{profileName}</span>
                                <span className="text-muted-foreground text-xs">(nome no WhatsApp)</span>
                              </p>
                            )}
                            
                            {ownerNumber && (
                              <p className="text-xs text-muted-foreground">
                                📱 {ownerNumber}
                              </p>
                            )}
                          </div>

                          {/* Associated vendedor */}
                          {associatedVendedor ? (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-md">
                              <Link className="h-3 w-3 text-primary" />
                              <span className="text-xs text-primary font-medium">
                                {(associatedVendedor as any).usuarios?.nome || 'Vendedor associado'}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Sem vendedor associado
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right side - Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Connect/Disconnect toggle */}
                        {isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => disconnectInstance(instanceName)}
                            className="text-amber-600 hover:bg-amber-500 hover:text-white"
                            title="Desconectar WhatsApp"
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchQrCode(instanceName)}
                            className="text-success hover:bg-success hover:text-success-foreground"
                            title="Conectar via QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Restart button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restartInstance(instanceName)}
                          title="Reiniciar instância"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>

                        {/* Associate button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInstanceToAssociate(instanceName);
                            setAssociateDialogOpen(true);
                          }}
                          title="Associar a vendedor"
                        >
                          <Link className="h-4 w-4" />
                        </Button>

                        {/* Delete button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInstance(instanceName)}
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          title="Deletar instância"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code para conectar a instância "{currentInstanceName}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {loadingQr ? (
              <div className="py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Gerando QR Code...</p>
              </div>
            ) : currentQrCode ? (
              <>
                <img 
                  src={currentQrCode.startsWith('data:') ? currentQrCode : `data:image/png;base64,${currentQrCode}`} 
                  alt="QR Code WhatsApp" 
                  className="max-w-[280px] rounded-lg border"
                />
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Abra o WhatsApp → Menu → Aparelhos conectados → Conectar aparelho
                </p>
              </>
            ) : (
              <div className="py-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  QR Code não disponível. A instância pode já estar conectada.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => fetchQrCode(currentInstanceName)}
              disabled={loadingQr}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingQr ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={() => setQrDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Associate Dialog */}
      <Dialog open={associateDialogOpen} onOpenChange={setAssociateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Associar Instância a Vendedor</DialogTitle>
            <DialogDescription>
              Vincule a instância "{instanceToAssociate}" a um vendedor do sistema
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={vendedorToAssociate} onValueChange={setVendedorToAssociate}>
                <SelectTrigger>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssociateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={associateInstanceToVendedor}
              disabled={associating || !vendedorToAssociate}
              className="bg-green-500 hover:bg-green-600"
            >
              {associating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Associando...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-1" />
                  Associar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
