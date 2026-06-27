/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Search, FolderClosed, Database, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenModal: () => void;
  totalPosts: number;
  user: User | null;
  onLogout: () => void;
}

export default function Header({ searchQuery, setSearchQuery, onOpenModal, totalPosts, user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur-md border-b border-stone-900 shadow-xs px-4 py-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Logo and App Title */}
        <div className="flex items-center gap-3">
          <div className="bg-white text-black p-2.5 rounded-2xl shadow-lg shadow-white/5 flex items-center justify-center">
            <FolderClosed className="w-5 h-5" id="app-logo-icon" />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight text-stone-100 flex items-center gap-2">
              Feed de Mídia e Arquivos
            </h1>
            <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-stone-400" />
              Banco de Dados Local (IndexedDB) • {totalPosts} {totalPosts === 1 ? 'publicação' : 'publicações'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* User Profile Info & Sign Out */}
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-900/40 border border-stone-850 rounded-xl shrink-0 max-w-[180px] sm:max-w-xs">
              <div className="w-7.5 h-7.5 rounded-lg bg-stone-800 text-stone-200 flex items-center justify-center font-bold text-xs font-display border border-stone-700 uppercase shrink-0">
                {user.displayName ? user.displayName[0] : user.email?.[0] || 'U'}
              </div>
              <div className="hidden sm:block text-left overflow-hidden">
                <p className="text-[11px] font-bold text-stone-200 leading-none truncate max-w-[100px]">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[9px] text-stone-500 font-mono leading-none truncate max-w-[100px] mt-0.5">
                  {user.email}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-stone-500 hover:text-rose-400 rounded-lg hover:bg-stone-850 transition-colors cursor-pointer ml-1"
                title="Sair da Conta"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
            <input
              type="text"
              placeholder="Buscar no feed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-900/50 border border-stone-800 rounded-xl text-sm placeholder:text-stone-600 text-stone-200 focus:bg-stone-900 focus:outline-hidden focus:border-stone-600 transition-all duration-200"
              id="feed-search-bar"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-500 hover:text-stone-300"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Add Post Button */}
          <button
            onClick={onOpenModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-200 text-black font-semibold rounded-xl text-sm shadow-md shadow-white/5 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
            id="add-post-btn"
          >
            <Plus className="w-5 h-5 text-black" />
            <span className="hidden sm:inline">Nova Publicação</span>
          </button>
        </div>
      </div>
    </header>
  );
}
