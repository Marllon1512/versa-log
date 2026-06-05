import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    '[Versa Log] Variáveis de ambiente ausentes: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ' +
    'precisam estar configuradas no arquivo .env (local) ou nas variáveis de ambiente do Vercel (produção).'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
