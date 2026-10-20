-- Completa unicidade, limites e limpeza de identificadores históricos.

CREATE UNIQUE INDEX IF NOT EXISTS energy_summaries_one_installation_period
  ON energy_summaries (installation_id, period_type, period_start, calculation_version)
  WHERE installation_id IS NOT NULL AND test_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS energy_summaries_one_test_period
  ON energy_summaries (test_id, period_type, period_start, calculation_version)
  WHERE test_id IS NOT NULL;

-- Impede períodos vazios, valores físicos negativos e economia sem tarifa.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'energy_summaries_values_valid') THEN
    ALTER TABLE energy_summaries ADD CONSTRAINT energy_summaries_values_valid CHECK (
      period_end > period_start AND recovered_energy_wh >= 0
      AND vehicle_energy_used_wh >= 0 AND average_power_w >= 0 AND peak_power_w >= 0
      AND sample_count >= 0 AND calculation_version >= 1
      AND money_saved >= 0 AND energy_tariff_per_kwh >= 0
      AND (money_saved IS NULL OR (currency_code IS NOT NULL AND energy_tariff_per_kwh IS NOT NULL))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_requests_reason_required') THEN
    ALTER TABLE support_requests ADD CONSTRAINT support_requests_reason_required
      CHECK (length(btrim(reason)) > 0);
  END IF;
END;
$$;

-- Reaplica a mesma restrição da migration de compatibilidade também em bancadas preservadas.
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_codes_valid;
ALTER TABLE audit_events ADD CONSTRAINT audit_events_codes_valid CHECK (
  (action ~ '^[A-Z][A-Z_]*$' OR action IN (
    'auth.login', 'auth.refresh', 'auth.logout-all', 'auth.logout', 'auth.register',
    'vehicle.create', 'vehicle.update', 'vehicle.delete', 'test.start', 'test.finish',
    'test.cancel', 'support.create'
  )) AND (resource_type ~ '^[A-Z][A-Z_]*$' OR resource_type IN (
    'session', 'user', 'vehicle', 'test', 'supportRequest'
  ))
);

-- Esvazia IDs de veículo, instalação e dispositivo antes de removê-los.
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

CREATE OR REPLACE TRIGGER vehicles_audit_cleanup
  BEFORE DELETE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION scrub_vehicle_audit_resources();

-- Esvazia o ID de uma conta excluída sem apagar o registro auditável.
CREATE OR REPLACE FUNCTION scrub_user_audit_resources()
RETURNS trigger AS $$
BEGIN
  UPDATE audit_events SET resource_id = NULL
    WHERE resource_type IN ('USER', 'user') AND resource_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_audit_cleanup
  BEFORE DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION scrub_user_audit_resources();
