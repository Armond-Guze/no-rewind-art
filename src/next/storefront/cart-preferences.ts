const orderNoteKey = 'armoze-order-note';

export function getCartOrderNote() {
  try { return window.sessionStorage.getItem(orderNoteKey) || ''; } catch { return ''; }
}

export function saveCartOrderNote(note: string) {
  try { window.sessionStorage.setItem(orderNoteKey, note.trim().slice(0, 500)); } catch { /* Keep the note in memory when storage is unavailable. */ }
}
