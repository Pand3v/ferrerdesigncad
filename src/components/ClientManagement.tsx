import React, { useState } from 'react';
import { Client, Order } from '../types';
import { formatCpfCnpj, formatPhone, formatCEP, centsToBRL } from '../utils/currency';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  History,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Check,
  Building,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  FileText,
} from 'lucide-react';

interface ClientManagementProps {
  clients: Client[];
  orders: Order[];
  currentUserEmail: string;
  onSaveClient: (clientData: Partial<Client>) => Promise<Client | void>;
  onDeleteClient: (clientId: string) => Promise<void>;
  onViewOrder: (order: Order) => void;
  onCreateOrderForClient: (client: Client) => void;
}

export const ClientManagement: React.FC<ClientManagementProps> = ({
  clients,
  orders,
  currentUserEmail,
  onSaveClient,
  onDeleteClient,
  onViewOrder,
  onCreateOrderForClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteClient(clientToDelete.id);
      const name = clientToDelete.name;
      setClientToDelete(null);
      setFeedbackToast({ type: 'success', text: `Cliente "${name}" excluído com sucesso.` });
      setTimeout(() => setFeedbackToast(null), 4000);
    } catch (err) {
      console.error(err);
      setFeedbackToast({ type: 'error', text: 'Erro ao excluir o cliente. Verifique permissões.' });
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    cpfCnpj: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    zipCode: string;
    city: string;
    state: string;
    notes: string;
  }>({
    name: '',
    cpfCnpj: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    zipCode: '',
    city: '',
    state: '',
    notes: '',
  });

  const openNewClientModal = () => {
    setEditingClient(null);
    setDuplicateWarning(null);
    setFormData({
      name: '',
      cpfCnpj: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      zipCode: '',
      city: '',
      state: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setDuplicateWarning(null);
    setFormData({
      name: client.name || '',
      cpfCnpj: client.cpfCnpj || '',
      contactPerson: client.contactPerson || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      zipCode: client.zipCode || '',
      city: client.city || '',
      state: client.state || '',
      notes: client.notes || '',
    });
    setIsModalOpen(true);
  };

  // Duplicate CPF/CNPJ check
  const handleCpfCnpjChange = (val: string) => {
    const formatted = formatCpfCnpj(val);
    setFormData(prev => ({ ...prev, cpfCnpj: formatted }));

    const rawInput = val.replace(/\D/g, '');
    if (rawInput.length >= 11) {
      const match = clients.find(
        c =>
          c.id !== editingClient?.id &&
          c.cpfCnpj?.replace(/\D/g, '') === rawInput
      );
      if (match) {
        setDuplicateWarning(`Atenção: Já existe um cliente com este CPF/CNPJ cadastrado: "${match.name}".`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('O Nome ou Razão Social do cliente é obrigatório.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSaveClient({
        ...(editingClient ? { id: editingClient.id } : {}),
        name: formData.name.trim(),
        cpfCnpj: formData.cpfCnpj.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        zipCode: formData.zipCode.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        notes: formData.notes.trim(),
        updatedBy: currentUserEmail,
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cliente. Verifique sua conexão e permissões.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase();
    const nameMatch = client.name?.toLowerCase().includes(term);
    const cpfMatch = client.cpfCnpj?.toLowerCase().includes(term);
    const phoneMatch = client.phone?.toLowerCase().includes(term);
    const contactMatch = client.contactPerson?.toLowerCase().includes(term);
    return nameMatch || cpfMatch || phoneMatch || contactMatch;
  });

  // Client's orders
  const getClientOrders = (clientId: string) => {
    return orders.filter(
      o => o.clientId === clientId || o.clientSnapshot?.name === historyClient?.name
    );
  };

  // CSV Export for clients
  const exportClientsCSV = () => {
    if (clients.length === 0) {
      alert('Nenhum cliente cadastrado para exportar.');
      return;
    }

    const headers = ['ID', 'Razao_Social_Nome', 'CPF_CNPJ', 'Contato', 'Telefone', 'Email', 'Endereco', 'CEP', 'Cidade', 'Estado', 'Observacoes', 'Cadastrado_Por'];
    const rows = clients.map(c => [
      `"${c.id}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.cpfCnpj || ''}"`,
      `"${(c.contactPerson || '').replace(/"/g, '""')}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.zipCode || ''}"`,
      `"${c.city || ''}"`,
      `"${c.state || ''}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      `"${c.createdBy || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Clientes_AlmaPrint_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-[#07281c]/70 backdrop-blur-xl p-4 sm:p-5 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            Clientes Cadastrados
          </h2>
          <p className="text-[11px] sm:text-xs text-emerald-200/70 mt-1">
            Gerenciamento de clientes com histórico de pedidos e preenchimento automático.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={exportClientsCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 border border-emerald-500/30 backdrop-blur-md transition-all cursor-pointer shadow-sm"
            title="Exportar clientes para arquivo CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Exportar CSV
          </button>
          <button
            onClick={openNewClientModal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackToast && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center gap-2.5 backdrop-blur-md shadow-lg shadow-black/40 text-xs font-semibold ${
            feedbackToast.type === 'success'
              ? 'border-emerald-400/40 bg-emerald-950/80 text-emerald-200'
              : 'border-rose-400/40 bg-rose-950/80 text-rose-200'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedbackToast.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-[#062419]/60 backdrop-blur-md p-3 sm:p-3.5 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 sm:gap-3 shadow-lg shadow-black/20 min-w-0">
        <Search className="w-4 h-4 text-emerald-400/70 shrink-0 ml-1" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por Nome, CPF/CNPJ, Contato ou Telefone..."
          className="w-full min-w-0 text-xs outline-none bg-transparent text-white placeholder-emerald-300/40"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-emerald-300/70 hover:text-white font-semibold cursor-pointer shrink-0"
          >
            Limpar
          </button>
        )}
      </div>

      {/* MOBILE CLIENT CARDS (Visible only on mobile screens < md, completely eliminates horizontal scroll) */}
      <div className="block md:hidden space-y-3">
        {filteredClients.length === 0 ? (
          <div className="bg-[#062419]/60 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-8 text-center text-emerald-300/60 text-xs">
            {searchTerm
              ? 'Nenhum cliente encontrado para os critérios de busca.'
              : 'Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para iniciar.'}
          </div>
        ) : (
          filteredClients.map(client => (
            <div
              key={client.id}
              className="bg-[#062419]/70 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-4 space-y-3 shadow-lg shadow-black/30"
            >
              {/* Header: Client Name & CPF/CNPJ Badge */}
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-emerald-500/15">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-sm leading-tight break-words">
                    {client.name}
                  </div>
                  {client.email && (
                    <div className="text-[11px] text-emerald-300/70 mt-0.5 break-all">
                      {client.email}
                    </div>
                  )}
                </div>
                {client.cpfCnpj ? (
                  <span className="shrink-0 px-2 py-0.5 font-mono text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 rounded-md">
                    {client.cpfCnpj}
                  </span>
                ) : (
                  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400/50 bg-emerald-950/40 border border-emerald-500/20 rounded">
                    Sem Doc
                  </span>
                )}
              </div>

              {/* Details: CPF/CNPJ, Contact, Phone & Location */}
              <div className="text-xs space-y-1.5 text-emerald-100/90">
                {/* Campo e Título de CPF / CNPJ sempre explícito */}
                <div className="flex items-center gap-1.5 flex-wrap bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-500/15">
                  <span className="text-emerald-300 font-semibold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    CPF / CNPJ:
                  </span>
                  <span className="font-mono text-white">
                    {client.cpfCnpj || (
                      <span className="text-emerald-400/50 italic text-[11px]">Não informado</span>
                    )}
                  </span>
                </div>

                {(client.contactPerson || client.phone) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {client.contactPerson && (
                      <span className="text-emerald-300/90 font-medium">
                        Contato: {client.contactPerson}
                      </span>
                    )}
                    {client.phone && (
                      <span className="font-mono text-emerald-200">
                        {client.contactPerson ? '• ' : ''}{client.phone}
                      </span>
                    )}
                  </div>
                )}
                {(client.city || client.state) && (
                  <div className="text-[11px] text-emerald-200/60">
                    Localização: {client.city || ''}{client.state ? ` / ${client.state}` : ''}
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() => setHistoryClient(client)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
                  title="Ver pedidos deste cliente"
                >
                  <History className="w-3.5 h-3.5 text-teal-400" />
                  Histórico
                </button>

                <button
                  onClick={() => onCreateOrderForClient(client)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-500/30 to-teal-500/30 hover:from-emerald-500/40 hover:to-teal-500/40 text-emerald-200 text-xs font-semibold border border-emerald-400/40 transition-colors cursor-pointer"
                  title="Criar novo pedido para este cliente"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  + Pedido
                </button>

                <button
                  onClick={() => openEditModal(client)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
                  title="Editar cadastro do cliente"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                  Editar
                </button>
              </div>

              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setClientToDelete(client)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Excluir Cliente
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP CLIENTS TABLE (Visible only on md and larger screens) */}
      <div className="hidden md:block bg-[#062419]/60 backdrop-blur-xl border border-emerald-500/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 w-full max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full min-w-[700px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-950/60 border-b border-emerald-500/25 font-extrabold uppercase tracking-wider text-emerald-200/90">
                <th className="py-3 px-4 border-r border-emerald-500/15">Cliente / Razão Social</th>
                <th className="py-3 px-4 border-r border-emerald-500/15 w-40">CPF / CNPJ</th>
                <th className="py-3 px-4 border-r border-emerald-500/15">Contato</th>
                <th className="py-3 px-4 border-r border-emerald-500/15 w-36">Telefone</th>
                <th className="py-3 px-4 border-r border-emerald-500/15">Cidade / UF</th>
                <th className="py-3 px-4 text-center w-40">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/10">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-emerald-300/60">
                    {searchTerm
                      ? 'Nenhum cliente encontrado para os critérios de busca.'
                      : 'Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para iniciar.'}
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-emerald-500/10 transition-colors group">
                    <td className="py-3.5 px-4 font-semibold border-r border-emerald-500/10 text-white">
                      <div>{client.name}</div>
                      {client.email && (
                        <div className="text-[11px] text-emerald-300/60 font-normal">{client.email}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 border-r border-emerald-500/10 font-mono text-emerald-200/80">
                      {client.cpfCnpj || '-'}
                    </td>
                    <td className="py-3.5 px-4 border-r border-emerald-500/10 text-emerald-100/80">
                      {client.contactPerson || '-'}
                    </td>
                    <td className="py-3.5 px-4 border-r border-emerald-500/10 text-emerald-100/80">
                      {client.phone || '-'}
                    </td>
                    <td className="py-3.5 px-4 border-r border-emerald-500/10 text-emerald-100/80">
                      {client.city ? `${client.city}${client.state ? ' / ' + client.state : ''}` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setHistoryClient(client)}
                          className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/30"
                          title="Ver histórico de pedidos deste cliente"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onCreateOrderForClient(client)}
                          className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/30"
                          title="Criar novo pedido para este cliente"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(client)}
                          className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/30"
                          title="Editar cadastro do cliente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setClientToDelete(client)}
                          className="p-2 text-rose-300 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
                          title="Excluir cadastro do cliente"
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

      {/* Modal: Add / Edit Client */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md overflow-y-auto p-3 sm:p-4">
          <div className="min-h-full flex items-start sm:items-center justify-center py-4 sm:py-8">
            <div className="bg-[#062419]/95 border border-emerald-500/30 max-w-xl w-full p-4 sm:p-7 rounded-3xl shadow-2xl shadow-black/80 relative text-white">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-5">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-300">
                    <Users className="w-4 h-4" />
                  </div>
                  {editingClient ? 'Editar Cadastro de Cliente' : 'Novo Cadastro de Cliente'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-emerald-300/70 hover:text-white hover:bg-emerald-500/20 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {duplicateWarning && (
                <div className="mb-4 p-3.5 bg-amber-500/15 border border-amber-400/40 text-amber-200 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-emerald-100 mb-1.5">
                    Razão Social ou Nome <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Cavorella Shoes / João da Silva"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-emerald-100 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        CPF ou CNPJ
                      </label>
                      <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                        {formData.cpfCnpj.replace(/\D/g, '').length > 11
                          ? 'CNPJ (P. Jurídica)'
                          : formData.cpfCnpj.replace(/\D/g, '').length > 0
                          ? 'CPF (P. Física)'
                          : 'Opcional'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={formData.cpfCnpj}
                      onChange={e => handleCpfCnpjChange(e.target.value)}
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 font-mono text-xs outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-emerald-100 mb-1.5">
                      Pessoa de Contato
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                      placeholder="Ex: Camila Bonvechio"
                      className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-xs outline-none focus:border-emerald-400 transition-all"
                    />
                  </div>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-emerald-100/90 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    placeholder="(19) 99999-9999"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-xs outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-100/90 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-xs outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-100/90 mb-1.5">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Av. da Emancipação, 3770 - Centro Metropolitano"
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-xs outline-none focus:border-emerald-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-emerald-100/90 mb-1.5">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={e => setFormData({ ...formData, zipCode: formatCEP(e.target.value) })}
                    placeholder="13184-000"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-xs outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-100/90 mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Campinas / Hortolândia"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-xs outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-100/90 mb-1.5">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-xs uppercase outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-100/90 mb-1.5">
                  Observações Gerais
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações específicas de entrega, horários, etc."
                  className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-xs outline-none focus:border-emerald-400 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-500/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-xs font-semibold text-emerald-100 rounded-xl border border-white/15 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : editingClient ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Modal: Client Order History */}
      {historyClient && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md overflow-y-auto p-3 sm:p-4">
          <div className="min-h-full flex items-center justify-center py-4">
            <div className="bg-[#062419]/95 border border-emerald-500/30 max-w-2xl w-full p-4 sm:p-7 rounded-3xl shadow-2xl shadow-black/80 relative max-h-[85vh] flex flex-col text-white">
            <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-300">
                    <History className="w-4 h-4" />
                  </div>
                  Histórico de Pedidos: {historyClient.name}
                </h3>
                <p className="text-xs text-emerald-200/70 mt-1">
                  Total de {getClientOrders(historyClient.id).length} pedido(s) registrado(s) para este cliente.
                </p>
              </div>
              <button
                onClick={() => setHistoryClient(null)}
                className="p-1.5 text-emerald-300/70 hover:text-white hover:bg-emerald-500/20 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {getClientOrders(historyClient.id).length === 0 ? (
                <div className="py-12 text-center text-xs text-emerald-300/60">
                  Nenhum pedido vinculado a este cliente até o momento.
                </div>
              ) : (
                getClientOrders(historyClient.id).map(order => (
                  <div
                    key={order.id}
                    className="p-3.5 bg-[#04160f]/70 border border-emerald-500/20 hover:border-emerald-400/40 rounded-xl transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="font-mono text-emerald-300">Nº {order.orderNumber}</span>
                        <span className="text-emerald-500/40 font-normal">|</span>
                        <span className="text-emerald-100/80 font-normal">Data: {order.date}</span>
                        <span className="text-emerald-500/40 font-normal">|</span>
                        <span className="font-semibold text-emerald-300 uppercase text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                          {order.status}
                        </span>
                      </div>
                      <div className="text-emerald-200/60 text-[11px] mt-1">
                        {order.items.length} item(ns) &bull; Total: <strong className="text-white font-mono">{centsToBRL(order.totalGeneralCents)}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setHistoryClient(null);
                        onViewOrder(order);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Visualizar
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-emerald-500/20 flex justify-between items-center mt-4">
              <button
                onClick={() => {
                  const targetClient = historyClient;
                  setHistoryClient(null);
                  onCreateOrderForClient(targetClient);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Novo Pedido
              </button>
              <button
                onClick={() => setHistoryClient(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-emerald-100 rounded-xl text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#072418] border border-rose-500/40 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl shadow-black/80 space-y-4 text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/20 rounded-2xl border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Excluir Cliente</h3>
                <p className="text-xs text-rose-300/80">Esta ação removerá o cliente do cadastro</p>
              </div>
            </div>

            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 text-xs text-emerald-100/90 leading-relaxed space-y-2">
              <p>
                Tem certeza que deseja excluir o cadastro do cliente{' '}
                <strong className="text-white font-black text-sm block mt-1">{clientToDelete.name}</strong>
              </p>
              <p className="text-[11px] text-emerald-300/70 pt-1 border-t border-white/10">
                Nota: Os pedidos e orçamentos vinculados a este cliente permanecerão intactos no histórico.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-rose-900/50 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
