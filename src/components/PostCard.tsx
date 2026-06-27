/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Camera, Film, Music, Type, Download, Trash2, 
  ChevronLeft, ChevronRight, Copy, Check, FileText, 
  Play, Folder, Clock, Calendar, ShieldAlert
} from 'lucide-react';
import { Post } from '../types';
import { getPostFile, deletePost } from '../lib/db';

interface PostCardProps {
  post: Post;
  onPostDeleted: () => void;
}

export default function PostCard({ post, onPostDeleted }: PostCardProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fileUrls, setFileUrls] = useState<{ [index: number]: string }>({});
  const [loadingFiles, setLoadingFiles] = useState<{ [index: number]: boolean }>({});
  const [copied, setCopied] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Formata data do post
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formata tamanho de arquivo
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Carrega arquivo sob demanda (Lazy Loading) do IndexedDB
  const loadFile = async (index: number) => {
    if (fileUrls[index]) return fileUrls[index]; // Já carregado
    
    setLoadingFiles(prev => ({ ...prev, [index]: true }));
    try {
      const blob = await getPostFile(post.id, index);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setFileUrls(prev => ({ ...prev, [index]: url }));
        setLoadingFiles(prev => ({ ...prev, [index]: false }));
        return url;
      }
    } catch (err) {
      console.error('Erro ao carregar arquivo do DB', err);
    }
    setLoadingFiles(prev => ({ ...prev, [index]: false }));
    return null;
  };

  // Carrega mídias necessárias no mount ou quando o index mudar
  useEffect(() => {
    if (post.type === 'texto') return;

    // Se for foto, carrega a atual e pré-carrega as adjacentes se for pasta
    loadFile(currentIdx);
    
    if (post.isFolder) {
      const nextIdx = (currentIdx + 1) % post.fileCount;
      const prevIdx = (currentIdx - 1 + post.fileCount) % post.fileCount;
      // Pré-carrega de leve
      setTimeout(() => {
        loadFile(nextIdx);
        loadFile(prevIdx);
      }, 500);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, post.id, post.type]);

  // Limpa URLs de arquivos ao desmontar para evitar vazamento de memória
  useEffect(() => {
    return () => {
      (Object.values(fileUrls) as string[]).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [fileUrls]);

  // Download de arquivo individual
  const downloadIndividualFile = async (index: number, fileName: string) => {
    try {
      const blob = await getPostFile(post.id, index);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    } catch (err) {
      console.error('Erro no download', err);
    }
  };

  // Download de TODOS os arquivos do post sequencialmente
  const downloadAllFiles = async () => {
    if (post.type === 'texto') return;
    
    for (let i = 0; i < post.fileCount; i++) {
      const metadata = post.files[i];
      await downloadIndividualFile(i, metadata.name);
      // Pequeno atraso para o navegador conseguir enfileirar os downloads corretamente
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  // Copia o texto para área de transferência
  const handleCopyText = () => {
    if (post.textContent) {
      navigator.clipboard.writeText(post.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Exclui a publicação do banco de dados local
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePost(post.id, post.fileCount);
      onPostDeleted();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir post');
      setIsDeleting(false);
    }
  };

  // Tipo de post e design de cabeçalho correspondente
  const getHeaderStyle = () => {
    switch (post.type) {
      case 'foto': return { bg: 'bg-rose-500/10 border border-rose-500/20', text: 'text-rose-400', icon: Camera, label: 'Foto' };
      case 'video': return { bg: 'bg-amber-500/10 border border-amber-500/20', text: 'text-amber-400', icon: Film, label: 'Vídeo' };
      case 'audio': return { bg: 'bg-purple-500/10 border border-purple-500/20', text: 'text-purple-400', icon: Music, label: 'Áudio' };
      case 'texto': return { bg: 'bg-emerald-500/10 border border-emerald-500/20', text: 'text-emerald-400', icon: Type, label: 'Texto' };
      case 'pdf': return { bg: 'bg-red-500/10 border border-red-500/20', text: 'text-red-400', icon: FileText, label: 'PDF' };
    }
  };

  const style = getHeaderStyle();
  const IconComponent = style.icon;

  return (
    <article className="bg-[#0a0a0a] rounded-3xl border border-stone-800 overflow-hidden flex flex-col hover:border-stone-750 transition-all duration-300">
      
      {/* Top Banner / Meta Info */}
      <div className="p-5 flex items-center justify-between border-b border-stone-900">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${style.bg} ${style.text} flex items-center justify-center shrink-0`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-stone-100 text-sm md:text-base leading-snug truncate max-w-xs md:max-w-md">
              {post.title}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-stone-500 text-xs mt-0.5 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(post.createdAt)}
              </span>
              <span>•</span>
              {post.isFolder ? (
                <span className="flex items-center gap-1 text-stone-300 bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded-md font-semibold text-[10px]">
                  <Folder className="w-3 h-3 text-stone-400" />
                  PASTA ({post.fileCount})
                </span>
              ) : (
                <span className="text-[10px] text-stone-400 bg-stone-900/55 border border-stone-850 px-1.5 py-0.5 rounded-md font-bold">
                  ARQUIVO ÚNICO
                </span>
              )}
              {post.userEmail && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[10px] text-stone-300 font-mono bg-stone-900 px-1.5 py-0.5 rounded-md border border-stone-800" title={`Publicado por ${post.userEmail}`}>
                    Por {post.userDisplayName || post.userEmail.split('@')[0]}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Delete Trigger */}
        <button
          onClick={() => setShowConfirmDelete(true)}
          className="p-2 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-stone-900/50 transition-colors cursor-pointer"
          title="Excluir publicação"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#0d0d0d]/30 flex flex-col justify-center min-h-[220px]">
        {/* Render for FOTO */}
        {post.type === 'foto' && (
          <div className="relative group w-full h-[360px] md:h-[400px] flex items-center justify-center bg-[#050505] overflow-hidden border-b border-stone-900">
            {loadingFiles[currentIdx] ? (
              <div className="flex flex-col items-center gap-3 text-stone-400">
                <div className="w-8 h-8 rounded-full border-2 border-stone-800 border-t-stone-400 animate-spin" />
                <span className="text-xs font-semibold font-mono">Buscando imagem...</span>
              </div>
            ) : fileUrls[currentIdx] ? (
              <img
                src={fileUrls[currentIdx]}
                alt={post.files[currentIdx]?.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain max-w-full max-h-full"
              />
            ) : (
              <div className="text-center px-6 max-w-sm">
                <p className="text-stone-400 text-xs font-semibold mb-1">Mídia Local Indisponível</p>
                <p className="text-[10px] text-stone-500 leading-normal font-mono">Este post foi sincronizado do Firebase, mas o arquivo original está armazenado no navegador do autor.</p>
              </div>
            )}

            {/* Gallery Navigation Controls */}
            {post.isFolder && post.fileCount > 1 && (
              <>
                {/* Image count bubble */}
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-stone-300 font-mono text-[11px] font-bold px-2.5 py-1 rounded-full border border-stone-800">
                  {currentIdx + 1} de {post.fileCount}
                </div>
                
                {/* Arrow buttons */}
                <button
                  onClick={() => setCurrentIdx(prev => (prev - 1 + post.fileCount) % post.fileCount)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-stone-900/80 border border-stone-800/50 backdrop-blur-md p-2 rounded-full text-stone-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentIdx(prev => (prev + 1) % post.fileCount)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-stone-900/80 border border-stone-800/50 backdrop-blur-md p-2 rounded-full text-stone-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Filename banner */}
                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs p-3 text-center truncate border-t border-stone-900">
                  <span className="text-xs text-stone-300 font-medium font-mono">
                    {post.files[currentIdx]?.name} ({formatSize(post.files[currentIdx]?.size)})
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Render for VÍDEO */}
        {post.type === 'video' && (
          <div className="bg-black flex flex-col md:flex-row w-full h-[380px] md:h-[420px] overflow-hidden border-b border-stone-900">
            {/* Main Video Player */}
            <div className="flex-1 relative flex items-center justify-center h-full bg-black">
              {loadingFiles[currentIdx] ? (
                <div className="flex flex-col items-center gap-3 text-stone-400">
                  <div className="w-8 h-8 rounded-full border-2 border-stone-800 border-t-stone-400 animate-spin" />
                  <span className="text-xs font-semibold font-mono">Preparando vídeo...</span>
                </div>
              ) : fileUrls[currentIdx] ? (
                <video
                  src={fileUrls[currentIdx]}
                  controls
                  playsInline
                  className="w-full h-full object-contain max-h-full"
                />
              ) : (
                <div className="text-center px-6 max-w-xs mx-auto">
                  <p className="text-stone-400 text-xs font-semibold mb-1">Mídia Local Indisponível</p>
                  <p className="text-[10px] text-stone-500 leading-normal font-mono">O arquivo de vídeo original reside no banco local IndexedDB do autor do post.</p>
                </div>
              )}
            </div>

            {/* Video List Sidebar (only if Folder/Multiple) */}
            {post.isFolder && post.fileCount > 1 && (
              <div className="w-full md:w-56 bg-[#080808] border-t md:border-t-0 md:border-l border-stone-900 flex flex-col h-1/3 md:h-full shrink-0">
                <div className="px-3 py-2 bg-black border-b border-stone-900 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Playlist</span>
                  <span className="text-[10px] font-bold text-stone-300 font-mono">
                    {currentIdx + 1}/{post.fileCount}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-stone-900/40 p-1.5 space-y-1">
                  {post.files.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-full text-left p-2 rounded-lg flex items-start gap-2 transition-all cursor-pointer ${
                        currentIdx === idx
                          ? 'bg-stone-900 border border-stone-800 text-stone-200'
                          : 'hover:bg-stone-900/45 text-stone-500 hover:text-stone-300 border border-transparent'
                      }`}
                    >
                      <Play className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${currentIdx === idx ? 'text-stone-300 fill-stone-300/10' : 'text-stone-600'}`} />
                      <div className="overflow-hidden">
                        <p className="text-[11px] font-medium font-mono truncate leading-tight">{file.name}</p>
                        <p className="text-[9px] text-stone-600 mt-0.5 font-mono">{formatSize(file.size)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Render for PDF */}
        {post.type === 'pdf' && (
          <div className="bg-[#050505] flex flex-col md:flex-row w-full h-[420px] overflow-hidden border-b border-stone-900">
            {/* Main PDF Viewer */}
            <div className="flex-1 relative flex flex-col h-full bg-[#0d0d0d]">
              {loadingFiles[currentIdx] ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-stone-400">
                  <div className="w-8 h-8 rounded-full border-2 border-stone-800 border-t-stone-400 animate-spin" />
                  <span className="text-xs font-semibold font-mono">Preparando documento PDF...</span>
                </div>
              ) : fileUrls[currentIdx] ? (
                <div className="flex-1 flex flex-col h-full relative">
                  {/* Top Bar with Open In New Tab button */}
                  <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-900 flex items-center justify-between text-xs text-stone-400">
                    <span className="font-mono truncate max-w-[180px] sm:max-w-xs md:max-w-md">{post.files[currentIdx]?.name}</span>
                    <button
                      onClick={() => window.open(fileUrls[currentIdx], '_blank')}
                      className="px-2.5 py-1 bg-stone-900 hover:bg-stone-850 text-stone-200 hover:text-white rounded-md border border-stone-800 transition-all font-semibold cursor-pointer shrink-0"
                    >
                      Abrir em nova aba
                    </button>
                  </div>
                  <iframe
                    src={fileUrls[currentIdx]}
                    title={post.files[currentIdx]?.name}
                    className="w-full h-full border-none bg-stone-900"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-xs mx-auto">
                  <p className="text-stone-400 text-xs font-semibold mb-1">Documento Indisponível</p>
                  <p className="text-[10px] text-stone-500 leading-normal font-mono">O PDF original reside no IndexedDB do autor do post.</p>
                </div>
              )}
            </div>

            {/* PDF List Sidebar (only if Folder/Multiple) */}
            {post.isFolder && post.fileCount > 1 && (
              <div className="w-full md:w-56 bg-[#080808] border-t md:border-t-0 md:border-l border-stone-900 flex flex-col h-1/3 md:h-full shrink-0">
                <div className="px-3 py-2 bg-black border-b border-stone-900 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Documentos</span>
                  <span className="text-[10px] font-bold text-stone-300 font-mono">
                    {currentIdx + 1}/{post.fileCount}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-stone-900/40 p-1.5 space-y-1">
                  {post.files.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-full text-left p-2 rounded-lg flex items-start gap-2 transition-all cursor-pointer ${
                        currentIdx === idx
                          ? 'bg-stone-900 border border-stone-800 text-stone-200'
                          : 'hover:bg-stone-900/45 text-stone-500 hover:text-stone-300 border border-transparent'
                      }`}
                    >
                      <FileText className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${currentIdx === idx ? 'text-red-400' : 'text-stone-600'}`} />
                      <div className="overflow-hidden">
                        <p className="text-[11px] font-medium font-mono truncate leading-tight">{file.name}</p>
                        <p className="text-[9px] text-stone-600 mt-0.5 font-mono">{formatSize(file.size)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Render for ÁUDIO */}
        {post.type === 'audio' && (
          <div className="p-6 flex flex-col items-center justify-center bg-[#080808] text-stone-200 border-y border-stone-900 relative overflow-hidden">
            {/* Background waveform visualization ornament */}
            <div className="absolute inset-x-0 bottom-0 top-1/2 opacity-5 flex items-end justify-center gap-1 px-4 pointer-events-none">
              {[...Array(24)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-stone-500 w-1.5 rounded-t-full"
                  style={{ 
                    height: `${Math.sin(i * 0.5) * 50 + 50}%`,
                    animation: `pulse 1.5s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              ))}
            </div>

            <div className="w-full max-w-md z-10 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 shrink-0">
                  <Music className="w-6 h-6 animate-pulse" />
                </div>
                <div className="overflow-hidden">
                  <h5 className="font-mono text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                    REPRODUZINDO ÁUDIO
                  </h5>
                  <p className="font-mono text-xs font-semibold truncate text-stone-200">
                    {post.files[currentIdx]?.name}
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">
                    Tamanho: {formatSize(post.files[currentIdx]?.size || 0)}
                  </p>
                </div>
              </div>

              {/* Native Audio Element */}
              {loadingFiles[currentIdx] ? (
                <div className="text-center text-xs text-purple-400 animate-pulse font-mono py-2">
                  Buscando áudio do DB local...
                </div>
              ) : fileUrls[currentIdx] ? (
                <audio
                  src={fileUrls[currentIdx]}
                  controls
                  className="w-full h-10 mt-2 filter invert brightness-200"
                />
              ) : (
                <div className="text-center py-2 max-w-xs mx-auto">
                  <p className="text-rose-400 text-xs font-semibold mb-1">Áudio Local Indisponível</p>
                  <p className="text-[10px] text-stone-500 leading-normal font-mono">O arquivo de som original reside no IndexedDB do autor do post.</p>
                </div>
              )}

              {/* Audio Playlist Selector (if Folder) */}
              {post.isFolder && post.fileCount > 1 && (
                <div className="pt-3 border-t border-stone-900">
                  <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-2">Playlist</p>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 max-w-full">
                    {post.files.map((file, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIdx(idx)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-medium whitespace-nowrap border shrink-0 transition-all cursor-pointer ${
                          currentIdx === idx
                            ? 'bg-white border-white text-black font-bold'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                        }`}
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Render for TEXTO */}
        {post.type === 'texto' && (
          <div className="p-6 md:p-8 bg-[#0d0d0d]/10 flex flex-col justify-between min-h-[220px]">
            <p className="text-stone-300 text-sm md:text-base leading-relaxed whitespace-pre-line font-sans break-words select-text">
              {post.textContent}
            </p>
            <div className="flex justify-end pt-4 border-t border-stone-900/60 mt-4">
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-stone-800 hover:border-stone-750 text-stone-300 hover:text-stone-100 font-semibold rounded-xl text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer / Download Operations (Only for non-text posts) */}
      {post.type !== 'texto' && (
        <div className="p-4 bg-[#080808]/80 border-t border-stone-900 flex flex-col gap-3">
          {/* List of files with size and direct individual download */}
          {post.isFolder && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Arquivos da pasta ({post.fileCount})
              </span>
              <div className="divide-y divide-stone-900/50 max-h-32 overflow-y-auto bg-black border border-stone-900 rounded-xl">
                {post.files.map((file, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between text-xs hover:bg-stone-900/20">
                    <span className="text-stone-300 font-mono font-medium truncate max-w-[200px] md:max-w-[400px]">
                      {file.name}
                    </span>
                    <div className="flex items-center gap-2.5 shrink-0 pl-3">
                      <span className="text-[10px] font-mono text-stone-500">{formatSize(file.size)}</span>
                      <button
                        onClick={() => downloadIndividualFile(idx, file.name)}
                        className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-900 transition-colors cursor-pointer"
                        title={`Baixar ${file.name}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-stone-500 font-medium font-mono">
              Tamanho total: <span className="font-bold text-stone-300">{formatSize(post.totalSize)}</span>
            </div>
            
            <button
              onClick={downloadAllFiles}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-stone-200 text-black font-semibold rounded-xl text-xs active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-black" />
              <span>{post.isFolder ? 'Baixar Tudo' : 'Baixar Arquivo'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Overlay Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowConfirmDelete(false)} />
          <div className="bg-[#0a0a0a] rounded-2xl p-6 max-w-sm w-full border border-stone-850 shadow-2xl relative z-10 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-950/20 rounded-full flex items-center justify-center text-rose-500 mx-auto border border-rose-900/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h5 className="font-display font-bold text-stone-100 text-base">Excluir publicação?</h5>
              <p className="text-xs text-stone-400 leading-relaxed">
                Esta ação apagará os metadados e todos os arquivos armazenados localmente para sempre.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 bg-rose-950/40 border border-rose-900/40 hover:bg-rose-900 text-rose-200 font-semibold rounded-xl text-xs shadow-xs active:scale-95 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </article>
  );
}
