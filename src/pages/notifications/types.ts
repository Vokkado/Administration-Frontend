export interface NotificationFormData {
  title: string;
  body: string;
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  totalDevices: number;
}

export interface DeviceStats {
  total: number;
  active: number;
  inactive: number;
}
