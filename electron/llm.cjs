// Lightweight internal LLM integration for Electron main process
// Tries local Ollama first; falls back to @xenova/transformers text-generation
let log
try { log = require('electron-log') } catch {}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b'

let _pipeline = null
async function getPipeline(primaryModel = 'Xenova/Qwen2.5-1.5B-Instruct') {
  if (_pipeline) return _pipeline
  try {
    const { pipeline } = await import('@xenova/transformers')
    // Use Qwen2.5 for stronger responses; may download at first run
    _pipeline = await pipeline('text-generation', primaryModel, { device: 'cpu' })
    log?.info?.('[LLM] Loaded transformers model', primaryModel)
    return _pipeline
  } catch (err) {
    log?.warn?.('[LLM] Primary model failed, trying TinyLlama', err?.message || err)
    try {
      const { pipeline } = await import('@xenova/transformers')
      _pipeline = await pipeline('text-generation', 'Xenova/TinyLlama-1.1B-Chat-v1.0', { device: 'cpu' })
      log?.info?.('[LLM] Loaded TinyLlama fallback')
      return _pipeline
    } catch (err2) {
      log?.error?.('[LLM] Failed to load any transformers model', err2?.message || err2)
      throw err2
    }
  }
}

async function tryOllama({ messages, maxTokens = 256, temperature = 0.2 }) {
  const url = `${OLLAMA_URL}/api/chat`
  const body = JSON.stringify({
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: { temperature, num_predict: maxTokens },
  })
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
  const json = await res.json()
  const text = json?.message?.content || json?.response || ''
  if (!text) throw new Error('Ollama returned empty response')
  return text
}

function buildPromptFromMessages(messages, system) {
  const lines = []
  if (system) {
    lines.push(`سیستم: ${system}`)
  }
  for (const m of messages) {
    if (m.role === 'user') lines.push(`کاربر: ${m.content}`)
    else if (m.role === 'assistant') lines.push(`دستیار: ${m.content}`)
  }
  lines.push('دستیار:')
  return lines.join('\n')
}

async function tryTransformers({ messages, system, maxTokens = 256, temperature = 0.2 }) {
  const pipe = await getPipeline()
  const prompt = buildPromptFromMessages(messages, system)
  const out = await pipe(prompt, {
    max_new_tokens: Math.max(32, Math.min(1024, maxTokens)),
    temperature,
    do_sample: temperature > 0,
    return_full_text: false,
  })
  const text = Array.isArray(out) ? out[0]?.generated_text : out?.generated_text
  return (text || '').trim()
}

exports.complete = async function complete(payload) {
  try {
    // Prefer Ollama if available
    const text = await tryOllama({ messages: payload?.messages || [], maxTokens: payload?.maxTokens, temperature: payload?.temperature })
    return { ok: true, text }
  } catch (err) {
    log?.warn?.('[LLM] Ollama unavailable, using transformers', err?.message || err)
    try {
      const text = await tryTransformers({ messages: payload?.messages || [], system: payload?.system, maxTokens: payload?.maxTokens, temperature: payload?.temperature })
      return { ok: true, text }
    } catch (err2) {
      log?.error?.('[LLM] Transformers failed', err2?.message || err2)
      return { ok: false, error: String(err2?.message || err2) }
    }
  }
}