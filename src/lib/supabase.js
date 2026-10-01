// Cliente de Supabase (Etapa 2). La clave publicable es pública por diseño:
// la seguridad la dan las políticas RLS (cada usuario solo ve sus filas).
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL || 'https://jikonxuznepdyhcjyysh.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_eoXYR6yUrBlY94BrEe8B6w_ULPOgu04'

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
