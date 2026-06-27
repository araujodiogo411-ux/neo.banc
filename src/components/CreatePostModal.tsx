/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  X, Camera, Film, Music, Type, Folder, File, 
  Upload, CheckCircle, Info, RefreshCw, AlertTriangle, Layers, FileText
} from 'lucide-react';
import { Post, PostType } from '../types';
import { savePost } from '../lib/db';
import { auth } from '../lib/firebase';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const [step, setStep] = useState<'type' | 'form' | 'publishing'>('type');
  const [postType, setPostType] = useState<PostType>('foto');
  const [title, setTitle] = useState('');
  const [isFolder, setIsFolder] = useState(false);
  const [uploadMode, setUploadMode] = useState<'multiple' | 'folder'>('multiple'); // multiple files vs system folder
  const [files, setFiles] = useState<File[]>([]);
  const [textContent, setTextContent] = useState('');
  
  // Progress & Error States
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('type');
    setPostType('foto');
    setTitle('');
    setIsFolder(false);
    setUploadMode('multiple');
    setFiles([]);
    setTextContent('');
    setProgress(0);
    setStatusText('');
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Escolha do tipo de post
  const handleSelectType = (type: PostType) => {
    setPostType(type);
    setIsFolder(false); // Default is single
    setStep('form');
  };

  // Formatar tamanho de arquivo de forma elegante
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filtragem e validação dos arquivos
  const validateAndAddFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);

    const incomingFiles = Array.from(fileList);
    
    // Validar tipo de arquivo
    const filtered = incomingFiles.filter(file => {
      if (postType === 'foto') {
        return file.type.startsWith('image/');
      }
      if (postType === 'video') {
        return file.type.startsWith('video/');
      }
      if (postType === 'audio') {
        return file.type.startsWith('audio/');
      }
      if (postType === 'pdf') {
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      }
      return true;
    });

    if (filtered.length === 0 && incomingFiles.length > 0) {
      let typeLabel = '';
      if (postType === 'foto') typeLabel = 'imagem';
      else if (postType === 'video') typeLabel = 'vídeo';
      else if (postType === 'audio') typeLabel = 'áudio';
      else if (postType === 'pdf') typeLabel = 'PDF';
      setError(`Nenhum arquivo do tipo ${typeLabel || postType} foi detectado.`);
      return;
    }

    if (!isFolder) {
      // Se não for pasta, só aceita o primeiro
      setFiles([filtered[0]]);
    } else {
      // Se for pasta ou multi-upload, concatena ou substitui
      setFiles((prev) => [...prev, ...filtered]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const triggerFileInput = () => {
    if (uploadMode === 'folder' && folderInputRef.current) {
      folderInputRef.current.click();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    validateAndAddFiles(e.dataTransfer.files);
  };

  // Publicar post no IndexedDB
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe o título da publicação.');
      return;
    }

    if (postType !== 'texto' && files.length === 0) {
      setError('Por favor, selecione pelo menos um arquivo para publicar.');
      return;
    }

    setStep('publishing');
    setStatusText('Preparando banco de dados...');
    setProgress(15);

    try {
      // Cria ID único
      const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const fileMetadata = files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream'
      }));

      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const currentUser = auth.currentUser;

      const newPost: Post = {
        id: postId,
        title: title.trim(),
        type: postType,
        isFolder: isFolder,
        textContent: postType === 'texto' ? textContent : undefined,
        createdAt: Date.now(),
        fileCount: files.length,
        totalSize: totalSize,
        files: fileMetadata,
        userId: currentUser?.uid,
        userEmail: currentUser?.email || undefined,
        userDisplayName: currentUser?.displayName || undefined
      };

      setStatusText('Armazenando metadados...');
      setProgress(40);

      // Salva no IndexedDB
      await savePost(newPost, files);
      
      setProgress(100);
      setStatusText('Publicado com sucesso!');
      
      // Espera 800ms para mostrar a conclusão bonita antes de fechar
      setTimeout(() => {
        onPostCreated();
        handleClose();
      }, 1000);

    } catch (err) {
      console.error(err);
      setError('Houve um erro ao tentar salvar no banco de dados local. Tente novamente.');
      setStep('form');
    }
  };

  // Aceitar tipos específicos no input de arquivo
  const getFileAccept = () => {
    if (postType === 'foto') return 'image/*';
    if (postType === 'video') return 'video/*';
    if (postType === 'audio') return 'audio/*';
    if (postType === 'pdf') return 'application/pdf';
    return '*';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div className="bg-[#0a0a0a] rounded-3xl shadow-2xl border border-stone-800 max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-10 transition-all duration-300 transform scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-900">
          <div>
            <h3 className="font-display font-bold text-lg text-stone-100">
              {step === 'type' && 'Escolha o tipo de publicação'}
              {step === 'form' && `Nova Publicação • ${postType.charAt(0).toUpperCase() + postType.slice(1)}`}
              {step === 'publishing' && 'Publicando...'}
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              {step === 'type' && 'Selecione um formato para começar'}
              {step === 'form' && 'Insira as informações da publicação'}
              {step === 'publishing' && 'Carregando arquivos para o banco local'}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Select Type */}
        {step === 'type' && (
          <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Foto Option */}
            <button
              onClick={() => handleSelectType('foto')}
              className="flex flex-col items-center justify-center p-6 bg-[#0e0e0e] hover:bg-rose-950/25 border border-stone-900 hover:border-rose-900/40 rounded-2xl group transition-all duration-300 text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <span className="font-display font-semibold text-stone-200 group-hover:text-rose-400">Foto / Imagem</span>
              <span className="text-[11px] text-stone-500 mt-1">Galeria ou foto única</span>
            </button>

            {/* Video Option */}
            <button
              onClick={() => handleSelectType('video')}
              className="flex flex-col items-center justify-center p-6 bg-[#0e0e0e] hover:bg-amber-950/25 border border-stone-900 hover:border-amber-900/40 rounded-2xl group transition-all duration-300 text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Film className="w-6 h-6" />
              </div>
              <span className="font-display font-semibold text-stone-200 group-hover:text-amber-400">Vídeo</span>
              <span className="text-[11px] text-stone-500 mt-1">Filmes, clipes ou pastas</span>
            </button>

            {/* Audio Option */}
            <button
              onClick={() => handleSelectType('audio')}
              className="flex flex-col items-center justify-center p-6 bg-[#0e0e0e] hover:bg-purple-950/25 border border-stone-900 hover:border-purple-900/40 rounded-2xl group transition-all duration-300 text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Music className="w-6 h-6" />
              </div>
              <span className="font-display font-semibold text-stone-200 group-hover:text-purple-400">Áudio</span>
              <span className="text-[11px] text-stone-500 mt-1">Músicas, podcasts ou sons</span>
            </button>

            {/* PDF Option */}
            <button
              onClick={() => handleSelectType('pdf')}
              className="flex flex-col items-center justify-center p-6 bg-[#0e0e0e] hover:bg-red-950/25 border border-stone-900 hover:border-red-900/40 rounded-2xl group transition-all duration-300 text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <span className="font-display font-semibold text-stone-200 group-hover:text-red-400">PDF / Documento</span>
              <span className="text-[11px] text-stone-500 mt-1">E-books, relatórios ou manuais</span>
            </button>

            {/* Text Option */}
            <button
              onClick={() => handleSelectType('texto')}
              className="flex flex-col items-center justify-center p-6 bg-[#0e0e0e] hover:bg-emerald-950/25 border border-stone-900 hover:border-emerald-900/40 rounded-2xl group transition-all duration-300 text-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Type className="w-6 h-6" />
              </div>
              <span className="font-display font-semibold text-stone-200 group-hover:text-emerald-400">Texto</span>
              <span className="text-[11px] text-stone-500 mt-1">Artigos, notas ou posts</span>
            </button>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/30 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Nome da publicação
              </label>
              <input
                type="text"
                required
                placeholder={`Dê um título para o seu ${postType}...`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:bg-[#0e0e0e] focus:outline-hidden focus:border-stone-500 transition-all duration-200"
              />
            </div>

            {/* Single vs Folder mode toggle (only for binary files) */}
            {postType !== 'texto' && (
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Modo de Upload
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFolder(false);
                      setFiles([]);
                    }}
                    className={`flex items-center justify-center gap-2 p-3 border rounded-xl font-medium text-xs transition-all duration-200 cursor-pointer ${
                      !isFolder
                        ? 'border-stone-200 bg-stone-900 text-stone-100 font-bold'
                        : 'border-stone-850 hover:border-stone-800 text-stone-500 bg-stone-900/20'
                    }`}
                  >
                    <File className="w-4 h-4 text-stone-400" />
                    <span>
                      {postType === 'foto' ? 'Foto Única' : postType === 'video' ? 'Vídeo Único' : postType === 'audio' ? 'Áudio Único' : 'PDF Único'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFolder(true);
                      setFiles([]);
                    }}
                    className={`flex items-center justify-center gap-2 p-3 border rounded-xl font-medium text-xs transition-all duration-200 cursor-pointer ${
                      isFolder
                        ? 'border-stone-200 bg-stone-900 text-stone-100 font-bold'
                        : 'border-stone-850 hover:border-stone-800 text-stone-500 bg-stone-900/20'
                    }`}
                  >
                    <Folder className="w-4 h-4 text-stone-400" />
                    <span>
                      Pasta de {postType === 'foto' ? 'Fotos' : postType === 'video' ? 'Vídeos' : postType === 'audio' ? 'Áudios' : 'PDFs'}
                    </span>
                  </button>
                </div>

                {isFolder && (
                  <div className="mt-3 flex items-center justify-between p-2 bg-stone-900/40 border border-stone-850 rounded-xl">
                    <span className="text-[11px] font-semibold text-stone-500 pl-2">Seleção de Pasta:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setUploadMode('multiple')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          uploadMode === 'multiple'
                            ? 'bg-white text-black shadow-xs'
                            : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                        }`}
                      >
                        Múltiplos Arquivos
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('folder')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          uploadMode === 'folder'
                            ? 'bg-white text-black shadow-xs'
                            : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                        }`}
                      >
                        Pasta Inteira
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rich text editing for text posts */}
            {postType === 'texto' ? (
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Conteúdo do texto
                </label>
                <textarea
                  required
                  placeholder="Escreva sua publicação aqui..."
                  rows={8}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:bg-[#0e0e0e] focus:outline-hidden focus:border-stone-500 transition-all duration-200 resize-none font-sans"
                />
              </div>
            ) : (
              /* Drag & Drop Zone for files */
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Carregar arquivos do armazenamento
                </label>
                
                {/* Inputs escondidos */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={getFileAccept()}
                  multiple={isFolder}
                  className="hidden"
                />
                
                {/* Input com atributo webkitdirectory para pastas */}
                <input
                  type="file"
                  ref={folderInputRef}
                  onChange={handleFileChange}
                  accept={getFileAccept()}
                  {...({
                    webkitdirectory: "true",
                    directory: "true",
                    multiple: true
                  } as any)}
                  className="hidden"
                />

                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className="border-2 border-dashed border-stone-800 hover:border-stone-600 rounded-2xl p-6 flex flex-col items-center justify-center bg-[#0c0c0c] hover:bg-stone-900/20 transition-all duration-300 cursor-pointer text-center group"
                >
                  <div className="w-10 h-10 bg-stone-900 group-hover:bg-stone-850 border border-stone-850 rounded-full flex items-center justify-center text-stone-300 group-hover:scale-105 transition-transform duration-200 mb-2">
                    <Upload className="w-5 h-5 text-stone-300" />
                  </div>
                  
                  <p className="text-sm font-semibold text-stone-300">
                    {uploadMode === 'folder' && isFolder 
                      ? 'Clique para selecionar uma pasta'
                      : isFolder 
                        ? 'Arraste ou clique para selecionar arquivos' 
                        : 'Arraste ou clique para selecionar o arquivo'
                    }
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Sem limite de tamanho de arquivos!
                  </p>
                  <p className="text-[10px] text-stone-400 font-semibold mt-2.5 bg-stone-900/80 px-2 py-0.5 rounded-md border border-stone-800">
                    Formatos aceitos: {postType === 'foto' ? 'Fotos/Imagens' : postType === 'video' ? 'Vídeos (MP4, WEBM, MKV, etc)' : postType === 'audio' ? 'Áudios (MP3, WAV, AAC, etc)' : 'Documentos PDF'}
                  </p>
                </div>

                {/* Info Note for Large Files */}
                <div className="mt-2.5 p-3 bg-stone-900/30 border border-stone-850 rounded-xl text-[11px] text-stone-400 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-stone-500 mt-0.5" />
                  <p className="font-medium">
                    Pode fazer upload de filmes inteiros, vídeos longos ou várias fotos em lote! Eles serão armazenados com segurança diretamente na memória local (IndexedDB) do seu navegador.
                  </p>
                </div>

                {/* Selected Files Preview List */}
                {files.length > 0 && (
                  <div className="mt-4 border border-stone-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    <div className="bg-stone-900/60 px-3 py-2 border-b border-stone-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-400">
                        {files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">
                        {formatSize(files.reduce((acc, f) => acc + f.size, 0))}
                      </span>
                    </div>
                    <div className="divide-y divide-stone-900/50 bg-[#0a0a0a]">
                      {files.map((file, idx) => (
                        <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-stone-900/20 transition-colors">
                          <div className="flex items-center gap-2 overflow-hidden mr-4">
                            <span className="text-xs text-stone-500 font-mono">#{idx + 1}</span>
                            <span className="text-xs font-medium text-stone-300 truncate max-w-xs">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-semibold text-stone-500 font-mono shrink-0">{formatSize(file.size)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(idx);
                              }}
                              className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-900">
              <button
                type="button"
                onClick={() => setStep('type')}
                className="px-4 py-2 bg-stone-900 border border-stone-800 text-stone-300 font-semibold rounded-xl text-xs hover:bg-stone-850 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-white hover:bg-stone-200 text-black font-semibold rounded-xl text-xs active:scale-95 transition-all cursor-pointer"
              >
                Publicar no Feed
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Publishing Progress */}
        {step === 'publishing' && (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-stone-900 border-t-white animate-spin" />
              <div className="absolute text-stone-300">
                <RefreshCw className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-display font-bold text-stone-100 text-base">{statusText}</h4>
              <p className="text-xs text-stone-500 font-medium">Gravando dados locais... Não feche esta janela.</p>
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full max-w-xs bg-stone-900 border border-stone-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <span className="text-xs font-bold text-stone-400 font-mono">{progress}%</span>
          </div>
        )}

      </div>
    </div>
  );
}
