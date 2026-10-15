import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { centsToBRL } from '../utils/currency';
import {
  calculateDeliveryTimeline,
  parseDateFlexible,
  formatDateToBR,
} from '../utils/dateUtils';
import { printOrderPDF } from '../utils/pdfExport';
import {
  Calendar as CalendarIcon,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays,
  Printer,
  Eye,
  Edit3,
  ChevronLeft,
  ChevronRight,
  List,
  Calendar as MonthViewIcon,
  Phone,
  ArrowUpDown,
  Sparkles,
  Info,
} from 'lucide-react';

interface DeliveryCalendarViewProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onCreateNewOrder: () => void;
}

type ViewMode = 'table' | 'calendar';
type UrgencyFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'concluded';

export const DeliveryCalendarView: React.FC<DeliveryCalendarViewProps> = ({
  orders,
  onViewOrder,
  onEditOrder,
  onCreateNewOrder,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [sortField, setSortField] = useState<'deliveryDate' | 'orderNumber' | 'daysRemaining'>('deliveryDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Month navigation for Calendar view mode
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Calculate timeline details for each order
  const ordersWithTimeline = useMemo(() => {
    return orders.map(order => {
      const timeline = calculateDeliveryTimeline(
        order.date,
        order.deliveryDate || '',
        order.status
      );
      const deliveryParsed = parseDateFlexible(order.deliveryDate);
      const orderDateParsed = parseDateFlexible(order.date);

      return {
        order,
        timeline,
        deliveryParsed,
        orderDateParsed,
      };
    });
  }, [orders]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;
    let upcomingWeekCount = 0;
    let onTimeCount = 0;
    let concludedCount = 0;

    ordersWithTimeline.forEach(({ timeline }) => {
      if (timeline.isConcluded) {
        concludedCount++;
      } else if (timeline.isOverdue) {
        overdueCount++;
      } else if (timeline.isToday) {
        todayCount++;
      } else if (timeline.daysRemaining !== null && timeline.daysRemaining > 0 && timeline.daysRemaining <= 7) {
        upcomingWeekCount++;
      } else if (timeline.daysRemaining !== null && timeline.daysRemaining > 7) {
        onTimeCount++;
      }
    });

    return {
      total: orders.length,
      overdueCount,
      todayCount,
      upcomingWeekCount,
      onTimeCount,
      concludedCount,
    };
  }, [ordersWithTimeline, orders.length]);

  // Filtered and Sorted list
  const filteredOrders = useMemo(() => {
    return ordersWithTimeline
      .filter(({ order, timeline }) => {
        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchNumber = order.orderNumber.toLowerCase().includes(term);
          const matchClient = (order.clientSnapshot?.name || '').toLowerCase().includes(term);
          const matchContact = (order.clientSnapshot?.contactPerson || '').toLowerCase().includes(term);
          const matchPhone = (order.clientSnapshot?.phone || '').toLowerCase().includes(term);
          if (!matchNumber && !matchClient && !matchContact && !matchPhone) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter !== 'all' && order.status !== statusFilter) {
          return false;
        }

        // Urgency filter
        if (urgencyFilter === 'overdue' && !timeline.isOverdue) return false;
        if (urgencyFilter === 'today' && !timeline.isToday) return false;
        if (urgencyFilter === 'upcoming') {
          if (timeline.isConcluded || timeline.isOverdue) return false;
          if (timeline.daysRemaining === null || timeline.daysRemaining < 0 || timeline.daysRemaining > 7) {
            return false;
          }
        }
        if (urgencyFilter === 'concluded' && !timeline.isConcluded) return false;

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'deliveryDate') {
          const timeA = a.deliveryParsed ? a.deliveryParsed.getTime() : (sortDirection === 'asc' ? 9999999999999 : -1);
          const timeB = b.deliveryParsed ? b.deliveryParsed.getTime() : (sortDirection === 'asc' ? 9999999999999 : -1);
          diff = timeA - timeB;
        } else if (sortField === 'orderNumber') {
          diff = (a.order.orderNumberInt || 0) - (b.order.orderNumberInt || 0);
        } else if (sortField === 'daysRemaining') {
          const daysA = a.timeline.daysRemaining ?? (sortDirection === 'asc' ? 9999 : -9999);
          const daysB = b.timeline.daysRemaining ?? (sortDirection === 'asc' ? 9999 : -9999);
          diff = daysA - daysB;
        }

        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [ordersWithTimeline, searchTerm, statusFilter, urgencyFilter, sortField, sortDirection]);

  // Calendar View: days matrix calculation
  const calendarData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Map orders to date strings YYYY-MM-DD
    const ordersByDay = new Map<string, typeof ordersWithTimeline>();

    ordersWithTimeline.forEach(item => {
      if (item.deliveryParsed) {
        const key = `${item.deliveryParsed.getFullYear()}-${String(item.deliveryParsed.getMonth() + 1).padStart(2, '0')}-${String(item.deliveryParsed.getDate()).padStart(2, '0')}`;
        const existing = ordersByDay.get(key) || [];
        existing.push(item);
        ordersByDay.set(key, existing);
      }
    });

    const days = [];
    // Padding days before start of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNumber: null, dateKey: null, orders: [] });
    }

    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOrders = ordersByDay.get(dateKey) || [];
      days.push({
        dayNumber: day,
        dateKey,
        orders: dayOrders,
      });
    }

    return {
      year,
      month,
      monthName: currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      days,
    };
  }, [currentCalendarDate, ordersWithTimeline]);

  const handlePrintOS = (order: Order) => {
    printOrderPDF({ order, isServiceOrder: true });
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'orcamento':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">Orçamento</span>;
      case 'aprovado':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Aprovado</span>;
      case 'em_producao':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Em Produção</span>;
      case 'concluido':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Concluído</span>;
      case 'cancelado':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">Cancelado</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-500/20 text-neutral-300 border border-neutral-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Top Header & View Mode Switcher */}
      <div className="bg-[#07281c]/75 backdrop-blur-xl p-4 sm:p-5 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 flex flex-wrap items-center justify-between gap-3 sm:gap-4 w-full max-w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 rounded-xl text-emerald-300 shadow-inner">
            <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              Calendário e Cronograma de Entregas
            </h1>
            <p className="text-xs text-emerald-200/70">
              Acompanhamento de prazos, dias restantes e previsão de entrega por pedido
            </p>
          </div>
        </div>

        {/* View mode toggle (Table vs Month Calendar) */}
        <div className="flex items-center gap-1.5 bg-[#03150d] p-1 border border-emerald-500/30 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-emerald-500/30 text-white border border-emerald-400/40 shadow-sm'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Tabela de Prazos</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-emerald-500/30 text-white border border-emerald-400/40 shadow-sm'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            <MonthViewIcon className="w-3.5 h-3.5" />
            <span>Visão Mensal</span>
          </button>
        </div>
      </div>

      {/* KPI / Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Overdue */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'overdue' ? 'all' : 'overdue')}
          className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
            urgencyFilter === 'overdue'
              ? 'bg-rose-950/80 border-rose-400 shadow-md shadow-rose-950/50'
              : 'bg-[#062419]/60 hover:bg-rose-950/30 border-rose-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Atrasados
            </span>
            <span className="text-lg sm:text-2xl font-black text-rose-200 font-mono">
              {metrics.overdueCount}
            </span>
          </div>
          <p className="text-[10px] text-rose-300/60 mt-1">Data de entrega expirada</p>
        </div>

        {/* Today */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'today' ? 'all' : 'today')}
          className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
            urgencyFilter === 'today'
              ? 'bg-amber-950/80 border-amber-400 shadow-md shadow-amber-950/50'
              : 'bg-[#062419]/60 hover:bg-amber-950/30 border-amber-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Entrega Hoje
            </span>
            <span className="text-lg sm:text-2xl font-black text-amber-200 font-mono">
              {metrics.todayCount}
            </span>
          </div>
          <p className="text-[10px] text-amber-300/60 mt-1">Vencimento no dia de hoje</p>
        </div>

        {/* Next 7 days */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'upcoming' ? 'all' : 'upcoming')}
          className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
            urgencyFilter === 'upcoming'
              ? 'bg-teal-950/80 border-teal-400 shadow-md shadow-teal-950/50'
              : 'bg-[#062419]/60 hover:bg-teal-950/30 border-teal-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-teal-400" />
              Próx. 7 dias
            </span>
            <span className="text-lg sm:text-2xl font-black text-teal-200 font-mono">
              {metrics.upcomingWeekCount}
            </span>
          </div>
          <p className="text-[10px] text-teal-300/60 mt-1">Prazo nesta semana</p>
        </div>

        {/* On Time (> 7 days) */}
        <div
          onClick={() => setUrgencyFilter('all')}
          className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
            urgencyFilter === 'all'
              ? 'bg-emerald-950/80 border-emerald-400/50'
              : 'bg-[#062419]/60 hover:bg-emerald-950/40 border-emerald-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              No Prazo
            </span>
            <span className="text-lg sm:text-2xl font-black text-emerald-200 font-mono">
              {metrics.onTimeCount}
            </span>
          </div>
          <p className="text-[10px] text-emerald-300/60 mt-1">Mais de 7 dias restantes</p>
        </div>

        {/* Concluded */}
        <div
          onClick={() => setUrgencyFilter(urgencyFilter === 'concluded' ? 'all' : 'concluded')}
          className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            urgencyFilter === 'concluded'
              ? 'bg-cyan-950/80 border-cyan-400 shadow-md'
              : 'bg-[#062419]/60 hover:bg-cyan-950/30 border-cyan-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Concluídos
            </span>
            <span className="text-lg sm:text-2xl font-black text-cyan-200 font-mono">
              {metrics.concludedCount}
            </span>
          </div>
          <p className="text-[10px] text-cyan-300/60 mt-1">Já entregues</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#062419]/60 backdrop-blur-xl p-3.5 sm:p-4 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nº do pedido, cliente, telefone..."
              className="w-full pl-9 pr-3 py-2 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs placeholder-emerald-400/40 outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#04160f] border border-emerald-500/30 rounded-xl py-2 px-3 text-xs text-white font-medium outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="orcamento">Orçamento</option>
              <option value="aprovado">Aprovado</option>
              <option value="em_producao">Em Produção</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Quick Urgency filter */}
          {urgencyFilter !== 'all' && (
            <button
              onClick={() => setUrgencyFilter('all')}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/15 text-emerald-200 border border-white/20 transition-all cursor-pointer"
            >
              Limpar filtro de urgência &times;
            </button>
          )}

          {/* Sort selector for Table view */}
          {viewMode === 'table' && (
            <button
              type="button"
              onClick={() => {
                if (sortField === 'deliveryDate') {
                  setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setSortField('deliveryDate');
                  setSortDirection('asc');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 border border-white/15 cursor-pointer"
              title="Alternar ordenação por data de entrega"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ordenar: Data Entrega ({sortDirection === 'asc' ? 'Mais próximos' : 'Mais distantes'})</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: STRUCTURED TABLE (DESKTOP) & TOUCH CARDS (MOBILE) */}
      {viewMode === 'table' && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#062419]/70 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-emerald-500/25 bg-[#051c14] text-emerald-200 font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Nº Pedido</th>
                    <th className="py-3.5 px-4">Nome do Cliente</th>
                    <th className="py-3.5 px-4 text-center">Data do Pedido</th>
                    <th className="py-3.5 px-4 text-center">Data de Entrega</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center bg-emerald-950/40 border-l border-r border-emerald-500/20">
                      Dias Restantes para Entrega
                    </th>
                    <th className="py-3.5 px-4 text-center">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/15">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-emerald-200/60">
                        <CalendarIcon className="w-10 h-10 mx-auto text-emerald-400/40 mb-3" />
                        <p className="font-semibold text-sm">Nenhum pedido encontrado com os filtros selecionados.</p>
                        <p className="text-xs text-emerald-300/60 mt-1">
                          Defina a data de entrega no formulário do pedido para acompanhar prazos.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(({ order, timeline }) => (
                      <tr
                        key={order.id}
                        className={`hover:bg-emerald-500/10 transition-colors ${
                          timeline.isOverdue
                            ? 'bg-rose-950/20'
                            : timeline.isToday
                            ? 'bg-amber-950/20'
                            : ''
                        }`}
                      >
                        {/* Nº Pedido */}
                        <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onViewOrder(order)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 hover:text-white border border-emerald-400/30 transition-all cursor-pointer font-mono font-bold"
                            title="Visualizar documento completo"
                          >
                            <span>#{order.orderNumber}</span>
                          </button>
                        </td>

                        {/* Nome do Cliente */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-xs leading-snug">
                            {order.clientSnapshot?.name || 'Cliente não identificado'}
                          </div>
                          <div className="text-[11px] text-emerald-300/70 flex items-center gap-2 mt-0.5">
                            {order.clientSnapshot?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                {order.clientSnapshot.phone}
                              </span>
                            )}
                            {order.clientSnapshot?.contactPerson && (
                              <span>&bull; Contato: {order.clientSnapshot.contactPerson}</span>
                            )}
                          </div>
                        </td>

                        {/* Data do Pedido */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap font-medium text-emerald-100">
                          {timeline.orderDateFormatted}
                        </td>

                        {/* Data de Entrega */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg border border-white/15 font-mono">
                            {timeline.deliveryDateFormatted}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>

                        {/* ÚLTIMO CAMPO: DIAS RESTANTES / CONTABILIZAÇÃO DE PRAZO */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap bg-emerald-950/30 border-l border-r border-emerald-500/20">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-3 py-1 rounded-xl text-xs font-black border ${timeline.statusBadge.bgClass} ${timeline.statusBadge.colorClass} ${timeline.statusBadge.borderClass}`}
                            >
                              {timeline.statusBadge.text}
                            </span>
                            {timeline.statusBadge.subtext && (
                              <span className="text-[10px] text-emerald-300/70 font-medium mt-1">
                                {timeline.statusBadge.subtext}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Ações Rápidas */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onViewOrder(order)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition-colors cursor-pointer"
                              title="Visualizar Documento"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintOS(order)}
                              className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 transition-colors cursor-pointer"
                              title="Imprimir Ordem de Serviço (OS)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditOrder(order)}
                              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
                              title="Editar Pedido / Alterar Data"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View (Visible on screens < md) */}
          <div className="block md:hidden space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-[#062419]/70 backdrop-blur-xl p-8 rounded-2xl border border-emerald-500/20 text-center text-emerald-200/60">
                <CalendarIcon className="w-8 h-8 mx-auto text-emerald-400/40 mb-2" />
                <p className="font-semibold text-sm">Nenhum pedido encontrado.</p>
              </div>
            ) : (
              filteredOrders.map(({ order, timeline }) => (
                <div
                  key={order.id}
                  className={`bg-[#062419]/80 backdrop-blur-xl border rounded-2xl p-4 space-y-3 shadow-lg shadow-black/30 ${
                    timeline.isOverdue
                      ? 'border-rose-500/40 bg-rose-950/15'
                      : timeline.isToday
                      ? 'border-amber-500/40 bg-amber-950/15'
                      : 'border-emerald-500/20'
                  }`}
                >
                  {/* Top card header: Order number + Status */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-white text-sm bg-emerald-500/25 px-2.5 py-1 rounded-lg border border-emerald-400/30">
                      Nº {order.orderNumber}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* Client Info */}
                  <div>
                    <h3 className="font-bold text-white text-sm leading-snug">
                      {order.clientSnapshot?.name || 'Cliente não identificado'}
                    </h3>
                    {order.clientSnapshot?.phone && (
                      <p className="text-xs text-emerald-300/80 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        {order.clientSnapshot.phone}
                      </p>
                    )}
                  </div>

                  {/* Dates Grid: Data do Pedido vs Data de Entrega */}
                  <div className="grid grid-cols-2 gap-2 bg-[#03150e]/80 p-2.5 rounded-xl border border-emerald-500/15 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-300/70 block">
                        Data do Pedido
                      </span>
                      <span className="font-medium text-white">{timeline.orderDateFormatted}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-300/70 block">
                        Data de Entrega
                      </span>
                      <span className="font-black text-white">{timeline.deliveryDateFormatted}</span>
                    </div>
                  </div>

                  {/* ÚLTIMO CAMPO: DIAS RESTANTES */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 text-center">
                    <div className="text-[10px] uppercase font-extrabold text-emerald-300/70 mb-1">
                      Contabilização de Prazo
                    </div>
                    <span
                      className={`inline-block px-3 py-1 rounded-lg text-xs font-black border ${timeline.statusBadge.bgClass} ${timeline.statusBadge.colorClass} ${timeline.statusBadge.borderClass}`}
                    >
                      {timeline.statusBadge.text}
                    </span>
                    {timeline.statusBadge.subtext && (
                      <div className="text-[10px] text-emerald-300/70 mt-1">
                        {timeline.statusBadge.subtext}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-500/15">
                    <button
                      type="button"
                      onClick={() => onViewOrder(order)}
                      className="py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintOS(order)}
                      className="py-2 px-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>OS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditOrder(order)}
                      className="py-2 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* VIEW MODE 2: MONTH CALENDAR GRID */}
      {viewMode === 'calendar' && (
        <div className="bg-[#062419]/70 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 p-4 sm:p-6 space-y-4">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <h2 className="text-base sm:text-lg font-extrabold text-white capitalize flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-400" />
              {calendarData.monthName}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentCalendarDate(
                    new Date(calendarData.year, calendarData.month - 1, 1)
                  )
                }
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/15 text-emerald-200 border border-white/15 cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentCalendarDate(
                    new Date(calendarData.year, calendarData.month + 1, 1)
                  )
                }
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/15 text-emerald-200 border border-white/15 cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-extrabold uppercase text-emerald-300 tracking-wider">
            <div className="py-1.5 bg-[#03150d] rounded-lg">Dom</div>
            <div className="py-1.5 bg-[#03150d] rounded-lg">Seg</div>
            <div className="py-1.5 bg-[#03150d] rounded-lg">Ter</div>
            <div className="py-1.5 bg-[#03150d] rounded-lg">Qua</div>
            <div className="py-1.5 bg-[#03150d] rounded-lg">Qui</div>
            <div className="py-1.5 bg-[#03150d] rounded-lg">Sex</div>
            <div className="py-1.5 bg-[#03150d] rounded-lg">Sáb</div>
          </div>

          {/* Calendar grid cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarData.days.map((cell, index) => {
              if (!cell.dayNumber) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[85px] sm:min-h-[110px] p-1.5 bg-black/20 rounded-xl border border-transparent opacity-40"
                  />
                );
              }

              const isToday =
                new Date().getDate() === cell.dayNumber &&
                new Date().getMonth() === calendarData.month &&
                new Date().getFullYear() === calendarData.year;

              return (
                <div
                  key={`day-${cell.dayNumber}`}
                  className={`min-h-[85px] sm:min-h-[110px] p-1 sm:p-1.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'bg-emerald-950/70 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-[#04160f]/80 hover:bg-[#062419] border-emerald-500/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${
                        isToday ? 'bg-emerald-400 text-slate-950' : 'text-emerald-100'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.orders.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-300/80">
                        {cell.orders.length} {cell.orders.length === 1 ? 'ped' : 'peds'}
                      </span>
                    )}
                  </div>

                  {/* Order chips inside cell */}
                  <div className="space-y-1 my-1 overflow-y-auto max-h-[80px]">
                    {cell.orders.slice(0, 3).map(({ order, timeline }) => (
                      <div
                        key={order.id}
                        onClick={() => onViewOrder(order)}
                        className={`p-1 rounded-md text-[10px] font-semibold truncate cursor-pointer transition-all border ${
                          timeline.isOverdue
                            ? 'bg-rose-950/90 text-rose-200 border-rose-500/50 hover:bg-rose-900'
                            : timeline.isConcluded
                            ? 'bg-cyan-950/90 text-cyan-200 border-cyan-500/50 hover:bg-cyan-900'
                            : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 hover:bg-emerald-900'
                        }`}
                        title={`Pedido #${order.orderNumber} - ${order.clientSnapshot?.name || 'Cliente'} (${timeline.statusBadge.text})`}
                      >
                        <span className="font-mono font-bold mr-1">#{order.orderNumber}</span>
                        <span>{order.clientSnapshot?.name || 'Cliente'}</span>
                      </div>
                    ))}
                    {cell.orders.length > 3 && (
                      <div className="text-[9px] font-bold text-emerald-300 text-center">
                        +{cell.orders.length - 3} mais...
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-emerald-400/40 text-right">
                    {cell.orders.length === 0 ? '' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
