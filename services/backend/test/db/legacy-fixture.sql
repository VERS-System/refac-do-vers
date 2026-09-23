-- Reproduz apenas as tabelas e FKs do schema experimental com dados fictícios.
-- Serve para ensaiar a ordem dos DROP TABLE da primeira migration em banco isolado.

CREATE TABLE public.configurations (id text PRIMARY KEY);
CREATE TABLE public.tests (
  id text PRIMARY KEY,
  configuration_id text NOT NULL REFERENCES public.configurations(id)
);
CREATE TABLE public.telemetries (
  id text PRIMARY KEY,
  test_id text NOT NULL REFERENCES public.tests(id)
);
CREATE TABLE public.ai_predictions (
  id text PRIMARY KEY,
  test_id text NOT NULL REFERENCES public.tests(id)
);
CREATE TABLE public.energy_summaries (id text PRIMARY KEY);
CREATE TABLE public.mqtt_messages (id text PRIMARY KEY);
CREATE TABLE public.ai_interactions (id text PRIMARY KEY);

INSERT INTO public.configurations VALUES ('synthetic-configuration');
INSERT INTO public.tests VALUES ('synthetic-test', 'synthetic-configuration');
INSERT INTO public.telemetries VALUES ('synthetic-telemetry', 'synthetic-test');
INSERT INTO public.ai_predictions VALUES ('synthetic-prediction', 'synthetic-test');
INSERT INTO public.energy_summaries VALUES ('synthetic-summary');
INSERT INTO public.mqtt_messages VALUES ('synthetic-message');
INSERT INTO public.ai_interactions VALUES ('synthetic-interaction');
