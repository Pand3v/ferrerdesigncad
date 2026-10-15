import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, CompanySettings } from '../types';
import { centsToBRL } from '../utils/currency';
import { printOrderPDF } from '../utils/pdfExport';
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit2,
  Copy,
  Ban,
  Trash2,
  AlertTriangle,
  Check,
  FileSpreadsheet,
  Filter,
  CheckCircle,
  Clock,
  Printer,
  ChevronDown,
} from 'lucide-react';

interface OrderListProps {
  orders: Order[];
  companySettings?: CompanySettings;
  onCreateNew: () => void;
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onDuplicateOrder: (order: Order) => void;
  onCancelOrder: (order: Order) => Promise<void> | void;
  onDeleteOrder: (orderId: string) => Promise<void> | void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  companySettings,
  onCreateNew,
  onViewOrder,
  onEditOrder,
  onDuplicateOrder,
  onCancelOrder,
  onDeleteOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [quickPrintToast, setQuickPrintToast] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      setIsActionLoading(true);
      await onCancelOrder(orderToCancel);
      const num = orderToCancel.orderNumber;
      setOrderToCancel(null);
      setActionToast({
        type: 'success',
        text: `Pedido Nº ${num} marcado como Cancelado com sucesso.`,
      });
      setTimeout(() => setActionToast(null), 4000);
    } catch (err) {
      console.error(err);
      setActionToast({
        type: 'error',
        text: 'Erro ao cancelar o pedido. Verifique conexão e permissões.',
      });
      setTimeout(() => setActionToast(null), 4000);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      setIsActionLoading(true);
      await onDeleteOrder(orderToDelete.id);
      const num = orderToDelete.orderNumber;
      setOrderToDelete(null);
      setActionToast({
        type: 'success',
        text: `Pedido Nº ${num} excluído definitivamente com sucesso.`,
      });
      setTimeout(() => setActionToast(null), 4000);
    } catch (err) {
      console.error(err);
      setActionToast({
        type: 'error',
        text: 'Erro ao excluir o pedido. Verifique conexão e permissões.',
      });
      setTimeout(() => setActionToast(null), 4000);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleQuickPrint = (order: Order, isServiceOrder: boolean) => {
    setQuickPrintToast(
      `Enviando ${isServiceOrder ? 'Ordem de Serviço (OS)' : 'Pedido Nº ' + order.orderNumber} para a impressora...`
    );
    printOrderPDF({ order, isServiceOrder, companySettings });
    setTimeout(() => {
      setQuickPrintToast(null);
    }, 5000);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const term = searchTerm.toLowerCase();
      const numMatch = order.orderNumber?.toLowerCase().includes(term);
      const clientMatch = order.clientSnapshot?.name?.toLowerCase().includes(term);
      const contactMatch = order.clientSnapshot?.contactPerson?.toLowerCase().includes(term);

      const matchesSearch = !term || numMatch || clientMatch || contactMatch;
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesDate = !dateFilter || order.date.includes(dateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, dateFilter]);

  // Export orders to CSV
  const exportOrdersCSV = () => {
    if (orders.length === 0) {
      alert('Nenhum pedido para exportar.');
      return;
    }

    const headers = [
      'Numero',
      'Data',
      'Status',
      'Cliente',
      'CPF_CNPJ',
      'Telefone',
      'Total_Itens',
      'Total_Geral_Reais',
      'Condicoes_Pagamento',
      'Prazo_Entrega',
      'Criado_Por',
      'Ultima_Alteracao_Por',
    ];

    const rows = orders.map(o => [
      `"${o.orderNumber}"`,
      `"${o.date}"`,
      `"${o.status}"`,
      `"${(o.clientSnapshot?.name || '').replace(/"/g, '""')}"`,
      `"${o.clientSnapshot?.cpfCnpj || ''}"`,
      `"${o.clientSnapshot?.phone || ''}"`,
      o.items.length,
      `"${(o.totalGeneralCents / 100).toFixed(2).replace('.', ',')}"`,
      `"${(o.paymentTerms || '').replace(/"/g, '""')}"`,
      `"${(o.deliveryTime || '').replace(/"/g, '""')}"`,
      `"${o.createdBy || ''}"`,
      `"${o.updatedBy || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pedidos_AlmaPrint_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'orcamento':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-md border border-amber-400/40 bg-amber-500/15 text-amber-300 shadow-xs">
            Orçamento
          </span>
        );
      case 'pedido_gerado':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border border-purple-400/50 bg-purple-500/20 text-purple-300 shadow-xs">
            Pedido Gerado (Arte)
          </span>
        );
      case 'aprovado':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-500/10">
            Aprovado
          </span>
        );
      case 'em_producao':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border border-indigo-400/40 bg-indigo-500/20 text-indigo-300 shadow-xs">
            Em Produção
          </span>
        );
      case 'concluido':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border border-cyan-400/40 bg-cyan-500/20 text-cyan-300 shadow-xs">
            Concluído
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300/70 line-through">
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Top Header bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-[#07281c]/70 backdrop-blur-xl p-4 sm:p-5 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            Pedidos e Orçamentos
          </h2>
          <p className="text-[11px] sm:text-xs text-emerald-200/70 mt-1">
            Consulta, impressão, emissão de Ordem de Serviço e histórico de documentos.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={exportOrdersCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 border border-emerald-500/30 backdrop-blur-md transition-all cursor-pointer shadow-sm"
            title="Exportar pedidos para CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Exportar CSV
          </button>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* Action Toast (Cancel/Delete Feedback) */}
      {actionToast && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center gap-2.5 backdrop-blur-md shadow-lg shadow-black/40 text-xs font-semibold ${
            actionToast.type === 'success'
              ? 'border-emerald-400/40 bg-emerald-950/80 text-emerald-200'
              : 'border-rose-400/40 bg-rose-950/80 text-rose-200'
          }`}
        >
          {actionToast.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionToast.text}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[#062419]/60 backdrop-blur-md p-3 sm:p-3.5 border border-emerald-500/20 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 text-xs shadow-lg shadow-black/20">
        {/* Search Input */}
        <div className="sm:col-span-6 flex items-center gap-2 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all min-w-0">
          <Search className="w-4 h-4 text-emerald-400/70 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar pedido, cliente ou contato..."
            className="w-full min-w-0 text-xs outline-none bg-transparent text-white placeholder-emerald-300/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[11px] text-emerald-300/70 hover:text-white font-semibold cursor-pointer shrink-0"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-3 flex items-center gap-2 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl px-3 py-2 min-w-0">
          <Filter className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full min-w-0 bg-[#04160f] text-white outline-none text-xs font-medium cursor-pointer"
          >
            <option value="all" className="bg-[#04160f] text-white">Todos os Status</option>
            <option value="orcamento" className="bg-[#04160f] text-white">Orçamento</option>
            <option value="pedido_gerado" className="bg-[#04160f] text-white">Pedido Gerado (Criação de Arte)</option>
            <option value="aprovado" className="bg-[#04160f] text-white">Aprovado</option>
            <option value="em_producao" className="bg-[#04160f] text-white">Em Produção</option>
            <option value="concluido" className="bg-[#04160f] text-white">Concluído</option>
            <option value="cancelado" className="bg-[#04160f] text-white">Cancelado</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="sm:col-span-3 flex items-center gap-2 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl px-3 py-2 focus-within:border-emerald-400 transition-all min-w-0">
          <input
            type="text"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            placeholder="Filtrar data (ex: /01/2026)"
            className="w-full min-w-0 text-xs outline-none bg-transparent text-white placeholder-emerald-300/40"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-[11px] text-emerald-300/70 hover:text-white font-semibold cursor-pointer shrink-0"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Quick Print Toast Notification */}
      {quickPrintToast && (
        <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-400/40 bg-emerald-950/70 text-emerald-200 flex items-center gap-2.5 backdrop-blur-md shadow-lg shadow-black/40 text-xs font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{quickPrintToast}</span>
        </div>
      )}

      {/* MOBILE CARDS VIEW (Visible only on mobile screens < md, completely avoids horizontal dragging) */}
      <div className="block md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-[#062419]/60 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-8 text-center text-emerald-300/60 text-xs">
            {searchTerm || statusFilter !== 'all' || dateFilter
              ? 'Nenhum pedido encontrado para os filtros aplicados.'
              : 'Nenhum pedido ou orçamento registrado ainda. Clique em "Novo Pedido" para começar.'}
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className="bg-[#062419]/70 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-4 space-y-3 shadow-lg shadow-black/30"
            >
              {/* Card Header: Order Number, Date, and Status Badge */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-emerald-500/15">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sm text-emerald-300">
                    #{order.orderNumber}
                  </span>
                  <span className="text-[11px] text-emerald-200/60 font-medium">
                    &bull; {order.date}
                  </span>
                  {order.deliveryDate && (
                    <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      Entrega: {order.deliveryDate}
                    </span>
                  )}
                </div>
                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Client Info */}
              <div>
                <div className="font-bold text-white text-sm">
                  {order.clientSnapshot?.name || 'Cliente não informado'}
                </div>
                {(order.clientSnapshot?.contactPerson || order.clientSnapshot?.phone) && (
                  <div className="text-[11px] text-emerald-200/70 mt-0.5">
                    {order.clientSnapshot?.contactPerson ? `Contato: ${order.clientSnapshot.contactPerson}` : ''}
                    {order.clientSnapshot?.phone ? ` • ${order.clientSnapshot.phone}` : ''}
                  </div>
                )}
              </div>

              {/* Value and Items Count */}
              <div className="flex items-center justify-between bg-[#04160f]/80 p-2.5 rounded-xl border border-emerald-500/20">
                <span className="text-[11px] text-emerald-300/80">
                  {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}
                </span>
                <span className="font-mono font-bold text-emerald-300 text-sm">
                  {centsToBRL(order.totalGeneralCents)}
                </span>
              </div>

              {/* Dedicated Quick Print Buttons for Mobile */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-500/15">
                <button
                  onClick={() => handleQuickPrint(order, false)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 active:opacity-80 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Pedido
                </button>
                <button
                  onClick={() => handleQuickPrint(order, true)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 text-white border border-cyan-400/40 text-xs font-bold active:opacity-80 transition-all cursor-pointer shadow-sm shadow-cyan-500/20"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-300" />
                  Imprimir OS
                </button>
              </div>

              {/* Actions Touch Row */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onViewOrder(order)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Ver / PDF
                </button>

                <button
                  onClick={() => onEditOrder(order)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                  Editar
                </button>

                <button
                  onClick={() => onDuplicateOrder(order)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-teal-400" />
                  Duplicar
                </button>
              </div>

              {/* Secondary Actions: Cancel / Delete */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {order.status !== 'cancelado' ? (
                  <button
                    type="button"
                    onClick={() => setOrderToCancel(order)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors cursor-pointer"
                    title="Marcar pedido como cancelado"
                  >
                    <Ban className="w-3.5 h-3.5 text-amber-400" />
                    Cancelar
                  </button>
                ) : (
                  <div className="flex items-center justify-center text-[11px] text-rose-300 font-bold py-1.5 px-2 bg-rose-950/40 rounded-xl border border-rose-500/20">
                    Cancelado
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setOrderToDelete(order)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                  title="Excluir pedido definitivamente"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP ORDERS TABLE (Visible only on md and larger screens) */}
      <div className="hidden md:block bg-[#062419]/60 backdrop-blur-xl border border-emerald-500/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 w-full max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full min-w-[700px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-950/60 border-b border-emerald-500/25 font-extrabold uppercase tracking-wider text-emerald-200/90">
                <th className="py-3 px-4 border-r border-emerald-500/15 w-24">Nº Pedido</th>
                <th className="py-3 px-4 border-r border-emerald-500/15 w-28">Data</th>
                <th className="py-3 px-4 border-r border-emerald-500/15">Cliente / Contratante</th>
                <th className="py-3 px-4 border-r border-emerald-500/15 w-36 text-center">Status</th>
                <th className="py-3 px-4 border-r border-emerald-500/15 text-right w-36">Total Geral</th>
                <th className="py-3 px-4 text-center w-56">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/10">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-emerald-300/60">
                    {searchTerm || statusFilter !== 'all' || dateFilter
                      ? 'Nenhum pedido encontrado para os filtros aplicados.'
                      : 'Nenhum pedido ou orçamento registrado ainda. Clique em "Novo Pedido / Orçamento" para começar.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-emerald-500/10 transition-colors group">
                    {/* Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-sm border-r border-emerald-500/10 text-emerald-300">
                      {order.orderNumber}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 border-r border-emerald-500/10 text-emerald-100/80">
                      <div>{order.date}</div>
                      {order.deliveryDate && (
                        <div className="text-[10px] text-emerald-300 font-bold mt-0.5 whitespace-nowrap">
                          Entrega: {order.deliveryDate}
                        </div>
                      )}
                    </td>

                    {/* Client info */}
                    <td className="py-3.5 px-4 border-r border-emerald-500/10">
                      <div className="font-semibold text-white">
                        {order.clientSnapshot?.name || 'Cliente não informado'}
                      </div>
                      <div className="text-[11px] text-emerald-200/60 mt-0.5">
                        {order.clientSnapshot?.contactPerson ? `Contato: ${order.clientSnapshot.contactPerson}` : ''}
                        {order.clientSnapshot?.phone ? ` • ${order.clientSnapshot.phone}` : ''}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 border-r border-emerald-500/10 text-center">
                      {getStatusBadge(order.status)}
                    </td>

                    {/* Total Geral */}
                    <td className="py-3.5 px-4 border-r border-emerald-500/10 text-right font-mono font-bold text-white text-sm">
                      {centsToBRL(order.totalGeneralCents)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Full Document */}
                        <button
                          onClick={() => onViewOrder(order)}
                          className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/30"
                          title="Visualizar documento completo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Quick Print Pedido */}
                        <button
                          onClick={() => handleQuickPrint(order, false)}
                          className="p-2 text-emerald-300 hover:text-emerald-100 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/30"
                          title="Imprimir Pedido / Orçamento"
                        >
                          <Printer className="w-4 h-4 text-emerald-400" />
                        </button>

                        {/* Quick Print OS */}
                        <button
                          onClick={() => handleQuickPrint(order, true)}
                          className="p-2 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-cyan-500/30"
                          title="Imprimir Ordem de Serviço (OS)"
                        >
                          <Printer className="w-4 h-4 text-cyan-300" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onEditOrder(order)}
                          className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/30"
                          title="Editar pedido"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => onDuplicateOrder(order)}
                          className="p-2 text-emerald-200/80 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/30"
                          title="Duplicar pedido (cria novo orçamento com próximo número)"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Cancel order */}
                        {order.status !== 'cancelado' && (
                          <button
                            type="button"
                            onClick={() => setOrderToCancel(order)}
                            className="p-2 text-amber-300/80 hover:text-white hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-500/30"
                            title="Marcar pedido como cancelado"
                          >
                            <Ban className="w-4 h-4 text-amber-400" />
                          </button>
                        )}

                        {/* Delete order */}
                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="p-2 text-rose-300/80 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
                          title="Excluir pedido definitivamente"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
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

      {/* Modal: Cancel Order Confirmation */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#072418] border border-amber-500/40 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl shadow-black/80 space-y-4 text-white">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 bg-amber-500/20 rounded-2xl border border-amber-500/30">
                <Ban className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Cancelar Pedido</h3>
                <p className="text-xs text-amber-300/80">Alteração de status do pedido</p>
              </div>
            </div>

            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 text-xs text-emerald-100/90 leading-relaxed space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-mono font-bold text-white text-sm">
                  Pedido Nº #{orderToCancel.orderNumber}
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {centsToBRL(orderToCancel.totalGeneralCents)}
                </span>
              </div>
              <p>
                Cliente: <strong className="text-white font-bold">{orderToCancel.clientSnapshot?.name || 'Cliente'}</strong>
              </p>
              <p className="text-[11px] text-amber-200/80 pt-1 border-t border-white/10">
                Deseja marcar este pedido como <strong>Cancelado</strong>? O documento e o histórico permanecerão salvos para consultas futuras.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                disabled={isActionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isActionLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-amber-900/50 cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                {isActionLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Order Confirmation */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#072418] border border-rose-500/40 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl shadow-black/80 space-y-4 text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/20 rounded-2xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Excluir Pedido Definitivamente</h3>
                <p className="text-xs text-rose-300/80">Remoção permanente do banco de dados</p>
              </div>
            </div>

            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 text-xs text-emerald-100/90 leading-relaxed space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-mono font-bold text-white text-sm">
                  Pedido Nº #{orderToDelete.orderNumber}
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {centsToBRL(orderToDelete.totalGeneralCents)}
                </span>
              </div>
              <p>
                Cliente: <strong className="text-white font-bold">{orderToDelete.clientSnapshot?.name || 'Cliente'}</strong>
              </p>
              <div className="p-2.5 bg-rose-950/50 rounded-xl border border-rose-500/30 text-[11px] text-rose-200">
                <strong>Atenção:</strong> Esta ação excluirá este pedido e todos os seus itens permanentemente. Esta operação <strong>NÃO</strong> poderá ser desfeita.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isActionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isActionLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-rose-900/50 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isActionLoading ? 'Excluindo...' : 'Sim, Excluir Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
