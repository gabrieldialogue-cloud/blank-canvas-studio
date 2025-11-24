import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Calendar, User, MessageSquare, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SearchResult {
  id: string;
  conteudo: string;
  created_at: string;
  atendimento_id: string;
  remetente_tipo: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  marca_veiculo?: string;
}

interface UnifiedSearchProps {
  onSearchChange: (query: string) => void;
  onSelectMessage: (atendimentoId: string, messageId: string) => void;
}

export function UnifiedSearch({ onSearchChange, onSelectMessage }: UnifiedSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [messageResults, setMessageResults] = useState<SearchResult[]>([]);
  const [showMessageResults, setShowMessageResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    onSearchChange(value);

    if (value.trim().length < 3) {
      setMessageResults([]);
      setShowMessageResults(false);
      return;
    }

    setIsSearching(true);

    try {
      // Buscar mensagens por conteúdo
      const { data: mensagens, error } = await supabase
        .from("mensagens")
        .select(`
          id,
          conteudo,
          created_at,
          atendimento_id,
          remetente_tipo,
          atendimentos (
            clientes (
              nome,
              telefone
            ),
            marca_veiculo,
            modelo_veiculo
          )
        `)
        .ilike("conteudo", `%${value}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const results: SearchResult[] = (mensagens || []).map((msg: any) => ({
        id: msg.id,
        conteudo: msg.conteudo,
        created_at: msg.created_at,
        atendimento_id: msg.atendimento_id,
        remetente_tipo: msg.remetente_tipo,
        cliente_nome: msg.atendimentos?.clientes?.nome,
        cliente_telefone: msg.atendimentos?.clientes?.telefone,
        marca_veiculo: msg.atendimentos?.marca_veiculo,
      }));

      setMessageResults(results);
      setShowMessageResults(results.length > 0);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setMessageResults([]);
    setShowMessageResults(false);
    onSearchChange("");
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-primary/30 font-semibold">{part}</mark> : 
        part
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nome, telefone ou conteúdo de mensagem..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showMessageResults && (
        <Card className="border-accent/50 shadow-lg">
          <CardContent className="p-0">
            <div className="bg-accent/5 px-3 py-2 border-b border-accent/20">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3 w-3" />
                {messageResults.length} mensagem{messageResults.length !== 1 ? 'ns' : ''} encontrada{messageResults.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1 p-2">
                {messageResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      onSelectMessage(result.atendimento_id, result.id);
                      clearSearch();
                    }}
                    className="w-full text-left p-2 rounded-md hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-xs truncate">
                          {result.cliente_nome || result.cliente_telefone || "Cliente"}
                        </span>
                        {result.marca_veiculo && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            • {result.marca_veiculo}
                          </span>
                        )}
                      </div>
                      <Badge 
                        variant={result.remetente_tipo === "vendedor" ? "secondary" : "outline"}
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        {result.remetente_tipo === "vendedor" ? "Você" : "Cliente"}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground mb-1 line-clamp-2">
                      {highlightText(result.conteudo, searchQuery)}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(result.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
