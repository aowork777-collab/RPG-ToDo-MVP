// Shared, single-colour line icons. Labels belong to the surrounding control.
const paths = Object.freeze({
  today: 'M8 5h11v15H5V5h3 M9 3h6v4H9z M8 12l2 2 5-5 M8 17h7',
  calendar: 'M5 5h14v15H5z M8 3v4 M16 3v4 M5 10h14 M8 13h2 M14 13h2 M8 17h2',
  compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M16 8l-3 5-5 3 3-5z',
  users: 'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M6 20v-2a6 6 0 0 1 12 0v2 M19 5a3 3 0 0 1 0 6 M20 14q3 1 3 5 M5 5a3 3 0 0 0 0 6 M4 14q-3 1-3 5',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M5 21v-2a7 7 0 0 1 14 0v2',
  steps: 'M4 20h5v-5h5v-5h6 M16 4h4v6',
  layers: 'M3 8l9-5 9 5-9 5z M3 12l9 5 9-5 M3 16l9 5 9-5',
  award: 'M17 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M8 12l-2 9 6-3 6 3-2-9',
  leaf: 'M4 19C1 8 11 3 20 4c0 10-5 16-12 13 M4 21L15 10',
  lock: 'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3',
  heart: 'M12 21S2 14 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-10 13-10 13',
  shield: 'M12 2l8 3v7c0 5-8 10-8 10S4 17 4 12V5z',
});
export function createIcon(name, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.65', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: `ui-icon ${className}`.trim()})) svg.setAttribute(key, value);
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[name] || paths.user); svg.append(path); return svg;
}
