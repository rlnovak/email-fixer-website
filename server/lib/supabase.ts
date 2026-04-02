import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Usar createClient sem genérico e tipar as queries individualmente.
// Quando as credenciais Supabase estiverem disponíveis, executar:
//   npx supabase gen types typescript --project-id <id> > server/lib/database.types.ts
// e importar o tipo gerado aqui.

export type OrderInsert = {
  domain: string;
  email: string;
  registrar?: string | null;
  status?: string;
  amount_brl?: number;
  scan_result?: unknown;
};

export type OrderRow = {
  id: string;
  domain: string;
  email: string;
  registrar: string | null;
  status: string;
  amount_brl: number;
  stripe_session_id: string | null;
  scan_result: unknown;
  delivered_at: string | null;
  created_at: string;
};

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configurados.');
    }
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}
