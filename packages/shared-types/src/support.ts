// Define a abertura e o acompanhamento público das revisões do sistema VERS.

export type SupportStatus = 'OPEN' | 'IN_REVIEW' | 'SCHEDULED' | 'RESOLVED' | 'CANCELLED';

export interface SupportRequest {
  id: string;
  vehicleId: string | null;
  installationId: string | null;
  reason: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportRequest {
  vehicleId: string;
  installationId?: string;
  reason: string;
}

export interface SupportSearchQuery {
  page?: number;
  pageSize?: number;
  status?: SupportStatus;
}
