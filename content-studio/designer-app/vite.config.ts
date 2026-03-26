import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { extractReadablePage } from './api/extract-url-core.js'

/** Serves POST /api/extract-url during `vite` dev (same behavior as Vercel serverless). */
function extractUrlDevPlugin(): import('vite').Plugin {
  return {
    name: 'enkrypt-extract-url-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''
        if (pathname !== '/api/extract-url') {
          next()
          return
        }
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        try {
          const raw = await new Promise<string>((resolve, reject) => {
            const parts: Buffer[] = []
            req.on('data', (chunk: Buffer) => {
              parts.push(chunk)
            })
            req.on('end', () => {
              resolve(
                parts.length === 0 ? '' : Buffer.concat(parts).toString('utf8'),
              )
            })
            req.on('error', reject)
          })
          let json: { url?: string }
          try {
            json = JSON.parse(raw || '{}') as { url?: string }
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid JSON' }))
            return
          }
          const url = json?.url
          if (!url || typeof url !== 'string') {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing url' }))
            return
          }
          const result = await extractReadablePage(url)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (e: unknown) {
          const err = e as { status?: number; message?: string }
          const status = typeof err.status === 'number' ? err.status : 502
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || 'Fetch error' }))
        }
      })
    },
  }
}

export default defineConfig({
  base: '/designer/',
  build: {
    outDir: '../public/designer',
    emptyOutDir: true,
  },
  plugins: [
    extractUrlDevPlugin(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      /** Shared `content-studio/lib/*` — same `@/lib/...` imports as Next.js */
      {
        find: /^@\/lib\/(.*)$/,
        replacement: `${path.resolve(__dirname, '../lib')}/$1`,
      },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      /** Shared with Content Studio Workspace + landing — one source for Enkrypt tokens */
      {
        find: '@studio-brand',
        replacement: path.resolve(__dirname, '../lib/brand/enkrypt-defaults.js'),
      },
    ],
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
