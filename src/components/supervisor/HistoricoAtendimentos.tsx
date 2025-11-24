import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Search, Calendar, User, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChatMessage } from "@/components/chat/ChatMessage";

interface HistoricoAtendimentosProps {
  vendedoresAtribuidos: string[];
}

interface AtendimentoEncerrado {
  id: string;
  marca_veiculo: string;
  modelo_veiculo: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  clientes: {
    nome: string;
    telefone: string;
  } | null;
  vendedor: {
    nome: string;
  } | null;
  mensagens: Array<{
    id: string;
    conteudo: string;
    created_at: string;
    remetente_tipo: string;
  }>;
}

export function HistoricoAtendimentos({ vendedoresAtribuidos }: HistoricoAtendimentosProps) {
  const [atendimentos, setAtendimentos] = useState<AtendimentoEncerrado[]>([]);
  const [filteredAtendimentos, setFilteredAtendimentos] = useState<AtendimentoEncerrado[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendedor, setSelectedVendedor] = useState<string>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendedores();
    fetchAtendimentosEncerrados();
  }, [vendedoresAtribuidos]);

  useEffect(() => {
    filterAtendimentos();
  }, [searchTerm, selectedVendedor, atendimentos]);

  const fetchVendedores = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome')
      .in('id', vendedoresAtribuidos);
    
    if (data) {
      setVendedores(data);
    }
  };

  const fetchAtendimentosEncerrados = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('atendimentos')
      .select(`
        id,
        marca_veiculo,
        modelo_veiculo,
        created_at,
        updated_at,
        status,
        clientes (nome, telefone),
        vendedor:usuarios!atendimentos_vendedor_fixo_id_fkey(nome),
        mensagens (id, conteudo, created_at, remetente_tipo)
      `)
      .eq('status', 'encerrado')
      .in('vendedor_fixo_id', vendedoresAtribuidos)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (data) {
      setAtendimentos(data as any);
      setFilteredAtendimentos(data as any);
    }
    setLoading(false);
  };

  const filterAtendimentos = () => {
    let filtered = [...atendimentos];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.clientes?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.marca_veiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.modelo_veiculo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by vendedor
    if (selectedVendedor !== "todos") {
      filtered = filtered.filter((a) => a.vendedor?.nome === selectedVendedor);
    }

    setFilteredAtendimentos(filtered);
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="secondary" className="bg-muted">
        Encerrado
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de Busca
          </CardTitle>
          <CardDescription>
            Pesquise e filtre atendimentos encerrados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por Cliente ou Veículo</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendedor">Filtrar por Vendedor</Label>
              <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                <SelectTrigger id="vendedor">
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Vendedores</SelectItem>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.nome}>
                      {v.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Carregando histórico...</p>
            </CardContent>
          </Card>
        ) : filteredAtendimentos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm || selectedVendedor !== "todos"
                  ? "Nenhum atendimento encontrado com os filtros aplicados"
                  : "Nenhum atendimento encerrado encontrado"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAtendimentos.map((atendimento) => {
            const isExpanded = expandedId === atendimento.id;
            return (
              <Collapsible
                key={atendimento.id}
                open={isExpanded}
                onOpenChange={() => setExpandedId(isExpanded ? null : atendimento.id)}
              >
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4 text-left">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">
                                {atendimento.clientes?.nome || "Cliente sem nome"}
                              </CardTitle>
                              {getStatusBadge(atendimento.status)}
                            </div>
                            <CardDescription className="flex items-center gap-4 text-xs">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {atendimento.vendedor?.nome || "Sem vendedor"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(atendimento.updated_at), "dd/MM/yyyy HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>
                              <span>
                                {atendimento.marca_veiculo} {atendimento.modelo_veiculo || ""}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">
                          Histórico da Conversa ({atendimento.mensagens?.length || 0} mensagens)
                        </h4>
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-4">
                            {atendimento.mensagens && atendimento.mensagens.length > 0 ? (
                              atendimento.mensagens.map((mensagem: any) => (
                                <ChatMessage
                                  key={mensagem.id}
                                  messageId={mensagem.id}
                                  remetenteTipo={mensagem.remetente_tipo}
                                  conteudo={mensagem.conteudo}
                                  createdAt={mensagem.created_at}
                                  attachmentUrl={mensagem.attachment_url}
                                  attachmentType={mensagem.attachment_type}
                                  attachmentFilename={mensagem.attachment_filename}
                                  transcription={mensagem.attachment_type === 'audio' && mensagem.conteudo !== '[Áudio]' && mensagem.conteudo !== '[Audio]' ? mensagem.conteudo : null}
                                />
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                Nenhuma mensagem registrada
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>

      {filteredAtendimentos.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Exibindo {filteredAtendimentos.length} de {atendimentos.length} atendimentos
        </p>
      )}
    </div>
  );
}
