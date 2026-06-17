import { useState, useEffect, useRef } from 'react'

import { Modal, Alert } from './ui/index'

export function LeitorCodigoBarras({ onScan, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [erro, setErro] = useState(null)
  const [ultimo, setUltimo] = useState(null)
  const ultimoRef = useRef(null)

  const beep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880; osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15)
    } catch {}
  }

  useEffect(() => {
    let active = true
    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/library')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader
        const devices = await reader.listVideoInputDevices()
        if (!devices.length) { setErro('Nenhuma câmera encontrada'); return }
        const deviceId = devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId || devices[0]?.deviceId
        await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
          if (!active || !result) return
          const text = result.getText()
          if (text === ultimoRef.current) return
          ultimoRef.current = text
          setUltimo(text)
          beep()
          onScan(text)
        })
      } catch (e) { if (active) setErro('Câmera indisponível: ' + (e.message || e)) }
    }
    start()
    return () => { active = false; readerRef.current?.reset() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fechar = () => { readerRef.current?.reset(); onClose() }

  return (
    <Modal title="Escanear Código de Barras" onClose={fechar}>
      {erro ? <Alert type="error">{erro}</Alert> : (
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', maxWidth: 400, margin: '0 auto' }}>
          <video ref={videoRef} style={{ width: '100%', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 220, height: 90, border: '2px solid #6366f1', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', position: 'relative' }}>
              {[['top:-2px', 'left:-2px', 'borderTop', 'borderLeft', '4px 0 0 0'], ['top:-2px', 'right:-2px', 'borderTop', 'borderRight', '0 4px 0 0'], ['bottom:-2px', 'left:-2px', 'borderBottom', 'borderLeft', '0 0 0 4px'], ['bottom:-2px', 'right:-2px', 'borderBottom', 'borderRight', '0 0 4px 0']].map(([t, s, b1, b2, r], i) => (
                <div key={i} style={{ position: 'absolute', [t.split(':')[0]]: t.split(':')[1], [s.split(':')[0]]: s.split(':')[1], width: 20, height: 20, [b1]: '3px solid #6366f1', [b2]: '3px solid #6366f1', borderRadius: r }} />
              ))}
            </div>
          </div>
        </div>
      )}
      {ultimo && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(99,102,241,.12)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--t2)' }}>Lido</div>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'monospace', color: 'var(--accent)' }}>{ultimo}</div>
        </div>
      )}
      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: 'var(--t2)' }}>
        Aponte a câmera para o código de barras
      </div>
      <button className="btn btn-s" style={{ width: '100%', marginTop: 10 }} onClick={fechar}>Fechar</button>
    </Modal>
  )
}
