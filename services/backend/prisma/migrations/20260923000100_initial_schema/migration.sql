-- Recria o schema inicial do VERS após inventário e backup do legado sintético.
-- O script é transacional e não deve ser aplicado sem a revisão do estado real.
BEGIN;

-- Remove somente as sete tabelas experimentais conhecidas, sem CASCADE.
-- Dependências inesperadas interrompem a migration para permitir nova revisão.
DROP TABLE IF EXISTS "public"."telemetries";
DROP TABLE IF EXISTS "public"."ai_predictions";
DROP TABLE IF EXISTS "public"."tests";
DROP TABLE IF EXISTS "public"."configurations";
DROP TABLE IF EXISTS "public"."energy_summaries";
DROP TABLE IF EXISTS "public"."mqtt_messages";
DROP TABLE IF EXISTS "public"."ai_interactions";

-- O email e a placa usam comparação sem distinção de caixa.
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'BLOCKED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "vehicle_relationship" AS ENUM ('OWNER', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "installation_status" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE', 'FAULT');

-- CreateEnum
CREATE TYPE "device_status" AS ENUM ('PROVISIONING', 'ONLINE', 'OFFLINE', 'REVOKED', 'FAULT');

-- CreateEnum
CREATE TYPE "piezo_association" AS ENUM ('SERIES', 'PARALLEL', 'MIXED');

-- CreateEnum
CREATE TYPE "storage_type" AS ENUM ('BATTERY', 'SUPERCAPACITOR', 'CAPACITOR', 'NONE');

-- CreateEnum
CREATE TYPE "test_status" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "terrain_type" AS ENUM ('HIGHWAY', 'CITY', 'OFFROAD', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "test_outcome" AS ENUM ('SATISFACTORY', 'UNSATISFACTORY', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "mqtt_processing_status" AS ENUM ('RECEIVED', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "telemetry_quality" AS ENUM ('VALID', 'PARTIAL', 'SUSPECT', 'INVALID');

-- CreateEnum
CREATE TYPE "summary_period" AS ENUM ('TEST', 'HOUR', 'DAY', 'MONTH');

-- CreateEnum
CREATE TYPE "summary_quality" AS ENUM ('GOOD', 'PARTIAL', 'INVALID');

-- CreateEnum
CREATE TYPE "support_status" AS ENUM ('OPEN', 'IN_REVIEW', 'SCHEDULED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "audit_result" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "status" "user_status" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "user_id" UUID NOT NULL,
    "role" "user_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_label" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_session_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "license_plate" CITEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "model_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vehicles" (
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "relationship" "vehicle_relationship" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_vehicles_pkey" PRIMARY KEY ("user_id","vehicle_id")
);

-- CreateTable
CREATE TABLE "vers_installations" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "system_model" TEXT NOT NULL,
    "serial_number" TEXT,
    "status" "installation_status" NOT NULL DEFAULT 'INACTIVE',
    "installed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vers_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "installation_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "device_uid" TEXT NOT NULL,
    "name" TEXT,
    "firmware_version" TEXT,
    "status" "device_status" NOT NULL DEFAULT 'PROVISIONING',
    "last_seen_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configurations" (
    "id" UUID NOT NULL,
    "installation_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "active_piezo_count" INTEGER NOT NULL,
    "piezo_association" "piezo_association" NOT NULL,
    "installation_point" TEXT NOT NULL,
    "storage_type" "storage_type" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID,
    "installation_id" UUID,
    "configuration_id" UUID,
    "created_by_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "status" "test_status" NOT NULL DEFAULT 'PLANNED',
    "terrain" "terrain_type" NOT NULL,
    "snapshot_vehicle_model" TEXT,
    "snapshot_test_location" VARCHAR(160) NOT NULL,
    "snapshot_active_piezo_count" INTEGER NOT NULL,
    "snapshot_configuration_version" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "vehicle_weight_kg" DOUBLE PRECISION,
    "average_engine_rpm" DOUBLE PRECISION,
    "average_speed_kph" DOUBLE PRECISION,
    "incline_degrees" DOUBLE PRECISION,
    "outcome" "test_outcome",
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_samples" (
    "id" UUID NOT NULL,
    "message_id" UUID,
    "sample_index" INTEGER NOT NULL,
    "test_id" UUID,
    "device_id" UUID,
    "installation_id" UUID,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "voltage_v" DOUBLE PRECISION,
    "current_a" DOUBLE PRECISION,
    "power_w" DOUBLE PRECISION,
    "device_power_w" DOUBLE PRECISION,
    "accumulated_energy_wh" DOUBLE PRECISION,
    "acceleration_x_ms2" DOUBLE PRECISION,
    "acceleration_y_ms2" DOUBLE PRECISION,
    "acceleration_z_ms2" DOUBLE PRECISION,
    "vibration_rms_ms2" DOUBLE PRECISION,
    "temperature_c" DOUBLE PRECISION,
    "active_piezo_count" INTEGER,
    "quality" "telemetry_quality" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_summaries" (
    "id" UUID NOT NULL,
    "installation_id" UUID,
    "test_id" UUID,
    "period_type" "summary_period" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "recovered_energy_wh" DOUBLE PRECISION NOT NULL,
    "vehicle_energy_used_wh" DOUBLE PRECISION,
    "average_power_w" DOUBLE PRECISION,
    "peak_power_w" DOUBLE PRECISION,
    "money_saved" DECIMAL(18,6),
    "currency_code" VARCHAR(3),
    "energy_tariff_per_kwh" DECIMAL(18,8),
    "sample_count" INTEGER NOT NULL,
    "quality" "summary_quality" NOT NULL,
    "calculation_version" INTEGER NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" UUID NOT NULL,
    "requester_id" UUID,
    "vehicle_id" UUID,
    "installation_id" UUID,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "support_status" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "resource_type" VARCHAR(40) NOT NULL,
    "resource_id" UUID,
    "result" "audit_result" NOT NULL,
    "request_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mqtt_messages" (
    "id" UUID NOT NULL,
    "message_id" TEXT NOT NULL,
    "device_id" UUID,
    "test_id" UUID,
    "schema_version" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sequence" BIGINT NOT NULL,
    "qos" INTEGER NOT NULL,
    "retained" BOOLEAN NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "status" "mqtt_processing_status" NOT NULL DEFAULT 'RECEIVED',
    "rejection_reason" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mqtt_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "refresh_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_revoked_at_expires_at_idx" ON "refresh_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "refresh_sessions_expires_at_idx" ON "refresh_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_license_plate_key" ON "vehicles"("license_plate");

-- CreateIndex
CREATE INDEX "user_vehicles_vehicle_id_idx" ON "user_vehicles"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "vers_installations_serial_number_key" ON "vers_installations"("serial_number");

-- CreateIndex
CREATE INDEX "vers_installations_vehicle_id_status_idx" ON "vers_installations"("vehicle_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vers_installations_id_vehicle_id_key" ON "vers_installations"("id", "vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_uid_key" ON "devices"("device_uid");

-- CreateIndex
CREATE INDEX "devices_installation_id_vehicle_id_idx" ON "devices"("installation_id", "vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "configurations_installation_id_version_key" ON "configurations"("installation_id", "version");

-- CreateIndex
CREATE INDEX "tests_installation_id_status_started_at_idx" ON "tests"("installation_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "tests_created_by_id_created_at_idx" ON "tests"("created_by_id", "created_at");

-- CreateIndex
CREATE INDEX "telemetry_samples_test_id_captured_at_idx" ON "telemetry_samples"("test_id", "captured_at");

-- CreateIndex
CREATE INDEX "telemetry_samples_device_id_captured_at_idx" ON "telemetry_samples"("device_id", "captured_at");

-- CreateIndex
CREATE INDEX "telemetry_samples_installation_id_captured_at_idx" ON "telemetry_samples"("installation_id", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_samples_message_id_sample_index_key" ON "telemetry_samples"("message_id", "sample_index");

-- CreateIndex
CREATE INDEX "energy_summaries_installation_id_period_type_period_start_idx" ON "energy_summaries"("installation_id", "period_type", "period_start");

-- CreateIndex
CREATE INDEX "energy_summaries_test_id_period_type_period_start_idx" ON "energy_summaries"("test_id", "period_type", "period_start");

-- CreateIndex
CREATE INDEX "support_requests_requester_id_status_created_at_idx" ON "support_requests"("requester_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_id_created_at_idx" ON "audit_events"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_resource_type_resource_id_idx" ON "audit_events"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "mqtt_messages_message_id_key" ON "mqtt_messages"("message_id");

-- CreateIndex
CREATE INDEX "mqtt_messages_device_id_captured_at_idx" ON "mqtt_messages"("device_id", "captured_at");

-- CreateIndex
CREATE INDEX "mqtt_messages_status_received_at_idx" ON "mqtt_messages"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "mqtt_messages_device_id_sequence_key" ON "mqtt_messages"("device_id", "sequence");

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_replaced_by_session_id_fkey" FOREIGN KEY ("replaced_by_session_id") REFERENCES "refresh_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vehicles" ADD CONSTRAINT "user_vehicles_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vers_installations" ADD CONSTRAINT "vers_installations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_installation_id_vehicle_id_fkey" FOREIGN KEY ("installation_id", "vehicle_id") REFERENCES "vers_installations"("id", "vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configurations" ADD CONSTRAINT "configurations_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "vers_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "vers_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "mqtt_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_samples" ADD CONSTRAINT "telemetry_samples_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "vers_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_summaries" ADD CONSTRAINT "energy_summaries_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "vers_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_summaries" ADD CONSTRAINT "energy_summaries_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "vers_installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mqtt_messages" ADD CONSTRAINT "mqtt_messages_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mqtt_messages" ADD CONSTRAINT "mqtt_messages_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- Completa as regras de ingestão e de posição das amostras MQTT no PostgreSQL.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mqtt_messages_envelope_valid') THEN
    ALTER TABLE mqtt_messages ADD CONSTRAINT mqtt_messages_envelope_valid
      CHECK (schema_version >= 1 AND sequence >= 0 AND qos BETWEEN 0 AND 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'telemetry_samples_position_valid') THEN
    ALTER TABLE telemetry_samples ADD CONSTRAINT telemetry_samples_position_valid
      CHECK (sample_index >= 0 AND active_piezo_count >= 0);
  END IF;
END;
$$;

-- Impede reescrever a mensagem bruta após recepção e deduplicação.
CREATE OR REPLACE FUNCTION reject_mqtt_raw_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'MQTT raw envelope is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER mqtt_messages_raw_guard
  BEFORE UPDATE OF message_id, device_id, schema_version, topic, payload,
    sequence, qos, retained, captured_at ON mqtt_messages
  FOR EACH ROW EXECUTE FUNCTION reject_mqtt_raw_update();

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
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_events_codes_valid') THEN
    ALTER TABLE audit_events ADD CONSTRAINT audit_events_codes_valid
      CHECK (action ~ '^[A-Z][A-Z_]*$' AND resource_type ~ '^[A-Z][A-Z_]*$');
  END IF;
END;
$$;

-- Esvazia IDs de veículo, instalação e dispositivo antes de removê-los.
CREATE OR REPLACE FUNCTION scrub_vehicle_audit_resources()
RETURNS trigger AS $$
BEGIN
  UPDATE audit_events SET resource_id = NULL
    WHERE (resource_type = 'VEHICLE' AND resource_id = OLD.id)
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
    WHERE resource_type = 'USER' AND resource_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_audit_cleanup
  BEFORE DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION scrub_user_audit_resources();

COMMIT;
