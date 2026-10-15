/**
 * Date utilities for Alma Print Cad
 * Handles Brazilian (DD/MM/AAAA) and standard ISO (YYYY-MM-DD) date formats,
 * automatic +30 day delivery calculation, and deadline remaining days tracking.
 */

/**
 * Normalizes any supported date string to a Date object set at 00:00:00 local time
 */
export function parseDateFlexible(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Case 1: Brazilian format DD/MM/AAAA
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(brMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Case 2: ISO format YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Case 3: Standard JS parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
}

/**
 * Formats a Date or date string to DD/MM/AAAA
 */
export function formatDateToBR(dateInput?: Date | string | null): string {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : parseDateFlexible(dateInput);
  if (!d) return typeof dateInput === 'string' ? dateInput : '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a Date or date string to YYYY-MM-DD (suitable for <input type="date" />)
 */
export function formatDateToISO(dateInput?: Date | string | null): string {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : parseDateFlexible(dateInput);
  if (!d) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * Adds N days to a given date string or Date object and returns DD/MM/AAAA
 */
export function addDaysToDate(baseDateInput: Date | string | null | undefined, daysToAdd = 30): string {
  const base = baseDateInput instanceof Date ? baseDateInput : parseDateFlexible(baseDateInput);
  const start = base || new Date();

  const result = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  result.setDate(result.getDate() + daysToAdd);

  return formatDateToBR(result);
}

export interface DeliveryTimelineInfo {
  orderDateFormatted: string;
  deliveryDateFormatted: string;
  totalDays: number | null;
  daysRemaining: number | null;
  isOverdue: boolean;
  isToday: boolean;
  isConcluded: boolean;
  isCanceled: boolean;
  statusBadge: {
    text: string;
    subtext?: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    urgency: 'overdue' | 'today' | 'urgent' | 'normal' | 'concluded' | 'canceled' | 'unknown';
  };
}

/**
 * Calculates delivery timeline comparison between order registration date and delivery date
 */
export function calculateDeliveryTimeline(
  orderDateStr?: string,
  deliveryDateStr?: string,
  orderStatus?: string
): DeliveryTimelineInfo {
  const isConcluded = orderStatus === 'concluido';
  const isCanceled = orderStatus === 'cancelado';

  const orderDate = parseDateFlexible(orderDateStr);
  const deliveryDate = parseDateFlexible(deliveryDateStr);

  const orderDateFormatted = orderDate ? formatDateToBR(orderDate) : (orderDateStr || '-');
  const deliveryDateFormatted = deliveryDate ? formatDateToBR(deliveryDate) : (deliveryDateStr || 'Não informada');

  if (!deliveryDate) {
    return {
      orderDateFormatted,
      deliveryDateFormatted,
      totalDays: null,
      daysRemaining: null,
      isOverdue: false,
      isToday: false,
      isConcluded,
      isCanceled,
      statusBadge: {
        text: isConcluded ? 'Concluído' : isCanceled ? 'Cancelado' : 'Sem data definida',
        colorClass: isConcluded ? 'text-emerald-400' : isCanceled ? 'text-neutral-400' : 'text-neutral-300',
        bgClass: isConcluded ? 'bg-emerald-500/20' : isCanceled ? 'bg-neutral-500/20' : 'bg-neutral-800/40',
        borderClass: isConcluded ? 'border-emerald-500/30' : isCanceled ? 'border-neutral-500/30' : 'border-neutral-700/40',
        urgency: isConcluded ? 'concluded' : isCanceled ? 'canceled' : 'unknown',
      },
    };
  }

  // Today at midnight
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Difference in days between today and deliveryDate
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.round((deliveryDate.getTime() - today.getTime()) / msPerDay);

  // Total days timeframe between order registration and delivery
  const totalDays = orderDate
    ? Math.round((deliveryDate.getTime() - orderDate.getTime()) / msPerDay)
    : null;

  const isToday = daysRemaining === 0;
  const isOverdue = daysRemaining < 0 && !isConcluded && !isCanceled;

  if (isConcluded) {
    return {
      orderDateFormatted,
      deliveryDateFormatted,
      totalDays,
      daysRemaining,
      isOverdue: false,
      isToday: false,
      isConcluded: true,
      isCanceled: false,
      statusBadge: {
        text: 'Pedido Entregue / Concluído',
        subtext: totalDays !== null ? `Prazo previsto foi de ${totalDays} dias` : undefined,
        colorClass: 'text-emerald-300',
        bgClass: 'bg-emerald-500/20',
        borderClass: 'border-emerald-400/40',
        urgency: 'concluded',
      },
    };
  }

  if (isCanceled) {
    return {
      orderDateFormatted,
      deliveryDateFormatted,
      totalDays,
      daysRemaining,
      isOverdue: false,
      isToday: false,
      isConcluded: false,
      isCanceled: true,
      statusBadge: {
        text: 'Cancelado',
        colorClass: 'text-neutral-400',
        bgClass: 'bg-neutral-800/60',
        borderClass: 'border-neutral-700/50',
        urgency: 'canceled',
      },
    };
  }

  if (isOverdue) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      orderDateFormatted,
      deliveryDateFormatted,
      totalDays,
      daysRemaining,
      isOverdue: true,
      isToday: false,
      isConcluded: false,
      isCanceled: false,
      statusBadge: {
        text: `Atrasado há ${overdueDays} ${overdueDays === 1 ? 'dia' : 'dias'}`,
        subtext: totalDays !== null ? `Prazo original: ${totalDays} dias` : undefined,
        colorClass: 'text-rose-300',
        bgClass: 'bg-rose-500/25',
        borderClass: 'border-rose-500/50',
        urgency: 'overdue',
      },
    };
  }

  if (isToday) {
    return {
      orderDateFormatted,
      deliveryDateFormatted,
      totalDays,
      daysRemaining: 0,
      isOverdue: false,
      isToday: true,
      isConcluded: false,
      isCanceled: false,
      statusBadge: {
        text: 'Entrega é HOJE!',
        subtext: totalDays !== null ? `Prazo total de ${totalDays} dias` : undefined,
        colorClass: 'text-amber-300',
        bgClass: 'bg-amber-500/25',
        borderClass: 'border-amber-400/60',
        urgency: 'today',
      },
    };
  }

  if (daysRemaining <= 5) {
    return {
      orderDateFormatted,
      deliveryDateFormatted,
      totalDays,
      daysRemaining,
      isOverdue: false,
      isToday: false,
      isConcluded: false,
      isCanceled: false,
      statusBadge: {
        text: `Restam ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`,
        subtext: totalDays !== null ? `Prazo total: ${totalDays} dias` : undefined,
        colorClass: 'text-amber-200',
        bgClass: 'bg-amber-500/20',
        borderClass: 'border-amber-500/40',
        urgency: 'urgent',
      },
    };
  }

  // Normal / on schedule
  return {
    orderDateFormatted,
    deliveryDateFormatted,
    totalDays,
    daysRemaining,
    isOverdue: false,
    isToday: false,
    isConcluded: false,
    isCanceled: false,
    statusBadge: {
      text: `Restam ${daysRemaining} dias`,
      subtext: totalDays !== null ? `Prazo total: ${totalDays} dias` : undefined,
      colorClass: 'text-emerald-300',
      bgClass: 'bg-emerald-500/20',
      borderClass: 'border-emerald-400/40',
      urgency: 'normal',
    },
  };
}
