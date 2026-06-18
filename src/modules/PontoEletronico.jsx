import { useState, useEffect } from 'react'

import { useData } from '../hooks/index'
import { useAuth } from '../context/AuthContext'
import { Alert, Spinner, Empty } from '../components/ui/index'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { PONTO_LABELS, PONTO_COLORS, PONTO_BG, normTipoMarcacao, calcSaldoHoras } from '../lib/pontoUtils'
import {
  pontoService, escalasTrabalhoService, pontoOcorrenciasService, cercasVirtuaisService,
} from '../services/index'

const PONTO_SEQUENCIA = ['entrada', 'saida_almoco', 'retorno_almoco', 'saida']

async function gerarOcorrenciaPonto(tipo_marcacao, dataHora, escala, usuarioId, lojaId) {
  if (!escala || !usuarioId) return
  const hoje = dataHora.toISOString().split('T')[0]
  const horaAtual = dataHora.getHours() * 60 + dataHora.getMinutes()
  const parseHora = (h) => { if (!h) return null; const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm }
  const tolerancia = escala.tolerancia_minutos || 10
  if (tipo_marcacao === 'entrada' && escala.hora_entrada) {
    const previsto = parseHora(escala.hora_entrada)
    if (previsto !== null && horaAtual > previsto + tolerancia) {
      await pontoOcorrenciasService.create({
        usuario_id: usuarioId, loja_id: lojaId || null, data: hoje, tipo: 'atraso',
        descricao: `Entrada às ${dataHora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}, previsto ${escala.hora_entrada}`,
        minutos: horaAtual - previsto, status: 'pendente',
      })
    }
  }
  if (tipo_marcacao === 'saida' && escala.hora_saida) {
    const previsto = parseHora(escala.hora_saida)
    if (previsto !== null) {
      if (horaAtual < previsto - tolerancia) {
        await pontoOcorrenciasService.create({
          usuario_id: usuarioId, loja_id: lojaId || null, data: hoje, tipo: 'saida_antecipada',
          descricao: `Saída às ${dataHora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}, previsto ${escala.hora_saida}`,
          minutos: previsto - horaAtual, status: 'pendente',
        })
      } else if (horaAtual > previsto + 15) {
        await pontoOcorrenciasService.create({
          usuario_id: usuarioId, loja_id: lojaId || null, data: hoje, tipo: 'hora_extra',
          descricao: `Saída às ${dataHora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}, previsto ${escala.hora_saida}`,
          minutos: horaAtual - previsto, status: 'pendente',
        })
      }
    }
  }
}

export default function Ponto() {
  const { perfil, isGestor, empresaId } = useAuth()
  const [time, setTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [comprovante, setComprovante] = useState(null)

  const { data: pontos, reload }             = useData(() => pontoService.listHoje(perfil?.id), [perfil?.id])
  const { data: todosPontos, reload: reTodos } = useData(() => isGestor ? pontoService.listAllHoje() : Promise.resolve([]), [isGestor])
  const { data: cercas }                     = useData(() => cercasVirtuaisService.list(), [])
  const { data: escala }                     = useData(() => perfil?.id ? escalasTrabalhoService.getEscalaHoje(perfil?.id) : Promise.resolve(null), [perfil?.id])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const registrosHoje  = pontos || []
  const indexProximo   = Math.min(registrosHoje.length, 3)
  const proximoTipo    = PONTO_SEQUENCIA[indexProximo]
  const todosFeitos    = registrosHoje.length >= 4

  const horarioEscala  = escala ? {
    entrada: escala.hora_entrada, saida_almoco: escala.hora_saida_almoco,
    retorno_almoco: escala.hora_retorno_almoco, saida: escala.hora_saida,
  }[proximoTipo] : null

  const saldo = calcSaldoHoras(registrosHoje)

  const obterGeolocalizacao = () => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => resolve(null),
      { timeout: 8000, maximumAge: 0 }
    )
  })

  const registrar = async () => {
    if (todosFeitos || loading) return
    setLoading(true)
    try {
      const now      = new Date()
      const dataHoje = now.toISOString().split('T')[0]
      const geo      = await obterGeolocalizacao()
      let dentroCerca = true, distancia = null

      if (geo) {
        const cercaLoja = (cercas || []).find(c => c.loja_id === perfil?.loja_id) || (cercas || [])[0]
        if (cercaLoja) {
          distancia   = cercasVirtuaisService.calcularDistancia(geo.lat, geo.lon, Number(cercaLoja.latitude), Number(cercaLoja.longitude))
          dentroCerca = distancia <= cercaLoja.raio_metros
          if (!dentroCerca) {
            await supabase.from('ponto_ocorrencias').insert({
              usuario_id: perfil?.id,
              data: dataHoje,
              tipo: 'marcacao_fora_cerca',
              descricao: `Marcação fora da cerca. Distância: ${distancia}m (raio permitido: ${cercaLoja.raio_metros}m)`,
              status: 'pendente',
              ...(empresaId ? { empresa_id: empresaId } : {}),
            })
          }
        }
      } else {
        dentroCerca = false
        await supabase.from('ponto_ocorrencias').insert({
          usuario_id: perfil?.id,
          data: dataHoje,
          tipo: 'marcacao_fora_cerca',
          descricao: 'Localização não disponível no momento do registro',
          status: 'pendente',
          ...(empresaId ? { empresa_id: empresaId } : {}),
        })
      }

      await pontoService.registrar({
        usuario_id:           perfil?.id,
        usuario_nome:         perfil?.full_name,
        tipo:                 PONTO_LABELS[proximoTipo],
        tipo_marcacao:        proximoTipo,
        data_hora:            now.toISOString(),
        data:                 dataHoje,
        latitude:             geo?.lat ?? null,
        longitude:            geo?.lon ?? null,
        dentro_cerca:         dentroCerca,
        distancia_loja_metros: distancia,
        device_info:          navigator.userAgent?.slice(0, 200) || null,
      })

      if (escala) await gerarOcorrenciaPonto(proximoTipo, now, escala, perfil?.id, perfil?.loja_id).catch(() => {})
      await reload()
      if (isGestor) await reTodos()
      setComprovante({ tipo: proximoTipo, horario: now, dentroCerca, distancia, geo })
      toast.success(`${PONTO_LABELS[proximoTipo]} registrado!`)
    } catch (e) {
      toast.error(`Erro ao registrar: ${e?.message || 'desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const porFuncionario = {}
  ;(todosPontos || []).forEach(p => {
    if (!porFuncionario[p.usuario_id]) porFuncionario[p.usuario_id] = { nome: p.usuario_nome, pontos: [] }
    porFuncionario[p.usuario_id].pontos.push(p)
  })

  return (
    <div className="page">
      <div className="ph"><h1>Ponto Eletrônico</h1></div>

      {/* Aviso de privacidade */}
      <Alert type="info" style={{ marginBottom: 12, fontSize: 12 }}>
        📍 A localização é capturada <strong>apenas no momento de bater o ponto</strong> para fins de controle de jornada, conforme a CLT.
      </Alert>

      {/* Card principal do funcionário */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 18 }}>
        <div className="clock">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 18 }}>
          {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>

        {/* Próxima marcação */}
        {!todosFeitos ? (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>Próxima marcação</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: PONTO_COLORS[proximoTipo], marginBottom: 4 }}>
              {PONTO_LABELS[proximoTipo]}
            </div>
            {horarioEscala && (
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                Previsto na escala: <strong>{horarioEscala}</strong>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--green)', fontWeight: 600, marginBottom: 18 }}>
            ✅ Jornada completa registrada hoje
          </div>
        )}

        {/* Saldo de horas */}
        {saldo && (
          <div style={{ fontSize: 13, color: 'var(--green)', marginBottom: 16 }}>⏱ {saldo} trabalhadas hoje</div>
        )}

        {/* Botão único */}
        {!todosFeitos && (
          <button
            className="btn btn-p"
            style={{ width: '100%', padding: 16, fontSize: 15, fontWeight: 700, background: PONTO_COLORS[proximoTipo], border: 'none', justifyContent: 'center' }}
            onClick={registrar}
            disabled={loading}
          >
            {loading ? 'Registrando...' : `Registrar ${PONTO_LABELS[proximoTipo]}`}
          </button>
        )}
      </div>

      {/* Registros do dia */}
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Meus registros de hoje</div>
      {registrosHoje.length === 0 ? <Empty text="Nenhum registro hoje" /> : registrosHoje.map((p, i) => {
        const tm = normTipoMarcacao(p)
        return (
          <div key={p.id} className="li" style={{ cursor: 'default' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: PONTO_BG[tm] || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: PONTO_COLORS[tm] || 'var(--t2)' }}>{i + 1}</span>
            </div>
            <div className="li-main">
              <div className="li-title" style={{ color: PONTO_COLORS[tm] }}>{PONTO_LABELS[tm] || p.tipo}</div>
              <div className="li-sub">
                {new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                {p.dentro_cerca === false && <span style={{ color: 'var(--amber)', marginLeft: 8 }}>⚠️ fora da cerca</span>}
              </div>
            </div>
            <span style={{ fontSize: 11, color: p.dentro_cerca === false ? 'var(--amber)' : 'var(--green)' }}>
              {p.dentro_cerca === false ? '🟡' : p.latitude ? '🟢' : '⚪'}
            </span>
          </div>
        )
      })}

      {/* Equipe (gestor) */}
      {isGestor && Object.keys(porFuncionario).length > 0 && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 12, marginTop: 28 }}>Ponto da equipe hoje</div>
          {Object.values(porFuncionario).map(func => {
            const h = calcSaldoHoras(func.pontos)
            return (
              <div className="card" key={func.nome} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{func.nome}</div>
                  {h && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>⏱ {h}</span>}
                </div>
                {func.pontos.map(p => {
                  const tm = normTipoMarcacao(p)
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: PONTO_COLORS[tm] || 'var(--t2)' }}>{PONTO_LABELS[tm] || p.tipo}</span>
                      <span>{new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </>
      )}

      {/* Comprovante */}
      {comprovante && (
        <div className="overlay" onClick={() => setComprovante(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="mh"><h2>Comprovante de Ponto</h2></div>
            <div className="mb" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {comprovante.dentroCerca ? '🟢' : '🟡'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: PONTO_COLORS[comprovante.tipo], marginBottom: 4 }}>
                {PONTO_LABELS[comprovante.tipo]}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                {comprovante.horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
                {comprovante.horario.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 12, color: comprovante.dentroCerca ? 'var(--green)' : 'var(--amber)', marginBottom: 8, fontWeight: 600 }}>
                {comprovante.dentroCerca ? '✅ Dentro da área da loja' : '⚠️ Fora da área esperada — DP será notificado'}
              </div>
              {comprovante.geo && (
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>
                  📍 {comprovante.geo.lat.toFixed(5)}, {comprovante.geo.lon.toFixed(5)}
                  {comprovante.distancia != null && ` · ${comprovante.distancia}m da loja`}
                </div>
              )}
              {!comprovante.geo && (
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>📍 Localização não disponível</div>
              )}
              <button className="btn btn-p" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} onClick={() => setComprovante(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
