/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  History,
  Settings as SettingsIcon,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  TrendingUp,
  FileDown,
  FileUp,
  BrainCircuit,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Save,
  Download,
  Upload
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Product, Category, Log, AppSettings, AppData } from './types';
import { callGeminiAI, AI_MODELS, AiError } from './services/geminiService';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initial Mock Data
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Điện tử', icon: 'Cpu', color: '#3b82f6' },
  { id: 'cat2', name: 'Gia dụng', icon: 'Home', color: '#10b981' },
  { id: 'cat3', name: 'Thời trang', icon: 'Shirt', color: '#f59e0b' },
  { id: 'cat4', name: 'Thực phẩm', icon: 'Coffee', color: '#ef4444' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'iPhone 15 Pro', category: 'Điện tử', price: 28000000, stock: 15, minStock: 5, unit: 'Cái', taxRate: 10, description: 'Điện thoại cao cấp Apple', updatedAt: new Date().toISOString() },
  { id: 'p2', name: 'Nồi cơm điện Sharp', category: 'Gia dụng', price: 1200000, stock: 3, minStock: 10, unit: 'Cái', taxRate: 8, description: 'Nồi cơm điện tử đa năng', updatedAt: new Date().toISOString() },
  { id: 'p3', name: 'Áo thun Cotton', category: 'Thời trang', price: 250000, stock: 100, minStock: 20, unit: 'Cái', taxRate: 5, description: 'Áo thun 100% cotton thoáng mát', updatedAt: new Date().toISOString() },
  { id: 'p4', name: 'Sữa tươi Vinamilk', category: 'Thực phẩm', price: 35000, stock: 500, minStock: 50, unit: 'Hộp', taxRate: 0, description: 'Sữa tươi tiệt trùng 1L', updatedAt: new Date().toISOString() },
  { id: 'p5', name: 'Bàn phím cơ AKKO', category: 'Điện tử', price: 1500000, stock: 8, minStock: 10, unit: 'Cái', taxRate: 10, description: 'Bàn phím cơ hotswap', updatedAt: new Date().toISOString() },
];

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'history' | 'settings' | 'ai-suggestions'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [logs, setLogs] = useState<Log[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    dateFormat: 'dd/MM/yyyy HH:mm',
    itemsPerPage: 10,
    autoBackup: true,
    taxDefault: 10
  });
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [aiError, setAiError] = useState<AiError | null>(null);
  const [tempApiKey, setTempApiKey] = useState('');

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // --- Initialization ---
  useEffect(() => {
    const savedData = localStorage.getItem('smartsales_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setProducts(parsed.products || INITIAL_PRODUCTS);
      setLogs(parsed.logs || []);
      setSettings(parsed.settings || settings);
    } else {
      setProducts(INITIAL_PRODUCTS);
    }

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setShowApiKeyModal(true);
    }
    const savedModel = localStorage.getItem('gemini_selected_model');
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  useEffect(() => {
    const dataToSave = { products, logs, settings };
    localStorage.setItem('smartsales_data', JSON.stringify(dataToSave));
  }, [products, logs, settings]);

  // --- Helpers ---
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const addLog = (action: string, product: Product, quantity: number, details: string) => {
    const newLog: Log = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      productId: product.id,
      productName: product.name,
      quantity,
      timestamp: new Date().toISOString(),
      details
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // --- Actions ---
  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData: Partial<Product> = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
      minStock: Number(formData.get('minStock')),
      unit: formData.get('unit') as string,
      taxRate: Number(formData.get('taxRate')),
      description: formData.get('description') as string,
      updatedAt: new Date().toISOString(),
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productData } as Product : p));
      addLog('Cập nhật sản phẩm', { ...editingProduct, ...productData } as Product, 0, 'Thay đổi thông tin sản phẩm');
    } else {
      const newProduct: Product = {
        id: Math.random().toString(36).substr(2, 9),
        ...productData as Product
      };
      setProducts(prev => [...prev, newProduct]);
      addLog('Thêm sản phẩm mới', newProduct, newProduct.stock, 'Khởi tạo sản phẩm');
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleStockChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProductForStock) return;

    const formData = new FormData(e.currentTarget);
    const quantity = Number(formData.get('quantity'));
    const type = stockAction;

    setProducts(prev => prev.map(p => {
      if (p.id === selectedProductForStock.id) {
        const newStock = type === 'in' ? p.stock + quantity : p.stock - quantity;
        return { ...p, stock: Math.max(0, newStock), updatedAt: new Date().toISOString() };
      }
      return p;
    }));

    addLog(
      type === 'in' ? 'Nhập kho' : 'Xuất kho',
      selectedProductForStock,
      quantity,
      type === 'in' ? `Nhập thêm ${quantity} ${selectedProductForStock.unit}` : `Xuất đi ${quantity} ${selectedProductForStock.unit}`
    );

    setIsStockModalOpen(false);
    setSelectedProductForStock(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      const product = products.find(p => p.id === id);
      setProducts(prev => prev.filter(p => p.id !== id));
      if (product) addLog('Xóa sản phẩm', product, 0, 'Xóa khỏi danh mục');
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `SmartSales_Inventory_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleAiAnalyze = async () => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsAiLoading(true);
    setAiResponse(null);
    setAiError(null);

    const inventorySummary = products.map(p =>
      `- ${p.name}: Tồn kho ${p.stock}/${p.minStock} ${p.unit}, Giá ${formatCurrency(p.price)}`
    ).join('\n');

    const salesSummary = logs
      .filter(l => l.action === 'Xuất kho')
      .slice(0, 20)
      .map(l => `- ${l.productName}: Xuất ${l.quantity} vào ${format(new Date(l.timestamp), 'dd/MM/yyyy')}`)
      .join('\n');

    const prompt = `
      Bạn là một chuyên gia phân tích kinh doanh và quản lý chuỗi cung ứng thông minh. 
      Dưới đây là dữ liệu kho hàng hiện tại:
      ${inventorySummary}

      Dưới đây là dữ liệu bán hàng gần đây (Xuất kho):
      ${salesSummary}

      Hãy thực hiện phân tích chuyên sâu và cung cấp các gợi ý hành động (AI Suggestions):
      1. **Phân tích tồn kho:** Xác định các mặt hàng đang dư thừa hoặc sắp hết hàng dựa trên tốc độ bán hàng.
      2. **Dự báo nhu cầu:** Dự đoán nhu cầu trong 30 ngày tới cho các danh mục chính.
      3. **Gợi ý nhập hàng (Reordering):** Danh sách cụ thể các mặt hàng cần nhập thêm, số lượng gợi ý và mức độ ưu tiên.
      4. **Gợi ý giải phóng kho (Stock Clearance):** Các mặt hàng tồn kho lâu ngày, chậm bán và đề xuất chương trình khuyến mãi/giảm giá cụ thể.
      5. **Chiến lược tối ưu:** Một lời khuyên chiến lược để tăng vòng quay vốn.

      Trả lời bằng tiếng Việt, định dạng Markdown chuyên nghiệp, sử dụng các icon phù hợp.
    `;

    try {
      const response = await callGeminiAI(prompt, apiKey, selectedModel);
      setAiResponse(response);
      setAiError(null);
    } catch (error: any) {
      const aiErr = error as AiError;
      if (aiErr && aiErr.raw) {
        setAiError(aiErr);
      } else {
        setAiError({
          message: 'Đã dừng do lỗi',
          code: error?.code || 'UNKNOWN',
          raw: error?.message || 'Lỗi không xác định từ API',
        });
      }
      setAiResponse(null);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveApiKeyFromModal = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey.trim());
      localStorage.setItem('gemini_api_key', tempApiKey.trim());
      setShowApiKeyModal(false);
      setTempApiKey('');
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('gemini_selected_model', modelId);
  };

  // --- Computed ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, filterCategory]);

  const stats = useMemo(() => {
    const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
    return { totalValue, lowStockCount, totalItems, productCount: products.length };
  }, [products]);

  const chartData = useMemo(() => {
    return categories.map(cat => ({
      name: cat.name,
      value: products.filter(p => p.category === cat.name).reduce((acc, p) => acc + (p.price * p.stock), 0),
      count: products.filter(p => p.category === cat.name).length
    }));
  }, [products, categories]);

  // --- Render Helpers ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng giá trị kho"
          value={formatCurrency(stats.totalValue)}
          icon={<TrendingUp className="text-emerald-500" />}
          trend="+12% so với tháng trước"
        />
        <StatCard
          title="Sản phẩm sắp hết"
          value={stats.lowStockCount}
          icon={<AlertTriangle className="text-amber-500" />}
          color={stats.lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"}
          trend="Cần chú ý nhập hàng"
        />
        <StatCard
          title="Tổng số lượng tồn"
          value={stats.totalItems.toLocaleString()}
          icon={<Package className="text-blue-500" />}
          trend="Đang lưu kho"
        />
        <StatCard
          title="Danh mục sản phẩm"
          value={stats.productCount}
          icon={<LayoutDashboard className="text-purple-500" />}
          trend="Đang kinh doanh"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Panel */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Phân bổ giá trị theo danh mục</h3>
            <div className="text-xs text-slate-400">Dữ liệu thời gian thực</div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Giá trị']}
                />
                <Bar dataKey="value" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#28A745" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Assistant Panel */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <BrainCircuit className="text-emerald-400 w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Assistant</h3>
              <p className="text-xs text-slate-400">Phân tích & Gợi ý thông minh</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-400 animate-pulse">Đang phân tích dữ liệu kho...</p>
              </div>
            ) : aiResponse ? (
              <div className="markdown-body text-slate-200 text-sm">
                <Markdown>{aiResponse}</Markdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
                <TrendingUp className="w-12 h-12 text-slate-600" />
                <p className="text-sm">Nhấn nút bên dưới để AI phân tích tình hình kinh doanh của bạn.</p>
              </div>
            )}
          </div>

          <button
            onClick={handleAiAnalyze}
            disabled={isAiLoading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <BrainCircuit size={18} />
            {aiResponse ? "Phân tích lại" : "Phân tích ngay"}
          </button>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {stats.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-full">
            <AlertTriangle className="text-amber-600 w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900">Cảnh báo tồn kho thấp!</h4>
            <p className="text-sm text-amber-700">Có {stats.lowStockCount} sản phẩm đang ở mức báo động. Hãy kiểm tra và nhập hàng sớm.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <select
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">Tất cả danh mục</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>

          <button
            onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-emerald-600 transition-all whitespace-nowrap"
          >
            <Plus size={18} />
            Thêm mới
          </button>

          <button
            onClick={handleExportExcel}
            className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
            title="Xuất Excel"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-bottom border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Danh mục</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Giá bán</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Tồn kho</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{product.name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">{product.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={cn(
                      "font-bold",
                      product.stock <= product.minStock ? "text-amber-600" : "text-slate-700"
                    )}>
                      {product.stock} <span className="text-[10px] font-normal text-slate-400 uppercase">{product.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {product.stock <= 0 ? (
                      <span className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600" /> Hết hàng
                      </span>
                    ) : product.stock <= product.minStock ? (
                      <span className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" /> Sắp hết
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Đang bán
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setSelectedProductForStock(product); setStockAction('in'); setIsStockModalOpen(true); }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Nhập kho"
                      >
                        <ArrowUpRight size={18} />
                      </button>
                      <button
                        onClick={() => { setSelectedProductForStock(product); setStockAction('out'); setIsStockModalOpen(true); }}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Xuất kho"
                      >
                        <ArrowDownLeft size={18} />
                      </button>
                      <button
                        onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={40} className="opacity-20" />
                      <p>Không tìm thấy sản phẩm nào phù hợp.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xl">Lịch sử hoạt động</h3>
        <button
          onClick={() => setLogs([])}
          className="text-xs text-red-500 hover:underline"
        >
          Xóa toàn bộ lịch sử
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-50">
          {logs.length > 0 ? logs.map(log => (
            <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
              <div className={cn(
                "p-2 rounded-xl",
                log.action.includes('Nhập') ? "bg-emerald-100 text-emerald-600" :
                  log.action.includes('Xuất') ? "bg-amber-100 text-amber-600" :
                    log.action.includes('Xóa') ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
              )}>
                {log.action.includes('Nhập') ? <ArrowUpRight size={20} /> :
                  log.action.includes('Xuất') ? <ArrowDownLeft size={20} /> :
                    log.action.includes('Xóa') ? <Trash2 size={20} /> : <History size={20} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">{log.action}</span>
                  <span className="text-xs text-slate-400">{format(new Date(log.timestamp), settings.dateFormat)}</span>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{log.productName}</span>: {log.details}
                </p>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-slate-400">
              Chưa có hoạt động nào được ghi lại.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAiSuggestions = () => (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-2xl text-slate-900">AI Suggestions</h3>
          <p className="text-slate-500">Phân tích tồn kho, dự báo nhu cầu và gợi ý hành động thông minh.</p>
        </div>
        <button
          onClick={handleAiAnalyze}
          disabled={isAiLoading}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <BrainCircuit size={20} />
          {isAiLoading ? "Đang phân tích..." : "Cập nhật gợi ý"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[400px] relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50" />

          <div className="relative z-10">
            {isAiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-emerald-100 rounded-full" />
                  <div className="absolute top-0 w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-bold text-slate-800">Đang xử lý dữ liệu...</p>
                  <p className="text-sm text-slate-400">Gemini AI đang phân tích kho hàng và lịch sử bán hàng của bạn.</p>
                </div>
              </div>
            ) : aiError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="p-4 bg-red-50 rounded-full">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <div className="max-w-md space-y-2">
                  <p className="text-lg font-bold text-red-700">Đã dừng do lỗi</p>
                  <p className="text-sm text-red-600">{aiError.message}</p>
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-left">
                    <p className="text-xs font-mono text-red-800 break-all">{aiError.raw}</p>
                  </div>
                </div>
                <button
                  onClick={handleAiAnalyze}
                  className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
                >
                  Thử lại
                </button>
              </div>
            ) : aiResponse ? (
              <div className="markdown-body prose prose-slate max-w-none">
                <Markdown>{aiResponse}</Markdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="p-6 bg-slate-50 rounded-full">
                  <BrainCircuit size={48} className="text-slate-300" />
                </div>
                <div className="max-w-sm space-y-2">
                  <p className="text-lg font-bold text-slate-800">Sẵn sàng phân tích</p>
                  <p className="text-sm text-slate-400">Nhấn nút "Cập nhật gợi ý" để nhận các phân tích chuyên sâu về kho hàng của bạn từ trí tuệ nhân tạo.</p>
                </div>
                <button
                  onClick={handleAiAnalyze}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                  Bắt đầu ngay
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <h4 className="font-bold text-blue-900 text-sm mb-1">Dự báo nhu cầu</h4>
            <p className="text-xs text-blue-700">AI sử dụng dữ liệu xuất kho để dự đoán xu hướng mua sắm sắp tới.</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <h4 className="font-bold text-emerald-900 text-sm mb-1">Tối ưu nhập hàng</h4>
            <p className="text-xs text-emerald-700">Gợi ý số lượng nhập hàng tối ưu để tránh đọng vốn hoặc đứt hàng.</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <h4 className="font-bold text-purple-900 text-sm mb-1">Xử lý hàng tồn</h4>
            <p className="text-xs text-purple-700">Nhận diện các mặt hàng chậm bán và đề xuất chương trình xả kho.</p>
          </div>
        </div>
      </div>
    </div>
  );
  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Model Selector Cards */}
      <section className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <BrainCircuit className="text-emerald-500" /> Thiết lập Model & API Key
        </h3>
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">Chọn Model AI</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {AI_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model.id)}
                className={cn(
                  "relative p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md",
                  selectedModel === model.id
                    ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                {model.badge && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full uppercase">{model.badge}</span>
                )}
                {selectedModel === model.id && (
                  <div className="absolute top-3 right-3">
                    <Check size={16} className="text-emerald-600" />
                  </div>
                )}
                <div className="font-bold text-sm text-slate-900">{model.name}</div>
                <div className="text-[11px] text-slate-500 mt-1">{model.description}</div>
                <div className="text-[10px] text-slate-400 mt-2 font-mono">{model.id}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Gemini API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Nhập API Key của bạn..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">Lấy API Key miễn phí tại <a href="https://aistudio.google.com/api-keys" target="_blank" className="text-emerald-500 underline">Google AI Studio</a></p>
          </div>
          <button
            onClick={() => { localStorage.setItem('gemini_api_key', apiKey); alert('Đã lưu API Key!'); }}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} /> Lưu cấu hình
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <SettingsIcon className="text-blue-500" /> Cài đặt hệ thống
        </h3>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Thuế mặc định (%)</div>
              <div className="text-xs text-slate-400">Áp dụng cho các sản phẩm mới</div>
            </div>
            <input
              type="number"
              className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center"
              value={settings.taxDefault}
              onChange={(e) => setSettings({ ...settings, taxDefault: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Tự động sao lưu</div>
              <div className="text-xs text-slate-400">Lưu dữ liệu vào LocalStorage</div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoBackup: !settings.autoBackup })}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                settings.autoBackup ? "bg-emerald-500" : "bg-slate-300"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                settings.autoBackup ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-4">
            <button
              onClick={() => {
                const data = JSON.stringify({ products, logs, settings });
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `smartsales_backup_${format(new Date(), 'yyyyMMdd')}.json`;
                a.click();
              }}
              className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} /> Xuất dữ liệu (JSON)
            </button>
            <label className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={16} /> Nhập dữ liệu
              <input
                type="file"
                className="hidden"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const data = JSON.parse(event.target?.result as string);
                        if (data.products) setProducts(data.products);
                        if (data.logs) setLogs(data.logs);
                        if (data.settings) setSettings(data.settings);
                        alert('Nhập dữ liệu thành công!');
                      } catch (err) {
                        alert('File không hợp lệ!');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">SmartSales <span className="text-emerald-500">AI</span></h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Tổng quan"
          />
          <NavItem
            active={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
            icon={<Package size={20} />}
            label="Kho hàng"
          />
          <NavItem
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            icon={<History size={20} />}
            label="Lịch sử"
          />
          <NavItem
            active={activeTab === 'ai-suggestions'}
            onClick={() => setActiveTab('ai-suggestions')}
            icon={<BrainCircuit size={20} />}
            label="Gợi ý AI"
          />
          <NavItem
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon size={20} />}
            label="Cài đặt"
          />
        </nav>

        {/* Settings API Key Button */}
        <button
          onClick={() => setActiveTab('settings')}
          className="mb-3 p-3 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <SettingsIcon size={16} className="text-red-500" />
            <span className="text-sm font-bold text-slate-700">API Key</span>
          </div>
          <p className="text-[11px] text-red-500 font-semibold mt-1">Lấy API key để sử dụng app</p>
        </button>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hỗ trợ AI</div>
          <p className="text-xs text-slate-600 leading-relaxed">Sử dụng Gemini AI để tối ưu hóa quy trình kinh doanh của bạn.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Header Desktop */}
        <header className="hidden md:flex items-center justify-between mb-6">
          <div />
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"
          >
            <SettingsIcon size={16} className="text-red-500" />
            <span className="text-sm font-medium text-slate-700">Settings (API Key)</span>
            <span className="text-[11px] text-red-500 font-semibold">Lấy API key để sử dụng app</span>
          </button>
        </header>
        {/* Header Mobile */}
        <header className="md:hidden flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-lg">SmartSales AI</h1>
          </div>
          <button onClick={() => setActiveTab('settings')} className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm border border-red-200">
            <SettingsIcon size={18} className="text-red-500" />
            <span className="text-[10px] text-red-500 font-bold">API Key</span>
          </button>
        </header>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'ai-suggestions' && renderAiSuggestions()}
          {activeTab === 'settings' && renderSettings()}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between z-50">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} />
        <MobileNavItem active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={24} />} />
        <MobileNavItem active={activeTab === 'ai-suggestions'} onClick={() => setActiveTab('ai-suggestions')} icon={<BrainCircuit size={24} />} />
        <MobileNavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={24} />} />
        <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={24} />} />
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {isProductModalOpen && (
          <Modal title={editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"} onClose={() => setIsProductModalOpen(false)}>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Tên sản phẩm</label>
                  <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Danh mục</label>
                  <select name="category" defaultValue={editingProduct?.category} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500">
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Giá bán (VND)</label>
                  <input type="number" name="price" defaultValue={editingProduct?.price} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Đơn vị tính</label>
                  <input name="unit" defaultValue={editingProduct?.unit || 'Cái'} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Tồn kho hiện tại</label>
                  <input type="number" name="stock" defaultValue={editingProduct?.stock || 0} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Tồn kho tối thiểu</label>
                  <input type="number" name="minStock" defaultValue={editingProduct?.minStock || 5} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Thuế (%)</label>
                  <input type="number" name="taxRate" defaultValue={editingProduct?.taxRate || settings.taxDefault} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Mô tả</label>
                <textarea name="description" defaultValue={editingProduct?.description} rows={3} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Hủy</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Lưu sản phẩm</button>
              </div>
            </form>
          </Modal>
        )}

        {isStockModalOpen && selectedProductForStock && (
          <Modal title={stockAction === 'in' ? "Nhập kho sản phẩm" : "Xuất kho sản phẩm"} onClose={() => setIsStockModalOpen(false)}>
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-xs text-slate-400 uppercase font-bold mb-1">Sản phẩm</div>
              <div className="font-bold text-lg text-slate-900">{selectedProductForStock.name}</div>
              <div className="text-sm text-slate-500">Tồn kho hiện tại: <span className="font-bold text-slate-700">{selectedProductForStock.stock} {selectedProductForStock.unit}</span></div>
            </div>
            <form onSubmit={handleStockChange} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Số lượng {stockAction === 'in' ? 'nhập thêm' : 'xuất đi'}</label>
                <input
                  type="number"
                  name="quantity"
                  autoFocus
                  required
                  min="1"
                  className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-2xl font-bold text-center focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-all">Hủy</button>
                <button
                  type="submit"
                  className={cn(
                    "flex-1 py-3 text-white rounded-xl font-semibold transition-all shadow-lg",
                    stockAction === 'in' ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                  )}
                >
                  Xác nhận {stockAction === 'in' ? 'Nhập' : 'Xuất'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Mandatory API Key Modal */}
        {showApiKeyModal && (
          <Modal title="Cấu hình API Key Gemini" onClose={() => { if (apiKey) setShowApiKeyModal(false); }}>
            <div className="space-y-5">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <p className="text-sm text-blue-800 leading-relaxed">
                  Để sử dụng SmartSales AI, bạn cần có API Key miễn phí từ Google AI Studio.
                </p>
                <a
                  href="https://aistudio.google.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-blue-600 hover:text-blue-700 underline"
                >
                  👉 Lấy API Key tại aistudio.google.com/api-keys
                  <ArrowUpRight size={14} />
                </a>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nhập API Key của bạn</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-mono"
                  placeholder="AIzaSy..."
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                onClick={handleSaveApiKeyFromModal}
                disabled={!tempApiKey.trim()}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} /> Lưu và bắt đầu sử dụng
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Subcomponents ---

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active ? "bg-emerald-50 text-emerald-600 font-bold shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <span className={cn("transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-xl transition-all",
        active ? "text-emerald-600 bg-emerald-50" : "text-slate-400"
      )}
    >
      {icon}
    </button>
  );
}

function StatCard({ title, value, icon, trend, color = "text-slate-900" }: { title: string, value: string | number, icon: React.ReactNode, trend: string, color?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</div>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </div>
      <div className={cn("text-2xl font-bold mb-1", color)}>{value}</div>
      <div className="text-[10px] text-slate-400 font-medium">{trend}</div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <h3 className="font-bold text-xl text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
