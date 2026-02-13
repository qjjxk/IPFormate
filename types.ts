export interface IpEntry {
  id: string;
  ip: string;
  port: string;
  region: string;
  active: boolean;
  isLocked?: boolean; // 新增：是否为锁定项
}

export type SortField = 'ip' | 'port' | 'region';