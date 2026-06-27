/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Post, PostFileBinary } from '../types';

const DB_NAME = 'MediaFeedDB';
const DB_VERSION = 1;
const STORE_POSTS = 'posts';
const STORE_FILES = 'files';

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Erro ao abrir o banco de dados IndexedDB');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Cria store de posts se não existir
      if (!db.objectStoreNames.contains(STORE_POSTS)) {
        db.createObjectStore(STORE_POSTS, { keyPath: 'id' });
      }
      
      // Cria store de arquivos binários se não existir
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Salva um post e seus arquivos binários associados no IndexedDB
 */
export async function savePost(post: Post, filesList: File[]): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_POSTS, STORE_FILES], 'readwrite');
    
    transaction.onerror = () => {
      console.error('Erro na transação de salvar post', transaction.error);
      reject(transaction.error);
    };
    
    transaction.oncomplete = () => {
      resolve();
    };
    
    const postsStore = transaction.objectStore(STORE_POSTS);
    const filesStore = transaction.objectStore(STORE_FILES);
    
    // 1. Salvar metadados do post
    postsStore.put(post);
    
    // 2. Salvar binários de cada arquivo
    filesList.forEach((file, index) => {
      const fileBinary: PostFileBinary = {
        id: `${post.id}_${index}`,
        postId: post.id,
        index: index,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        blob: file // File herda de Blob, então podemos salvar diretamente
      };
      
      filesStore.put(fileBinary);
    });
  });
}

/**
 * Recupera todos os posts cadastrados, ordenados por data decrescente
 */
export async function getPosts(): Promise<Post[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_POSTS, 'readonly');
    const store = transaction.objectStore(STORE_POSTS);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const posts = request.result as Post[];
      // Ordena decrescente por data de criação
      posts.sort((a, b) => b.createdAt - a.createdAt);
      resolve(posts);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Recupera a lista de blobs de arquivos associados a um Post
 */
export async function getPostFile(postId: string, index: number): Promise<Blob | null> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FILES, 'readonly');
    const store = transaction.objectStore(STORE_FILES);
    const id = `${postId}_${index}`;
    const request = store.get(id);
    
    request.onsuccess = () => {
      const result = request.result as PostFileBinary | undefined;
      if (result) {
        resolve(result.blob);
      } else {
        resolve(null);
      }
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Deleta um post e todos os seus arquivos associados
 */
export async function deletePost(postId: string, fileCount: number): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_POSTS, STORE_FILES], 'readwrite');
    
    transaction.onerror = () => {
      reject(transaction.error);
    };
    
    transaction.oncomplete = () => {
      resolve();
    };
    
    const postsStore = transaction.objectStore(STORE_POSTS);
    const filesStore = transaction.objectStore(STORE_FILES);
    
    // Deleta metadados
    postsStore.delete(postId);
    
    // Deleta binários associados
    for (let i = 0; i < fileCount; i++) {
      filesStore.delete(`${postId}_${i}`);
    }
  });
}
