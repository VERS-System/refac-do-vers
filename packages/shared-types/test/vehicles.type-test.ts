// Testes de compilação dos contratos minimizados de veículos do VERS.

import type {
  ApiSuccessResponse,
  CreateVehicleRequest,
  PaginatedResponse,
  UpdateVehicleRequest,
  Vehicle,
} from '../src/index';
import { vehicleFixture, vehicleListFixture } from '../src/index';

const createRequest: CreateVehicleRequest = {
  licensePlate: 'ABC1D23',
  brand: 'Marca Exemplo',
  model: 'Modelo Exemplo',
  modelYear: 2026,
};

const updateRequest: UpdateVehicleRequest = {
  modelYear: 2027,
  isPrimary: true,
};

const vehicleResponse: ApiSuccessResponse<Vehicle> = {
  data: vehicleFixture,
  requestId: 'request-vehicle-001',
};

const vehicleListResponse: PaginatedResponse<Vehicle> = vehicleListFixture;

void createRequest;
void updateRequest;
void vehicleResponse;
void vehicleListResponse;

// @ts-expect-error A placa normalizada é obrigatória no cadastro.
const requestWithoutPlate: CreateVehicleRequest = { brand: 'Marca Exemplo' };
void requestWithoutPlate;

const requestWithPersonalDocument: CreateVehicleRequest = {
  licensePlate: 'ABC1D23',
  // @ts-expect-error CPF e documentos não pertencem ao contrato de veículo.
  cpf: '00000000000',
};
void requestWithPersonalDocument;

const requestWithPrivilegeEscalation: UpdateVehicleRequest = {
  // @ts-expect-error O cliente não altera o próprio vínculo administrativo.
  relationship: 'ADMIN',
};
void requestWithPrivilegeEscalation;

const requestChangingPlate: UpdateVehicleRequest = {
  // @ts-expect-error A placa é imutável depois do cadastro do veículo.
  licensePlate: 'XYZ9Z99',
};
void requestChangingPlate;
