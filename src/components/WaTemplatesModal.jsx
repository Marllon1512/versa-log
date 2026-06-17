import { Ic, Modal } from './ui/index'

export function WaTemplatesModal({ pedido, onClose, tipo = 'entregador' }) {
  const nome = pedido.cliente?.split(' ')[0] || pedido.cliente || ''
  const num = pedido.numero_pedido || ''
  const data = pedido.data_entrega ? new Date(pedido.data_entrega + 'T12:00').toLocaleDateString('pt-BR') : ''

  const templates = tipo === 'entregador' ? [
    { icon: '🚚', label: 'A caminho', msg: `Olá ${nome}! Sou da Versa Log e estou a caminho com seu pedido #${num}. Chego em breve! 🚚` },
    { icon: '📦', label: 'Cheguei', msg: `Olá ${nome}! Estou na porta com seu pedido #${num}. Por favor me aguarde! 📦` },
    { icon: '❌', label: 'Ausente', msg: `Olá ${nome}! Tentei entregar seu pedido #${num} mas não encontrei ninguém no endereço. Por favor entre em contato para reagendar. 📞` },
  ] : [
    { icon: '✅', label: 'Confirmação', msg: `Olá ${nome}! Seu pedido #${num} está confirmado para entrega${data ? ` em ${data}` : ' em breve'}. Qualquer dúvida estamos à disposição! 🗓` },
    { icon: '📅', label: 'Remarcação', msg: `Olá ${nome}! Informamos que a entrega do pedido #${num} precisou ser remarcada. Em breve entraremos em contato com a nova data. Pedimos desculpas pelo transtorno. 📅` },
    { icon: '🚫', label: 'Cancelamento', msg: `Olá ${nome}! Infelizmente seu pedido #${num} foi cancelado. Entre em contato com nossa equipe para mais informações. 🚫` },
  ]

  const enviar = (msg) => {
    const tel = pedido.telefone?.replace(/\D/g, '')
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
    onClose()
  }

  return (
    <Modal title="Enviar via WhatsApp" subtitle={pedido.telefone} onClose={onClose}>
      {templates.map(t => (
        <div
          key={t.label}
          onClick={() => enviar(t.msg)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, cursor: 'pointer', gap: 12 }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{t.icon} {t.label}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.msg.substring(0, 72)}…
            </div>
          </div>
          <Ic n="wa" s={16} style={{ color: '#25D366', flexShrink: 0 }} />
        </div>
      ))}
    </Modal>
  )
}
