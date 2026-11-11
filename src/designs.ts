// Original postcard front artwork. 4x6 postcard with 1/8" bleed at 300dpi = 1875x1275.
export const W = 1875
export const H = 1275

export type Design = { id: string; name: string; description: string; svg: () => string }

const frame = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`

const snowflakes = (n: number, seed: number, color = '#fff') => {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  let out = ''
  for (let i = 0; i < n; i++) {
    out += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" r="${(3 + rnd() * 9).toFixed(1)}" fill="${color}" opacity="${(0.5 + rnd() * 0.5).toFixed(2)}"/>`
  }
  return out
}

const title = (text: string, fill: string, y = 1150) =>
  `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="110" font-style="italic" fill="${fill}">${text}</text>`

export const designs: Design[] = [
  {
    id: 'snowy-cabin',
    name: 'Snowy Cabin',
    description: 'A warm cabin under a starry winter night.',
    svg: () =>
      frame(`
        <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1d3a"/><stop offset="1" stop-color="#2b4c7e"/></linearGradient></defs>
        <rect width="${W}" height="${H}" fill="url(#sky)"/>
        <circle cx="1500" cy="250" r="110" fill="#f6f1d5"/>
        ${snowflakes(140, 7)}
        <path d="M0 900 Q 450 760 900 880 T ${W} 840 V ${H} H 0 Z" fill="#eef3fb"/>
        <rect x="760" y="640" width="360" height="260" fill="#7a3e1d"/>
        <path d="M720 650 L940 470 L1160 650 Z" fill="#f4f7fb"/>
        <rect x="900" y="760" width="80" height="140" fill="#3b1d0c"/>
        <rect x="800" y="700" width="70" height="70" fill="#ffd56b"/>
        <rect x="1010" y="700" width="70" height="70" fill="#ffd56b"/>
        <rect x="1060" y="500" width="40" height="110" fill="#5b2c12"/>
        ${title('Season’s Greetings', '#0b1d3a')}`),
  },
  {
    id: 'geometric-tree',
    name: 'Geometric Tree',
    description: 'A modern triangle-stacked tree with a gold star.',
    svg: () =>
      frame(`
        <rect width="${W}" height="${H}" fill="#f7f1e3"/>
        ${[0, 1, 2, 3]
          .map((i) => {
            const top = 170 + i * 190
            const half = 170 + i * 90
            const shade = ['#2f6b4f', '#2a5f46', '#24533d', '#1e4734'][i]
            return `<path d="M${W / 2} ${top} L${W / 2 + half} ${top + 280} L${W / 2 - half} ${top + 280} Z" fill="${shade}"/>`
          })
          .join('')}
        <rect x="${W / 2 - 50}" y="1010" width="100" height="70" fill="#7a4b2a"/>
        <path d="M937 70 l28 60 66 8 -49 45 13 65 -58 -33 -58 33 13 -65 -49 -45 66 -8z" fill="#d9a521"/>
        ${[[860, 520, '#c0392b'], [1010, 640, '#d9a521'], [840, 820, '#c0392b'], [1080, 900, '#d9a521'], [960, 420, '#c0392b']]
          .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="26" fill="${c}"/>`)
          .join('')}
        ${title('Merry Christmas', '#24533d', 1200)}`),
  },
  {
    id: 'ornaments',
    name: 'Ornaments',
    description: 'Three hanging baubles on a deep red background.',
    svg: () =>
      frame(`
        <rect width="${W}" height="${H}" fill="#8e1b24"/>
        ${snowflakes(60, 21, '#f3c9cc')}
        ${[[520, 380, '#d9a521'], [940, 560, '#eef3fb'], [1360, 420, '#2f6b4f']]
          .map(
            ([x, y, c]) => `
              <line x1="${x}" y1="0" x2="${x}" y2="${Number(y) - 190}" stroke="#f3e3b3" stroke-width="6"/>
              <rect x="${Number(x) - 35}" y="${Number(y) - 200}" width="70" height="50" rx="8" fill="#c9a24a"/>
              <circle cx="${x}" cy="${y}" r="160" fill="${c}"/>
              <path d="M${Number(x) - 160} ${y} Q ${x} ${Number(y) + 70} ${Number(x) + 160} ${y}" stroke="#8e1b24" stroke-width="14" fill="none" opacity="0.5"/>`,
          )
          .join('')}
        ${title('Happy Holidays', '#f7f1e3', 1100)}`),
  },
  {
    id: 'robot-elf',
    name: 'Robot Elf',
    description: 'A friendly little robot in a holiday hat — sent by an agent.',
    svg: () =>
      frame(`
        <rect width="${W}" height="${H}" fill="#163a5f"/>
        ${snowflakes(110, 42)}
        <rect x="0" y="980" width="${W}" height="${H - 980}" fill="#eef3fb"/>
        <rect x="770" y="520" width="340" height="300" rx="40" fill="#cfd8e3"/>
        <rect x="810" y="580" width="260" height="150" rx="24" fill="#1d2b3a"/>
        <circle cx="880" cy="655" r="30" fill="#6ff0c4"/>
        <circle cx="1000" cy="655" r="30" fill="#6ff0c4"/>
        <path d="M890 770 Q 940 800 990 770" stroke="#1d2b3a" stroke-width="12" fill="none"/>
        <path d="M770 530 L1000 330 L1110 530 Z" fill="#c0392b"/>
        <rect x="750" y="500" width="380" height="60" rx="30" fill="#f7f7f7"/>
        <circle cx="1000" cy="320" r="40" fill="#f7f7f7"/>
        <rect x="800" y="820" width="280" height="170" rx="30" fill="#b7c3d0"/>
        <rect x="700" y="840" width="90" height="40" rx="20" fill="#b7c3d0"/>
        <rect x="1090" y="840" width="90" height="40" rx="20" fill="#b7c3d0"/>
        ${title('Beep boop, happy holidays!', '#163a5f', 1160)}`),
  },
]

export const designIds = designs.map((d) => d.id) as [string, ...string[]]

export const findDesign = (id: string) => designs.find((d) => d.id === id)
