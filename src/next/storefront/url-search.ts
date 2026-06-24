'use client';

import { useSyncExternalStore } from 'react';

function subscribeToUrlSearch(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener('hashchange', onStoreChange);

  return () => {
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener('hashchange', onStoreChange);
  };
}

function getUrlSearch() {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function getServerUrlSearch() {
  return '';
}

export function useUrlSearchParam(name: string) {
  const search = useSyncExternalStore(subscribeToUrlSearch, getUrlSearch, getServerUrlSearch);

  return new URLSearchParams(search).get(name);
}
