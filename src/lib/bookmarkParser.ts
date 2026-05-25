/**
 * Parse browser bookmark HTML export files (Netscape Bookmark format)
 * Used by Chrome, Firefox, Edge, Safari, Opera, etc.
 */

import type { VaultLink } from '@/hooks/useVault';

interface BookmarkNode {
  title: string;
  url?: string;
  folder?: string;
  children?: BookmarkNode[];
}

function parseBookmarkHTML(html: string): BookmarkNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function walk(parent: Element, folderPath: string): BookmarkNode[] {
    const nodes: BookmarkNode[] = [];
    const children = parent.children;

    for (let i = 0; i < children.length; i++) {
      const el = children[i];

      if (el.tagName === 'DT') {
        const a = el.querySelector(':scope > A');
        const h3 = el.querySelector(':scope > H3');
        const dl = el.querySelector(':scope > DL');

        if (a) {
          nodes.push({
            title: a.textContent?.trim() || '',
            url: a.getAttribute('HREF') || '',
            folder: folderPath,
          });
        } else if (h3 && dl) {
          const folderName = h3.textContent?.trim() || '';
          const nextPath = folderPath ? `${folderPath} / ${folderName}` : folderName;
          nodes.push(...walk(dl, nextPath));
        } else if (dl) {
          nodes.push(...walk(dl, folderPath));
        }
      } else if (el.tagName === 'DL') {
        nodes.push(...walk(el, folderPath));
      }
    }

    return nodes;
  }

  const rootDL = doc.querySelector('DL');
  if (!rootDL) return [];
  return walk(rootDL, '');
}

export function bookmarksToVaultLinks(html: string): VaultLink[] {
  const nodes = parseBookmarkHTML(html);
  const now = Date.now();

  return nodes
    .filter(n => n.url && n.url.startsWith('http'))
    .map(n => {
      let siteName = '';
      try {
        siteName = new URL(n.url!).hostname.replace('www.', '');
      } catch { /* ignore */ }

      return {
        id: crypto.randomUUID(),
        url: n.url!,
        title: n.title || siteName || n.url!,
        siteName,
        topic: n.folder || '',
        type: 'main' as const,
        favorite: false,
        private: false,
        createdAt: now,
        updatedAt: now,
      };
    });
}
