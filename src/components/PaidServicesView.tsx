import React, { useState, useMemo } from 'react';
import { PaidService, CompanySettings } from '../types';
import { centsToBRL, parseBRLToCents } from '../utils/currency';
import { formatDateToBR, parseDateFlexible, formatDateToISO } from '../utils/dateUtils';
import { printPaidServicesPDF, generatePaidServicesPDF } from '../utils/paidServicesPdfExport';
import {
  HandCoins,
  Plus,
  Search,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Filter,
  Printer,
  Download,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  Building,
  CreditCard,
  FileText,
  ArrowUpDown,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface PaidServicesViewProps {
  paidServices: PaidService[];
  companySettings?: CompanySettings;
  currentUserEmail: string;
  onSavePaidService: (service: Partial<PaidService>) => Promise<void>;
  onDeletePaidService: (serviceId: string) => Promise<void>;
}

// Common service quick-suggestions in printing & graphic arts
const QUICK_SERVICE_SUGGESTIONS = [
  'Acabamento Gráfico',
  'Costura e Ilhós para Lona',
  'Laminação Fosca / Brilho',
  'Corte e Vinco',
  'Serralheria / Estrutura',
  'Frete / Entrega Terceirizada',
  'Instalação e Aplicação',
  'Solda e Refile',
  'Gravação e Corte a Laser',
  'Manutenção de Máquinas',
];

const PAYMENT_METHODS = [
  'PIX',
  'Dinheiro (Espécie)',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Transferência Bancária',
  'Boleto Bancário',
];

export const PaidServicesView: React.FC<PaidServicesViewProps> = ({
  paidServices,
  companySettings,
  currentUserEmail,
  onSavePaidService,
  onDeletePaidService,
}) => {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<PaidService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<PaidService | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Form Fields
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formService, setFormService] = useState('');
  const [formValueStr, setFormValueStr] = useState('');
  const [formProviderName, setFormProviderName] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('PIX');
  const [formNotes, setFormNotes] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Filter States
  const [filterMode, setFilterMode] = useState<'month' | 'custom' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`; // YYYY-MM
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Quick Open Modal for New Service
  const handleOpenNewModal = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    setEditingService(null);
    setFormDate(formatDateToISO(now));
    setFormTime(`${hours}:${minutes}`);
    setFormService('');
    setFormValueStr('');
    setFormProviderName('');
    setFormPaymentMethod('PIX');
    setFormNotes('');
    setFormCategory('Acabamento');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: PaidService) => {
    setEditingService(item);

    // Format date for date input
    const parsedDate = parseDateFlexible(item.date);
    setFormDate(parsedDate ? formatDateToISO(parsedDate) : item.date);
    setFormTime(item.time || '12:00');
    setFormService(item.service);
    setFormValueStr((item.valueCents / 100).toFixed(2).replace('.', ','));
    setFormProviderName(item.providerName || '');
    setFormPaymentMethod(item.paymentMethod || 'PIX');
    setFormNotes(item.notes || '');
    setFormCategory(item.category || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Helper to set current time
  const handleSetCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setFormTime(`${hours}:${minutes}`);
  };

  // Helper to set today's date
  const handleSetTodayDate = () => {
    setFormDate(formatDateToISO(new Date()));
  };

  // Submit Handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formDate.trim()) {
      setFormError('Por favor, informe a data do serviço.');
      return;
    }
    if (!formTime.trim()) {
      setFormError('Por favor, informe o horário do serviço.');
      return;
    }
    if (!formService.trim()) {
      setFormError('Por favor, informe a descrição do serviço.');
      return;
    }

    const valueCents = parseBRLToCents(formValueStr);
    if (valueCents <= 0) {
      setFormError('Por favor, informe um valor válido maior que zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSavePaidService({
        ...(editingService?.id ? { id: editingService.id } : {}),
        date: formDate,
        time: formTime,
        service: formService.trim(),
        valueCents,
        providerName: formProviderName.trim() || undefined,
        paymentMethod: formPaymentMethod || 'PIX',
        notes: formNotes.trim() || undefined,
        category: formCategory.trim() || undefined,
        updatedBy: currentUserEmail,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'Erro ao salvar prestação de serviço.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      setIsSubmitting(true);
      await onDeletePaidService(serviceToDelete.id);
      setServiceToDelete(null);
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir lançamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Distinct Months available in data for filter dropdown
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();

    // Always include current month
    const now = new Date();
    const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(curYearMonth);

    paidServices.forEach(item => {
      const parsed = parseDateFlexible(item.date);
      if (parsed) {
        const ym = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        monthsSet.add(ym);
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [paidServices]);

  // Format month label (e.g. "2026-10" -> "Outubro / 2026")
  const formatMonthLabel = (ymStr: string) => {
    const [y, m] = ymStr.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIdx = parseInt(m, 10) - 1;
    return `${monthNames[monthIdx] || m} / ${y}`;
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    return paidServices.filter(item => {
      const parsedDate = parseDateFlexible(item.date);

      // 1. Filter by Mode
      if (filterMode === 'month') {
        if (!parsedDate) return false;
        const ym = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
        if (ym !== selectedMonth) return false;
      } else if (filterMode === 'custom') {
        if (startDate) {
          const startParsed = parseDateFlexible(startDate);
          if (startParsed && parsedDate && parsedDate < startParsed) return false;
        }
        if (endDate) {
          const endParsed = parseDateFlexible(endDate);
          if (endParsed && parsedDate && parsedDate > endParsed) return false;
        }
      }

      // 2. Search Term Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesService = item.service.toLowerCase().includes(term);
        const matchesProvider = (item.providerName || '').toLowerCase().includes(term);
        const matchesPayment = (item.paymentMethod || '').toLowerCase().includes(term);
        const matchesNotes = (item.notes || '').toLowerCase().includes(term);
        const matchesDate = (item.date || '').includes(term) || formatDateToBR(item.date).includes(term);
        if (!matchesService && !matchesProvider && !matchesPayment && !matchesNotes && !matchesDate) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return sortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      }
      return sortOrder === 'desc'
        ? (b.time || '').localeCompare(a.time || '')
        : (a.time || '').localeCompare(b.time || '');
    });
  }, [paidServices, filterMode, selectedMonth, startDate, endDate, searchTerm, sortOrder]);

  // Aggregate KPI Calculations
  const { totalExpensesCents, totalCount, averageCents, maxExpense } = useMemo<{
    totalExpensesCents: number;
    totalCount: number;
    averageCents: number;
    maxExpense: PaidService | null;
  }>(() => {
    let sum = 0;
    let max = 0;
    let maxItem: PaidService | null = null;

    filteredServices.forEach(item => {
      const v = item.valueCents || 0;
      sum += v;
      if (v > max) {
        max = v;
        maxItem = item;
      }
    });

    const count = filteredServices.length;
    const avg = count > 0 ? Math.round(sum / count) : 0;

    return {
      totalExpensesCents: sum,
      totalCount: count,
      averageCents: avg,
      maxExpense: maxItem,
    };
  }, [filteredServices]);

  // Helper to format active period for PDF
  const getPeriodLabel = () => {
    if (filterMode === 'month') return formatMonthLabel(selectedMonth);
    if (filterMode === 'custom') {
      const from = startDate ? formatDateToBR(startDate) : 'Início';
      const to = endDate ? formatDateToBR(endDate) : 'Fim';
      return `${from} até ${to}`;
    }
    return 'Histórico Geral';
  };

  // Real PDF Print Handler (Uses offscreen iframe blob print with auto-fallback)
  const handlePrintReport = () => {
    try {
      setIsExporting(true);
      setExportFeedback({
        type: 'info',
        text: 'Iniciando impressão do relatório de gastos...',
      });

      printPaidServicesPDF({
        services: filteredServices,
        periodLabel: getPeriodLabel(),
        companySettings,
      });

      setTimeout(() => {
        setExportFeedback({
          type: 'success',
          text: 'Impressão iniciada com sucesso!',
        });
      }, 700);

      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      console.warn('Erro ao disparar impressão, baixando PDF como alternativa:', err);
      handleDownloadPdf();
    } finally {
      setIsExporting(false);
    }
  };

  // Direct PDF Download Handler
  const handleDownloadPdf = () => {
    try {
      setIsExporting(true);
      setExportFeedback({
        type: 'info',
        text: 'Gerando arquivo PDF para download...',
      });

      generatePaidServicesPDF({
        services: filteredServices,
        periodLabel: getPeriodLabel(),
        companySettings,
      });

      setExportFeedback({
        type: 'success',
        text: 'Relatório em PDF baixado com sucesso!',
      });

      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      alert('Erro ao gerar PDF: ' + (err?.message || 'Tente novamente'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {exportFeedback && (
        <div className="fixed top-18 right-6 z-50 bg-[#062419] border border-emerald-400 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-3 backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{exportFeedback.text}</span>
        </div>
      )}

      {/* 1. Page Header (Hidden when printing) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#062419] to-[#041a12] p-5 sm:p-6 rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
              <HandCoins className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Prestação de Serviços Pagos
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/75">
                Controle e registro de gastos com serviços terceirizados, acabamentos e prestadores
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Baixar PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-950/60 hover:bg-emerald-900/60 active:bg-emerald-800/60 text-emerald-200 hover:text-white border border-emerald-500/30 hover:border-emerald-400/50 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Baixar arquivo PDF com o relatório de gastos filtrados"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Baixar PDF</span>
          </button>

          {/* Imprimir Relatório */}
          <button
            type="button"
            onClick={handlePrintReport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-950/60 hover:bg-emerald-900/60 active:bg-emerald-800/60 text-emerald-200 hover:text-white border border-emerald-500/30 hover:border-emerald-400/50 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Imprimir relatório em PDF formatado"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 text-emerald-400" />
            )}
            <span>Imprimir Relatório</span>
          </button>

          {/* Novo Lançamento */}
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Totalizadores no Topo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gasto */}
        <div className="bg-[#052116]/85 border border-emerald-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden backdrop-blur-sm group hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">
              Total de Gastos
            </span>
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
            {centsToBRL(totalExpensesCents)}
          </div>
          <div className="text-[11px] text-emerald-200/70 mt-1 flex items-center gap-1 font-medium">
            <span>
              {filterMode === 'month'
                ? `Referente a ${formatMonthLabel(selectedMonth)}`
                : filterMode === 'custom'
                ? 'Período customizado'
                : 'Histórico completo'}
            </span>
          </div>
        </div>

        {/* Quantidade de Serviços */}
        <div className="bg-[#052116]/85 border border-emerald-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden backdrop-blur-sm group hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">
              Serviços Realizados
            </span>
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-lg">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {totalCount}{' '}
            <span className="text-sm font-semibold text-emerald-200/70">
              {totalCount === 1 ? 'serviço' : 'serviços'}
            </span>
          </div>
          <div className="text-[11px] text-emerald-200/70 mt-1">
            Lançamentos registrados no filtro
          </div>
        </div>

        {/* Valor Médio por Serviço */}
        <div className="bg-[#052116]/85 border border-emerald-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden backdrop-blur-sm group hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">
              Média por Serviço
            </span>
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
            {centsToBRL(averageCents)}
          </div>
          <div className="text-[11px] text-emerald-200/70 mt-1">
            Ticket médio por ordem de serviço paga
          </div>
        </div>

        {/* Maior Gasto Registrado */}
        <div className="bg-[#052116]/85 border border-emerald-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden backdrop-blur-sm group hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">
              Maior Lançamento
            </span>
            <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-300 tracking-tight truncate">
            {maxExpense ? centsToBRL(maxExpense.valueCents) : 'R$ 0,00'}
          </div>
          <div className="text-[11px] text-emerald-200/70 mt-1 truncate" title={maxExpense?.service}>
            {maxExpense ? maxExpense.service : 'Nenhum lançamento'}
          </div>
        </div>
      </div>

      {/* 3. Filters Toolbar (Hidden when printing) */}
      <div className="no-print bg-[#052116]/90 border border-emerald-500/25 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-emerald-500/20 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterMode === 'month'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-emerald-200/80 hover:text-white'
              }`}
            >
              Por Mês
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('custom')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterMode === 'custom'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-emerald-200/80 hover:text-white'
              }`}
            >
              Por Data / Período
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-emerald-200/80 hover:text-white'
              }`}
            >
              Todos os Gastos
            </button>
          </div>

          {/* Quick Date Filters based on Mode */}
          <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
            {filterMode === 'month' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Mês:
                </label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-emerald-950/80 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  {availableMonths.map(ym => (
                    <option key={ym} value={ym} className="bg-[#052116] text-white">
                      {formatMonthLabel(ym)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800/60 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 cursor-pointer transition-colors"
                >
                  Este Mês
                </button>
              </div>
            )}

            {filterMode === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-emerald-300/80 font-medium">De:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-emerald-950/80 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-emerald-300/80 font-medium">Até:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-emerald-950/80 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = formatDateToISO(new Date());
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800/60 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 cursor-pointer"
                >
                  Hoje
                </button>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="p-1.5 text-emerald-300 hover:text-white"
                    title="Limpar período"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-emerald-500/15">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-emerald-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por serviço, prestador ou pagamento..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-emerald-500/30 rounded-xl text-xs text-white placeholder-emerald-200/40 focus:outline-none focus:border-emerald-400 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400/60 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-emerald-200/80">
            <button
              type="button"
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/25 rounded-lg text-emerald-300 hover:text-white cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>{sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Printable Header (Visible ONLY when printing) */}
      <div className="hidden print:block mb-6 p-4 border-b-2 border-black text-black">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase">{companySettings?.tradeName || 'ALMA PRINT'}</h1>
            <p className="text-xs text-gray-700">{companySettings?.legalName} &bull; CNPJ: {companySettings?.cnpj}</p>
            <p className="text-xs text-gray-700">{companySettings?.address} - {companySettings?.unit}</p>
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold uppercase">Relatório de Prestação de Serviços Pagos</h2>
            <p className="text-xs text-gray-700">
              Período:{' '}
              {filterMode === 'month'
                ? formatMonthLabel(selectedMonth)
                : filterMode === 'custom'
                ? `${startDate ? formatDateToBR(startDate) : 'Início'} até ${endDate ? formatDateToBR(endDate) : 'Fim'}`
                : 'Histórico Geral'}
            </p>
            <p className="text-xs text-gray-700">Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      {/* 5. Main Table of Paid Services */}
      <div className="bg-[#052116]/80 border border-emerald-500/25 rounded-2xl shadow-xl overflow-hidden print:border-black print:bg-white print:text-black">
        {filteredServices.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <HandCoins className="w-8 h-8 opacity-80" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Nenhum serviço pago encontrado</h3>
              <p className="text-xs text-emerald-200/70 max-w-md mx-auto">
                {searchTerm || filterMode !== 'all'
                  ? 'Nenhum lançamento corresponde aos filtros selecionados. Tente ajustar o mês ou período.'
                  : 'Nenhum gasto com prestação de serviços foi registrado ainda. Clique no botão abaixo para adicionar.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Cadastrar Primeiro Serviço
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-950/90 border-b border-emerald-500/30 text-emerald-200 print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
                  <th className="py-3 px-3 sm:px-4 font-bold uppercase tracking-wider text-[11px] w-28">
                    Data
                  </th>
                  <th className="py-3 px-3 sm:px-4 font-bold uppercase tracking-wider text-[11px] w-20">
                    Horário
                  </th>
                  <th className="py-3 px-3 sm:px-4 font-bold uppercase tracking-wider text-[11px]">
                    Serviço Executado
                  </th>
                  <th className="py-3 px-3 sm:px-4 font-bold uppercase tracking-wider text-[11px] hidden md:table-cell">
                    Prestador / Profissional
                  </th>
                  <th className="py-3 px-3 sm:px-4 font-bold uppercase tracking-wider text-[11px] hidden sm:table-cell w-28">
                    Pagamento
                  </th>
                  <th className="py-3 px-3 sm:px-4 font-bold uppercase tracking-wider text-[11px] text-right w-32">
                    Valor Pago
                  </th>
                  <th className="no-print py-3 px-3 sm:px-4 font-bold uppercase tracking-wider text-[11px] text-center w-24">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/15 print:divide-gray-300">
                {filteredServices.map((item, index) => {
                  const displayDate = formatDateToBR(item.date);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-emerald-500/10 transition-colors ${
                        index % 2 === 0 ? 'bg-transparent' : 'bg-emerald-950/20 print:bg-gray-50'
                      }`}
                    >
                      {/* Data */}
                      <td className="py-3 px-3 sm:px-4 font-semibold text-white print:text-black whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400 print:hidden shrink-0" />
                          <span>{displayDate || item.date}</span>
                        </div>
                      </td>

                      {/* Horário */}
                      <td className="py-3 px-3 sm:px-4 font-medium text-emerald-200/90 print:text-black whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-400/70 print:hidden shrink-0" />
                          <span>{item.time || '--:--'}</span>
                        </div>
                      </td>

                      {/* Serviço */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="font-bold text-white print:text-black leading-snug">
                          {item.service}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-emerald-200/70 print:text-gray-600 mt-0.5 line-clamp-1" title={item.notes}>
                            {item.notes}
                          </div>
                        )}
                        {/* Mobile provider display */}
                        <div className="md:hidden text-[10px] text-emerald-300/80 mt-1 flex items-center gap-2">
                          {item.providerName && (
                            <span className="font-medium bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              {item.providerName}
                            </span>
                          )}
                          {item.paymentMethod && <span>({item.paymentMethod})</span>}
                        </div>
                      </td>

                      {/* Prestador */}
                      <td className="py-3 px-3 sm:px-4 hidden md:table-cell text-emerald-100/90 print:text-black">
                        {item.providerName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 rounded-md font-medium text-emerald-200">
                            <Building className="w-3 h-3 text-emerald-400 print:hidden" />
                            {item.providerName}
                          </span>
                        ) : (
                          <span className="text-emerald-500/40 italic">Não informado</span>
                        )}
                      </td>

                      {/* Forma de Pagamento */}
                      <td className="py-3 px-3 sm:px-4 hidden sm:table-cell text-emerald-200/90 print:text-black whitespace-nowrap">
                        {item.paymentMethod ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 bg-black/30 rounded-full border border-emerald-500/20">
                            <CreditCard className="w-3 h-3 text-emerald-400 print:hidden" />
                            {item.paymentMethod}
                          </span>
                        ) : (
                          <span>PIX</span>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                        <span className="text-sm font-extrabold text-emerald-300 print:text-black bg-emerald-950/40 print:bg-transparent px-2 py-0.5 rounded border border-emerald-500/25 print:border-none">
                          {centsToBRL(item.valueCents)}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="no-print py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiceToDelete(item)}
                            className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Tabela Footer com a SOMA TOTAL DOS GASTOS */}
              <tfoot>
                <tr className="bg-emerald-950/95 border-t-2 border-emerald-400/50 text-white font-bold print:bg-gray-200 print:text-black print:border-black">
                  <td colSpan={2} className="py-4 px-3 sm:px-4 font-black text-xs uppercase tracking-wider text-emerald-300 print:text-black">
                    Totalização Geral
                  </td>
                  <td className="py-4 px-3 sm:px-4 text-xs font-semibold text-emerald-200/90 print:text-black">
                    Soma de {filteredServices.length} {filteredServices.length === 1 ? 'serviço pago' : 'serviços pagos'}
                  </td>
                  <td className="py-4 px-3 sm:px-4 hidden md:table-cell" />
                  <td className="py-4 px-3 sm:px-4 hidden sm:table-cell" />
                  <td className="py-4 px-3 sm:px-4 text-right font-black text-base sm:text-lg text-emerald-300 print:text-black whitespace-nowrap">
                    {centsToBRL(totalExpensesCents)}
                  </td>
                  <td className="no-print py-4 px-3 sm:px-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 6. Modal de Cadastro e Edição de Serviço Pago */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#052116] border border-emerald-500/30 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl shadow-black/80 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {editingService ? 'Editar Prestação de Serviço' : 'Novo Serviço Pago'}
                  </h3>
                  <p className="text-[11px] text-emerald-200/70">
                    Registre a data, horário, serviço e valor pago
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-emerald-400/70 hover:text-white rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Row 1: Data e Horário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Data */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-emerald-200 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      Data *
                    </label>
                    <button
                      type="button"
                      onClick={handleSetTodayDate}
                      className="text-[10px] text-emerald-400 hover:text-emerald-200 underline cursor-pointer"
                    >
                      Hoje
                    </button>
                  </div>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-emerald-500/30 rounded-xl text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Horário */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-emerald-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Horário *
                    </label>
                    <button
                      type="button"
                      onClick={handleSetCurrentTime}
                      className="text-[10px] text-emerald-400 hover:text-emerald-200 underline cursor-pointer"
                    >
                      Agora
                    </button>
                  </div>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-emerald-500/30 rounded-xl text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Row 2: Serviço e Sugestões */}
              <div className="space-y-1">
                <label className="font-bold text-emerald-200">
                  Descrição do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Costura e refile de lonas para banners..."
                  value={formService}
                  onChange={e => setFormService(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-emerald-500/30 rounded-xl text-white focus:outline-none focus:border-emerald-400 font-medium"
                />

                {/* Quick suggestions chips */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <span className="text-[10px] text-emerald-300/70 mr-1 self-center">Sugestões:</span>
                  {QUICK_SERVICE_SUGGESTIONS.slice(0, 6).map(sug => (
                    <button
                      type="button"
                      key={sug}
                      onClick={() => setFormService(sug)}
                      className="text-[10px] px-2 py-0.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded-md border border-emerald-500/20 cursor-pointer transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Valor (R$) e Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Valor */}
                <div className="space-y-1">
                  <label className="font-bold text-emerald-200 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Valor Pago (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-400 text-xs">
                      R$
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="0,00"
                      value={formValueStr}
                      onChange={e => {
                        // Allow digits and comma/dots
                        const val = e.target.value.replace(/[^\d,.-]/g, '');
                        setFormValueStr(val);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-emerald-500/30 rounded-xl text-white font-extrabold text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-1">
                  <label className="font-bold text-emerald-200 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    Forma de Pagamento
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={e => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/40 border border-emerald-500/30 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m} className="bg-[#052116] text-white">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Prestador / Empresa */}
              <div className="space-y-1">
                <label className="font-bold text-emerald-200 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-emerald-400" />
                  Prestador / Profissional Terceirizado (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: João Serralheiro, Gráfica Parceira, etc."
                  value={formProviderName}
                  onChange={e => setFormProviderName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-emerald-500/30 rounded-xl text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Row 5: Observações */}
              <div className="space-y-1">
                <label className="font-bold text-emerald-200">
                  Observações / Detalhes (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais, número de nota, detalhes da entrega..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-emerald-500/30 rounded-xl text-white focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-emerald-500/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-emerald-200 font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSubmitting ? 'Salvando...' : editingService ? 'Atualizar Gasto' : 'Salvar Serviço Pago'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal de Exclusão com Confirmação */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#052116] border border-rose-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Excluir Lançamento?</h3>
              <p className="text-xs text-rose-200/80">
                Tem certeza que deseja excluir o serviço pago{' '}
                <strong className="text-white">"{serviceToDelete.service}"</strong> no valor de{' '}
                <strong className="text-emerald-300">{centsToBRL(serviceToDelete.valueCents)}</strong>?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {isSubmitting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
