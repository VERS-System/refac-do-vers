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
