import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, PaidService } from '../types';
import { centsToBRL } from '../utils/currency';
import {
  calculateDeliveryTimeline,
  parseDateFlexible,
  formatDateToBR,
} from '../utils/dateUtils';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Filter,
  Eye,
  Printer,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  HandCoins,
  Wallet,
} from 'lucide-react';

interface DeliveryDashboardViewProps {
  orders: Order[];
  paidServices?: PaidService[];
  onViewOrder: (order: Order) => void;
  onGoToDeliveries: () => void;
  onGoToOrders: () => void;
  onGoToPaidServices?: () => void;
}

type PeriodFilter = 'all' | 'current_month' | 'active_only' | 'next_30_days';

export const DeliveryDashboardView: React.FC<DeliveryDashboardViewProps> = ({
  orders,
  paidServices = [],
  onViewOrder,
  onGoToDeliveries,
  onGoToOrders,
  onGoToPaidServices,
}) => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedStatusHover, setSelectedStatusHover] = useState<string | null>(null);

  // Today at midnight
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Compute all orders with their calculated delivery timeline
  const allOrdersWithTimeline = useMemo(() => {
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

  // Filter orders according to selected period
  const filteredOrders = useMemo(() => {
    return allOrdersWithTimeline.filter(({ order, timeline, deliveryParsed }) => {
      if (periodFilter === 'active_only') {
        return order.status !== 'concluido' && order.status !== 'cancelado';
      }

      if (periodFilter === 'current_month') {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        if (!deliveryParsed) return false;
        return (
          deliveryParsed.getFullYear() === currentYear &&
          deliveryParsed.getMonth() === currentMonth
        );
      }

      if (periodFilter === 'next_30_days') {
        if (!deliveryParsed) return false;
        const diffDays = Math.round(
          (deliveryParsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays >= 0 && diffDays <= 30 && order.status !== 'concluido';
      }

      return true;
    });
  }, [allOrdersWithTimeline, periodFilter, now, today]);

  // General KPIs and Metrics
  const metrics = useMemo(() => {
    const totalCount = filteredOrders.length;
    let overdueCount = 0;
    let overdueCents = 0;
    let todayCount = 0;
    let onTimeCount = 0;
    let concludedCount = 0;
    let totalCents = 0;
    let inProductionCents = 0;

    filteredOrders.forEach(({ order, timeline }) => {
      totalCents += order.totalGeneralCents || 0;

      if (order.status === 'em_producao' || order.status === 'aprovado') {
        inProductionCents += order.totalGeneralCents || 0;
      }

      if (timeline.isConcluded) {
        concludedCount++;
      } else if (timeline.isOverdue) {
        overdueCount++;
        overdueCents += order.totalGeneralCents || 0;
      } else if (timeline.isToday) {
        todayCount++;
      } else if (timeline.daysRemaining !== null && timeline.daysRemaining > 0) {
        onTimeCount++;
      }
    });

    const activeDeliveriesCount = totalCount - concludedCount;
    const punctualityRate =
      activeDeliveriesCount > 0
        ? Math.round(((onTimeCount + todayCount) / activeDeliveriesCount) * 100)
        : 100;

    return {
      totalCount,
      totalCents,
      inProductionCents,
      overdueCount,
      overdueCents,
      todayCount,
      onTimeCount,
      concludedCount,
      punctualityRate,
    };
  }, [filteredOrders]);

  // Filter and compute Paid Services Expenses Metrics
  const filteredPaidServices = useMemo(() => {
    if (!paidServices || paidServices.length === 0) return [];

    return paidServices.filter(item => {
      const parsedDate = parseDateFlexible(item.date);
      if (!parsedDate) return true;

      if (periodFilter === 'current_month') {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        return (
          parsedDate.getFullYear() === currentYear &&
          parsedDate.getMonth() === currentMonth
        );
      }

      if (periodFilter === 'next_30_days') {
        const diffDays = Math.round(
          (parsedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays >= -30 && diffDays <= 30;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.time || '').localeCompare(a.time || '');
    });
  }, [paidServices, periodFilter, now, today]);

  const paidServicesMetrics = useMemo(() => {
    let totalCents = 0;
    filteredPaidServices.forEach(item => {
      totalCents += item.valueCents || 0;
    });
    return {
      count: filteredPaidServices.length,
      totalCents,
      netBalanceCents: metrics.totalCents - totalCents,
    };
  }, [filteredPaidServices, metrics.totalCents]);

  // Breakdown by Status
  const statusDistribution = useMemo(() => {
    const counts: Record<OrderStatus, { count: number; totalCents: number; label: string; color: string; bg: string }> = {
      orcamento: { count: 0, totalCents: 0, label: 'Orçamento', color: '#f59e0b', bg: 'bg-amber-500' },
      pedido_gerado: { count: 0, totalCents: 0, label: 'Pedido Gerado (Arte)', color: '#a855f7', bg: 'bg-purple-500' },
      aprovado: { count: 0, totalCents: 0, label: 'Aprovado', color: '#10b981', bg: 'bg-emerald-500' },
      em_producao: { count: 0, totalCents: 0, label: 'Em Produção', color: '#6366f1', bg: 'bg-indigo-500' },
      concluido: { count: 0, totalCents: 0, label: 'Concluído', color: '#06b6d4', bg: 'bg-cyan-500' },
      cancelado: { count: 0, totalCents: 0, label: 'Cancelado', color: '#f43f5e', bg: 'bg-rose-500' },
    };

    filteredOrders.forEach(({ order }) => {
      if (counts[order.status]) {
        counts[order.status].count += 1;
        counts[order.status].totalCents += order.totalGeneralCents || 0;
      }
    });

    const total = filteredOrders.length || 1;
    return Object.entries(counts).map(([key, data]) => ({
      status: key as OrderStatus,
      ...data,
      percentage: Math.round((data.count / total) * 100),
    }));
  }, [filteredOrders]);

  // Breakdown by Delivery Urgency
  const deliveryUrgencyData = useMemo(() => {
    const total = filteredOrders.length || 1;
    return [
      {
        key: 'on_time',
        label: 'No Prazo (> 7 dias)',
        count: metrics.onTimeCount,
        percentage: Math.round((metrics.onTimeCount / total) * 100),
        color: '#10b981',
        bg: 'bg-emerald-500',
        textColor: 'text-emerald-300',
      },
      {
        key: 'today',
        label: 'Entrega Hoje',
        count: metrics.todayCount,
        percentage: Math.round((metrics.todayCount / total) * 100),
        color: '#f59e0b',
        bg: 'bg-amber-500',
        textColor: 'text-amber-300',
      },
      {
        key: 'overdue',
        label: 'Atrasados',
        count: metrics.overdueCount,
        percentage: Math.round((metrics.overdueCount / total) * 100),
        color: '#f43f5e',
        bg: 'bg-rose-500',
        textColor: 'text-rose-300',
      },
      {
        key: 'concluded',
        label: 'Concluídos',
        count: metrics.concludedCount,
        percentage: Math.round((metrics.concludedCount / total) * 100),
        color: '#06b6d4',
        bg: 'bg-cyan-500',
        textColor: 'text-cyan-300',
      },
    ];
  }, [filteredOrders.length, metrics]);

  // Deliveries grouped by upcoming weeks / timeline buckets
  const deliveryTimelineBuckets = useMemo(() => {
    const buckets = [
      { label: 'Atrasados', count: 0, cents: 0, color: 'bg-rose-500', barColor: '#f43f5e', urgency: 'overdue' },
      { label: 'Hoje', count: 0, cents: 0, color: 'bg-amber-500', barColor: '#f59e0b', urgency: 'today' },
      { label: '1 a 7 dias', count: 0, cents: 0, color: 'bg-teal-500', barColor: '#14b8a6', urgency: 'soon' },
      { label: '8 a 15 dias', count: 0, cents: 0, color: 'bg-emerald-500', barColor: '#10b981', urgency: 'normal' },
      { label: '16 a 30 dias', count: 0, cents: 0, color: 'bg-emerald-600', barColor: '#059669', urgency: 'normal' },
      { label: '+30 dias', count: 0, cents: 0, color: 'bg-indigo-500', barColor: '#6366f1', urgency: 'future' },
      { label: 'Concluídos', count: 0, cents: 0, color: 'bg-cyan-500', barColor: '#06b6d4', urgency: 'concluded' },
    ];

    filteredOrders.forEach(({ order, timeline }) => {
      const val = order.totalGeneralCents || 0;
      if (timeline.isConcluded) {
        buckets[6].count++;
        buckets[6].cents += val;
      } else if (timeline.isOverdue) {
        buckets[0].count++;
        buckets[0].cents += val;
      } else if (timeline.isToday) {
        buckets[1].count++;
        buckets[1].cents += val;
      } else if (timeline.daysRemaining !== null) {
        const d = timeline.daysRemaining;
        if (d >= 1 && d <= 7) {
          buckets[2].count++;
          buckets[2].cents += val;
        } else if (d >= 8 && d <= 15) {
          buckets[3].count++;
          buckets[3].cents += val;
        } else if (d >= 16 && d <= 30) {
          buckets[4].count++;
          buckets[4].cents += val;
        } else if (d > 30) {
          buckets[5].count++;
          buckets[5].cents += val;
        }
      }
    });

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map(b => ({
      ...b,
      heightPercentage: Math.round((b.count / maxCount) * 100),
    }));
  }, [filteredOrders]);

  // Critical Attention Orders (Overdue or Due in next 3 days)
  const criticalOrders = useMemo(() => {
    return allOrdersWithTimeline
      .filter(({ order, timeline }) => {
        if (timeline.isConcluded || order.status === 'cancelado') return false;
        if (timeline.isOverdue || timeline.isToday) return true;
        if (timeline.daysRemaining !== null && timeline.daysRemaining <= 3) return true;
        return false;
      })
      .sort((a, b) => {
        const daysA = a.timeline.daysRemaining ?? 9999;
        const daysB = b.timeline.daysRemaining ?? 9999;
        return daysA - daysB;
      })
      .slice(0, 5);
  }, [allOrdersWithTimeline]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Top Header & Period Selector */}
      <div className="bg-[#07281c]/75 backdrop-blur-xl p-4 sm:p-5 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 flex flex-wrap items-center justify-between gap-3 sm:gap-4 w-full max-w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 rounded-xl text-emerald-300 shadow-inner">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              Dashboard de Entregas & Pedidos
            </h1>
            <p className="text-xs text-emerald-200/70">
              Métricas consolidadas de pontualidade, status de produção e fluxo de prazos
            </p>
          </div>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-[#03150d] p-1 border border-emerald-500/30 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => setPeriodFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              periodFilter === 'all'
                ? 'bg-emerald-500/30 text-white border border-emerald-400/40 shadow-sm'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('active_only')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              periodFilter === 'active_only'
                ? 'bg-emerald-500/30 text-white border border-emerald-400/40 shadow-sm'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            Ativos / Pendentes
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('current_month')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              periodFilter === 'current_month'
                ? 'bg-emerald-500/30 text-white border border-emerald-400/40 shadow-sm'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            Mês Atual
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('next_30_days')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              periodFilter === 'next_30_days'
                ? 'bg-emerald-500/30 text-white border border-emerald-400/40 shadow-sm'
                : 'text-emerald-300/70 hover:text-white'
            }`}
          >
            Próximos 30 dias
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total em Produção / Entregas */}
        <div className="bg-[#062419]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/30 space-y-2">
          <div className="flex items-center justify-between text-emerald-300/80">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Total de Pedidos
            </span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {metrics.totalCount}
            </span>
            <span className="text-xs font-bold text-emerald-300">
              {centsToBRL(metrics.totalCents)}
            </span>
          </div>
          <div className="text-[10px] text-emerald-300/60 flex items-center justify-between pt-1 border-t border-emerald-500/15">
            <span>Em Produção / Aprovados:</span>
            <span className="font-bold text-white font-mono">{centsToBRL(metrics.inProductionCents)}</span>
          </div>
        </div>

        {/* Taxa de Pontualidade / No Prazo */}
        <div className="bg-[#062419]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/30 space-y-2">
          <div className="flex items-center justify-between text-emerald-300/80">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              No Prazo
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
              {metrics.onTimeCount}
            </span>
            <span className="text-xs font-bold text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
              {metrics.punctualityRate}% pontual
            </span>
          </div>
          <div className="w-full bg-[#03150d] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics.punctualityRate}%` }}
            />
          </div>
        </div>

        {/* Entrega Hoje */}
        <div className="bg-[#062419]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-amber-500/25 shadow-xl shadow-black/30 space-y-2">
          <div className="flex items-center justify-between text-amber-300/80">
            <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Entrega Hoje
            </span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-200 font-mono">
              {metrics.todayCount}
            </span>
            <span className="text-[11px] font-semibold text-amber-300/80">
              Vencem no dia atual
            </span>
          </div>
          <p className="text-[10px] text-amber-200/60 pt-1 border-t border-amber-500/15">
            Prioridade de expedição e despacho
          </p>
        </div>

        {/* Atrasados (Alerta) */}
        <div className="bg-[#062419]/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-rose-500/30 shadow-xl shadow-black/30 space-y-2">
          <div className="flex items-center justify-between text-rose-300/90">
            <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Atrasados
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-300 font-mono">
              {metrics.overdueCount}
            </span>
            <span className="text-xs font-bold text-rose-200 font-mono">
              {centsToBRL(metrics.overdueCents)}
            </span>
          </div>
          <p className="text-[10px] text-rose-300/70 pt-1 border-t border-rose-500/15">
            {metrics.overdueCount === 0 ? 'Nenhum atraso registrado' : 'Exigem contato imediato com clientes'}
          </p>
        </div>
      </div>

      {/* FINANCIAL OVERVIEW & GASTOS COM SERVIÇOS PAGOS BANNER */}
      <div className="bg-gradient-to-r from-[#062419] via-[#041a12] to-[#082a1c] p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-xl shadow-black/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl">
              <HandCoins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Controle de Gastos & Serviços Terceirizados
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  {paidServicesMetrics.count} {paidServicesMetrics.count === 1 ? 'gasto registrado' : 'gastos registrados'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/70">
                Resumo integrado de pagamentos a prestadores no filtro atual ({periodFilter === 'current_month' ? 'Mês Atual' : periodFilter === 'next_30_days' ? 'Próximos 30 dias' : 'Período Completo'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {/* Total Gastos */}
            <div className="bg-black/30 px-3.5 py-2 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase text-emerald-300/70 block">
                Total em Gastos
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                {centsToBRL(paidServicesMetrics.totalCents)}
              </span>
            </div>

            {/* Balanço Operacional */}
            <div className="bg-black/30 px-3.5 py-2 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] font-bold uppercase text-emerald-300/70 block">
                Saldo Operacional Líquido
              </span>
              <span className={`text-base sm:text-lg font-black font-mono ${paidServicesMetrics.netBalanceCents >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>
                {centsToBRL(paidServicesMetrics.netBalanceCents)}
              </span>
            </div>

            {onGoToPaidServices && (
              <button
                type="button"
                onClick={onGoToPaidServices}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <span>Acessar Serviços Pagos</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CHARTS ROW 1: STATUS DISTRIBUTION & DELIVERY TIMELINE HISTOGRAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Chart 1: Timeline de Entregas por Período (Histograma de Barras) */}
        <div className="lg:col-span-7 bg-[#062419]/70 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  Cronograma de Entregas por Prazos
                </h3>
                <p className="text-[11px] text-emerald-200/70">
                  Distribuição volumétrica dos pedidos agrupados por vencimento
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToDeliveries}
              className="text-xs text-emerald-300 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <span>Ver Tabela</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vertical Bar Chart Container */}
          <div className="h-56 pt-6 flex items-end justify-between gap-2 sm:gap-3 px-1 sm:px-2">
            {deliveryTimelineBuckets.map((bucket, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Count badge on top */}
                <span className="text-[11px] font-mono font-bold text-white mb-1.5 opacity-90 group-hover:scale-110 transition-transform">
                  {bucket.count}
                </span>

                {/* Vertical Bar */}
                <div className="w-full max-w-[42px] bg-[#03150d] rounded-t-xl h-full flex items-end p-0.5 border border-emerald-500/10">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-700 ease-out group-hover:brightness-125 ${bucket.color}`}
                    style={{
                      height: `${Math.max(bucket.heightPercentage, bucket.count > 0 ? 12 : 2)}%`,
                    }}
                    title={`${bucket.label}: ${bucket.count} pedidos (${centsToBRL(bucket.cents)})`}
                  />
                </div>

                {/* X-axis Label */}
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-200/80 mt-2 text-center truncate max-w-full">
                  {bucket.label}
                </span>
                <span className="text-[9px] text-emerald-300/50 font-mono hidden sm:block">
                  {centsToBRL(bucket.cents)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Distribuição por Status do Pedido (Funil de Produção) */}
        <div className="lg:col-span-5 bg-[#062419]/70 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  Status de Produção dos Pedidos
                </h3>
                <p className="text-[11px] text-emerald-200/70">
                  Volume e valores por etapa do fluxo operacional
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToOrders}
              className="text-xs text-emerald-300 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <span>Ver Pedidos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Horizontal Progress Bars per Status */}
          <div className="space-y-3 pt-1">
            {statusDistribution.map(item => (
              <div
                key={item.status}
                onMouseEnter={() => setSelectedStatusHover(item.status)}
                onMouseLeave={() => setSelectedStatusHover(null)}
                className={`p-2.5 rounded-xl border transition-all ${
                  selectedStatusHover === item.status
                    ? 'bg-emerald-950/70 border-emerald-400/50'
                    : 'bg-[#04160f]/60 border-emerald-500/15'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-white">{item.label}</span>
                    <span className="text-[11px] font-mono text-emerald-300/70">
                      ({item.count} {item.count === 1 ? 'pedido' : 'pedidos'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-200 text-xs">
                      {centsToBRL(item.totalCents)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300/80 bg-white/10 px-1.5 py-0.5 rounded">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full bg-[#020b07] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHARTS ROW 2: COMPARATIVO PRAZO/ATRASOS + PEDIDOS CRÍTICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Urgency breakdown Donut / Progress visual */}
        <div className="lg:col-span-5 bg-[#062419]/70 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  Saúde das Entregas
                </h3>
                <p className="text-[11px] text-emerald-200/70">
                  Comparativo entre pedidos no prazo e atrasados
                </p>
              </div>
            </div>
          </div>

          {/* Multi-segment Segmented Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-200/80">
              <span className="font-semibold">Composição dos Prazos</span>
              <span className="font-mono font-bold text-white">{filteredOrders.length} Total</span>
            </div>
            <div className="w-full h-4 rounded-xl overflow-hidden flex bg-black/40 p-0.5 gap-0.5 border border-emerald-500/20">
              {deliveryUrgencyData.map(item => (
                <div
                  key={item.key}
                  className={`h-full transition-all duration-700 ${item.bg}`}
                  style={{ width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%` }}
                  title={`${item.label}: ${item.count} (${item.percentage}%)`}
                />
              ))}
            </div>
          </div>

          {/* Cards of each urgency category */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            {deliveryUrgencyData.map(item => (
              <div
                key={item.key}
                className="p-3 rounded-xl bg-[#04160f]/80 border border-emerald-500/20 space-y-1"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] font-bold text-emerald-100 truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className={`text-xl font-black font-mono ${item.textColor}`}>
                    {item.count}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-300/70">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Punctuality Badge Banner */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-400/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-300">
                Índice de Pontualidade
              </span>
              <div className="text-sm font-extrabold text-white">
                {metrics.punctualityRate >= 90
                  ? 'Excelente Desempenho Operacional'
                  : metrics.punctualityRate >= 70
                  ? 'Atenção aos Prazos em Aberto'
                  : 'Necessita Ação Corretiva Imediata'}
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-300">
              {metrics.punctualityRate}%
            </span>
          </div>
        </div>

        {/* Priority Focus List: Pedidos que Exigem Atenção Imediata */}
        <div className="lg:col-span-7 bg-[#062419]/70 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  Pedidos com Atenção Imediata
                </h3>
                <p className="text-[11px] text-emerald-200/70">
                  Ordens atrasadas ou que vencem nos próximos 3 dias
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToDeliveries}
              className="text-xs text-emerald-300 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <span>Ver Todos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {criticalOrders.length === 0 ? (
            <div className="py-12 text-center text-emerald-300/70 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <p className="font-bold text-sm text-white">Tudo em dia!</p>
              <p className="text-xs text-emerald-300/70">
                Nenhum pedido atrasado ou com prazo crítico nos próximos 3 dias.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {criticalOrders.map(({ order, timeline }) => (
                <div
                  key={order.id}
                  onClick={() => onViewOrder(order)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                    timeline.isOverdue
                      ? 'bg-rose-950/30 hover:bg-rose-950/50 border-rose-500/40'
                      : timeline.isToday
                      ? 'bg-amber-950/30 hover:bg-amber-950/50 border-amber-500/40'
                      : 'bg-teal-950/20 hover:bg-teal-950/40 border-teal-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-xs">
                      #{order.orderNumber}
                    </span>
                    <div>
                      <div className="font-bold text-white text-xs leading-snug">
                        {order.clientSnapshot?.name || 'Cliente'}
                      </div>
                      <div className="text-[11px] text-emerald-300/70 flex items-center gap-2 mt-0.5">
                        <span>Data do Pedido: {timeline.orderDateFormatted}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-white">
                          Entrega: {timeline.deliveryDateFormatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-black border ${timeline.statusBadge.bgClass} ${timeline.statusBadge.colorClass} ${timeline.statusBadge.borderClass}`}
                      >
                        {timeline.statusBadge.text}
                      </span>
                      <div className="text-[10px] text-emerald-300/80 font-mono mt-0.5">
                        {centsToBRL(order.totalGeneralCents)}
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-emerald-400 opacity-70 group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: RECENT PAID SERVICES BREAKDOWN */}
      <div className="bg-[#062419]/70 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/40 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Últimos Serviços Pagos Realizados
              </h3>
              <p className="text-[11px] text-emerald-200/70">
                Lançamentos recentes de serviços e pagamentos a prestadores
              </p>
            </div>
          </div>

          {onGoToPaidServices && (
            <button
              type="button"
              onClick={onGoToPaidServices}
              className="text-xs text-emerald-300 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <span>Ver Todos ({filteredPaidServices.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filteredPaidServices.length === 0 ? (
          <div className="py-8 text-center text-emerald-300/70 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/80" />
            <p className="font-bold text-xs text-white">Nenhum serviço pago neste período</p>
            <p className="text-[11px] text-emerald-300/60">
              Cadastre prestações de serviços na aba correspondente para acompanhar os gastos operacionais.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPaidServices.slice(0, 6).map(item => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#04160f]/80 border border-emerald-500/20 hover:border-emerald-400/40 transition-all flex flex-col justify-between space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white text-xs leading-snug line-clamp-1" title={item.service}>
                      {item.service}
                    </span>
                    <div className="text-[10px] text-emerald-300/70 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      <span>{formatDateToBR(item.date)}</span>
                      <span>&bull;</span>
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>{item.time || '--:--'}</span>
                    </div>
                  </div>
                  <span className="font-extrabold text-xs text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/25 shrink-0 font-mono">
                    {centsToBRL(item.valueCents)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-emerald-200/70 pt-1.5 border-t border-emerald-500/10">
                  <span className="truncate max-w-[120px]">
                    {item.providerName ? `Prestador: ${item.providerName}` : 'Sem prestador'}
                  </span>
                  <span className="font-semibold text-emerald-300/90 bg-black/40 px-1.5 py-0.2 rounded">
                    {item.paymentMethod || 'PIX'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
