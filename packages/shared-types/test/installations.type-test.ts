// Testa contratos públicos de instalações e configurações sem expor credenciais.

import type {
  ApiSuccessResponse,
  Configuration,
  ConfigurationSearchQuery,
  Installation,
  InstallationSearchQuery,
  PaginatedResponse,
  PublicDevice,
} from '../src/index';
import {
  configurationFixture,
  configurationListFixture,
  installationFixture,
  installationListFixture,
} from '../src/index';

const installationQuery: InstallationSearchQuery = {
  page: 1,
  pageSize: 20,
  vehicleId: installationFixture.vehicleId,
  status: 'ACTIVE',
};
const configurationQuery: ConfigurationSearchQuery = { page: 1, pageSize: 20 };
const installation: ApiSuccessResponse<Installation> = {
  data: installationFixture,
  requestId: 'request-installation-001',
};
const installations: PaginatedResponse<Installation> = installationListFixture;
const configuration: ApiSuccessResponse<Configuration> = {
  data: configurationFixture,
  requestId: 'request-configuration-001',
};
const configurations: PaginatedResponse<Configuration> = configurationListFixture;
const activeDevice: PublicDevice | null = installationFixture.activeDevice;

void installationQuery;
void configurationQuery;
void installation;
void installations;
void configuration;
void configurations;
void activeDevice;

// @ts-expect-error Credenciais MQTT não integram a visão pública do dispositivo.
const secretDevice: PublicDevice = { ...installationFixture.activeDevice, mqttPassword: 'secret' };
void secretDevice;

// @ts-expect-error Configurações publicadas precisam de uma versão.
const unversionedConfiguration: Configuration = { ...configurationFixture, version: undefined };
void unversionedConfiguration;

// @ts-expect-error A consulta de instalação não recebe placa na query string.
const queryByPlate: InstallationSearchQuery = { licensePlate: 'ABC1D23' };
void queryByPlate;
