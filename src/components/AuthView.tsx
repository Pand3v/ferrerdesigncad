import React, { useState, useEffect } from 'react';
import { AlmaPrintLogo } from './AlmaPrintLogo';
import { Lock, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface AuthViewProps {
  onLogin: () => void;
  onLoginRedirect: () => void;
  onLogout: () => void;
  isLoading: boolean;
  unauthorizedEmail?: string | null;
  authErrorMessage?: string | null;
  customLogoUrl?: string;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLogin,
  onLoginRedirect,
  onLogout,
  isLoading,
  unauthorizedEmail,
  authErrorMessage,
  customLogoUrl,
}) => {
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#04140d] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative ambient glass light glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="bg-[#062419]/75 backdrop-blur-2xl border border-emerald-500/30 max-w-md w-full p-8 sm:p-9 rounded-3xl shadow-2xl shadow-black/70 space-y-6 relative z-10">
        {/* Brand Logo */}
        <div className="flex justify-center pb-5 border-b border-emerald-500/20">
          <AlmaPrintLogo customLogoUrl={customLogoUrl} height={58} variant="light" />
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-black tracking-tight text-white uppercase">
            Alma Print Cad
          </h1>
          <p className="text-xs text-emerald-200/75 font-medium">
            Sistema Integrado de Gestão &bull; Clientes, Orçamentos e Ordens de Serviço
          </p>
        </div>

        {/* Error message from popup */}
        {authErrorMessage && (
          <div className="p-3.5 border border-rose-500/40 bg-rose-950/40 text-rose-200 rounded-xl text-xs space-y-2 backdrop-blur-sm">
            <div className="font-bold flex items-center gap-1.5 text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Aviso de Autenticação</span>
            </div>
            <p className="leading-relaxed text-rose-200/90">{authErrorMessage}</p>
            {isInIframe && (
              <p className="text-[11px] text-rose-300/80 font-medium">
                Dica: Quando o sistema está incorporado no preview, navegadores podem bloquear popups. Use a opção por redirecionamento ou abra em nova aba.
              </p>
            )}
          </div>
        )}

        {/* Unauthorized Account Alert */}
        {unauthorizedEmail ? (
          <div className="p-4 border border-rose-500/40 bg-rose-950/40 text-rose-100 rounded-2xl space-y-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              Acesso Não Permitido
            </div>
            <p className="text-xs leading-relaxed text-rose-200/90">
              A conta <strong className="font-bold underline text-white">{unauthorizedEmail}</strong> não tem autorização para entrar neste sistema.
            </p>
            <div className="p-3 bg-black/40 border border-rose-500/30 rounded-xl text-[11px] text-rose-200/90 leading-relaxed">
              <strong>Regra de Acesso:</strong> Nenhuma pessoa pode se cadastrar ou logar a menos que o <strong>Super Admin</strong> (<span className="text-white font-mono">ferreiraguih91@gmail.com</span>) registre previamente o e-mail dela como permitido.
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={onLogin}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/25 cursor-pointer transition-all"
              >
                Tentar com outra Conta Google
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 px-3 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 rounded-xl cursor-pointer transition-colors"
              >
                Desconectar
              </button>
            </div>
          </div>
        ) : (
          /* Normal Login state */
          <div className="space-y-5">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl text-xs text-emerald-100/85 leading-relaxed space-y-1.5 backdrop-blur-sm">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Acesso Seguro e Restrito
              </div>
              <p>
                O sistema é de uso exclusivo da <strong className="text-white font-semibold">ALMA PRINT</strong>.
              </p>
              <p className="text-[11px] text-emerald-300/80">
                Acesso liberado apenas para o Super Admin e e-mails previamente registrados por ele.
              </p>
            </div>

            <div className="space-y-3">
              {/* Primary: Standard Google Popup */}
              <button
                type="button"
                onClick={onLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold rounded-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer shadow-lg shadow-emerald-500/25"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Autenticando...
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Entrar com Conta Google (Janela Popup)</span>
                  </>
                )}
              </button>

              {/* Alternative: Redirect mode (best for mobile or if popups close/block) */}
              <button
                type="button"
                onClick={onLoginRedirect}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl border border-white/15 transition-all disabled:opacity-60 cursor-pointer backdrop-blur-md"
                title="Recomendado caso a janela popup feche sozinha no celular"
              >
                <span>Entrar por Redirecionamento (Recomendado no Celular)</span>
              </button>

              {/* Standalone new tab button */}
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 text-xs font-medium rounded-xl border border-emerald-500/25 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>Abrir aplicativo em nova aba</span>
              </a>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-emerald-500/20 text-center space-y-1.5">
          <div className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-mono">
            ALMA PRINT &bull; Gráfica e Embalagens
          </div>
          <div className="text-[11px] text-emerald-300/80">
            Desenvolvido por <strong className="text-emerald-100 font-semibold">Ferrer Design</strong> -{' '}
            <a
              href="mailto:ferrerdesignoficial@proton.me"
              className="underline hover:text-white transition-colors font-mono"
            >
              ferrerdesignoficial@proton.me
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
