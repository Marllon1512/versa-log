export function SuperAdminSemEmpresa() {
  return (
    <div className="empty" style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Acesso disponível apenas via impersonation</div>
      <div style={{ fontSize: 14, color: 'var(--t2)', maxWidth: 380, margin: '0 auto' }}>
        Como Super Admin, selecione uma empresa específica para visualizar dados operacionais.
      </div>
    </div>
  )
}
