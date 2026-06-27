/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PostType = 'foto' | 'video' | 'audio' | 'texto' | 'pdf';

export interface PostFileMetadata {
  name: string;
  size: number;
  type: string;
}

export interface Post {
  id: string;
  title: string;
  type: PostType;
  isFolder: boolean;
  textContent?: string;
  createdAt: number;
  fileCount: number;
  totalSize: number;
  files: PostFileMetadata[];
}

export interface PostFileBinary {
  id: string; // postid_index
  postId: string;
  index: number;
  name: string;
  type: string;
  size: number;
  blob: Blob;
}
