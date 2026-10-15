import React, { useState, useRef, useEffect } from 'react';
import { CompanySettings, AuthorizedUser, Client, Order } from '../types';
import { AlmaPrintLogo } from './AlmaPrintLogo';
import { formatCpfCnpj, formatPhone, formatCEP } from '../utils/currency';
import {
  Building2,
  Save,
  Upload,
  Trash2,
  ShieldCheck,
  UserPlus,
  Database,
  Download,
  UploadCloud,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Crown,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '../utils/constants';

interface CompanySettingsViewProps {
  settings: CompanySettings;
  authorizedUsers: AuthorizedUser[];
  currentUserEmail: string;
  clients: Client[];
  orders: Order[];
  onSaveSettings: (settings: CompanySettings) => Promise<void>;
  onAddAuthorizedUser: (email: string) => Promise<void>;
  onRemoveAuthorizedUser: (email: string) => Promise<void>;
  onRestoreBackup: (backupData: {
    settings?: CompanySettings;
    clients?: Client[];
    orders?: Order[];
    authorizedUsers?: AuthorizedUser[];
  }) => Promise<void>;
  onSyncOrdersCompanySettings?: () => Promise<number>;
}

export const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({
  settings,
  authorizedUsers,
  currentUserEmail,
  clients,
  orders,
  onSaveSettings,
  onAddAuthorizedUser,
  onRemoveAuthorizedUser,
  onRestoreBackup,
  onSyncOrdersCompanySettings,
}) => {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const [newAuthEmail, setNewAuthEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Logo upload handling
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG ou WEBP).');
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      alert('O tamanho da imagem do logo não deve ultrapassar 1,5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: '' }));
  };

  const isSuperAdmin = currentUserEmail.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert(`Permissão negada. Apenas o Super Admin (${SUPER_ADMIN_EMAIL}) pode alterar as configurações da empresa.`);
      return;
    }
    try {
      setIsSaving(true);
      setStatusMessage(null);
      await onSaveSettings({
        ...formData,
        updatedBy: currentUserEmail,
      });
      setStatusMessage({
        type: 'success',
        text: 'Configurações da empresa salvas com sucesso! Novos pedidos utilizarão estes dados.',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Erro ao salvar configurações da empresa.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSyncOrders = async () => {
    if (!onSyncOrdersCompanySettings) return;
    try {
      setIsSyncingOrders(true);
      setStatusMessage(null);
      const count = await onSyncOrdersCompanySettings();
      setStatusMessage({
        type: 'success',
        text: `Sincronização concluída! ${
          count > 0
            ? `${count} pedidos e orçamentos anteriores foram atualizados com o novo endereço e CNPJ.`
            : 'Todos os pedidos e orçamentos anteriores já estão atualizados com o novo endereço e CNPJ.'
        }`,
      });
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Erro ao sincronizar pedidos anteriores.',
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsSyncingOrders(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert(`Apenas o Super Admin (${SUPER_ADMIN_EMAIL}) pode autorizar novos usuários.`);
      return;
    }
    const email = newAuthEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      alert('Informe um endereço de e-mail válido.');
      return;
    }

    try {
      await onAddAuthorizedUser(email);
      setNewAuthEmail('');
      alert(`E-mail ${email} autorizado com sucesso.`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Erro ao autorizar e-mail.');
    }
  };

  // Full System Backup Export (JSON)
  const handleExportFullBackup = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUserEmail,
      companySettings: formData,
      clients,
      orders,
      authorizedUsers,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `Backup_AlmaPrintCad_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Full System Restore from JSON
  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) {
      alert(`Permissão negada. Apenas o Super Admin (${SUPER_ADMIN_EMAIL}) pode restaurar backups.`);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.clients && !parsed.orders && !parsed.companySettings) {
          throw new Error('Arquivo de backup inválido ou em formato incompatível.');
        }

        const confirmMsg =
          `ATENÇÃO: Você está prestes a restaurar um backup contendo:\n` +
          `- ${(parsed.clients || []).length} clientes\n` +
          `- ${(parsed.orders || []).length} pedidos\n` +
          `Deseja prosseguir com a restauração?`;

        if (!confirm(confirmMsg)) return;

        await onRestoreBackup({
          settings: parsed.companySettings,
          clients: parsed.clients,
          orders: parsed.orders,
          authorizedUsers: parsed.authorizedUsers,
        });

        alert('Backup restaurado com sucesso!');
        if (parsed.companySettings) {
          setFormData(parsed.companySettings);
        }
      } catch (err: any) {
        console.error(err);
        alert(`Erro na restauração: ${err.message || 'Arquivo corrompido'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 sm:space-y-8 w-full max-w-full">
      {/* Top Header */}
      <div className="bg-[#07281c]/70 backdrop-blur-xl p-4 sm:p-5 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 w-full max-w-full">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            Configurações da Empresa
          </h2>
          <p className="text-[11px] sm:text-xs text-emerald-200/70 mt-1">
            Dados cadastrais fixos da Alma Print usados no cabeçalho e contratada dos documentos.
          </p>
        </div>

        {isSuperAdmin ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        ) : (
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black/40 border border-emerald-500/20 text-emerald-300/80 text-xs font-medium rounded-xl self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Modo Consulta (Somente Leitura)</span>
          </div>
        )}
      </div>

      {/* Role permission info banner */}
      {!isSuperAdmin ? (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/25 rounded-2xl flex items-start gap-3 text-emerald-200">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              Perfil: Operador Autorizado
            </h4>
            <p className="text-[11px] text-emerald-200/90 leading-relaxed">
              Você tem permissão para <strong>cadastrar clientes, realizar consultas no sistema e emitir/imprimir pedidos e ordens de serviço</strong>.
            </p>
            <p className="text-[11px] text-emerald-300/70 leading-relaxed">
              As modificações nos dados cadastrais da empresa, numeração sequencial, restauração de backup e controle de usuários são exclusivas do <strong>Super Admin ({SUPER_ADMIN_EMAIL})</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-amber-200 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Acesso Ativo: Super Admin ({SUPER_ADMIN_EMAIL})</span>
          </div>
          <span className="text-[11px] text-amber-200/80">
            Acesso total para gerenciar dados da empresa, usuários autorizados e backups.
          </span>
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-3.5 text-xs rounded-xl border flex items-center gap-2.5 backdrop-blur-md ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-400/40 text-emerald-200'
              : 'bg-rose-950/50 border-rose-400/40 text-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 w-full max-w-full">
        <fieldset disabled={!isSuperAdmin} className={`space-y-4 sm:space-y-6 ${!isSuperAdmin ? 'opacity-90' : ''}`}>
        {/* LOGO & VISUAL PREVIEW */}
        <div className="bg-[#062419]/60 backdrop-blur-xl p-4 sm:p-6 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 space-y-4">
          <div className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider pb-3 border-b border-emerald-500/20">
            Logotipo da Alma Print
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="p-4 border border-emerald-500/25 bg-[#04160f]/80 rounded-2xl flex items-center justify-center w-full sm:w-auto max-w-full min-h-[90px] shadow-inner">
              <AlmaPrintLogo
                customLogoUrl={formData.logoUrl}
                height={54}
                variant="light"
              />
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-emerald-100/90 leading-relaxed">
                O logotipo original da Alma Print é mantido por padrão. Se desejar, faça o upload de um arquivo de imagem personalizado (PNG transparente, SVG ou JPG).
              </p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 border border-white/15 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  Substituir Logo
                </button>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Restaurar Logo Padrão
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COMPANY IDENTIFICATION */}
        <div className="bg-[#062419]/60 backdrop-blur-xl p-6 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 space-y-4 text-xs">
          <div className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider pb-3 border-b border-emerald-500/20">
            Identificação da Empresa (Contratada)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Nome Fantasia <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.tradeName}
                onChange={e => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400 font-semibold"
                placeholder="Ex: ALMA PRINT — Gráfica e Embalagens"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Razão Social <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.legalName}
                onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400 font-semibold"
                placeholder="Ex: ALMA NEGÓCIOS E SERVIÇOS LTDA"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                CNPJ / CPF
              </label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={e => setFormData({ ...formData, cnpj: formatCpfCnpj(e.target.value) })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white font-mono outline-none focus:border-emerald-400"
                placeholder="65.349.937/0001-12"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Unidade
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                placeholder="Campinas - SP"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-emerald-100 mb-1.5">
              Endereço Completo
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
              placeholder="Rua Regente Feijó, 484 - Centro"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                CEP
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={e => setFormData({ ...formData, zipCode: formatCEP(e.target.value) })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white font-mono outline-none focus:border-emerald-400"
                placeholder="13013-051"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Cidade
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                placeholder="Campinas"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Estado (UF)
              </label>
              <input
                type="text"
                maxLength={2}
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white uppercase outline-none focus:border-emerald-400"
                placeholder="SP"
              />
            </div>
          </div>
        </div>

        {/* CONTACTS, SERVICES & PIX */}
        <div className="bg-[#062419]/60 backdrop-blur-xl p-6 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 space-y-4 text-xs">
          <div className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider pb-3 border-b border-emerald-500/20">
            Contatos, Serviços e Pagamento Padrão
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400 font-medium"
                placeholder="19 9 9359-9923"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                E-mail de Contato
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                placeholder="contato@almaprintgrafica.com.br"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Perfil do Instagram
              </label>
              <input
                type="text"
                value={formData.instagram}
                onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white outline-none focus:border-emerald-400"
                placeholder="almaprint.grafica"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Chave Pix Padrão
              </label>
              <input
                type="text"
                value={formData.pixKey}
                onChange={e => setFormData({ ...formData, pixKey: e.target.value })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-emerald-300 font-mono outline-none focus:border-emerald-400 font-semibold"
                placeholder="52.917.006/0001-21"
              />
            </div>

            <div>
              <label className="block font-semibold text-emerald-100 mb-1.5">
                Próximo Número Sequencial de Pedido
              </label>
              <input
                type="number"
                value={formData.nextOrderNumber}
                onChange={e => setFormData({ ...formData, nextOrderNumber: parseInt(e.target.value, 10) || 1 })}
                className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-emerald-300 font-mono outline-none focus:border-emerald-400 font-bold"
                placeholder="8579"
              />
              <p className="text-[10px] text-emerald-300/60 mt-1">
                Incrementado automaticamente a cada novo pedido salvo.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-emerald-100 mb-1.5">
              Lista de Serviços do Cabeçalho (uma por linha)
            </label>
            <textarea
              rows={5}
              value={formData.headerServices}
              onChange={e => setFormData({ ...formData, headerServices: e.target.value })}
              className="w-full p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-emerald-200 font-mono text-xs uppercase outline-none focus:border-emerald-400 leading-relaxed"
              placeholder="OFFSET&#10;DIGITAL&#10;EMBALAGENS&#10;BRINDES&#10;SIGN"
            />
          </div>
        </div>

        </fieldset>

        {/* BOTTOM SAVE & SYNC BUTTONS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {onSyncOrdersCompanySettings ? (
            <button
              type="button"
              onClick={handleManualSyncOrders}
              disabled={isSyncingOrders || isSaving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-200 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Aplica o novo endereço e CNPJ da empresa em todos os orçamentos e pedidos já emitidos"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingOrders ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
              {isSyncingOrders ? 'Sincronizando pedidos...' : 'Sincronizar Pedidos e Orçamentos Anteriores'}
            </button>
          ) : <div />}

          <div>
            {isSuperAdmin ? (
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 border border-emerald-500/20 text-emerald-300/80 text-xs font-medium rounded-xl">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Alteração de dados cadastrais exclusiva do Super Admin</span>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* SECTION: AUTHORIZED ACCOUNTS (SUPER ADMIN CONTROL) */}
      <div className="bg-[#062419]/60 backdrop-blur-xl p-4 sm:p-6 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-emerald-500/20 gap-2">
          <div>
            <h3 className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Controle de Acesso e Usuários Autorizados
            </h3>
            <p className="text-emerald-200/70 mt-1">
              Regra de segurança ativa: Somente o <strong className="text-amber-300 font-semibold">Super Admin</strong> tem permissão para cadastrar ou liberar contas de e-mail para acesso.
            </p>
          </div>
          {isSuperAdmin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold rounded-lg shrink-0 w-fit">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Super Admin Conectado
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {authorizedUsers.map(user => {
            const isThisSuperAdmin = user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim();
            const isCurrent = user.email.toLowerCase().trim() === currentUserEmail.toLowerCase().trim();

            return (
              <div
                key={user.email}
                className={`p-3.5 border rounded-xl flex items-center justify-between gap-3 ${
                  isThisSuperAdmin
                    ? 'border-amber-500/40 bg-amber-950/20 shadow-sm shadow-amber-500/10'
                    : 'border-emerald-500/25 bg-[#04160f]/70'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{user.email}</span>
                    {isThisSuperAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold rounded-md">
                        <Crown className="w-3 h-3 text-amber-400" />
                        Super Admin (Dono)
                      </span>
                    )}
                    {!isThisSuperAdmin && (
                      <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold rounded-md">
                        Operador Permitido
                      </span>
                    )}
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-[10px] font-medium rounded-md">
                        (sua sessão)
                      </span>
                    )}
                  </div>
                  {user.addedAt && (
                    <div className="text-[10px] text-emerald-300/60 mt-1">
                      Autorizado em: {new Date(user.addedAt).toLocaleDateString('pt-BR')} {user.addedBy ? `por ${user.addedBy}` : ''}
                    </div>
                  )}
                </div>

                {!isThisSuperAdmin && isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Revogar acesso da conta "${user.email}"? Esta pessoa não poderá mais acessar o sistema.`)) {
                        onRemoveAuthorizedUser(user.email);
                      }
                    }}
                    className="p-1.5 text-rose-300/70 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg cursor-pointer transition-colors"
                    title="Revogar autorização de acesso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {isSuperAdmin ? (
          <form onSubmit={handleAddEmail} className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <input
              type="email"
              required
              value={newAuthEmail}
              onChange={e => setNewAuthEmail(e.target.value)}
              placeholder="Digite o e-mail do colaborador para autorizar: ex: funcionario@gmail.com"
              className="flex-1 min-w-0 p-2.5 bg-[#04160f]/80 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-300/40 text-xs outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer w-full sm:w-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Autorizar Acesso
            </button>
          </form>
        ) : (
          <div className="p-3 bg-black/40 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-emerald-300/70 text-xs">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Apenas o Super Admin (<strong className="text-white">{SUPER_ADMIN_EMAIL}</strong>) pode autorizar novos e-mails ou revogar acessos.
            </span>
          </div>
        )}
      </div>

      {/* SECTION: BACKUP & RESTORE */}
      <div className="bg-[#062419]/60 backdrop-blur-xl p-4 sm:p-6 border border-emerald-500/20 rounded-2xl shadow-xl shadow-black/40 space-y-4 text-xs">
        <div className="pb-3 border-b border-emerald-500/20">
          <h3 className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Backup Completo e Restauração
          </h3>
          <p className="text-emerald-200/70 mt-1">
            Geração de arquivo JSON contendo todos os clientes, histórico de pedidos, numerações e configurações.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border border-emerald-500/25 bg-[#04160f]/70 rounded-xl space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              Exportar Backup Completo (JSON)
            </div>
            <p className="text-emerald-200/70 text-[11px] leading-relaxed">
              Baixa um arquivo JSON seguro com todos os registros atuais do banco de dados (clientes, pedidos, orçamentos e dados cadastrais).
            </p>
            <button
              type="button"
              onClick={handleExportFullBackup}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer mt-2 w-full sm:w-auto"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Arquivo de Backup
            </button>
          </div>

          <div className="p-4 border border-emerald-500/25 bg-[#04160f]/70 rounded-xl space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-teal-400" />
              Restaurar a partir de Backup (JSON)
            </div>
            <p className="text-emerald-200/70 text-[11px] leading-relaxed">
              Restaura e mescla os dados a partir de um arquivo JSON exportado anteriormente pelo Alma Print Cad.
            </p>
            {isSuperAdmin ? (
              <>
                <input
                  type="file"
                  ref={backupInputRef}
                  onChange={handleRestoreFileSelect}
                  accept=".json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => backupInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/15 text-emerald-100 rounded-xl text-xs font-semibold border border-white/15 transition-colors cursor-pointer mt-2 w-full sm:w-auto"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                  Selecionar Arquivo JSON
                </button>
              </>
            ) : (
              <div className="mt-2 p-2.5 bg-black/40 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300/70 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Restauração de banco restrita ao Super Admin</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
