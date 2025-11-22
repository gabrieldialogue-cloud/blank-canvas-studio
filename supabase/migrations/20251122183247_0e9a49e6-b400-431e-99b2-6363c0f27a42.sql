-- Criar função que notifica via broadcast quando mensagem é inserida/atualizada
CREATE OR REPLACE FUNCTION notify_message_change()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
BEGIN
  -- Construir payload com info da mensagem
  payload := json_build_object(
    'type', TG_OP,
    'atendimento_id', COALESCE(NEW.atendimento_id, OLD.atendimento_id),
    'message_id', COALESCE(NEW.id, OLD.id),
    'remetente_tipo', COALESCE(NEW.remetente_tipo, OLD.remetente_tipo)
  );
  
  -- Enviar notificação via pg_notify para o canal do atendimento
  PERFORM pg_notify(
    'message_changes',
    payload::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para INSERT
DROP TRIGGER IF EXISTS trigger_notify_message_insert ON mensagens;
CREATE TRIGGER trigger_notify_message_insert
AFTER INSERT ON mensagens
FOR EACH ROW
EXECUTE FUNCTION notify_message_change();

-- Criar trigger para UPDATE
DROP TRIGGER IF EXISTS trigger_notify_message_update ON mensagens;
CREATE TRIGGER trigger_notify_message_update
AFTER UPDATE ON mensagens
FOR EACH ROW
EXECUTE FUNCTION notify_message_change();