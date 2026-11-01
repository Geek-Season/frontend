// SVG-кадры → PNG (нужен Playwright с Chromium): node scripts/ascii/render.cjs <папка с frameNN.svg>
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const dir = process.argv[2] || '.'
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 640, height: 508 } })
  const frames = fs.readdirSync(dir).filter((f) => /^frame\d+\.svg$/.test(f)).sort()
  for (const f of frames) {
    await page.setContent(`<body style="margin:0">${fs.readFileSync(path.join(dir, f), 'utf8')}</body>`)
    await page.screenshot({ path: path.join(dir, f.replace('.svg', '.png')) })
  }
  await browser.close()
})()
