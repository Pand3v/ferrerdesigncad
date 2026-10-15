import jsPDF from 'jspdf';
import { PaidService, CompanySettings } from '../types';
import { centsToBRL } from './currency';
import { formatDateToBR } from './dateUtils';

interface GeneratePaidServicesPdfOptions {
  services: PaidService[];
  periodLabel: string;
  companySettings?: CompanySettings;
}

/**
 * Generates an offscreen high-res PNG of the official ALMA PRINT logo for PDF documents.
 */
function createAlmaPrintLogoDataUrl(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 620;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw 4 colorful flower petals
    ctx.save();
    ctx.translate(14, 12);
    ctx.scale(1.3, 1.3);

    // Top-Left petal (Magenta #EC4899)
    ctx.fillStyle = '#EC4899';
    const p1 = new Path2D('M48 48 C 42 20, 20 10, 18 32 C 16 46, 32 48, 48 48 Z');
    ctx.fill(p1);

    // Top-Right petal (Cyan #06B6D4)
    ctx.fillStyle = '#06B6D4';
    const p2 = new Path2D('M52 48 C 58 20, 80 12, 82 34 C 84 48, 68 48, 52 48 Z');
    ctx.fill(p2);

    // Bottom-Left petal (Orange/Amber #F59E0B)
    ctx.fillStyle = '#F59E0B';
    const p3 = new Path2D('M48 52 C 22 56, 12 76, 34 82 C 48 84, 48 68, 48 52 Z');
    ctx.fill(p3);

    // Bottom-Right petal (Lime Green #10B981)
    ctx.fillStyle = '#10B981';
    const p4 = new Path2D('M52 52 C 78 56, 86 78, 66 84 C 52 86, 52 68, 52 52 Z');
    ctx.fill(p4);

    // Center white dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(50, 50, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Brand text: ALMA (Dark Slate #0F172A) + PRINT (Emerald #10B981)
    ctx.font = '900 44px "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('ALMA', 160, 68);
    const almaW = ctx.measureText('ALMA ').width;
    ctx.fillStyle = '#10B981';
    ctx.fillText('PRINT', 160 + almaW, 68);

    // Subtitle: GRÁFICA E EMBALAGENS (#475569)
    ctx.font = '700 16px "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('GRÁFICA E EMBALAGENS', 162, 102);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Falha ao gerar logotipo Alma Print em Canvas:', err);
    return '';
  }
}

export function buildPaidServicesPdfDoc({
  services,
  periodLabel,
  companySettings,
}: GeneratePaidServicesPdfOptions): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  const comp: Partial<CompanySettings> = {
    legalName: companySettings?.legalName || 'ALMA NEGÓCIOS E SERVIÇOS LTDA',
    cnpj: companySettings?.cnpj || '65.349.937/0001-12',
    address: companySettings?.address || 'Rua Regente Feijó, 484 - Centro',
    unit: companySettings?.unit || 'Campinas - SP',
    zipCode: companySettings?.zipCode || '13013-051',
    phone: companySettings?.phone || '19 9 9359-9923',
    email: companySettings?.email || 'contato@almaprintgrafica.com.br',
    logoUrl: companySettings?.logoUrl,
  };

  let y = margin;

  // 1. TOP HEADER (Logo + Company Institutional Information)
  const customLogo = comp.logoUrl && comp.logoUrl.trim().length > 0 ? comp.logoUrl : null;
  const generatedLogo = !customLogo ? createAlmaPrintLogoDataUrl() : null;

  try {
    if (customLogo) {
      doc.addImage(customLogo, 'JPEG', margin, y, 54, 15);
    } else if (generatedLogo) {
      doc.addImage(generatedLogo, 'PNG', margin, y, 60, 15);
    }
  } catch (e) {
    console.warn('Could not draw logo in PDF:', e);
  }

  // Institutional Info in Header Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(comp.legalName || 'ALMA NEGÓCIOS E SERVIÇOS LTDA', margin + 70, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`CNPJ: ${comp.cnpj || '65.349.937/0001-12'} | Tel: ${comp.phone || '(19) 9 9359-9923'}`, margin + 70, y + 8.5);
  doc.text(`${comp.address || ''} - ${comp.unit || 'Campinas - SP'}`, margin + 70, y + 12.5);

  y += 18;

  // Horizontal divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 3;

  // 2. DOCUMENT TITLE BANNER (Dark Emerald Green Box with Golden / White Text)
  const bannerH = 13;
  doc.setFillColor(5, 33, 22); // Deep Emerald (#052116)
  doc.rect(margin, y, contentWidth, bannerH, 'F');

  // Decorative border
  doc.setDrawColor(16, 185, 129); // Emerald-500
  doc.setLineWidth(0.6);
  doc.rect(margin, y, contentWidth, bannerH, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('RELATÓRIO DE PRESTAÇÃO DE SERVIÇOS PAGOS & GASTOS', margin + contentWidth / 2, y + 5.5, { align: 'center' });

  const nowStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(167, 243, 208); // Emerald-200
  doc.text(`Período Selecionado: ${periodLabel}  |  Emitido em: ${nowStr}`, margin + contentWidth / 2, y + 10, { align: 'center' });

  y += bannerH + 4;

  // 3. FINANCIAL SUMMARY STATS BOX (Cards)
  let totalCents = 0;
  services.forEach(s => {
    totalCents += s.valueCents || 0;
  });
  const count = services.length;
  const avgCents = count > 0 ? Math.round(totalCents / count) : 0;

  const summaryBoxH = 13;
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(margin, y, contentWidth, summaryBoxH, 'FD');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  const colWidth = contentWidth / 3;

  // Col 1: Total de Gastos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL GASTO NO PERÍODO', margin + colWidth * 0.5, y + 4.2, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setTextColor(16, 185, 129); // Emerald-600
  doc.text(centsToBRL(totalCents), margin + colWidth * 0.5, y + 9.5, { align: 'center' });

  // Divider 1
  doc.line(margin + colWidth, y, margin + colWidth, y + summaryBoxH);

  // Col 2: Quantidade de Serviços
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('SERVIÇOS REALIZADOS', margin + colWidth * 1.5, y + 4.2, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${count} ${count === 1 ? 'serviço pago' : 'serviços pagos'}`, margin + colWidth * 1.5, y + 9.5, { align: 'center' });

  // Divider 2
  doc.line(margin + colWidth * 2, y, margin + colWidth * 2, y + summaryBoxH);

  // Col 3: Média por Serviço
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('MÉDIA POR SERVIÇO', margin + colWidth * 2.5, y + 4.2, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setTextColor(217, 119, 6); // Amber-600
  doc.text(centsToBRL(avgCents), margin + colWidth * 2.5, y + 9.5, { align: 'center' });

  y += summaryBoxH + 4;

  // 4. DETAILED SERVICES TABLE
  const colDateW = 22;
  const colTimeW = 16;
  const colServW = 74;
  const colProvW = 38;
  const colPayW = 20;
  const colValW = 20;

  // Table Header Function
  const drawTableHeader = (currentY: number) => {
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(margin, currentY, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let curX = margin;
    doc.text('DATA', curX + colDateW / 2, currentY + 4.8, { align: 'center' });
    curX += colDateW;

    doc.text('HORA', curX + colTimeW / 2, currentY + 4.8, { align: 'center' });
    curX += colTimeW;

    doc.text('DESCRIÇÃO DO SERVIÇO', curX + 2, currentY + 4.8);
    curX += colServW;

    doc.text('PRESTADOR', curX + 2, currentY + 4.8);
    curX += colProvW;

    doc.text('PAGTO', curX + colPayW / 2, currentY + 4.8, { align: 'center' });
    curX += colPayW;

    doc.text('VALOR PAGO', curX + colValW - 2, currentY + 4.8, { align: 'right' });
    return currentY + 7;
  };

  y = drawTableHeader(y);

  if (services.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 12, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum serviço pago encontrado para o período filtrado.', margin + contentWidth / 2, y + 7.5, { align: 'center' });
    y += 12;
  } else {
    services.forEach((item, index) => {
      // Row height estimate (multiline description if long)
      const serviceText = item.service + (item.notes ? ` (${item.notes})` : '');
      const splitService = doc.splitTextToSize(serviceText, colServW - 3);
      const textLines = Math.max(splitService.length, 1);
      const rowH = Math.max(textLines * 3.8 + 2.5, 6.5);

      // Check for Page Overflow
      if (y + rowH > pageHeight - margin - 22) {
        // Add footer to current page
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`ALMA PRINT CAD - Página ${doc.getNumberOfPages()}`, margin + contentWidth / 2, pageHeight - 6, { align: 'center' });

        doc.addPage();
        y = margin;
        y = drawTableHeader(y);
      }

      // Zebra background
      if (index % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252); // Slate-50
      }
      doc.rect(margin, y, contentWidth, rowH, 'F');

      // Light border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, contentWidth, rowH, 'D');

      // Values
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      let curX = margin;
      // Date
      doc.text(formatDateToBR(item.date), curX + colDateW / 2, y + 4.5, { align: 'center' });
      curX += colDateW;

      // Time
      doc.text(item.time || '--:--', curX + colTimeW / 2, y + 4.5, { align: 'center' });
      curX += colTimeW;

      // Service description
      doc.setFont('helvetica', 'bold');
      doc.text(splitService, curX + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      curX += colServW;

      // Provider
      const provStr = item.providerName ? doc.splitTextToSize(item.providerName, colProvW - 3) : '-';
      doc.text(provStr, curX + 2, y + 4);
      curX += colProvW;

      // Payment
      doc.text(item.paymentMethod || 'PIX', curX + colPayW / 2, y + 4.5, { align: 'center' });
      curX += colPayW;

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Green
      doc.text(centsToBRL(item.valueCents), curX + colValW - 2, y + 4.5, { align: 'right' });

      y += rowH;
    });

    // TOTAL ROW AT END OF TABLE
    const totalRowH = 8.5;
    if (y + totalRowH > pageHeight - margin - 20) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.rect(margin, y, contentWidth, totalRowH, 'F');
    doc.setDrawColor(16, 185, 129); // Emerald-500
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, totalRowH, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(6, 78, 59); // Emerald-900
    doc.text(`TOTAL GERAL DE GASTOS (${count} LANÇAMENTOS):`, margin + 3, y + 5.5);

    doc.setFontSize(10);
    doc.setTextColor(4, 120, 87); // Emerald-700
    doc.text(centsToBRL(totalCents), margin + contentWidth - 3, y + 5.7, { align: 'right' });

    y += totalRowH + 10;
  }

  // 5. SIGNATURE & VERIFICATION AREA
  if (y + 24 <= pageHeight - margin - 5) {
    const sigW = 80;
    const sigX = margin + (contentWidth - sigW) / 2;

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(sigX, y + 10, sigX + sigW, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('CONFERÊNCIA E ASSINATURA DO RESPONSÁVEL', sigX + sigW / 2, y + 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Documento gerado pelo sistema de gestão Alma Print Cad', sigX + sigW / 2, y + 17.5, { align: 'center' });
  }

  // Page numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`ALMA PRINT &bull; Prestação de Contas e Gastos &bull; Página ${i} de ${totalPages}`, margin + contentWidth / 2, pageHeight - 5, { align: 'center' });
  }

  const cleanPeriod = periodLabel.replace(/[\/\s]/g, '_').toLowerCase();
  const filename = `relatorio_gastos_almaprint_${cleanPeriod || 'geral'}.pdf`;

  return { doc, filename };
}

export function generatePaidServicesPDF(options: GeneratePaidServicesPdfOptions): void {
  const { doc, filename } = buildPaidServicesPdfDoc(options);
  doc.save(filename);
}

export function printPaidServicesPDF(options: GeneratePaidServicesPdfOptions): void {
  const { doc, filename } = buildPaidServicesPdfDoc(options);

  try {
    doc.autoPrint({ variant: 'non-conform' });
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // Create hidden iframe to trigger native browser print dialog
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed or blocked, downloading PDF directly:', err);
        doc.save(filename);
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          } catch {}
        }, 8000);
      }
    };

    iframe.onload = () => {
      setTimeout(triggerPrint, 300);
    };

    document.body.appendChild(iframe);

    // Fallback if onload doesn't trigger
    setTimeout(() => {
      if (!printed) {
        triggerPrint();
      }
    }, 1200);
  } catch (err) {
    console.warn('Print PDF exception, falling back to direct download:', err);
    doc.save(filename);
  }
}
