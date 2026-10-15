import React, { useState, useEffect, useMemo } from 'react';
import {
  Order,
  OrderItem,
  Client,
  CompanySettings,
  OrderStatus,
  ClientSnapshot,
} from '../types';
import {
  centsToBRL,
  parseBRLToCents,
  centsToBRLNumber,
  getTodayDateBR,
  formatCpfCnpj,
  formatPhone,
  calculateItemUnitPrice,
} from '../utils/currency';
import {
  addDaysToDate,
  calculateDeliveryTimeline,
  formatDateToISO,
  formatDateToBR,
  parseDateFlexible,
} from '../utils/dateUtils';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  ArrowLeft,
  UserPlus,
  Search,
  Building,
  AlertCircle,
  CheckCircle,
  FileText,
  RotateCcw,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';

interface OrderFormProps {
  orderToEdit?: Order | null;
  defaultClient?: Client | null;
  clients: Client[];
  companySettings: CompanySettings;
  currentUserEmail: string;
  onSave: (order: Partial<Order>) => Promise<Order | void>;
  onCancel: () => void;
  onQuickCreateClient: (clientData: Partial<Client>) => Promise<Client>;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  orderToEdit,
  defaultClient,
  clients,
  companySettings,
  currentUserEmail,
  onSave,
  onCancel,
  onQuickCreateClient,
}) => {
  const isEditing = Boolean(orderToEdit);

  // Form State
  const [orderNumber, setOrderNumber] = useState(
    orderToEdit?.orderNumber || String(companySettings.nextOrderNumber || 8579)
  );
  const initialDate = orderToEdit?.date || getTodayDateBR();
  const [date, setDate] = useState(initialDate);
  const [deliveryDate, setDeliveryDate] = useState(
    orderToEdit?.deliveryDate || addDaysToDate(initialDate, 30)
  );
  const [status, setStatus] = useState<OrderStatus>(orderToEdit?.status || 'orcamento');

  // Client Selection & Snapshot
  const [selectedClientId, setSelectedClientId] = useState<string>(
    orderToEdit?.clientId || defaultClient?.id || ''
  );
  const [clientSnapshot, setClientSnapshot] = useState<ClientSnapshot>(
    orderToEdit?.clientSnapshot || {
      name: defaultClient?.name || '',
      cpfCnpj: defaultClient?.cpfCnpj || '',
      contactPerson: defaultClient?.contactPerson || '',
      phone: defaultClient?.phone || '',
      email: defaultClient?.email || '',
      address: defaultClient?.address || '',
      zipCode: defaultClient?.zipCode || '',
      city: defaultClient?.city || '',
      state: defaultClient?.state || '',
    }
  );

  // Company snapshot for this order
  const [companySnapshot, setCompanySnapshot] = useState<CompanySettings>(
    orderToEdit?.companySnapshot || companySettings
  );

  // Items
  const [items, setItems] = useState<OrderItem[]>(
    orderToEdit?.items?.length
      ? orderToEdit.items
      : [
          {
            id: 'item-1',
            quantity: '1.000',
            description:
              'Sacola 42cm(L) x 36cm(A) x 14cm(P), vertical\nPapel Offset 240g\nImpressão Sistema Offset Colorido\nReforço no fundo\nSEM furos p/ passar fitas p/ laços (Passafita)\nCordão de Gorgurão Marrom\nFrete incluso',
            totalItemCents: 450000,
          },
        ]
  );

  // Terms and observations
  const [paymentTerms, setPaymentTerms] = useState(
    orderToEdit?.paymentTerms ?? 'Link pagto - 5x'
  );
  const [pixKey, setPixKey] = useState(
    orderToEdit?.pixKey ?? companySettings.pixKey
  );
  const [deliveryTime, setDeliveryTime] = useState(
    orderToEdit?.deliveryTime ?? '20 a 40 dias corridos'
  );
  const [notes, setNotes] = useState(orderToEdit?.notes ?? '');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [quickClientModalOpen, setQuickClientModalOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientCpf, setQuickClientCpf] = useState('');
  const [quickClientContact, setQuickClientContact] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');
  const [quickClientCity, setQuickClientCity] = useState('');
  const [quickClientAddress, setQuickClientAddress] = useState('');

  // Total General = Strict sum of items' values (no multiplication by quantity!)
  const totalGeneralCents = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.totalItemCents || 0), 0);
  }, [items]);

  // Handle client selection change
  const handleClientSelect = (clientId: string) => {
    setIsDirty(true);
    setSelectedClientId(clientId);
    const found = clients.find(c => c.id === clientId);
    if (found) {
      setClientSnapshot({
        name: found.name || '',
        cpfCnpj: found.cpfCnpj || '',
        contactPerson: found.contactPerson || '',
        phone: found.phone || '',
        email: found.email || '',
        address: found.address || '',
        zipCode: found.zipCode || '',
        city: found.city || '',
        state: found.state || '',
      });
    }
  };

  // Add Item
  const handleAddItem = () => {
    setIsDirty(true);
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        quantity: '1',
        description: '',
        totalItemCents: 0,
      },
    ]);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('O pedido deve conter pelo menos um item.');
      return;
    }
    setIsDirty(true);
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Move item up / down
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    setIsDirty(true);
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setItems(newItems);
  };

  // Update item field
  const handleItemFieldChange = (
    index: number,
    field: keyof OrderItem,
    value: string | number
  ) => {
    setIsDirty(true);
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Quick Client creation modal submit
  const handleQuickClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }

    try {
      const newClient = await onQuickCreateClient({
        name: quickClientName.trim(),
        cpfCnpj: quickClientCpf.trim(),
        contactPerson: quickClientContact.trim(),
        phone: quickClientPhone.trim(),
        city: quickClientCity.trim(),
        address: quickClientAddress.trim(),
        createdBy: currentUserEmail,
        updatedBy: currentUserEmail,
      });

      setSelectedClientId(newClient.id);
      setClientSnapshot({
        name: newClient.name,
        cpfCnpj: newClient.cpfCnpj || '',
        contactPerson: newClient.contactPerson || '',
        phone: newClient.phone || '',
        email: newClient.email || '',
        address: newClient.address || '',
        zipCode: newClient.zipCode || '',
        city: newClient.city || '',
        state: newClient.state || '',
      });
      setQuickClientModalOpen(false);
      setQuickClientName('');
      setQuickClientCpf('');
      setQuickClientContact('');
      setQuickClientPhone('');
      setQuickClientCity('');
      setQuickClientAddress('');
      setIsDirty(true);
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar cliente.');
    }
  };

  // Submit order
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientSnapshot.name.trim()) {
      alert('Por favor, informe ou selecione o cliente do pedido.');
      return;
    }

    if (items.length === 0) {
      alert('Adicione pelo menos um item ao pedido.');
      return;
    }

    // Validate that items have descriptions
    const emptyDesc = items.some(it => !it.description.trim());
    if (emptyDesc) {
      if (!confirm('Algum item está sem descrição. Deseja salvar assim mesmo?')) {
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const parsedNum = parseInt(orderNumber.replace(/\D/g, ''), 10) || 0;

      const orderData: Partial<Order> = {
        ...(orderToEdit ? { id: orderToEdit.id } : {}),
        orderNumber: String(orderNumber).trim(),
        orderNumberInt: parsedNum,
        date: date.trim(),
        status,
        clientId: selectedClientId || undefined,
        clientSnapshot,
        companySnapshot,
        items,
        totalGeneralCents,
        paymentTerms: paymentTerms.trim(),
        pixKey: pixKey.trim(),
        deliveryTime: deliveryTime.trim(),
        deliveryDate: deliveryDate.trim(),
        notes: notes.trim(),
        version: (orderToEdit?.version || 0) + 1,
        updatedBy: currentUserEmail,
        ...(orderToEdit ? {} : { createdBy: currentUserEmail }),
      };

      await onSave(orderData);
      setIsDirty(false);
    } catch (err: any) {
      console.error(err);
      alert(
        err?.message ||
          'Erro ao salvar o pedido. Verifique a conexão com o banco de dados.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      if (!confirm('Você tem alterações não salvas. Deseja realmente sair e descartar?')) {
        return;
      }
    }
    onCancel();
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Header bar */}
      <div className="bg-[#07281c]/70 backdrop-blur-xl p-4 sm:p-5 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 flex flex-wrap items-center justify-between gap-3 sm:gap-4 w-full max-w-full">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleCancelClick}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            Voltar
          </button>
          <div className="h-5 sm:h-6 w-px bg-emerald-500/25 hidden xs:block" />
          <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2 sm:gap-2.5">
            <div className="p-1 sm:p-1.5 bg-emerald-500/20 rounded-lg text-emerald-300">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            {isEditing ? `Editar Pedido Nº ${orderNumber}` : 'Novo Pedido / Orçamento'}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/15 text-emerald-100 text-xs font-semibold rounded-xl border border-white/15 transition-colors cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Salvando...' : 'Salvar Pedido'}
          </button>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-6 w-full max-w-full">
        {/* TOP SECTION: NUMBER, DATE, STATUS */}
        <div className="bg-[#062419]/60 backdrop-blur-xl p-4 sm:p-6 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40">
          <div className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider pb-3 border-b border-emerald-500/20 mb-4 flex items-center justify-between">
            <span>Dados Gerais do Pedido</span>
            {orderToEdit && (
              <span className="text-[11px] font-normal text-emerald-300/70 lowercase">
                criado por: {orderToEdit.createdBy} &bull; v{orderToEdit.version || 1}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="min-w-0">
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Número do Pedido / Orçamento <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={e => {
                  setIsDirty(true);
                  setOrderNumber(e.target.value);
                }}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-emerald-300 font-mono font-bold text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
                placeholder="Ex: 8578"
              />
              <p className="text-[10px] text-emerald-300/60 mt-1">
                Numeração sequencial automática.
              </p>
            </div>

            <div className="min-w-0">
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Data do Registro <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={date}
                onChange={e => {
                  setIsDirty(true);
                  const newDate = e.target.value;
                  setDate(newDate);
                  // Auto-update delivery date if user is creating new order
                  if (!orderToEdit && newDate.length >= 10) {
                    setDeliveryDate(addDaysToDate(newDate, 30));
                  }
                }}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs font-semibold outline-none focus:border-emerald-400 transition-all"
                placeholder="DD/MM/AAAA"
              />
              <p className="text-[10px] text-emerald-300/60 mt-1">
                Data do orçamento/pedido ({getTodayDateBR()}).
              </p>
            </div>

            {/* DATA DE ENTREGA (NOVO CAMPO COM +30 DIAS PADRÃO) */}
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-emerald-100 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Data de Entrega</span>
                  <span className="text-emerald-400 font-bold">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={deliveryDate}
                  onChange={e => {
                    setIsDirty(true);
                    setDeliveryDate(e.target.value);
                  }}
                  className="w-full p-2.5 pr-9 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-400"
                  placeholder="DD/MM/AAAA"
                />
                {/* Native date picker trigger overlay */}
                <input
                  type="date"
                  value={formatDateToISO(deliveryDate)}
                  onChange={e => {
                    if (e.target.value) {
                      setIsDirty(true);
                      setDeliveryDate(formatDateToBR(e.target.value));
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 opacity-60 hover:opacity-100 cursor-pointer bg-transparent"
                  title="Abrir calendário"
                />
              </div>

              {/* Quick shortcut buttons (+15d, +30d padrão, +45d) */}
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsDirty(true);
                    setDeliveryDate(addDaysToDate(date, 15));
                  }}
                  className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 rounded cursor-pointer"
                  title="Definir para 15 dias da data de registro"
                >
                  +15d
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDirty(true);
                    setDeliveryDate(addDaysToDate(date, 30));
                  }}
                  className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/25 hover:bg-emerald-500/35 text-white border border-emerald-400/40 rounded cursor-pointer shadow-xs"
                  title="Padrão: 30 dias a contar do registro"
                >
                  +30d (Padrão)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDirty(true);
                    setDeliveryDate(addDaysToDate(date, 45));
                  }}
                  className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 rounded cursor-pointer"
                  title="Definir para 45 dias da data de registro"
                >
                  +45d
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Status do Documento
              </label>
              <select
                value={status}
                onChange={e => {
                  setIsDirty(true);
                  setStatus(e.target.value as OrderStatus);
                }}
                className="w-full p-2.5 bg-[#04160f] border border-emerald-500/30 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="orcamento" className="bg-[#04160f] text-amber-300">Orçamento (Inicial)</option>
                <option value="pedido_gerado" className="bg-[#04160f] text-purple-300">Pedido Gerado (Criação de Arte)</option>
                <option value="aprovado" className="bg-[#04160f] text-emerald-400">Aprovado (Gera OS)</option>
                <option value="em_producao" className="bg-[#04160f] text-indigo-300">Em Produção (Gera OS)</option>
                <option value="concluido" className="bg-[#04160f] text-cyan-300">Concluído (Gera OS)</option>
                <option value="cancelado" className="bg-[#04160f] text-rose-300">Cancelado</option>
              </select>
              <p className="text-[10px] text-emerald-300/60 mt-1">
                OS liberada em Pedido Gerado, Aprovado, Em Produção ou Concluído.
              </p>
            </div>
          </div>
        </div>

        {/* CLIENT SECTION: SELECTION & SNAPSHOT */}
        <div className="bg-[#062419]/60 backdrop-blur-xl p-4 sm:p-6 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-emerald-500/20 mb-4 gap-2">
            <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
              Dados do Contratante (Cliente)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuickClientModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Cadastrar Novo Cliente
              </button>
            </div>
          </div>

          {/* Quick Select from existing clients */}
          <div className="mb-4">
            <label className="block font-semibold text-emerald-100 text-xs mb-1.5">
              Vincular a um cliente já cadastrado (preenchimento automático):
            </label>
            <select
              value={selectedClientId}
              onChange={e => handleClientSelect(e.target.value)}
              className="w-full p-2.5 bg-[#04160f] border border-emerald-500/30 rounded-xl text-white text-xs outline-none focus:border-emerald-400 font-medium cursor-pointer"
            >
              <option value="" className="bg-[#04160f] text-emerald-300/60">-- Selecione um cliente da lista ou preencha abaixo --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id} className="bg-[#04160f] text-white">
                  {c.name} {c.cpfCnpj ? `(${c.cpfCnpj})` : ''} {c.city ? `- ${c.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Snapshot editable fields */}
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-emerald-100 mb-1.5">
                  Razão Social ou Nome do Cliente <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientSnapshot.name}
                  onChange={e => {
                    setIsDirty(true);
                    setClientSnapshot({ ...clientSnapshot, name: e.target.value });
                  }}
                  placeholder="Ex: Cavorella Shoes"
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white font-semibold text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-emerald-100 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  CPF ou CNPJ
                </label>
                <input
                  type="text"
                  value={clientSnapshot.cpfCnpj || ''}
                  onChange={e => {
                    setIsDirty(true);
                    setClientSnapshot({
                      ...clientSnapshot,
                      cpfCnpj: formatCpfCnpj(e.target.value),
                    });
                  }}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white font-mono text-xs outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-emerald-100 mb-1.5">
                  Pessoa de Contato
                </label>
                <input
                  type="text"
                  value={clientSnapshot.contactPerson || ''}
                  onChange={e => {
                    setIsDirty(true);
                    setClientSnapshot({
                      ...clientSnapshot,
                      contactPerson: e.target.value,
                    });
                  }}
                  placeholder="Ex: Camila Bonvechio"
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-emerald-100 mb-1.5">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={clientSnapshot.phone || ''}
                  onChange={e => {
                    setIsDirty(true);
                    setClientSnapshot({
                      ...clientSnapshot,
                      phone: formatPhone(e.target.value),
                    });
                  }}
                  placeholder="(19) 99999-9999"
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-6">
                <label className="block font-semibold text-emerald-100 mb-1.5">
                  Endereço
                </label>
                <input
                  type="text"
                  value={clientSnapshot.address || ''}
                  onChange={e => {
                    setIsDirty(true);
                    setClientSnapshot({
                      ...clientSnapshot,
                      address: e.target.value,
                    });
                  }}
                  placeholder="Ex: Av. da Emancipação, 3770 - Centro Metropolitano"
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block font-semibold text-emerald-100 mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  value={clientSnapshot.city || ''}
                  onChange={e => {
                    setIsDirty(true);
                    setClientSnapshot({
                      ...clientSnapshot,
                      city: e.target.value,
                    });
                  }}
                  placeholder="Hortolândia"
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-emerald-100 mb-1.5">
                  Estado
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={clientSnapshot.state || ''}
                  onChange={e => {
                    setIsDirty(true);
                    setClientSnapshot({
                      ...clientSnapshot,
                      state: e.target.value.toUpperCase(),
                    });
                  }}
                  placeholder="SP"
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs uppercase outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ITEMS SECTION — CRITICAL: NO UNIT VALUE, NO MULTIPLICATION BY QUANTITY */}
        <div className="bg-[#062419]/60 backdrop-blur-xl p-4 sm:p-6 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-emerald-500/20 mb-4 gap-2">
            <div>
              <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                Itens do Pedido (Entrada Manual)
              </span>
              <p className="text-[11px] text-emerald-200/70 mt-0.5">
                Não há multiplicação por quantidade. Digite a quantidade, a especificação livre e o <strong>Valor do item</strong> final.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-4 border border-emerald-500/25 bg-[#04160f]/75 rounded-2xl relative space-y-3 shadow-inner"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-emerald-500/20">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-md text-[11px]">
                      Item #{index + 1}
                    </span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveItem(index, 'up')}
                      className="p-1.5 text-emerald-300/70 hover:text-white hover:bg-emerald-500/20 rounded-md disabled:opacity-30 cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => handleMoveItem(index, 'down')}
                      className="p-1.5 text-emerald-300/70 hover:text-white hover:bg-emerald-500/20 rounded-md disabled:opacity-30 cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-rose-300/70 hover:text-rose-200 hover:bg-rose-500/20 rounded-md ml-2 cursor-pointer transition-colors"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 text-xs">
                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-emerald-100 mb-1">
                      Qtde
                    </label>
                    <input
                      type="text"
                      value={item.quantity}
                      onChange={e =>
                        handleItemFieldChange(index, 'quantity', e.target.value)
                      }
                      placeholder="Ex: 1.000"
                      className="w-full p-2.5 bg-[#04160f] border border-emerald-500/30 rounded-xl text-white text-xs font-semibold outline-none focus:border-emerald-400"
                    />
                  </div>

                  {/* Multiline description */}
                  <div className="sm:col-span-7">
                    <label className="block font-semibold text-emerald-100 mb-1">
                      Descrição dos Serviços (várias linhas permitidas)
                    </label>
                    <textarea
                      rows={4}
                      value={item.description}
                      onChange={e =>
                        handleItemFieldChange(index, 'description', e.target.value)
                      }
                      placeholder="Ex: Sacola 42cm(L) x 36cm(A) x 14cm(P), vertical&#10;Papel Offset 240g&#10;Impressão Sistema Offset Colorido&#10;Reforço no fundo&#10;Cordão de Gorgurão Marrom"
                      className="w-full p-2.5 bg-[#04160f] border border-emerald-500/30 rounded-xl text-white text-xs font-sans outline-none focus:border-emerald-400 leading-relaxed"
                    />
                  </div>

                  {/* Manual Total Item Value */}
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-emerald-100 mb-1">
                      Valor do item (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-400">
                        R$
                      </span>
                      <input
                        type="text"
                        value={centsToBRLNumber(item.totalItemCents)}
                        onChange={e => {
                          const cents = parseBRLToCents(e.target.value);
                          handleItemFieldChange(index, 'totalItemCents', cents);
                        }}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2.5 bg-[#04160f] border border-emerald-500/40 rounded-xl text-right font-mono font-bold text-white text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    <div className="mt-1.5 p-1.5 bg-[#03150d] rounded-lg border border-emerald-500/20 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-300/80 font-medium">Valor Unit.:</span>
                      <span className="font-mono font-bold text-emerald-200">
                        {calculateItemUnitPrice(item.totalItemCents, item.quantity)}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-300/60 mt-1 text-right">
                      Valor final digitado manualmente.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* TOTAL GERAL SUMMARY BAR */}
          <div className="mt-4 sm:mt-5 p-4 sm:p-5 border border-emerald-400/40 bg-gradient-to-r from-emerald-950/80 via-[#073322] to-teal-950/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                TOTAL GERAL DO PEDIDO
              </span>
              <p className="text-[11px] text-emerald-200/70 mt-0.5">
                Soma automática dos valores totais dos itens acima.
              </p>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {centsToBRL(totalGeneralCents)}
              </span>
            </div>
          </div>
        </div>

        {/* PAYMENT TERMS & TIMELINE */}
        <div className="bg-[#062419]/60 backdrop-blur-xl p-4 sm:p-6 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 space-y-4 text-xs">
          <div className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider pb-3 border-b border-emerald-500/20">
            Prazo, Condições de Pagamento e Observações
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Forma / Condições de Pagamento
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={e => {
                  setIsDirty(true);
                  setPaymentTerms(e.target.value);
                }}
                placeholder="Ex: Link pagto - 5x / 50% entrada e 50% na entrega"
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Chave Pix
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={e => {
                  setIsDirty(true);
                  setPixKey(e.target.value);
                }}
                placeholder="Ex: 52.917.006/0001-21"
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Prazo de Entrega (descrição impressa)
              </label>
              <input
                type="text"
                value={deliveryTime}
                onChange={e => {
                  setIsDirty(true);
                  setDeliveryTime(e.target.value);
                }}
                placeholder="Ex: 30 dias corridos / 20 dias úteis"
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5 flex items-center justify-between">
                <span>Data de Entrega Prevista</span>
                <span className="text-[10px] text-emerald-300/80 font-normal">
                  +30 dias padrão do registro
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={deliveryDate}
                  onChange={e => {
                    setIsDirty(true);
                    setDeliveryDate(e.target.value);
                  }}
                  placeholder="DD/MM/AAAA"
                  className="w-full p-2.5 pr-8 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs font-bold outline-none focus:border-emerald-400"
                />
                <input
                  type="date"
                  value={formatDateToISO(deliveryDate)}
                  onChange={e => {
                    if (e.target.value) {
                      setIsDirty(true);
                      setDeliveryDate(formatDateToBR(e.target.value));
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 opacity-60 hover:opacity-100 cursor-pointer bg-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-emerald-100 mb-1.5">
              Observações Gerais
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => {
                setIsDirty(true);
                setNotes(e.target.value);
              }}
              placeholder="Ex: Especificações de acabamento, local de descarga, contatos de transporte..."
              className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white text-xs outline-none focus:border-emerald-400 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="bg-[#07281c]/70 backdrop-blur-xl p-5 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-emerald-100 text-xs font-semibold rounded-xl border border-white/15 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-emerald-200/80">
              Total Geral: <span className="font-mono text-white font-bold text-base ml-1">{centsToBRL(totalGeneralCents)}</span>
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : 'Salvar Pedido'}
            </button>
          </div>
        </div>
      </form>

      {/* QUICK CLIENT MODAL */}
      {quickClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md overflow-y-auto p-4">
          <div className="min-h-full flex items-center justify-center py-4">
            <div className="bg-[#062419]/95 border border-emerald-500/30 max-w-md w-full p-7 rounded-3xl shadow-2xl shadow-black/80 relative text-white">
              <h3 className="text-sm font-extrabold text-white pb-3 border-b border-emerald-500/20 mb-3 flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-300">
                  <UserPlus className="w-4 h-4" />
                </div>
                Cadastrar Cliente Rapidamente
              </h3>
              <p className="text-xs text-emerald-200/70 mb-4">
                Os dados já preenchidos no formulário do pedido não serão perdidos.
              </p>

              <form onSubmit={handleQuickClientSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-emerald-100 mb-1.5">
                    Nome ou Razão Social <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickClientName}
                    onChange={e => setQuickClientName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-emerald-100 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      CPF ou CNPJ
                    </label>
                    <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {quickClientCpf.replace(/\D/g, '').length > 11
                        ? 'CNPJ'
                        : quickClientCpf.replace(/\D/g, '').length > 0
                        ? 'CPF'
                        : 'Opcional'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={quickClientCpf}
                    onChange={e => setQuickClientCpf(formatCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white font-mono outline-none focus:border-emerald-400"
                  />
                </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-emerald-100 mb-1.5">
                    Contato
                  </label>
                  <input
                    type="text"
                    value={quickClientContact}
                    onChange={e => setQuickClientContact(e.target.value)}
                    placeholder="Nome do contato"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-100 mb-1.5">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={quickClientPhone}
                    onChange={e => setQuickClientPhone(formatPhone(e.target.value))}
                    placeholder="(19) 99999-9999"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-100 mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  value={quickClientCity}
                  onChange={e => setQuickClientCity(e.target.value)}
                  placeholder="Cidade"
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-500/20 mt-4">
                <button
                  type="button"
                  onClick={() => setQuickClientModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-emerald-100 rounded-xl text-xs font-semibold cursor-pointer border border-white/15 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  Salvar e Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
