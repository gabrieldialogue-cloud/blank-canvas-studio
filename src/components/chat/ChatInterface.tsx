import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, X } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  remetente_tipo: "ia" | "cliente" | "vendedor" | "supervisor";
  conteudo: string;
  created_at: string;
}

interface ChatInterfaceProps {
  atendimentoId: string;
  clienteNome: string;
  mensagens: Message[];
  onClose: () => void;
  onSendMessage: (message: string) => Promise<void>;
}

export function ChatInterface({
  clienteNome,
  mensagens,
  onClose,
  onSendMessage,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-card shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-primary px-6 py-4">
            <h2 className="text-lg font-semibold text-primary-foreground">
              Conversa com {clienteNome}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary/90"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
            <div className="space-y-4">
              {mensagens.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  remetenteTipo={msg.remetente_tipo}
                  conteudo={msg.conteudo}
                  createdAt={msg.created_at}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border bg-card p-4">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="min-h-[80px] resize-none"
                disabled={isSending}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isSending}
                size="icon"
                className="h-[80px] w-12 bg-success hover:bg-success/90"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
