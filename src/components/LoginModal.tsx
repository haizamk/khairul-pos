import React, { useState } from 'react';
import { useFirebaseSync } from '../context/FirebaseSyncContext';
import { 
  LogIn, 
  Lock, 
  User, 
  Key, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Store,
  Eye,
  EyeOff,
  Sparkles,
  X
} from 'lucide-react';
import { sound } from '../utils/audio';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  allowClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  allowClose = false,
}) => {
  const {
    user,
    currentUserProfile,
    loginWithLoginId,
    loginWithGoogle,
    syncErrorMessage,
    settings,
    staffUsers
  } = useFirebaseSync();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanLoginId = loginId.trim();
    if (!cleanLoginId) {
      setLocalError('Sila masukkan Login ID anda.');
      sound.playVoidBeep();
      return;
    }
    if (!password) {
      setLocalError('Sila masukkan kata laluan.');
      sound.playVoidBeep();
      return;
    }

    setIsLoading(true);
    sound.playKeyBeep(600, 0.04);
    const res = await loginWithLoginId(cleanLoginId, password);
    setIsLoading(false);

    if (res.success) {
      sound.playOkBeep();
      if (onClose) onClose();
    } else {
      sound.playVoidBeep();
      setLocalError(res.error || 'Log masuk gagal. Sila cuba lagi.');
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    setIsGoogleLoading(true);
    sound.playKeyBeep(600, 0.04);
    try {
      await loginWithGoogle();
      sound.playOkBeep();
      if (onClose) onClose();
    } catch (err: any) {
      sound.playVoidBeep();
      setLocalError('Log masuk Google gagal.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl space-y-6 relative overflow-hidden">
        {/* Decorative Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 rounded-b-full shadow-lg shadow-emerald-500/50" />

        {/* Close button if optional */}
        {allowClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/50">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-extrabold uppercase text-slate-100 tracking-wider">
              {settings.storeName || 'KHAIRUL FRESH POS'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Log Masuk Staf / Juruwang Terminal POS
            </p>
          </div>
        </div>

        {/* Error message */}
        {(localError || syncErrorMessage) && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-semibold">{localError || syncErrorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Login ID Juruwang / Admin</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="Contoh: ali / siti / khairul"
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kata Laluan</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata laluan..."
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-4 py-3 pr-12 text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-950/70 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Mengesahkan...' : 'Log Masuk POS'}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            atau
          </span>
        </div>

        {/* Google Login for Store Owner / Master Admin */}
        <button
          type="button"
          disabled={isLoading || isGoogleLoading}
          onClick={handleGoogleLogin}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer shadow-md"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isGoogleLoading ? 'Menyambung Google...' : 'Log Masuk Google (Master Admin / Pemilik)'}</span>
        </button>

        {/* Footer info */}
        <div className="text-center space-y-1 pt-2">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            KHAIRUL FRESH AND FROZEN FOOD
          </div>
          <div className="text-[9px] text-slate-400 flex items-center justify-center gap-2 font-medium">
            <a href="https://freshmarket.my" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 underline transition">freshmarket.my</a>
            <span>•</span>
            <a href="https://pos.freshmarket.my" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 underline transition">pos.freshmarket.my</a>
            <span>•</span>
            <a href="mailto:support@freshmarket.my" className="hover:text-emerald-400 underline transition">support@freshmarket.my</a>
          </div>
        </div>
      </div>
    </div>
  );
};
