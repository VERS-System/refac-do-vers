// Define as visões públicas de instalações, dispositivos e configurações VERS.

export type InstallationStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'FAULT';
export type DeviceStatus = 'PROVISIONING' | 'ONLINE' | 'OFFLINE' | 'REVOKED' | 'FAULT';
export type PiezoAssociation = 'SERIES' | 'PARALLEL' | 'MIXED';
export type StorageType = 'BATTERY' | 'SUPERCAPACITOR' | 'CAPACITOR' | 'NONE';

export interface PublicDevice {
  id: string;
  name: string | null;
  firmwareVersion: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
}

export interface Installation {
  id: string;
  vehicleId: string;
  systemModel: string;
  status: InstallationStatus;
  installedAt: string | null;
  activeDevice: PublicDevice | null;
  createdAt: string;
  updatedAt: string;
}

export interface Configuration {
  id: string;
  installationId: string;
  name: string;
  version: number;
  activePiezoCount: number;
  piezoAssociation: PiezoAssociation;
  installationPoint: string;
  storageType: StorageType;
  notes: string | null;
  createdAt: string;
}

export interface InstallationSearchQuery {
  page?: number;
  pageSize?: number;
  vehicleId?: string;
  status?: InstallationStatus;
}

export interface ConfigurationSearchQuery {
  page?: number;
  pageSize?: number;
}
