import jsPDF from 'jspdf';
import { Order, CompanySettings } from '../types';
import { centsToBRL, calculateItemUnitPrice } from './currency';

interface GeneratePdfOptions {
  order: Order;
  isServiceOrder: boolean;
  companySettings?: CompanySettings;
}

/**
 * Generates an offscreen high-res PNG of the official ALMA PRINT logo with 4-petal flower icon & typography.
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

export function buildOrderPdfDoc({ order, isServiceOrder, companySettings }: GeneratePdfOptions): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const isOrcamento = order.status === 'orcamento';
  const docTitle = isServiceOrder
    ? 'ORDEM DE SERVIÇO'
    : isOrcamento
    ? 'ORÇAMENTO'
    : 'PEDIDO';

  // Merge order's snapshot with active company settings so changes apply automatically to all orders
  const comp: Partial<CompanySettings> = {
    ...(order.companySnapshot || {}),
    ...(companySettings || {}),
    address: companySettings?.address || order.companySnapshot?.address || 'Rua Regente Feijó, 484 - Centro',
    cnpj: companySettings?.cnpj || order.companySnapshot?.cnpj || '65.349.937/0001-12',
    zipCode: companySettings?.zipCode || order.companySnapshot?.zipCode || '13013-051',
    city: companySettings?.city || order.companySnapshot?.city || 'Campinas',
    state: companySettings?.state || order.companySnapshot?.state || 'SP',
    unit: companySettings?.unit || order.companySnapshot?.unit || 'Campinas - SP',
    legalName: companySettings?.legalName || order.companySnapshot?.legalName || 'ALMA NEGÓCIOS E SERVIÇOS LTDA',
    phone: companySettings?.phone || order.companySnapshot?.phone || '19 9 9359-9923',
    email: companySettings?.email || order.companySnapshot?.email || 'contato@almaprintgrafica.com.br',
    instagram: companySettings?.instagram || order.companySnapshot?.instagram || 'almaprint.grafica',
    headerServices: companySettings?.headerServices || order.companySnapshot?.headerServices || 'OFFSET\nDIGITAL\nEMBALAGENS\nBRINDES\nSIGN',
    logoUrl: companySettings?.logoUrl || order.companySnapshot?.logoUrl,
  };

  // 1. TOP HEADER (Logo, Contacts, Services)
  // Render Official Colorful Logo
  const customLogo = comp.logoUrl && comp.logoUrl.trim().length > 0 ? comp.logoUrl : null;
  const generatedLogo = !customLogo ? createAlmaPrintLogoDataUrl() : null;

  try {
    if (customLogo) {
      doc.addImage(customLogo, 'JPEG', margin, y, 56, 16);
    } else if (generatedLogo) {
      doc.addImage(generatedLogo, 'PNG', margin, y, 62, 15);
    } else {
      // Fallback text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text('ALMA PRINT', margin + 2, y + 8);
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('GRÁFICA E EMBALAGENS', margin + 2, y + 13);
    }
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text('ALMA PRINT', margin + 2, y + 8);
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('GRÁFICA E EMBALAGENS', margin + 2, y + 13);
  }

  // Center: Contacts (WhatsApp, Instagram, E-mail)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const phone = comp.phone || '19 9 9359-9923';
  const insta = comp.instagram || 'almaprint.grafica';
  const email = comp.email || 'contato@almaprintgrafica.com.br';

  doc.setFont('helvetica', 'bold');
  doc.text('Tel / WhatsApp:', margin + 63, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(phone, margin + 88, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Instagram:', margin + 63, y + 9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`@${insta.replace('@', '')}`, margin + 88, y + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.text('E-mail:', margin + 63, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(email, margin + 88, y + 14);

  // Right: Services with left vertical border (mirroring app's border-l border-neutral-300)
  const servicesBorderX = margin + contentWidth - 36;
  doc.setDrawColor(209, 213, 219); // #D1D5DB (neutral-300)
  doc.setLineWidth(0.35);
  doc.line(servicesBorderX, y + 1.5, servicesBorderX, y + 19.5);

  const servicesText = comp.headerServices || 'OFFSET\nDIGITAL\nEMBALAGENS\nBRINDES\nSIGN';
  const serviceLines = servicesText.split('\n');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  serviceLines.forEach((sLine, idx) => {
    doc.text(sLine.trim().toUpperCase(), margin + contentWidth - 1, y + 4.2 + idx * 3.2, { align: 'right' });
  });

  // Divider line under top header (placed with comfortable space below SIGN)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 22, margin + contentWidth, y + 22);

  y += 25;

  // 2. DOCUMENT TITLE & NUMBER BAR WITH VIBRANT RED/MAGENTA BANNER (Unified Bordered Container)
  const bannerTitle = isServiceOrder
    ? 'ORDEM DE SERVIÇO — VIA DE PRODUÇÃO'
    : 'CONTRATO DE PRESTAÇÃO DE SERVIÇO';

  const bannerH = 6.5;
  const rowH = 9.0;
  const totalBoxH = bannerH + rowH;

  const dateColW = 48;
  const numColW = 48;
  const titleColW = contentWidth - dateColW - numColW;

  const boxStartY = y;

  // 1. FILLS (Drawn first so borders are never covered)
  // Top Banner Fill (#E60045)
  doc.setFillColor(230, 0, 69);
  doc.rect(margin, boxStartY, contentWidth, bannerH, 'F');

  // Left Col Fill (Date: #F8FAFC)
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, boxStartY + bannerH, dateColW, rowH, 'F');

  // Center Col Fill (Title: #FFFFFF)
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + dateColW, boxStartY + bannerH, titleColW, rowH, 'F');

  // Right Col Fill (Nº: #FEF9C3 / Amber-100)
  doc.setFillColor(254, 249, 195);
  doc.rect(margin + dateColW + titleColW, boxStartY + bannerH, numColW, rowH, 'F');

  // 2. BORDERS (Drawn on top with exact alignment)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);

  // Outer enclosing rectangle around entire block
  doc.rect(margin, boxStartY, contentWidth, totalBoxH);

  // Horizontal line separating top banner from bottom columns
  doc.line(margin, boxStartY + bannerH, margin + contentWidth, boxStartY + bannerH);

  // Vertical line between Date and Title
  doc.line(margin + dateColW, boxStartY + bannerH, margin + dateColW, boxStartY + totalBoxH);

  // Vertical line between Title and Nº
  doc.line(margin + dateColW + titleColW, boxStartY + bannerH, margin + dateColW + titleColW, boxStartY + totalBoxH);

  // 3. TEXTS
  // Banner text (White, Bold, Centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(bannerTitle, margin + contentWidth / 2, boxStartY + 4.6, { align: 'center' });

  // Date column text (Centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Data: ${order.date}`, margin + dateColW / 2, boxStartY + bannerH + 5.8, { align: 'center' });

  // Document Title column text (PEDIDO / ORÇAMENTO / ORDEM DE SERVIÇO)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(docTitle, margin + dateColW + titleColW / 2, boxStartY + bannerH + 6.2, { align: 'center' });

  // Nº column text (Centered with label and bold number in black)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const nW = doc.getTextWidth('Nº ');
  doc.setFontSize(12);
  const numW = doc.getTextWidth(order.orderNumber);
  const startNumX = margin + dateColW + titleColW + (numColW - (nW + numW)) / 2;

  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Nº ', startNumX, boxStartY + bannerH + 5.8);

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(order.orderNumber, startNumX + nW, boxStartY + bannerH + 6.2);

  y += totalBoxH + 3;

  // 3. CONTRATADA (Company info)
  doc.setFillColor(241, 245, 249); // #F1F5F9 Slate-100
  doc.rect(margin, y, contentWidth, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CONTRATADA', margin + contentWidth / 2, y + 4.2, { align: 'center' });
  y += 6;

  // Details box
  const compBoxHeight = 16;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, compBoxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  // Line 1
  doc.setFont('helvetica', 'bold');
  doc.text('Razão Social: ', margin + 3, y + 4.5);
  let w = doc.getTextWidth('Razão Social: ');
  doc.setFont('helvetica', 'normal');
  doc.text(comp.legalName || 'ALMA NEGÓCIOS E SERVIÇOS LTDA', margin + 3 + w, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('CNPJ/CPF: ', margin + 115, y + 4.5);
  w = doc.getTextWidth('CNPJ/CPF: ');
  doc.setFont('helvetica', 'normal');
  doc.text(comp.cnpj || '65.349.937/0001-12', margin + 115 + w, y + 4.5);

  // Line 2
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço: ', margin + 3, y + 9);
  w = doc.getTextWidth('Endereço: ');
  doc.setFont('helvetica', 'normal');
  doc.text(comp.address || 'Rua Regente Feijó, 484 - Centro', margin + 3 + w, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.text('Unidade: ', margin + 115, y + 9);
  w = doc.getTextWidth('Unidade: ');
  doc.setFont('helvetica', 'normal');
  doc.text(comp.unit || 'Campinas - SP', margin + 115 + w, y + 9);

  // Line 3
  doc.setFont('helvetica', 'bold');
  doc.text('CEP: ', margin + 3, y + 13.5);
  w = doc.getTextWidth('CEP: ');
  doc.setFont('helvetica', 'normal');
  doc.text(comp.zipCode || '13013-051', margin + 3 + w, y + 13.5);

  const cepEnd = margin + 3 + w + doc.getTextWidth(comp.zipCode || '13013-051') + 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Cidade: ', cepEnd, y + 13.5);
  w = doc.getTextWidth('Cidade: ');
  doc.setFont('helvetica', 'normal');
  doc.text(comp.city || 'Campinas', cepEnd + w, y + 13.5);

  const cityEnd = cepEnd + w + doc.getTextWidth(comp.city || 'Campinas') + 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Estado: ', cityEnd, y + 13.5);
  w = doc.getTextWidth('Estado: ');
  doc.setFont('helvetica', 'normal');
  doc.text(comp.state || 'SP', cityEnd + w, y + 13.5);

  y += compBoxHeight + 3;

  // 4. DADOS DO CONTRATANTE (Client info)
  doc.setFillColor(241, 245, 249); // #F1F5F9 Slate-100
  doc.rect(margin, y, contentWidth, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DADOS DO CONTRATANTE', margin + contentWidth / 2, y + 4.2, { align: 'center' });
  y += 6;

  const cli = order.clientSnapshot || { name: 'Cliente não informado' };
  const cliBoxHeight = 16;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, cliBoxHeight, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  // Line 1
  doc.setFont('helvetica', 'bold');
  doc.text('Razão Social / Nome: ', margin + 3, y + 4.5);
  w = doc.getTextWidth('Razão Social / Nome: ');
  doc.setFont('helvetica', 'bold');
  doc.text(cli.name || '', margin + 3 + w, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text('CPF / CNPJ: ', margin + 115, y + 4.5);
  w = doc.getTextWidth('CPF / CNPJ: ');
  doc.setFont('helvetica', 'normal');
  doc.text(cli.cpfCnpj || '-', margin + 115 + w, y + 4.5);

  // Line 2
  doc.setFont('helvetica', 'bold');
  doc.text('Contato: ', margin + 3, y + 9);
  w = doc.getTextWidth('Contato: ');
  doc.setFont('helvetica', 'normal');
  doc.text(cli.contactPerson || '-', margin + 3 + w, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.text('Telefone: ', margin + 115, y + 9);
  w = doc.getTextWidth('Telefone: ');
  doc.setFont('helvetica', 'normal');
  doc.text(cli.phone || '-', margin + 115 + w, y + 9);

  // Line 3
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço: ', margin + 3, y + 13.5);
  w = doc.getTextWidth('Endereço: ');
  doc.setFont('helvetica', 'normal');
  const cliAddrFull = `${cli.address || '-'}${cli.city ? ' | ' + cli.city : ''}${cli.state ? ' - ' + cli.state : ''}`;
  doc.text(cliAddrFull, margin + 3 + w, y + 13.5);

  y += cliBoxHeight + 3;

  // 5. ITENS TABLE HEADER
  const colQtdeW = 18;
  const colUnitW = isServiceOrder ? 0 : 25;
  const colValW = isServiceOrder ? 0 : 28;
  const colConfW = isServiceOrder ? 25 : 0;
  const colDescW = contentWidth - colQtdeW - (isServiceOrder ? colConfW : colUnitW + colValW);

  doc.setFillColor(241, 245, 249); // #F1F5F9 Slate-100
  doc.rect(margin, y, contentWidth, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  doc.text('QTDE', margin + colQtdeW / 2, y + 4.8, { align: 'center' });
  doc.text(
    isServiceOrder ? 'DESCRIÇÃO DOS SERVIÇOS & ESPECIFICAÇÕES TÉCNICAS' : 'DESCRIÇÃO DOS SERVIÇOS',
    margin + colQtdeW + 3,
    y + 4.8
  );

  if (!isServiceOrder) {
    doc.text('VALOR UNIT.', margin + colQtdeW + colDescW + colUnitW - 3, y + 4.8, { align: 'right' });
    doc.text('VALOR TOTAL', margin + contentWidth - 3, y + 4.8, { align: 'right' });
  } else {
    doc.text('CONFERÊNCIA', margin + contentWidth - colConfW / 2, y + 4.8, { align: 'center' });
  }

  y += 7;

  // 6. ITENS ROWS
  doc.setTextColor(0, 0, 0);

  order.items.forEach((item, index) => {
    // Split description into lines fitting within colDescW - 6mm
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const descLines = doc.splitTextToSize(item.description || '', colDescW - 5);
    const rowHeight = Math.max(8, descLines.length * 4.2 + 4);

    // Page overflow check
    if (y + rowHeight > pageHeight - 35) {
      doc.addPage();
      y = margin;

      // Repeat table header on new page
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 7, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('QTDE', margin + colQtdeW / 2, y + 4.8, { align: 'center' });
      doc.text('DESCRIÇÃO DOS SERVIÇOS (continuação)', margin + colQtdeW + 3, y + 4.8);
      if (!isServiceOrder) {
        doc.text('VALOR UNIT.', margin + colQtdeW + colDescW + colUnitW - 3, y + 4.8, { align: 'right' });
        doc.text('VALOR TOTAL', margin + contentWidth - 3, y + 4.8, { align: 'right' });
      } else {
        doc.text('CONFERÊNCIA', margin + contentWidth - colConfW / 2, y + 4.8, { align: 'center' });
      }
      y += 7;
      doc.setTextColor(0, 0, 0);
    }

    // Subtle alternating row background for readability
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    // Row borders
    doc.rect(margin, y, contentWidth, rowHeight);
    doc.line(margin + colQtdeW, y, margin + colQtdeW, y + rowHeight);

    if (!isServiceOrder) {
      doc.line(margin + colQtdeW + colDescW, y, margin + colQtdeW + colDescW, y + rowHeight);
      doc.line(margin + colQtdeW + colDescW + colUnitW, y, margin + colQtdeW + colDescW + colUnitW, y + rowHeight);
    } else {
      doc.line(margin + contentWidth - colConfW, y, margin + contentWidth - colConfW, y + rowHeight);
    }

    // Quantity (Centered & bold)
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.quantity || '-'), margin + colQtdeW / 2, y + 5, { align: 'center' });

    // Multiline description
    doc.setFont('helvetica', 'normal');
    doc.text(descLines, margin + colQtdeW + 3, y + 4.5);

    // Item values strictly ONLY on Pedido/Orcamento
    if (!isServiceOrder) {
      const unitValStr = calculateItemUnitPrice(item.totalItemCents, item.quantity);
      const totalValStr = centsToBRL(item.totalItemCents);

      doc.setFont('helvetica', 'normal');
      doc.text(unitValStr, margin + colQtdeW + colDescW + colUnitW - 3, y + 5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text(totalValStr, margin + contentWidth - 3, y + 5, { align: 'right' });
    } else {
      // OS Checkbox
      const boxSize = 4;
      const boxX = margin + contentWidth - colConfW / 2 - boxSize / 2;
      const boxY = y + rowHeight / 2 - boxSize / 2;
      doc.rect(boxX, boxY, boxSize, boxSize);
    }

    y += rowHeight;
  });

  // 7. TOTAL ROW (ONLY ON PEDIDO / ORÇAMENTO)
  if (!isServiceOrder) {
    if (y + 10 > pageHeight - 35) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.rect(margin, y, contentWidth, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL GERAL', margin + colQtdeW + colDescW + colUnitW - 3, y + 5.5, { align: 'right' });

    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(centsToBRL(order.totalGeneralCents), margin + contentWidth - 3, y + 5.5, { align: 'right' });
    y += 10;
  } else {
    y += 3;
  }

  // 8. PRAZO E OBSERVAÇÕES / PAGAMENTO
  if (y + 40 > pageHeight - 20) {
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(241, 245, 249); // #F1F5F9 Slate-100
  doc.rect(margin, y, contentWidth, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    isServiceOrder ? 'PRAZO E ESPECIFICAÇÕES TÉCNICAS' : 'PRAZO E FORMAS DE PAGAMENTO',
    margin + contentWidth / 2,
    y + 4.2,
    { align: 'center' }
  );
  y += 6;

  const footerBoxHeight = isServiceOrder ? 34 : 36;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, footerBoxHeight, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  let footerY = y + 5;

  if (!isServiceOrder) {
    if (order.paymentTerms) {
      doc.setFont('helvetica', 'bold');
      doc.text('Condições de Pagamento: ', margin + 3, footerY);
      const ptW = doc.getTextWidth('Condições de Pagamento: ');
      doc.setFont('helvetica', 'normal');
      doc.text(order.paymentTerms, margin + 3 + ptW, footerY);
      footerY += 5;
    }
  }

  const deliveryLabelParts = [];
  if (order.deliveryTime) deliveryLabelParts.push(order.deliveryTime);
  if (order.deliveryDate) deliveryLabelParts.push(`(Previsão: ${order.deliveryDate})`);
  if (deliveryLabelParts.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Prazo de Entrega: ', margin + 3, footerY);
    const delW = doc.getTextWidth('Prazo de Entrega: ');
    doc.setFont('helvetica', 'normal');
    doc.text(deliveryLabelParts.join(' '), margin + 3 + delW, footerY);
    footerY += 5;
  }

  if (order.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observações: ', margin + 3, footerY);
    const notW = doc.getTextWidth('Observações: ');
    doc.setFont('helvetica', 'normal');
    doc.text(order.notes, margin + 3 + notW, footerY);
    footerY += 5;
  }

  // Signature line
  const signY = y + footerBoxHeight - 6;

  if (isServiceOrder) {
    const colHalf = contentWidth / 2;
    // Left signature: Visto da Produção
    doc.line(margin + 8, signY, margin + colHalf - 8, signY);
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text('Visto da Produção / Expedição', margin + colHalf / 2, signY + 3.8, { align: 'center' });

    // Right signature: Recebido pelo Cliente
    doc.line(margin + colHalf + 8, signY, margin + contentWidth - 8, signY);
    doc.text('Recebido pelo Cliente / Data', margin + colHalf + colHalf / 2, signY + 3.8, { align: 'center' });
  } else {
    doc.line(margin + 50, signY, margin + contentWidth - 50, signY);
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Aprovação / Assinatura do Cliente', margin + contentWidth / 2, signY + 3.8, { align: 'center' });
  }

  // Filename suggestion
  const safeNumber = (order.orderNumber || '000000').padStart(6, '0');
  const filename = isServiceOrder
    ? `OS_${safeNumber}.pdf`
    : isOrcamento
    ? `Orcamento_${safeNumber}.pdf`
    : `Pedido_${safeNumber}.pdf`;

  return { doc, filename };
}

export function generateOrderPDF(options: GeneratePdfOptions): void {
  const { doc, filename } = buildOrderPdfDoc(options);
  doc.save(filename);
}

export function printOrderPDF(options: GeneratePdfOptions): void {
  const { doc, filename } = buildOrderPdfDoc(options);

  try {
    doc.autoPrint({ variant: 'non-conform' });
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    // Create hidden iframe to trigger browser print dialog
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
        console.warn('Iframe print failed, falling back to download:', err);
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

    // Fallback if onload doesn't fire (e.g. mobile Safari)
    setTimeout(() => {
      if (!printed) {
        triggerPrint();
      }
    }, 1200);
  } catch (err) {
    console.warn('Print order PDF exception, falling back to save:', err);
    doc.save(filename);
  }
}
