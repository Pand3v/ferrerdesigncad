import React from 'react';
import { AlmaPrintLogo } from './AlmaPrintLogo';
import {
  Users,
  FileText,
  Settings,
  Plus,
  LogOut,
  ShieldCheck,
  Crown,
  CalendarDays,
  BarChart3,
  HandCoins,
} from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '../utils/constants';

export type ActiveTab = 'clients' | 'orders' | 'settings' | 'order_form' | 'document_view' | 'calendar' | 'dashboard' | 'paid_services';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  clientsCount: number;
  ordersCount: number;
  pendingDeliveriesCount?: number;
  paidServicesCount?: number;
  userEmail: string;
  onLogout: () => void;
  onNewOrder: () => void;
  customLogoUrl?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  clientsCount,
  ordersCount,
  pendingDeliveriesCount = 0,
  paidServicesCount = 0,
  userEmail,
  onLogout,
  onNewOrder,
  customLogoUrl,
}) => {
  return (
    <header className="no-print bg-[#052116]/90 backdrop-blur-xl border-b border-emerald-500/20 sticky top-0 z-40 shadow-xl shadow-black/40 transition-all w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-13 sm:h-16 gap-2 sm:gap-4">
          {/* Logo & Brand title */}
          <div
            onClick={() => setActiveTab('orders')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group shrink-0 min-w-0"
            title="Ir para Pedidos e Orçamentos"
          >
            <div className="block sm:hidden">
              <AlmaPrintLogo customLogoUrl={customLogoUrl} height={28} variant="light" />
            </div>
            <div className="hidden sm:block">
              <AlmaPrintLogo customLogoUrl={customLogoUrl} height={38} variant="light" />
            </div>
            <div className="hidden md:block pl-3 border-l border-emerald-500/25">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-950/60 px-2 py-0.5 border border-emerald-500/30 rounded-md shadow-inner">
                CAD
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Visible on tablets and desktop) */}
          <nav className="hidden sm:flex items-center gap-1.5 lg:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('clients')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                activeTab === 'clients'
                  ? 'bg-emerald-500/20 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                  : 'text-emerald-100/70 hover:text-white hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Clientes</span>
              {clientsCount > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'clients'
                      ? 'bg-emerald-400 text-emerald-950'
                      : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {clientsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                activeTab === 'orders' || activeTab === 'order_form' || activeTab === 'document_view'
                  ? 'bg-emerald-500/20 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                  : 'text-emerald-100/70 hover:text-white hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Pedidos<span className="hidden md:inline"> & Orçamentos</span></span>
              {ordersCount > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'orders' || activeTab === 'order_form' || activeTab === 'document_view'
                      ? 'bg-emerald-400 text-emerald-950'
                      : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {ordersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                activeTab === 'calendar'
                  ? 'bg-emerald-500/20 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                  : 'text-emerald-100/70 hover:text-white hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
              }`}
              title="Calendário e Cronograma de Entregas"
            >
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <span>Entregas</span>
              {pendingDeliveriesCount > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'calendar'
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-amber-900/60 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {pendingDeliveriesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('paid_services')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                activeTab === 'paid_services'
                  ? 'bg-emerald-500/20 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                  : 'text-emerald-100/70 hover:text-white hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
              }`}
              title="Prestação de Serviços Pagos e Gastos Operacionais"
            >
              <HandCoins className="w-4 h-4 text-emerald-400" />
              <span>Serviços Pagos</span>
              {paidServicesCount > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'paid_services'
                      ? 'bg-emerald-400 text-emerald-950'
                      : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {paidServicesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-500/20 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                  : 'text-emerald-100/70 hover:text-white hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
              }`}
              title="Dashboard e Gráficos de Entregas"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                activeTab === 'settings'
                  ? 'bg-emerald-500/20 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                  : 'text-emerald-100/70 hover:text-white hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
              }`}
              title="Configurações da Empresa"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Configurações</span>
            </button>
          </nav>

          {/* Action, User & Logout Area */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Quick New Order Button on Mobile */}
            <button
              type="button"
              onClick={onNewOrder}
              className="inline-flex sm:hidden items-center justify-center p-2 text-slate-950 font-bold bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg shadow-sm transition-all cursor-pointer"
              title="Criar Novo Pedido / Orçamento"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Desktop New Order Button */}
            <button
              type="button"
              onClick={onNewOrder}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-lg shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido
            </button>

            <div className="h-6 w-px bg-emerald-500/25 hidden sm:block" />

            {/* Desktop User display */}
            <div className="text-right hidden sm:block">
              <div className="font-semibold text-white leading-tight max-w-[150px] truncate" title={userEmail}>
                {userEmail}
              </div>
              <div className="text-[10px] text-emerald-300/80 font-medium flex items-center justify-end gap-1">
                {userEmail.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim() ? (
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    Super Admin
                  </span>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Autorizado
                  </>
                )}
              </div>
            </div>

            {/* Logout Button (ALWAYS 100% visible, inside screen bounds, with label on mobile & desktop) */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/35 hover:border-rose-400/60 rounded-lg transition-all cursor-pointer shrink-0 shadow-sm"
              title="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Segmented Navigation Sub-Bar (Visible strictly on screens < 640px) */}
      <div className="sm:hidden px-1 pb-2 pt-1 border-t border-emerald-500/15 bg-black/30">
        <nav className="grid grid-cols-6 gap-0.5 w-full">
          {/* Clientes Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs font-bold transition-all border ${
              activeTab === 'clients'
                ? 'bg-emerald-500/25 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                : 'text-emerald-100/70 hover:text-white bg-emerald-950/40 border-emerald-500/10'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-[9px] mt-0.5">Clientes</span>
          </button>

          {/* Pedidos Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs font-bold transition-all border ${
              activeTab === 'orders' || activeTab === 'order_form' || activeTab === 'document_view'
                ? 'bg-emerald-500/25 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                : 'text-emerald-100/70 hover:text-white bg-emerald-950/40 border-emerald-500/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-[9px] mt-0.5">Pedidos</span>
          </button>

          {/* Entregas Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs font-bold transition-all border ${
              activeTab === 'calendar'
                ? 'bg-emerald-500/25 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                : 'text-emerald-100/70 hover:text-white bg-emerald-950/40 border-emerald-500/10'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-[9px] mt-0.5">Entregas</span>
          </button>

          {/* Serviços Pagos Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('paid_services')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs font-bold transition-all border ${
              activeTab === 'paid_services'
                ? 'bg-emerald-500/25 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                : 'text-emerald-100/70 hover:text-white bg-emerald-950/40 border-emerald-500/10'
            }`}
          >
            <HandCoins className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-[9px] mt-0.5">Gastos</span>
          </button>

          {/* Dashboard / Gráficos Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs font-bold transition-all border ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500/25 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                : 'text-emerald-100/70 hover:text-white bg-emerald-950/40 border-emerald-500/10'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-[9px] mt-0.5">Gráficos</span>
          </button>

          {/* Configurações Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-xs font-bold transition-all border ${
              activeTab === 'settings'
                ? 'bg-emerald-500/25 text-white border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                : 'text-emerald-100/70 hover:text-white bg-emerald-950/40 border-emerald-500/10'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-[9px] mt-0.5">Config</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
