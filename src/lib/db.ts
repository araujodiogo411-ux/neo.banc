/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Post, PostFileBinary } from '../types';
import { db } from './firebase';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

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
 * Salva um post e seus arquivos binários associados no IndexedDB e sincroniza com o Firestore
 */
export async function savePost(post: Post, filesList: File[]): Promise<void> {
  const localDB = await initDB();
  
  // Primeiro, salvar tudo localmente no IndexedDB
  await new Promise<void>((resolve, reject) => {
    const transaction = localDB.transaction([STORE_POSTS, STORE_FILES], 'readwrite');
    
    transaction.onerror = () => {
      console.error('Erro na transação de salvar post local', transaction.error);
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

  // Segundo, tentar sincronizar os metadados do post para o Firestore
  try {
    await setDoc(doc(db, 'posts', post.id), post);
    console.log('Post sincronizado com o Firestore:', post.id);
  } catch (err) {
    console.error('Erro ao sincronizar post com o Firestore (funcionará offline):', err);
  }
}

/**
 * Recupera todos os posts do banco de dados local IndexedDB de forma rápida
 */
export async function getLocalPosts(): Promise<Post[]> {
  const dbInstance = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(STORE_POSTS, 'readonly');
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
 * Tenta sincronizar as publicações do Firestore para o IndexedDB local.
 * Retorna true se houver novas mídias ou mídias alteradas, forçando uma atualização silenciosa da UI.
 */
export async function syncFirestorePosts(): Promise<boolean> {
  try {
    const querySnapshot = await getDocs(collection(db, 'posts'));
    const firebasePosts: Post[] = [];
    querySnapshot.forEach((doc) => {
      firebasePosts.push(doc.data() as Post);
    });

    if (firebasePosts.length > 0) {
      const currentLocalPosts = await getLocalPosts();
      const localIdSet = new Set(currentLocalPosts.map(p => p.id));
      let hasChanges = false;

      for (const fPost of firebasePosts) {
        if (!localIdSet.has(fPost.id)) {
          hasChanges = true;
          break;
        }
        const localPost = currentLocalPosts.find(p => p.id === fPost.id);
        if (localPost && localPost.createdAt !== fPost.createdAt) {
          hasChanges = true;
          break;
        }
      }

      const localDB = await initDB();
      // Usamos uma transação para salvar posts recebidos do Firestore no IndexedDB local
      await new Promise<void>((resolve, reject) => {
        const transaction = localDB.transaction(STORE_POSTS, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        
        const store = transaction.objectStore(STORE_POSTS);
        firebasePosts.forEach(post => {
          store.put(post);
        });
      });

      return hasChanges;
    }
  } catch (err) {
    console.warn('Não foi possível sincronizar posts com o Firestore:', err);
  }
  return false;
}

/**
 * Recupera todos os posts cadastrados (sincronizados localmente)
 */
export async function getPosts(): Promise<Post[]> {
  return getLocalPosts();
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
 * Deleta um post e todos os seus arquivos associados localmente e no Firestore
 */
export async function deletePost(postId: string, fileCount: number): Promise<void> {
  const localDB = await initDB();
  
  // Primeiro, deletar localmente
  await new Promise<void>((resolve, reject) => {
    const transaction = localDB.transaction([STORE_POSTS, STORE_FILES], 'readwrite');
    
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

  // Segundo, tentar deletar do Firestore
  try {
    await deleteDoc(doc(db, 'posts', postId));
    console.log('Post deletado do Firestore:', postId);
  } catch (err) {
    console.error('Erro ao deletar post do Firestore:', err);
  }
}
