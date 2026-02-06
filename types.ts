export type Language = 'en' | 'zh-TW';

export type ThemeMode = 'light' | 'dark';

export interface PainterTheme {
  id: string;
  name: string;
  colors: {
    bg: string;
    text: string;
    accent: string;
    secondary: string;
    panelBg: string;
    borderColor: string;
    coral: string;
  };
}

export interface DistributionRecord {
  SupplierID: string;
  Category: string;
  LicenseNo: string;
  Model: string;
  LotNO: string;
  SerialNo: string;
  CustomerID: string;
  DeliverDate: string;
  Quantity: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}
