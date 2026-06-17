import { useState, useEffect, useRef } from 'react'

import { Printer } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { jsPDF } from 'jspdf'

import { configSistemaService, lojasService } from '../services/index'
import { useAuth } from '../context/AuthContext'
import { Modal } from './ui/index'
import { toast } from '../lib/toast'

export function EtiquetaModal({ produto, onClose }) {
  const { perfil } = useAuth()
  const [logoVersa, setLogoVersa] = useState(null)
  const [logoLoja, setLogoLoja] = useState(null)
  const [nomeLoja, setNomeLoja] = useState(produto?.loja || perfil?.loja || 'Grupo Versa')
  const [origem, setOrigem] = useState('Estoque')
  const [nf, setNf] = useState('')
  const [numPedido, setNumPedido] = useState('')
  const [volumes, setVolumes] = useState(1)
  const [totalVolumes, setTotalVolumes] = useState(1)
  const [quantidade, setQuantidade] = useState(1)
  const [nomeCliente, setNomeCliente] = useState('')
  const [copias, setCopias] = useState(1)
  const [imprimindo, setImprimindo] = useState(false)
  const barcodeRef = useRef(null)

  const nomeProduto = produto?.nome || produto?.nome_produto || ''
  const codigoBarras = String(produto?.codigo_barras || produto?.referencia || produto?.sku || '0000000000000')
  const dataEmissao = new Date().toLocaleDateString('pt-BR')
  const nomeEmitente = perfil?.full_name || perfil?.email || ''

  useEffect(() => {
    configSistemaService.get().then(d => {
      if (d?.logo_versa_url) setLogoVersa(d.logo_versa_url)
    }).catch(() => {})
    const ljNome = produto?.loja || perfil?.loja
    if (ljNome) {
      lojasService.list().then(lojas => {
        const found = lojas.find(l => l.nome === ljNome)
        if (found) {
          setNomeLoja(found.nome)
          if (found.logo_url) setLogoLoja(found.logo_url)
        }
      }).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!barcodeRef.current) return
    try {
      JsBarcode(barcodeRef.current, codigoBarras, {
        format: 'CODE128', width: 2, height: 50,
        displayValue: true, fontSize: 11, margin: 4,
        background: '#ffffff', lineColor: '#000000',
      })
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadImgAsDataUrl = async (url) => {
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      return new Promise(res => {
        const fr = new FileReader()
        fr.onload = () => res(fr.result)
        fr.onerror = () => res(null)
        fr.readAsDataURL(blob)
      })
    } catch { return null }
  }

  const gerarPDF = async () => {
    setImprimindo(true)
    try {
      const doc = new jsPDF({ unit: 'mm', format: [100, 150], orientation: 'portrait' })

      const bCanvas = document.createElement('canvas')
      let barcodeImg = null, bCanvasH = 0, bCanvasW = 0
      try {
        JsBarcode(bCanvas, codigoBarras, {
          format: 'CODE128', width: 2, height: 60,
          displayValue: true, fontSize: 12, margin: 6,
          background: '#ffffff', lineColor: '#000000',
        })
        barcodeImg = bCanvas.toDataURL('image/png')
        bCanvasH = bCanvas.height
        bCanvasW = bCanvas.width
      } catch {}

      const [imgVersa, imgLoja] = await Promise.all([
        logoVersa ? loadImgAsDataUrl(logoVersa) : Promise.resolve(null),
        logoLoja ? loadImgAsDataUrl(logoLoja) : Promise.resolve(null),
      ])

      for (let i = 0; i < copias; i++) {
        if (i > 0) doc.addPage()
        let y = 7

        if (imgVersa || imgLoja) {
          if (imgVersa) { try { doc.addImage(imgVersa, 'PNG', 5, y, 28, 13) } catch {} }
          if (imgLoja) { try { doc.addImage(imgLoja, 'PNG', 67, y, 28, 13) } catch {} }
          y += 17
        }

        doc.setFontSize(11); doc.setFont('helvetica', 'bold')
        doc.text(nomeLoja, 50, y, { align: 'center' }); y += 6

        doc.setDrawColor(180, 180, 180); doc.line(5, y, 95, y); y += 5

        doc.setFontSize(10); doc.setFont('helvetica', 'bold')
        const pLines = doc.splitTextToSize(nomeProduto, 85)
        doc.text(pLines, 5, y); y += pLines.length * 5 + 2

        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        doc.text(`Origem: ${origem}`, 5, y); y += 5
        doc.text(`NF: ${nf || '—'}`, 5, y)
        doc.text(`Pedido: ${numPedido || '—'}`, 52, y); y += 5
        doc.text(`Volume: ${volumes} de ${totalVolumes}`, 5, y)
        doc.text(`Qtd: ${quantidade}`, 52, y); y += 5
        doc.setFontSize(8)
        doc.text(`Emissão: ${dataEmissao}   Emitido por: ${nomeEmitente}`, 5, y); y += 5

        if (nomeCliente) {
          doc.setFontSize(9); doc.setFont('helvetica', 'bold')
          doc.text(`Cliente: ${nomeCliente}`, 5, y)
          doc.setFont('helvetica', 'normal'); y += 5
        }

        doc.setDrawColor(180, 180, 180); doc.line(5, y, 95, y); y += 4

        if (barcodeImg && bCanvasW > 0) {
          const bw = 85
          const bh = (bCanvasH / bCanvasW) * bw
          doc.addImage(barcodeImg, 'PNG', 7, y, bw, bh)
        }
      }

      doc.autoPrint()
      window.open(doc.output('bloburl'), '_blank')
    } catch (e) { toast.error('Erro ao gerar PDF: ' + e.message) }
    setImprimindo(false)
  }

  return (
    <Modal title="Gerar Etiqueta" onClose={onClose}>
      <div style={{ background:'#fff', color:'#000', border:'2px solid #ddd', borderRadius:8, padding:'12px 16px', maxWidth:340, margin:'0 auto 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, minHeight:28 }}>
          {logoVersa ? <img src={logoVersa} alt="Versa" style={{ height:26, objectFit:'contain', maxWidth:90 }} /> : <span style={{ fontSize:11, fontWeight:700, color:'#6366f1' }}>VERSA</span>}
          {logoLoja ? <img src={logoLoja} alt="Loja" style={{ height:26, objectFit:'contain', maxWidth:90 }} /> : <span style={{ fontSize:10, color:'#888' }}>{nomeLoja}</span>}
        </div>
        <div style={{ borderBottom:'1px solid #ddd', paddingBottom:5, marginBottom:5, textAlign:'center', fontWeight:700, fontSize:13 }}>{nomeLoja}</div>
        <div style={{ fontWeight:700, fontSize:12, marginBottom:3 }}>{nomeProduto}</div>
        <div style={{ fontSize:11, color:'#555' }}>Origem: <b>{origem}</b></div>
        <div style={{ display:'flex', gap:12, fontSize:11, color:'#555', margin:'2px 0' }}>
          <span>NF: <b>{nf || '—'}</b></span>
          <span>Pedido: <b>{numPedido || '—'}</b></span>
        </div>
        <div style={{ display:'flex', gap:12, fontSize:11, color:'#555', margin:'2px 0' }}>
          <span>Vol: <b>{volumes}/{totalVolumes}</b></span>
          <span>Qtd: <b>{quantidade}</b></span>
        </div>
        <div style={{ fontSize:10, color:'#777', margin:'2px 0' }}>{dataEmissao} · {nomeEmitente}</div>
        {nomeCliente && <div style={{ fontSize:11, fontWeight:700, margin:'2px 0' }}>Cliente: {nomeCliente}</div>}
        <div style={{ borderTop:'1px solid #ddd', marginTop:6, paddingTop:6, textAlign:'center' }}>
          <canvas ref={barcodeRef} style={{ maxWidth:'100%' }} />
        </div>
      </div>

      <div className="grid2">
        <div className="fg">
          <label className="fl">Origem</label>
          <select className="fi" value={origem} onChange={e => setOrigem(e.target.value)}>
            {['Estoque','Showroom','Depósito','CD'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="fg">
          <label className="fl">Cópias</label>
          <input className="fi" type="number" min={1} max={50} value={copias} onChange={e => setCopias(Math.max(1, parseInt(e.target.value)||1))} />
        </div>
        <div className="fg">
          <label className="fl">Nota Fiscal</label>
          <input className="fi" value={nf} onChange={e => setNf(e.target.value)} placeholder="Nº da NF" />
        </div>
        <div className="fg">
          <label className="fl">Nº Pedido</label>
          <input className="fi" value={numPedido} onChange={e => setNumPedido(e.target.value)} placeholder="Nº do pedido" />
        </div>
        <div className="fg">
          <label className="fl">Volume atual</label>
          <input className="fi" type="number" min={1} value={volumes} onChange={e => setVolumes(Math.max(1, parseInt(e.target.value)||1))} />
        </div>
        <div className="fg">
          <label className="fl">Total de volumes</label>
          <input className="fi" type="number" min={1} value={totalVolumes} onChange={e => setTotalVolumes(Math.max(1, parseInt(e.target.value)||1))} />
        </div>
        <div className="fg">
          <label className="fl">Quantidade</label>
          <input className="fi" type="number" min={1} value={quantidade} onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value)||1))} />
        </div>
        <div className="fg">
          <label className="fl">Nome do cliente</label>
          <input className="fi" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} placeholder="Destinatário" />
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:12 }}>
        <button className="btn btn-p" style={{ flex:1 }} onClick={gerarPDF} disabled={imprimindo}>
          {imprimindo ? 'Gerando...' : <><Printer size={14} strokeWidth={1.8} /> Imprimir Etiqueta</>}
        </button>
        <button className="btn btn-s" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  )
}
