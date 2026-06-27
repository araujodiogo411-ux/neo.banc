/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Info, HardDrive, Cpu, HelpCircle
} from 'lucide-react';
import { Post } from './types';
import { getPosts } from './lib/db';
import Header from './components/Header';
import CreatePostModal from './components/CreatePostModal';
import PostCard from './components/PostCard';
import EmptyFeed from './components/EmptyFeed';
import AuthScreen from './components/AuthScreen';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Monitora o estado de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Carrega publicações do IndexedDB
  const loadPosts = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const allPosts = await getPosts();
      setPosts(allPosts);
    } catch (err) {
      console.error('Erro ao carregar posts do IndexedDB', err);
    }
    if (showLoading) setIsLoading(false);
  };

  // Carrega no mount e inicia sincronização em segundo plano
  useEffect(() => {
    if (authLoading || !user) return;

    const initializeFeed = async () => {
      // 1. Carrega dados locais imediatamente (0ms de atraso)
      await loadPosts(true);
      
      // 2. Sincroniza em segundo plano com o Firebase
      try {
        const { syncFirestorePosts } = await import('./lib/db');
        const hasChanges = await syncFirestorePosts();
        if (hasChanges) {
          // Se houver mudanças, atualiza silenciosamente os posts do estado
          await loadPosts(false);
        }
      } catch (err) {
        console.warn('Sincronização em segundo plano indisponível:', err);
      }
    };
    
    initializeFeed();
  }, [authLoading, user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Erro ao deslogar do Firebase', err);
    }
  };

  // Filtra publicações baseada na busca por título ou texto
  const filteredPosts = posts.filter(post => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const titleMatch = post.title.toLowerCase().includes(query);
    const textMatch = post.textContent?.toLowerCase().includes(query) || false;
    const fileMatch = post.files.some(f => f.name.toLowerCase().includes(query));
    
    return titleMatch || textMatch || fileMatch;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-stone-400">
        <div className="w-8 h-8 rounded-full border-2 border-stone-850 border-t-stone-200 animate-spin" />
        <span className="text-xs font-semibold font-mono tracking-wider">Verificando credenciais...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={() => loadPosts(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col font-sans select-none text-stone-300 animate-fadeIn">
      
      {/* Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenModal={() => setIsModalOpen(true)}
        totalPosts={posts.length}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:px-8 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Feed */}
        <section className="lg:col-span-8 flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-stone-100 text-lg md:text-xl">
              {searchQuery ? 'Resultados da Busca' : 'Publicações Recentes'}
            </h2>
            {searchQuery && (
              <span className="text-xs font-semibold text-stone-400 bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-lg">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'encontrado' : 'encontrados'}
              </span>
            )}
          </div>

          {isLoading ? (
            /* Beautiful Dark Skeleton Feed Loader */
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-[#0a0a0a] rounded-3xl p-6 border border-stone-800 space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-900 rounded-xl border border-stone-850" />
                    <div className="space-y-2">
                      <div className="h-4 bg-stone-900 rounded-md w-48" />
                      <div className="h-3 bg-stone-900 rounded-md w-24" />
                    </div>
                  </div>
                  <div className="h-56 bg-stone-900/50 rounded-2xl w-full border border-stone-850" />
                  <div className="h-8 bg-stone-900 rounded-md w-32 ml-auto" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EmptyFeed
                isFiltering={!!searchQuery}
                onOpenModal={() => setIsModalOpen(true)}
              />
            </motion.div>
          ) : (
            /* Active Post Feed list */
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {filteredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  >
                    <PostCard
                      post={post}
                      onPostDeleted={loadPosts}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Right Column: Information & Tech Specs Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* Info Card: Como Funciona */}
          <div className="bg-[#0a0a0a] rounded-3xl border border-stone-800 p-6 space-y-4 shadow-xs">
            <h3 className="font-display font-bold text-stone-100 text-sm md:text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-stone-400 shrink-0" />
              Como Funciona?
            </h3>
            <p className="text-stone-400 text-xs leading-relaxed">
              Este site é um gerenciador de mídia completo rodando em um <strong>banco de dados no seu navegador (IndexedDB)</strong>. 
              Isso traz várias vantagens exclusivas:
            </p>
            
            <div className="space-y-3.5 pt-1.5">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-200 flex items-center justify-center shrink-0 border border-stone-800">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-stone-200">Sem limite de tamanho</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                    Você pode publicar fotos pesadas ou filmes de 2 horas. Os dados são gravados direto na sua máquina, com velocidade instantânea.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-200 flex items-center justify-center shrink-0 border border-stone-800">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-stone-200">Persistência Garantida</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                    Tudo é salvo de forma definitiva. Se você fechar a aba ou recarregar o navegador, suas mídias continuarão salvas exatamente aqui!
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-200 flex items-center justify-center shrink-0 border border-stone-800">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-stone-200">Visualização & Download</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                    Assista a vídeos, ouça áudios, leia textos ou navegue por pastas de imagens diretamente no feed. Faça o download individual ou em lote quando quiser.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tip Card */}
          <div className="p-5 bg-stone-900/30 border border-stone-800 rounded-3xl space-y-2.5">
            <div className="flex items-center gap-2 text-stone-300 font-semibold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4 text-stone-400" />
              Dica Pro
            </div>
            <p className="text-stone-400 text-xs leading-relaxed">
              Ao escolher o modo <strong>&quot;Pasta de Fotos&quot;</strong>, você pode usar o botão para selecionar múltiplos arquivos de uma só vez, ou selecionar um diretório físico inteiro contendo centenas de mídias!
            </p>
          </div>

        </aside>

      </main>

      {/* Creation Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={loadPosts}
      />

    </div>
  );
}
