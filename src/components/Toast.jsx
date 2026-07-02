'use client';
export default function Toast({ msg, visible }) {
  return (
    <div role="status" aria-live="polite" className={`toast ${visible ? 'toast-show' : ''}`}>
      {msg}
    </div>
  );
}
