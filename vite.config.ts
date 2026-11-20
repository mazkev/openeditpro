import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { EdgeTTS } from 'node-edge-tts'

function edgeTTSPlugin(): Plugin {
  const handler = async (req: any, res: any) => {
    // Enable CORS and basic preflight handling
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
    }

    const processTTS = async (
      text: string,
      voice: string,
      rate: string,
      pitch: string,
      volume: string
    ) => {
      const cleanText = text.trim()
      if (!cleanText) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ error: 'Text cannot be empty' }))
      }

      const tts = new EdgeTTS({
        voice: voice || 'id-ID-ArdiNeural',
        rate: rate || '+0%',
        pitch: pitch || '+0Hz',
        volume: volume || '+0%',
        timeout: 25000,
      })

      const buffers: Buffer[] = []
      for await (const chunk of tts.streamAudio(cleanText)) {
        if (Buffer.isBuffer(chunk)) {
          buffers.push(chunk)
        }
      }

      if (buffers.length === 0) {
        throw new Error('No audio generated from Edge TTS')
      }

      const fullBuffer = Buffer.concat(buffers)
      res.statusCode = 200
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Content-Length', fullBuffer.length)
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.end(fullBuffer)
    }

    if (req.method === 'POST') {
      let bodyStr = ''
      req.on('data', (chunk: any) => {
        bodyStr += chunk
      })
      req.on('end', async () => {
        try {
          const body = JSON.parse(bodyStr || '{}')
          await processTTS(
            body.text || '',
            body.voice || 'id-ID-ArdiNeural',
            body.rate || '+0%',
            body.pitch || '+0Hz',
            body.volume || '+0%'
          )
        } catch (err: any) {
          console.error('[Edge TTS Plugin Error]:', err?.message || err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err?.message || 'TTS Error' }))
        }
      })
      return
    }

    if (req.method === 'GET') {
      try {
        const urlObj = new URL(req.url, 'http://localhost')
        const text = urlObj.searchParams.get('text') || ''
        const voice = urlObj.searchParams.get('voice') || 'id-ID-ArdiNeural'
        const rate = urlObj.searchParams.get('rate') || '+0%'
        const pitch = urlObj.searchParams.get('pitch') || '+0Hz'
        const volume = urlObj.searchParams.get('volume') || '+0%'
        await processTTS(text, voice, rate, pitch, volume)
      } catch (err: any) {
        console.error('[Edge TTS Plugin Error]:', err?.message || err)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err?.message || 'TTS Error' }))
      }
      return
    }

    res.statusCode = 405
    res.end('Method Not Allowed')
  }

  return {
    name: 'vite-plugin-edge-tts',
    configureServer(server) {
      server.middlewares.use('/api/edge-tts', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/edge-tts', handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), edgeTTSPlugin()],
  server: {
    proxy: {
      '/api/tts': {
        target: 'https://translate.google.com/translate_tts',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tts/, ''),
        headers: {
          'Referer': 'https://translate.google.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
  preview: {
    proxy: {
      '/api/tts': {
        target: 'https://translate.google.com/translate_tts',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tts/, ''),
        headers: {
          'Referer': 'https://translate.google.com/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
})
