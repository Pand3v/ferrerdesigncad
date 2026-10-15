export type OrderStatus = 'orcamento' | 'pedido_gerado' | 'aprovado' | 'em_producao' | 'concluido' | 'cancelado';

export interface Client {
  id: string;
  name: string;
  cpfCnpj?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface OrderItem {
  id: string;
  quantity: string;
  description: string;
  totalItemCents: number;
}

export interface CompanySettings {
  logoUrl?: string;
  tradeName: string;
  legalName: string;
  cnpj: string;
  unit: string;
  address: string;
  zipCode: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  instagram: string;
  headerServices: string;
  pixKey: string;
  nextOrderNumber: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ClientSnapshot {
  name: string;
  cpfCnpj?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  state?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderNumberInt: number;
  date: string; // DD/MM/AAAA
  status: OrderStatus;
  clientId?: string;
  clientSnapshot: ClientSnapshot;
  companySnapshot: CompanySettings;
  items: OrderItem[];
  totalGeneralCents: number;
  paymentTerms: string;
  pixKey: string;
  deliveryTime: string;
  deliveryDate?: string;
  notes: string;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorizedUser {
  email: string;
  name?: string;
  role?: 'super_admin' | 'operador' | 'admin';
  addedAt: string;
  addedBy: string;
}

export interface PaidService {
  id: string;
  date: string; // YYYY-MM-DD or DD/MM/AAAA
  time: string; // HH:MM
  service: string; // Nome/descrição do serviço
  valueCents: number; // Valor em centavos
  providerName?: string; // Prestador / Fornecedor terceirizado
  paymentMethod?: string; // PIX, Dinheiro, Cartão, Transferência, Boleto
  notes?: string; // Observações
  category?: string; // Acabamento, Costura, Frete, Manutenção, etc.
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}
