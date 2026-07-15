/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/popup/**/*.{html,tsx,ts,jsx,js}'],
  theme: {
    extend: {
      colors: {
        'move-best': '#629924',
        'move-excellent': '#97b832',
        'move-good': '#67b8a0',
        'move-inaccuracy': '#f4c542',
        'move-mistake': '#e8863a',
        'move-blunder': '#d32f2f',
        'board-dark': '#769656',
        'board-light': '#eeeed2',
        'panel-bg': '#262421',
        'panel-surface': '#302e2b',
        'panel-border': '#3d3b38',
        'panel-text': '#bababa',
        'panel-text-dim': '#8b8988',
      },
      width: {
        'popup': '400px',
      },
      height: {
        'popup': '560px',
      },
    },
  },
  plugins: [],
};
