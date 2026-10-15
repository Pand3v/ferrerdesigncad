import React, { useState } from 'react';
import { Order, CompanySettings } from '../types';
import { centsToBRL, calculateItemUnitPrice } from '../utils/currency';
import { generateOrderPDF, printOrderPDF } from '../utils/pdfExport';
import { AlmaPrintLogo } from './AlmaPrintLogo';
import { Download, Printer, ArrowLeft, Edit3, CheckCircle2 } from 'lucide-react';

interface DocumentViewerProps {
  order: Order;
  companySettings?: CompanySettings;
  onBack: () => void;
  onEdit: (order: Order) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  order,
  companySettings,
  onBack,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'os'>('financial');
  const [printFeedback, setPrintFeedback] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Merge order's companySnapshot with active company settings so address/CNPJ updates reflect across all documents
  const activeCompany: Partial<CompanySettings> = {
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

  const isOrcamento = order.status === 'orcamento';

  const docTitle =
    activeTab === 'os'
      ? 'ORDEM DE SERVIÇO'
      : isOrcamento
      ? 'ORÇAMENTO'
      : 'PEDIDO';

  const handlePrint = (osMode: boolean) => {
    setActiveTab(osMode ? 'os' : 'financial');

    setPrintFeedback({
      type: 'info',
      text: `Iniciando impressão de ${osMode ? 'Ordem de Serviço (OS)' : 'Pedido/Orçamento'}...`,
    });

    // 1. Vector PDF auto-print engine via hidden iframe with blob
    printOrderPDF({ order, isServiceOrder: osMode, companySettings: activeCompany as CompanySettings });

    // 2. Also invoke native window.print() if supported in current browser environment
    try {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    } catch (e) {
      console.warn('Native window.print() suppressed or blocked by iframe:', e);
    }

    setPrintFeedback({
      type: 'success',
      text: `Impressão enviada com sucesso! Caso a caixa da impressora não tenha aberto automaticamente no seu aparelho, utilize o botão "Baixar PDF" para imprimir ou compartilhar pelo WhatsApp.`,
    });

    setTimeout(() => {
      setPrintFeedback(null);
    }, 7000);
  };

  const handleDownload = (osMode: boolean) => {
    generateOrderPDF({ order, isServiceOrder: osMode, companySettings: activeCompany as CompanySettings });
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Top Action Bar (Hidden during print) */}
      <div className="no-print bg-[#07281c]/75 backdrop-blur-xl p-4 sm:p-5 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 flex flex-wrap items-center justify-between gap-3 sm:gap-4 text-white w-full max-w-full">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            Voltar
          </button>
          <div className="h-5 sm:h-6 w-px bg-emerald-500/25 hidden xs:block" />
          <span className="text-xs sm:text-sm font-extrabold text-white font-mono">
            Documento Nº {order.orderNumber}
          </span>
          <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg border ${
            order.status === 'aprovado'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm shadow-emerald-500/10'
              : order.status === 'pedido_gerado'
              ? 'bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-sm shadow-purple-500/10'
              : order.status === 'orcamento'
              ? 'bg-amber-500/15 text-amber-300 border-amber-400/40'
              : order.status === 'concluido'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
              : order.status === 'em_producao'
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
              : 'bg-rose-500/10 text-rose-300/70 border-rose-500/30'
          }`}>
            {order.status === 'orcamento' && 'Orçamento'}
            {order.status === 'pedido_gerado' && 'Pedido Gerado (Criação de Arte)'}
            {order.status === 'aprovado' && 'Aprovado'}
            {order.status === 'em_producao' && 'Em Produção'}
            {order.status === 'concluido' && 'Concluído'}
            {order.status === 'cancelado' && 'Cancelado'}
          </span>
        </div>

        {/* Tab switch between Pedido and OS */}
        <div className="flex items-center gap-1 border border-emerald-500/30 p-1 bg-[#04160f]/80 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === 'financial'
                ? 'bg-emerald-500/25 text-white border border-emerald-400/40 shadow-xs'
                : 'text-emerald-200/70 hover:text-white'
            }`}
          >
            {isOrcamento ? 'Orçamento com Valores' : 'Pedido com Valores'}
          </button>
          <button
            onClick={() => setActiveTab('os')}
            className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === 'os'
                ? 'bg-cyan-500/25 text-white border border-cyan-400/40 shadow-xs'
                : 'text-cyan-200/70 hover:text-white'
            }`}
          >
            Ordem de Serviço (OS)
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {/* Print/Download Pedido */}
          <button
            onClick={() => handlePrint(false)}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            title="Imprimir Pedido / Orçamento na impressora"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Pedido
          </button>
          <button
            onClick={() => handleDownload(false)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 border border-white/15 transition-colors cursor-pointer"
            title="Baixar arquivo PDF com valores"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            PDF Pedido
          </button>

          <div className="h-6 w-px bg-emerald-500/25 mx-0.5 hidden sm:block" />

          {/* OS Buttons */}
          <button
            onClick={() => handlePrint(true)}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-cyan-500/25 hover:bg-cyan-500/35 text-white border border-cyan-400/50 transition-colors cursor-pointer shadow-sm shadow-cyan-500/20"
            title="Imprimir Ordem de Serviço na impressora"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-300" />
            Imprimir OS
          </button>
          <button
            onClick={() => handleDownload(true)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 transition-colors cursor-pointer"
            title="Baixar Ordem de Serviço em PDF"
          >
            <Download className="w-3.5 h-3.5 text-cyan-300" />
            PDF OS
          </button>

          <div className="h-6 w-px bg-emerald-500/25 mx-0.5 hidden sm:block" />

          <button
            onClick={() => onEdit(order)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Pedido
          </button>
        </div>
      </div>

      {/* Print status feedback toast */}
      {printFeedback && (
        <div
          className={`no-print p-3 sm:p-4 rounded-xl border flex items-start gap-2.5 backdrop-blur-md ${
            printFeedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-400/40 text-emerald-200'
              : 'bg-teal-950/60 border-teal-400/40 text-teal-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed font-medium">
            {printFeedback.text}
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW CONTAINER (Used for both screen review & window.print()) */}
      <div className="w-full max-w-full overflow-x-auto pb-4 print:overflow-visible print:pb-0">
        <div className="print-area max-w-[210mm] w-full min-w-0 mx-auto bg-white p-4 sm:p-8 md:p-10 rounded-2xl shadow-2xl shadow-black/60 text-black border border-neutral-200 print:max-w-none print:w-full print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none">
        {/* 1. HEADER (LOGO, CONTACTS, SERVICES) */}
        <div className="print-avoid-break flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-black">
          {/* Logo - Dark text on white paper */}
          <div className="shrink-0 flex items-center justify-center sm:justify-start">
            <AlmaPrintLogo
              customLogoUrl={activeCompany.logoUrl}
              height={58}
              variant="dark"
            />
          </div>

          {/* Contacts (WhatsApp, Instagram, Email) - Centralizado no espaço, mas linhas alinhadas à esquerda */}
          <div className="flex-1 flex justify-center w-full sm:w-auto">
            <div className="inline-flex flex-col items-start text-left text-xs space-y-1 font-medium text-neutral-800">
              <div className="flex items-center gap-1.5 text-left">
                <span className="font-bold text-black w-28 shrink-0 text-left">WhatsApp / Tel:</span>
                <span className="text-neutral-900 font-semibold">{activeCompany.phone || '19 9 9359-9923'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-left">
                <span className="font-bold text-black w-28 shrink-0 text-left">Instagram:</span>
                <span className="text-neutral-900">@{activeCompany.instagram?.replace('@', '') || 'almaprint.grafica'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-left">
                <span className="font-bold text-black w-28 shrink-0 text-left">E-mail:</span>
                <span className="text-neutral-900">{activeCompany.email || 'contato@almaprintgrafica.com.br'}</span>
              </div>
            </div>
          </div>

          {/* Services list */}
          <div className="border-l border-neutral-300 pl-4 hidden sm:block text-right shrink-0">
            <div className="text-[11px] font-black tracking-widest text-neutral-800 leading-tight whitespace-pre-line uppercase">
              {activeCompany.headerServices || 'OFFSET\nDIGITAL\nEMBALAGENS\nBRINDES\nSIGN'}
            </div>
          </div>
        </div>

        {/* 2. CONTRATO DE PRESTAÇÃO DE SERVIÇO & IDENTIFICAÇÃO DO DOCUMENTO */}
        <div className="print-avoid-break mt-3 border border-black overflow-hidden">
          <div className="bg-[#E60045] text-white text-center py-1.5 px-3 font-extrabold text-sm tracking-wider uppercase">
            {activeTab === 'os'
              ? 'ORDEM DE SERVIÇO — VIA DE PRODUÇÃO'
              : 'CONTRATO DE PRESTAÇÃO DE SERVIÇO'}
          </div>

          {/* Desktop & Print Layout (3 colunas clássicas) */}
          <div className="hidden sm:grid sm:grid-cols-12 print:!grid print:!grid-cols-12 border-t border-black text-center text-sm font-bold divide-x divide-black bg-white">
            <div className="sm:col-span-3 print:!col-span-3 py-2 px-3 flex items-center justify-center text-xs sm:text-sm font-medium whitespace-nowrap bg-neutral-50/40">
              <span className="font-bold mr-1">Data:</span> {order.date}
            </div>
            <div className="sm:col-span-6 print:!col-span-6 py-2 px-3 flex items-center justify-center text-sm sm:text-base font-extrabold tracking-widest uppercase">
              {docTitle}
            </div>
            <div className="sm:col-span-3 print:!col-span-3 py-2 px-3 flex items-center justify-center bg-amber-50/70 whitespace-nowrap">
              <span className="text-xs mr-1 text-neutral-600 font-bold">Nº</span>
              <span className="text-base font-black text-black">{order.orderNumber}</span>
            </div>
          </div>

          {/* Mobile Layout (2 linhas perfeitamente responsivas que nunca ultrapassam as bordas do formulário) */}
          <div className="sm:hidden print:!hidden border-t border-black bg-white">
            <div className="py-2 px-3 text-center text-sm font-extrabold tracking-wider uppercase border-b border-black bg-neutral-50/60">
              {docTitle}
            </div>
            <div className="grid grid-cols-2 divide-x divide-black text-xs font-bold">
              <div className="py-2 px-2.5 flex items-center justify-center font-medium bg-neutral-50/30">
                <span className="font-bold mr-1">Data:</span>
                <span className="whitespace-nowrap">{order.date}</span>
              </div>
              <div className="py-2 px-2.5 flex items-center justify-center bg-amber-50/70">
                <span className="text-xs mr-1 text-neutral-600 font-bold">Nº</span>
                <span className="text-sm font-black text-black">{order.orderNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. CONTRATADA (Company info) */}
        <div className="print-avoid-break mt-3 border border-black">
          <div className="bg-neutral-100 border-b border-black py-1 px-3 text-center text-xs font-extrabold tracking-wider uppercase">
            CONTRATADA
          </div>
          <div className="p-2.5 sm:p-3 text-xs leading-relaxed space-y-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8">
                <span className="font-bold">Razão Social: </span>
                <span>{activeCompany.legalName || 'ALMA NEGÓCIOS E SERVIÇOS LTDA'}</span>
              </div>
              <div className="sm:col-span-4">
                <span className="font-bold">CNPJ/CPF: </span>
                <span>{activeCompany.cnpj || '65.349.937/0001-12'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8">
                <span className="font-bold">Endereço: </span>
                <span>{activeCompany.address || 'Rua Regente Feijó, 484 - Centro'}</span>
              </div>
              <div className="sm:col-span-4">
                <span className="font-bold">Unidade: </span>
                <span>{activeCompany.unit || 'Campinas - SP'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-4">
                <span className="font-bold">CEP: </span>
                <span>{activeCompany.zipCode || '13013-051'}</span>
              </div>
              <div className="sm:col-span-4">
                <span className="font-bold">Cidade: </span>
                <span>{activeCompany.city || 'Campinas'}</span>
              </div>
              <div className="sm:col-span-4">
                <span className="font-bold">Estado: </span>
                <span>{activeCompany.state || 'SP'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. DADOS DO CONTRATANTE (Client info) */}
        <div className="print-avoid-break mt-3 border border-black">
          <div className="bg-neutral-100 border-b border-black py-1 px-3 text-center text-xs font-extrabold tracking-wider uppercase">
            DADOS DO CONTRATANTE
          </div>
          <div className="p-2.5 sm:p-3 text-xs leading-relaxed space-y-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8">
                <span className="font-bold">Razão Social / Nome: </span>
                <span className="font-semibold">{order.clientSnapshot?.name || 'Cliente não informado'}</span>
              </div>
              <div className="sm:col-span-4">
                <span className="font-bold">CPF/CNPJ: </span>
                <span>{order.clientSnapshot?.cpfCnpj || '-'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <span className="font-bold">Contato: </span>
                <span>{order.clientSnapshot?.contactPerson || '-'}</span>
              </div>
              <div className="sm:col-span-6">
                <span className="font-bold">Telefone: </span>
                <span>{order.clientSnapshot?.phone || '-'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8">
                <span className="font-bold">Endereço: </span>
                <span>{order.clientSnapshot?.address || '-'}</span>
              </div>
              <div className="sm:col-span-4">
                <span className="font-bold">Cidade / UF: </span>
                <span>
                  {order.clientSnapshot?.city || '-'}
                  {order.clientSnapshot?.state ? ` - ${order.clientSnapshot.state}` : ''}
                </span>
              </div>
            </div>
            {order.clientSnapshot?.email && (
              <div>
                <span className="font-bold">E-mail: </span>
                <span>{order.clientSnapshot.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* 6. TABELA DE ITENS */}
        <div className="print-avoid-break mt-3 border border-black">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100 border-b border-black text-center font-extrabold">
                <th className="py-1.5 px-3 border-r border-black w-20 text-center uppercase">
                  Qtde
                </th>
                <th className="py-1.5 px-3 border-r border-black text-left uppercase">
                  Descrição dos Serviços {activeTab === 'os' ? '& Especificações Técnicas' : ''}
                </th>
                {/* Financial columns: only shown in Pedido/Orçamento */}
                {activeTab === 'financial' && (
                  <>
                    <th className="py-1.5 px-3 border-r border-black w-24 text-right uppercase">
                      Valor Unit.
                    </th>
                    <th className="py-1.5 px-3 w-28 text-right uppercase">
                      Valor do item
                    </th>
                  </>
                )}
                {/* OS Production Check Column */}
                {activeTab === 'os' && (
                  <th className="py-1.5 px-3 w-28 text-center uppercase">
                    Conferência
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  className="border-b border-neutral-300 last:border-b-0 align-top"
                >
                  <td className="py-2.5 px-3 border-r border-black text-center font-semibold">
                    {item.quantity || '-'}
                  </td>
                  <td className="py-2.5 px-3 border-r border-black leading-relaxed whitespace-pre-wrap font-normal">
                    {item.description}
                  </td>
                  {/* Financial columns */}
                  {activeTab === 'financial' && (
                    <>
                      <td className="py-2.5 px-3 border-r border-black text-right font-medium text-neutral-800 whitespace-nowrap">
                        {calculateItemUnitPrice(item.totalItemCents, item.quantity)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                        {centsToBRL(item.totalItemCents)}
                      </td>
                    </>
                  )}
                  {/* OS Production Check Column */}
                  {activeTab === 'os' && (
                    <td className="py-2.5 px-3 text-center text-[11px] text-neutral-500 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-black inline-block rounded-xs"></span>
                        <span className="text-[10px] uppercase font-semibold text-neutral-700">OK</span>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {/* TOTAL GERAL (ONLY IN PEDIDO/ORÇAMENTO) */}
            {activeTab === 'financial' && (
              <tfoot>
                <tr className="border-t-2 border-black bg-neutral-50 font-extrabold text-sm">
                  <td
                    colSpan={3}
                    className="py-2.5 px-4 text-right border-r border-black uppercase tracking-wider"
                  >
                    Total Geral
                  </td>
                  <td className="py-2.5 px-3 text-right text-base font-black">
                    {centsToBRL(order.totalGeneralCents)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* 7. PRAZO E FORMAS DE PAGAMENTO / ESPECIFICAÇÕES */}
        <div className="print-avoid-break mt-3 border border-black">
          <div className="bg-neutral-100 border-b border-black py-1 px-3 text-center text-xs font-extrabold tracking-wider uppercase">
            {activeTab === 'financial'
              ? 'PRAZO E FORMAS DE PAGAMENTO'
              : 'PRAZO E ESPECIFICAÇÕES DE PRODUÇÃO'}
          </div>
          <div className="p-3 text-xs leading-relaxed space-y-2">
            {/* Financial terms: only in Pedido/Orçamento */}
            {activeTab === 'financial' && (
              <div>
                <span className="font-bold">Pagamento: </span>
                <span>{order.paymentTerms || 'A combinar'}</span>
              </div>
            )}

            <div>
              <span className="font-bold">Prazo / Entrega: </span>
              <span>{order.deliveryTime || 'A combinar'}</span>
              {order.deliveryDate && (
                <span className="ml-2 font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300 inline-block text-[11px]">
                  Data Prevista de Entrega: {order.deliveryDate}
                </span>
              )}
            </div>

            {order.notes && (
              <div>
                <span className="font-bold">{activeTab === 'os' ? 'Observações Técnicas / Acabamento: ' : 'Observações: '}</span>
                <span className="whitespace-pre-wrap">{order.notes}</span>
              </div>
            )}

            {/* Signature space */}
            {activeTab === 'os' ? (
              <div className="pt-7 pb-2 grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="w-5/6 mx-auto border-t border-black pt-1">
                    <span className="text-[11px] font-semibold text-neutral-700 block">
                      Visto da Produção / Expedição
                    </span>
                  </div>
                </div>
                <div>
                  <div className="w-5/6 mx-auto border-t border-black pt-1">
                    <span className="text-[11px] font-semibold text-neutral-700 block">
                      Recebido pelo Cliente / Data
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-7 pb-2 text-center">
                <div className="w-72 mx-auto border-t border-black pt-1">
                  <span className="text-[11px] font-semibold text-neutral-700">
                    Aprovação / Assinatura do Cliente
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 8. RECIBO (ONLY IN PEDIDO WITH VALUES IF NOT OS) */}
        {activeTab === 'financial' && (
          <div className="print-avoid-break mt-3 border border-black p-3 bg-neutral-50/40 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold">RECIBO: </span>
                <span>Recebemos a quantia de: </span>
                <span className="font-extrabold underline ml-1">
                  {centsToBRL(order.totalGeneralCents)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full sm:w-auto text-xs">
                <div className="whitespace-nowrap">
                  <span className="font-bold">Data: </span>
                  <span>____ / ____ / ________</span>
                </div>
                <div className="whitespace-nowrap">
                  <span className="font-bold">Assinatura: </span>
                  <span>____________________</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
