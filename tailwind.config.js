/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Design tokens (mapped to CSS variables — adaptive light/dark) ──
        canvas: 'var(--bg)',
        elevated: 'var(--bg-elevated)',
        hair: 'var(--border)',
        'hair-strong': 'var(--border-strong)',
        ink: 'var(--text)',
        'ink-2': 'var(--text-secondary)',
        'ink-3': 'var(--text-tertiary)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        success: 'var(--success)',
        danger: 'var(--danger)',
        series: 'var(--series)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        display: 'var(--font-display)',
      },
      borderRadius: { xl2: '20px', xl3: '26px' },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      maxWidth: { content: '1040px' },
    },
  },
  plugins: [],
};
