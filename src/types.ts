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

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  type: 'purchase' | 'payment' | 'debt';
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface SmartInputResult {
  customer: Partial<Customer>;
  transactions: Array<{
    type: 'purchase' | 'payment' | 'debt';
    amount: number;
    description: string;
  }>;
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
  customers: Customer[];
  transactions: Transaction[];
  settings: AppSettings;
}
