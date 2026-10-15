/**
 * Formats integer cents to Brazilian Real string (e.g. 450000 -> "R$ 4.500,00")
 */
export function centsToBRL(cents: number | undefined | null): string {
  if (cents === undefined || cents === null || isNaN(cents)) return 'R$ 0,00';
  const val = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Parses quantity strings like "1.000", "500", "2,5", "10.000" into a numeric value
 */
export function parseQuantityToNumber(quantityStr: string | number | undefined | null): number {
  if (quantityStr === undefined || quantityStr === null) return 1;
  if (typeof quantityStr === 'number') return quantityStr > 0 ? quantityStr : 1;
  const cleaned = String(quantityStr).trim();
  if (!cleaned) return 1;

  // If format is like "1.000" or "10.000" or "1.000.000" (Brazilian thousand separators with dot)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    const num = parseInt(cleaned.replace(/\./g, ''), 10);
    return num > 0 ? num : 1;
  }

  // If format has comma (e.g. "2,5" or "1.500,50")
  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return !isNaN(num) && num > 0 ? num : 1;
  }

  // General number cleanup
  const num = parseFloat(cleaned.replace(/[^\d.-]/g, ''));
  return !isNaN(num) && num > 0 ? num : 1;
}

/**
 * Calculates unit price string from total item cents and quantity string
 * Logic: Valor Total do Item dividido por QTDE
 */
export function calculateItemUnitPrice(
  totalItemCents: number | undefined | null,
  quantityStr: string | number | undefined | null
): string {
  if (!totalItemCents || isNaN(totalItemCents)) return 'R$ 0,00';
  const qty = parseQuantityToNumber(quantityStr);
  if (qty <= 0) return centsToBRL(totalItemCents);

  const unitVal = (totalItemCents / 100) / qty;

  // If unit price is smaller than R$ 1,00, show up to 3 decimal digits if needed (e.g., R$ 0,45 or R$ 0,355)
  if (unitVal < 1) {
    const hasThreeDecimals = Math.round(unitVal * 1000) % 10 !== 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: hasThreeDecimals ? 3 : 2,
    }).format(unitVal);
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(unitVal);
}

/**
 * Formats integer cents to raw Brazilian number without currency symbol (e.g. 450000 -> "4.500,00")
 */
export function centsToBRLNumber(cents: number | undefined | null): string {
  if (cents === undefined || cents === null || isNaN(cents)) return '0,00';
  const val = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Parses Brazilian Real input or typed numbers into integer cents
 */
export function parseBRLToCents(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100);
  }
  if (!input) return 0;

  // Remove currency symbol, spaces
  let cleaned = input.replace(/[R$\s]/g, '').trim();

  // If input format is like "4.500,00" or "4500,00"
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if ((cleaned.match(/\./g) || []).length > 1) {
    // Multiple dots like "1.000.000"
    cleaned = cleaned.replace(/\./g, '');
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Returns today's date formatted as DD/MM/AAAA
 */
export function getTodayDateBR(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats CPF (000.000.000-00) or CNPJ (00.000.000/0000-00)
 */
export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    // CPF
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ
    return digits
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
}

/**
 * Formats phone number ((19) 99359-9923 or (19) 3359-9923)
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  } else {
    return digits
      .slice(0, 11)
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }
}

/**
 * Formats CEP (00000-000)
 */
export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}
