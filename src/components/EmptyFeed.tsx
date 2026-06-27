/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Inbox, SearchCode, ArrowUpRight } from 'lucide-react';

interface EmptyFeedProps {
  isFiltering: boolean;
  onOpenModal: () => void;
}

export default function EmptyFeed({ isFiltering, onOpenModal }: EmptyFeedProps) {
  return (
    <div className="bg-[#0a0a0a] rounded-3xl border border-stone-800 p-10 md:p-16 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-6">
      
      {/* Visual Icon with soft glow */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-stone-900 text-stone-200 flex items-center justify-center border border-stone-800">
          {isFiltering ? (
            <SearchCode className="w-8 h-8 text-stone-400" />
          ) : (
            <Inbox className="w-8 h-8 text-stone-400" />
          )}
        </div>
        {!isFiltering && (
          <div className="absolute -top-1.5 -right-1.5 bg-stone-100 text-black p-1 rounded-lg animate-bounce">
            <Sparkles className="w-3.5 h-3.5 fill-black text-black" />
          </div>
        )}
      </div>

      {/* Texts */}
      <div className="space-y-2">
        <h3 className="font-display font-bold text-stone-100 text-lg md:text-xl">
          {isFiltering 
            ? 'Nenhuma publicação encontrada' 
            : 'Seu feed está vazio'
          }
        </h3>
        <p className="text-stone-500 text-xs md:text-sm max-w-sm mx-auto leading-relaxed">
          {isFiltering 
            ? 'Tente buscar por termos mais genéricos ou limpe o campo de busca no cabeçalho.' 
            : 'Adicione suas fotos de viagem, vídeos/filmes favoritos, anotações de texto ou faixas de áudio no seu banco local!'
          }
        </p>
      </div>

      {/* Call to action button */}
      {!isFiltering && (
        <button
          onClick={onOpenModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-stone-200 text-black font-semibold rounded-xl text-xs shadow-md shadow-white/5 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <span>Criar Primeira Publicação</span>
          <ArrowUpRight className="w-4 h-4 text-black" />
        </button>
      )}

    </div>
  );
}
