// Contratos minimizados de veículos vinculados aos usuários do VERS.

export type VehicleRelationship = 'OWNER' | 'DRIVER' | 'ADMIN';

export interface Vehicle {
  id: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  modelYear: number | null;
  relationship: VehicleRelationship;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  brand?: string;
  model?: string;
  modelYear?: number;
}

export interface UpdateVehicleRequest {
  brand?: string | null;
  model?: string | null;
  modelYear?: number | null;
  isPrimary?: boolean;
}
