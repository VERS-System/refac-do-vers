-- Completa no PostgreSQL as invariantes de veículo não expressáveis no Prisma.

CREATE UNIQUE INDEX IF NOT EXISTS user_vehicles_one_primary_per_user
  ON user_vehicles (user_id) WHERE is_primary = true;

-- Rejeita placa não normalizada e alterações da placa após a criação.
CREATE OR REPLACE FUNCTION enforce_vehicle_license_plate()
RETURNS trigger AS $$
BEGIN
  IF NEW.license_plate::text <> upper(btrim(NEW.license_plate::text)) THEN
    RAISE EXCEPTION 'license_plate must be normalized';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.license_plate::text IS DISTINCT FROM OLD.license_plate::text THEN
      RAISE EXCEPTION 'license_plate is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER vehicles_license_plate_guard
  BEFORE INSERT OR UPDATE OF license_plate ON vehicles
  FOR EACH ROW EXECUTE FUNCTION enforce_vehicle_license_plate();
