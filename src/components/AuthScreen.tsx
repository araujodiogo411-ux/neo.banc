import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  FolderClosed, 
  AlertCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        setLoading(false);
        return;
      }
      if (!displayName.trim()) {
        setError('Por favor, informe seu nome.');
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        // Cadastro
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Atualiza o perfil com o nome de exibição
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: displayName.trim()
          });
        }
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Ocorreu um erro. Tente novamente.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'Este e-mail já está em uso.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Formato de e-mail inválido.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'A senha fornecida é muito fraca.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'E-mail ou senha incorretos.';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-stone-800 selection:text-white">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/[0.01] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-500/[0.01] rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-stone-950 border border-stone-900 rounded-3xl p-8 shadow-2xl relative z-10"
        id="auth-container-card"
      >
        {/* App Branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-black p-3.5 rounded-2xl shadow-xl shadow-white/5 flex items-center justify-center mb-4"
          >
            <FolderClosed className="w-6 h-6" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-stone-100 flex items-center gap-2">
            Feed de Mídia e Arquivos
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-1">
            Faça login para sincronizar e gerenciar seus conteúdos em tempo real
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-stone-900/50 p-1 rounded-xl mb-6 border border-stone-900">
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isLogin 
                ? 'bg-stone-800 text-stone-100 border border-stone-700/50' 
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Fazer Login
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isLogin 
                ? 'bg-stone-800 text-stone-100 border border-stone-700/50' 
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
                key="name-field"
              >
                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-600" />
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-900/30 border border-stone-900 rounded-xl text-sm placeholder:text-stone-700 text-stone-200 focus:bg-stone-900/50 focus:outline-hidden focus:border-stone-700 transition-all duration-200"
                    required={!isLogin}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">Endereço de E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-600" />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-stone-900/30 border border-stone-900 rounded-xl text-sm placeholder:text-stone-700 text-stone-200 focus:bg-stone-900/50 focus:outline-hidden focus:border-stone-700 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-600" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-stone-900/30 border border-stone-900 rounded-xl text-sm placeholder:text-stone-700 text-stone-200 focus:bg-stone-900/50 focus:outline-hidden focus:border-stone-700 transition-all duration-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
                key="confirm-password-field"
              >
                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-mono">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-600" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-900/30 border border-stone-900 rounded-xl text-sm placeholder:text-stone-700 text-stone-200 focus:bg-stone-900/50 focus:outline-hidden focus:border-stone-700 transition-all duration-200"
                    required={!isLogin}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-normal">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-white hover:bg-stone-200 text-black font-semibold rounded-xl text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Entrar na Conta' : 'Criar Conta Grátis'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Info/Security Footer */}
        <div className="mt-6 pt-5 border-t border-stone-900/60 text-center flex items-center justify-center gap-1.5 text-[10px] font-mono text-stone-600">
          <Sparkles className="w-3.5 h-3.5 text-stone-500" />
          <span>Sua conta está protegida pelo Firebase Authentication</span>
        </div>
      </motion.div>
    </div>
  );
}
