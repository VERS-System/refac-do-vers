-- Completa as regras históricas e a compatibilidade das referências do teste.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tests_snapshot_counts_valid') THEN
    ALTER TABLE tests ADD CONSTRAINT tests_snapshot_counts_valid
      CHECK (snapshot_active_piezo_count >= 0 AND snapshot_configuration_version >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tests_measurements_valid') THEN
    ALTER TABLE tests ADD CONSTRAINT tests_measurements_valid
      CHECK (vehicle_weight_kg > 0 AND average_engine_rpm >= 0 AND average_speed_kph >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tests_timestamps_valid') THEN
    ALTER TABLE tests ADD CONSTRAINT tests_timestamps_valid
      CHECK (ended_at >= started_at);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tests_text_required') THEN
    ALTER TABLE tests ADD CONSTRAINT tests_text_required
      CHECK (length(btrim(name)) > 0 AND length(btrim(snapshot_test_location)) > 0);
  END IF;
END;
$$;

-- Examina o estado final da linha para tolerar FKs zeradas por exclusões em cascata.
CREATE OR REPLACE FUNCTION validate_test_references()
RETURNS trigger AS $$
DECLARE
  current_vehicle_id uuid;
  current_installation_id uuid;
  current_configuration_id uuid;
  expected_vehicle_id uuid;
  expected_installation_id uuid;
BEGIN
  SELECT vehicle_id, installation_id, configuration_id
    INTO current_vehicle_id, current_installation_id, current_configuration_id
    FROM tests WHERE id = NEW.id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF current_installation_id IS NOT NULL THEN
    SELECT vehicle_id INTO expected_vehicle_id
      FROM vers_installations WHERE id = current_installation_id;
    IF expected_vehicle_id IS NULL OR current_vehicle_id IS DISTINCT FROM expected_vehicle_id THEN
      RAISE EXCEPTION 'test installation and vehicle are incompatible';
    END IF;
  END IF;
  IF current_configuration_id IS NOT NULL THEN
    SELECT installation_id INTO expected_installation_id
      FROM configurations WHERE id = current_configuration_id;
    IF expected_installation_id IS NULL OR current_installation_id IS DISTINCT FROM expected_installation_id THEN
      RAISE EXCEPTION 'test configuration and installation are incompatible';
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tests_reference_guard') THEN
    CREATE CONSTRAINT TRIGGER tests_reference_guard
      AFTER INSERT OR UPDATE ON tests
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION validate_test_references();
  END IF;
END;
$$;

-- Impede alterar o contexto histórico enquanto permite atualizar o ciclo do teste.
CREATE OR REPLACE FUNCTION reject_test_snapshot_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.snapshot_vehicle_model IS DISTINCT FROM OLD.snapshot_vehicle_model
    OR NEW.snapshot_test_location IS DISTINCT FROM OLD.snapshot_test_location
    OR NEW.snapshot_active_piezo_count IS DISTINCT FROM OLD.snapshot_active_piezo_count
    OR NEW.snapshot_configuration_version IS DISTINCT FROM OLD.snapshot_configuration_version THEN
    RAISE EXCEPTION 'test snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tests_snapshot_guard
  BEFORE UPDATE OF snapshot_vehicle_model, snapshot_test_location,
    snapshot_active_piezo_count, snapshot_configuration_version ON tests
  FOR EACH ROW EXECUTE FUNCTION reject_test_snapshot_update();
