export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  taxRate: number;
  description: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Log {
  id: string;
  action: string;
  productId: string;
  productName: string;
  quantity: number;
  timestamp: string;
  details: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  dateFormat: string;
  itemsPerPage: number;
  autoBackup: boolean;
  taxDefault: number;
}

export interface AppData {
  products: Product[];
  categories: Category[];
  logs: Log[];
  settings: AppSettings;
}
