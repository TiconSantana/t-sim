import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public/brand');
const ink = '#071B30';
const inkLight = '#EAF4FA';
const blue = '#1769AA';
const orange = '#E4762D';
const green = '#167D62';
const violet = '#6C5BD4';

function mark({ background = 'none', foreground = inkLight, accent = orange, size = 120, title = 'Símbolo T-Sim' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title><desc id="desc">T estrutural com rota de decisão e nó de sinal.</desc>
  <rect width="120" height="120" rx="28" fill="${background}"/>
  <path d="M19 22h67v14H62v50H45V36H19z" fill="${foreground}"/>
  <path d="M68 56c0-11 9-20 22-20 6 0 11 2 15 5v14c-4-3-8-5-13-5-5 0-8 2-8 5 0 3 2 4 8 6 10 3 15 8 15 16 0 11-9 19-23 19-6 0-12-2-16-4V78c5 3 9 4 14 4 4 0 7-2 7-5 0-3-2-4-8-6-9-3-13-7-13-15z" fill="${accent}"/>
  <circle cx="96" cy="22" r="7" fill="${green}"/>
  <path d="M96 22l-11 18" fill="none" stroke="${green}" stroke-width="3" stroke-linecap="round" opacity=".72"/>
</svg>`;
}

function logo({ dark = false, compact = false } = {}) {
  const foreground = dark ? ink : inkLight;
  const word = dark ? ink : '#FFFFFF';
  const sub = dark ? '#6A859E' : '#9DB8CA';
  const bg = dark ? 'none' : ink;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 690 160" role="img" aria-labelledby="title desc">
  <title id="title">T-Sim</title><desc id="desc">T-Sim — Simular antes. Decidir melhor.</desc>
  <rect width="160" height="160" rx="40" fill="${bg}"/>
  <g transform="translate(20 20)">${mark({ foreground, accent: orange, size: 120 }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>
  <text x="200" y="84" fill="${word}" font-family="Space Grotesk, Arial, sans-serif" font-size="58" font-weight="700" letter-spacing="-2">T-Sim</text>
  ${compact ? '' : `<text x="203" y="117" fill="${sub}" font-family="DM Sans, Arial, sans-serif" font-size="16" letter-spacing="1.8">SIMULAR ANTES · DECIDIR MELHOR</text>`}
</svg>`;
}

const specs = {
  overview: ['Visão geral', blue, '<circle cx="60" cy="58" r="22" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="60" cy="58" r="8" fill="currentColor"/><path d="M60 22v12M60 82v12M24 58h12M84 58h12" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'],
  simulator: ['Simulador', orange, '<path d="M27 40h42l-11-11M93 76H51l11 11" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M69 40l-9 9m-10 27l9-9" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>'],
  people: ['People', blue, '<circle cx="46" cy="45" r="12" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="78" cy="47" r="9" fill="none" stroke="currentColor" stroke-width="5"/><path d="M25 88c2-16 11-24 21-24s19 8 21 24M63 88c1-11 7-17 15-17 8 0 14 6 16 17" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'],
  scenarios: ['Cenários', violet, '<path d="M60 25l27 16-27 16-27-16zM33 58l27 16 27-16M33 75l27 16 27-16" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>'],
  ops: ['Operação', green, '<path d="M60 23l31 12v22c0 20-13 33-31 40-18-7-31-20-31-40V35z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M44 58l11 11 21-23" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'],
  reports: ['Pareceres', blue, '<path d="M35 24h34l16 16v56H35z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M69 24v17h16M47 59h26M47 73h20" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'],
  budget: ['Budget', orange, '<path d="M30 88V60M60 88V39M90 88V25" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><path d="M23 94h74" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'],
  analytics: ['Analytics', violet, '<path d="M24 87l23-25 15 13 34-39" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="87" r="5" fill="currentColor"/><circle cx="47" cy="62" r="5" fill="currentColor"/><circle cx="62" cy="75" r="5" fill="currentColor"/><circle cx="96" cy="36" r="5" fill="currentColor"/>'],
  ai: ['T-Sim AI', green, '<path d="M60 25l5 18 18 5-18 5-5 18-5-18-18-5 18-5zM89 69l3 10 10 3-10 3-3 10-3-10-10-3 10-3z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>'],
  settings: ['Configurações', blue, '<path d="M31 36h58M31 60h58M31 84h58" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="48" cy="36" r="8" fill="white" stroke="currentColor" stroke-width="5"/><circle cx="76" cy="60" r="8" fill="white" stroke="currentColor" stroke-width="5"/><circle cx="55" cy="84" r="8" fill="white" stroke="currentColor" stroke-width="5"/>'],
};

function moduleLogo(name, [label, accent, glyph]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-labelledby="title desc">
  <title id="title">T-Sim ${label}</title><desc id="desc">Símbolo visual da visão ${label}.</desc>
  <rect width="120" height="120" rx="28" fill="#F4F7F9" stroke="#D7E2EA" stroke-width="2"/>
  <path d="M20 21h44v10H48v18H36V31H20z" fill="${ink}"/>
  <path d="M57 40c0-7 6-13 14-13 4 0 7 1 10 3v9c-3-2-5-3-8-3-3 0-5 1-5 3 0 2 1 3 5 4 6 2 10 5 10 10 0 7-6 12-15 12-4 0-8-1-11-3v-9c3 2 6 3 9 3s5-1 5-3c0-2-1-3-5-4-6-2-9-4-9-9z" fill="${accent}"/>
  <circle cx="93" cy="22" r="5" fill="${green}"/>
  <g color="${accent}">${glyph}</g>
</svg>`;
}

await mkdir(root, { recursive: true });
const files = {
  't-sim-mark.svg': mark({ background: ink, foreground: inkLight, title: 'T-Sim · símbolo' }),
  't-sim-logo.svg': logo({ dark: false }),
  't-sim-logo-light.svg': logo({ dark: false }),
  't-sim-logo-dark.svg': logo({ dark: true }),
};
for (const [name, spec] of Object.entries(specs)) files[`t-sim-${name}.svg`] = moduleLogo(name, spec);
files['t-sim-brand-sheet.svg'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" role="img" aria-labelledby="title desc"><title id="title">T-Sim · prancha de identidade</title><desc id="desc">Logo principal e logos das visões do T-Sim.</desc><rect width="960" height="540" fill="#F4F7F9"/><g transform="translate(52 42) scale(.8)">${logo({ dark: true })}</g>${Object.keys(specs).map((name, i) => `<g transform="translate(${52 + (i % 5) * 175} ${250 + Math.floor(i / 5) * 140})"><image href="t-sim-${name}.svg" width="92" height="92"/><text x="0" y="108" fill="#0A2541" font-family="DM Sans, Arial" font-size="14">${specs[name][0]}</text></g>`).join('')}</svg>`;
await Promise.all(Object.entries(files).map(([name, contents]) => writeFile(path.join(root, name), contents, 'utf8')));
await writeFile(path.resolve('public/icon.svg'), mark({ background: ink, foreground: inkLight, title: 'T-Sim · ícone PWA' }), 'utf8');
console.log(`Generated ${Object.keys(files).length + 1} T-Sim brand assets in ${root}`);
