export interface IpEntry {
  id: string;
  ip: string;
  port: string;
  region: string;
  active: boolean;
}

export type SortField = 'ip' | 'port' | 'region';