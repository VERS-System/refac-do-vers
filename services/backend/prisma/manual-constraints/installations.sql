-- Completa no PostgreSQL a unicidade de ESP32 ativo e a imutabilidade da montagem.

CREATE UNIQUE INDEX IF NOT EXISTS devices_one_unrevoked_per_vehicle
  ON devices (vehicle_id) WHERE revoked_at IS NULL;

-- Restringe versões e contagens aos limites anunciados no contrato público.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configurations_positive_version') THEN
    ALTER TABLE configurations ADD CONSTRAINT configurations_positive_version CHECK (version >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configurations_nonnegative_piezos') THEN
    ALTER TABLE configurations ADD CONSTRAINT configurations_nonnegative_piezos CHECK (active_piezo_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'devices_revocation_state') THEN
    ALTER TABLE devices ADD CONSTRAINT devices_revocation_state
      CHECK ((status = 'REVOKED') = (revoked_at IS NOT NULL));
  END IF;
END;
$$;

-- Bloqueia mutações de uma versão já capturada, exigindo uma nova versão.
CREATE OR REPLACE FUNCTION reject_configuration_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'configuration snapshot is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER configurations_immutable_guard
  BEFORE UPDATE ON configurations
  FOR EACH ROW EXECUTE FUNCTION reject_configuration_update();
