-- Compatibiliza códigos atuais da aplicação com eventos legados sem reescrever histórico.
BEGIN;

ALTER TABLE audit_events DROP CONSTRAINT audit_events_codes_valid;
ALTER TABLE audit_events ADD CONSTRAINT audit_events_codes_valid CHECK (
  (action ~ '^[A-Z][A-Z_]*$' OR action IN (
    'auth.login', 'auth.refresh', 'auth.logout-all', 'auth.logout', 'auth.register',
    'vehicle.create', 'vehicle.update', 'vehicle.delete', 'test.start', 'test.finish',
    'test.cancel', 'support.create'
  )) AND (resource_type ~ '^[A-Z][A-Z_]*$' OR resource_type IN (
    'session', 'user', 'vehicle', 'test', 'supportRequest'
  ))
);

-- Mantém limpeza histórica ao excluir veículos com eventos nos dois formatos aceitos.
CREATE OR REPLACE FUNCTION scrub_vehicle_audit_resources()
RETURNS trigger AS $$
BEGIN
  UPDATE audit_events SET resource_id = NULL
    WHERE (resource_type IN ('VEHICLE', 'vehicle') AND resource_id = OLD.id)
      OR (resource_type = 'INSTALLATION' AND resource_id IN (
        SELECT id FROM vers_installations WHERE vehicle_id = OLD.id
      ))
      OR (resource_type = 'DEVICE' AND resource_id IN (
        SELECT d.id FROM devices d JOIN vers_installations i
          ON i.id = d.installation_id WHERE i.vehicle_id = OLD.id
      ));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Esvazia referência de usuário atual/legada sem apagar o evento auditável.
CREATE OR REPLACE FUNCTION scrub_user_audit_resources()
RETURNS trigger AS $$
BEGIN
  UPDATE audit_events SET resource_id = NULL
    WHERE resource_type IN ('USER', 'user') AND resource_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMIT;
