/**
 * Tenant-resolution contracts for the multi-store platform.
 * Production implementation must validate hostnames and enforce tenant scope
 * in database queries/RLS—not rely on client-provided store IDs.
 */
export type StoreStatus = 'draft' | 'active' | 'suspended';

export interface StoreRecord {
  id: string;
  slug: string;
  name: string;
  status: StoreStatus;
  primaryDomain: string | null;
}

export interface DomainMapping {
  hostname: string;
  storeId: string;
  verifiedAt: string | null;
  isPrimary: boolean;
}

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/:\\d+$/, '').replace(/^www\\./, '');
}
