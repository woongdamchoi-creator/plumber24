// src/lib/pagination.ts — 전역 페이지네이션 유틸리티 (빌드 타임 전용)
import { getAllRegions, SIDO_SLUG } from './regions';

export interface PagItem {
  num:       number;
  href:      string;
  label:     string;
  isCurrent: boolean;
}

interface GlobalPage {
  href:  string;
  label: string;
}

let _pages:    GlobalPage[] | null = null;
let _hrefMap:  Map<string, number> | null = null;

function buildGlobalPages(): GlobalPage[] {
  if (_pages) return _pages;

  _pages = getAllRegions()
    .filter(r => r.dong)
    .map(r => {
      const slug = SIDO_SLUG[r.sidoname];
      if (!slug) return null;
      return {
        href:  `/${slug}/${encodeURIComponent(r.sigungu)}/${encodeURIComponent(r.dong)}`,
        label: `${r.sigungu} ${r.dong}`,
      };
    })
    .filter(Boolean) as GlobalPage[];

  _hrefMap = new Map(_pages.map((p, i) => [p.href, i]));
  return _pages;
}

export function getGlobalPageCount(): number {
  return buildGlobalPages().length;
}

// 현재 페이지 href → 전역 인덱스
export function getGlobalIndex(href: string): number {
  buildGlobalPages();
  return _hrefMap!.get(href) ?? 0;
}

// 10개 창 (현재 페이지가 가운데)
export function getPaginationWindow(currentIdx: number, windowSize = 10): PagItem[] {
  const pages = buildGlobalPages();
  const total = pages.length;

  let start = Math.max(0, currentIdx - Math.floor(windowSize / 2));
  let end   = start + windowSize - 1;

  if (end >= total) {
    end   = total - 1;
    start = Math.max(0, end - windowSize + 1);
  }

  const result: PagItem[] = [];
  for (let i = start; i <= end; i++) {
    result.push({
      num:       i + 1,
      href:      pages[i].href,
      label:     pages[i].label,
      isCurrent: i === currentIdx,
    });
  }
  return result;
}
