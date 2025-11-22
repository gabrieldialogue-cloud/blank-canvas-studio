-- Ensure REPLICA IDENTITY is set to FULL for complete row data in realtime events
ALTER TABLE mensagens REPLICA IDENTITY FULL;