/**
 * Cria os usuários do Versa Log no Supabase Auth + tabela usuarios.
 *
 * ANTES DE RODAR:
 *   1. Acesse https://supabase.com/dashboard/project/kwccjkqltllypbmaisio/settings/api
 *   2. Copie a chave "service_role" (seção "Project API keys")
 *   3. Cole em .env: SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * COMO RODAR:
 *   node scripts/criar-usuarios.js
 *
 * Para adicionar novos funcionários, edite o array USUARIOS abaixo e rode novamente.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Lê variáveis do .env ──────────────────────────────────────
const envPath = join(__dirname, '..', '.env')
let envVars = {}
try {
  envVars = Object.fromEntries(
    readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=')
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')]
      })
  )
} catch {
  console.error('❌  Arquivo .env não encontrado em', envPath)
  process.exit(1)
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || 'https://kwccjkqltllypbmaisio.supabase.co'
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'COLE_AQUI') {
  console.error('\n❌  SUPABASE_SERVICE_ROLE_KEY não configurada!\n')
  console.error('   Passos:')
  console.error('   1. Acesse https://supabase.com/dashboard/project/kwccjkqltllypbmaisio/settings/api')
  console.error('   2. Copie a chave "service_role" (começa com "eyJ...")')
  console.error('   3. Adicione no .env: SUPABASE_SERVICE_ROLE_KEY=eyJ...\n')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Lista de usuários da equipe ───────────────────────────────
// Edite aqui para adicionar/alterar membros da equipe
const USUARIOS = [
  {
    email: 'admin@versalog.com',
    password: 'Versa@2026',
    full_name: 'Marllon Augusto',
    role: 'admin',
  },
  {
    email: 'gestor@versalog.com',
    password: 'Versa@2026',
    full_name: 'Carlos Gestor',
    role: 'gestor',
  },
  {
    email: 'entregador@versalog.com',
    password: 'Versa@2026',
    full_name: 'João Entregador',
    role: 'entregador',
  },
  {
    email: 'motorista@versalog.com',
    password: 'Versa@2026',
    full_name: 'Pedro Motorista',
    role: 'motorista',
  },
]

// ── Lógica de criação ─────────────────────────────────────────
async function criarOuAtualizar(u) {
  let authId

  // 1. Tenta criar no Supabase Auth
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true, // pula verificação de email
  })

  if (authErr) {
    const jaExiste = authErr.message.toLowerCase().includes('already') ||
                     authErr.message.includes('already been registered')
    if (jaExiste) {
      // Usuário já existe — busca o UUID existente
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
      if (listErr) { console.error(`  ❌ Erro ao listar users: ${listErr.message}`); return }
      const existing = list?.users?.find(x => x.email === u.email)
      if (!existing) { console.error(`  ❌ Não encontrou ${u.email} após conflict`); return }
      authId = existing.id
      console.log(`  ⚠️  Auth: ${u.email} já existia — id ${authId}`)
    } else {
      console.error(`  ❌ Auth: ${u.email} — ${authErr.message}`)
      return
    }
  } else {
    authId = created.user.id
    console.log(`  ✅ Auth: ${u.email} criado — id ${authId}`)
  }

  // 2. Upsert na tabela usuarios (mesmo UUID do Auth → FK consistente)
  const { error: dbErr } = await admin
    .from('usuarios')
    .upsert(
      { id: authId, email: u.email, full_name: u.full_name, role: u.role },
      { onConflict: 'email' }
    )

  if (dbErr) {
    console.error(`  ❌ DB usuarios: ${u.email} — ${dbErr.message} | ${dbErr.details}`)
  } else {
    console.log(`  ✅ DB usuarios: ${u.email} → role=${u.role}`)
  }
}

// ── Main ──────────────────────────────────────────────────────
console.log('\n🔧  Criando/sincronizando usuários Versa Log no Supabase...\n')

for (const u of USUARIOS) {
  console.log(`👤  ${u.full_name} (${u.email})`)
  await criarOuAtualizar(u)
  console.log()
}

console.log('✅  Concluído! Agora faça login normalmente com email/senha.')
console.log('    O JWT será gerado e o Supabase liberará os inserts.\n')
