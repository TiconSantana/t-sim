import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudEnabled = Boolean(supabaseUrl && supabaseKey);
export const supabase = cloudEnabled
  ? createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  : null;

const WORKSPACE_SIMULATOR = 't-sim-workspace';
const WORKSPACE_NAME = 'Workspace principal T-Sim';

export async function getCloudSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signInCloud(email, password) {
  if (!supabase) return { error: new Error('Cloud não configurada.') };
  const result = await supabase.auth.signInWithPassword({ email, password });
  return result;
}

export async function signUpCloud(email, password) {
  if (!supabase) return { error: new Error('Cloud não configurada.') };
  const result = await supabase.auth.signUp({ email, password });
  return result;
}

export async function signOutCloud() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}

async function getCollaboratorId(userId) {
  const { data, error } = await supabase
    .from('colaborador')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function loadCloudWorkspace(session) {
  if (!supabase || !session?.user?.id) return { payload: null, error: null };
  try {
    const collaboratorId = await getCollaboratorId(session.user.id);
    if (!collaboratorId) return { payload: null, error: new Error('Usuário autenticado ainda não está vinculado a um colaborador Tconnect.') };
    const { data, error } = await supabase
      .from('cenario_simulador')
      .select('id, parametros, criado_em')
      .eq('colaborador_id', collaboratorId)
      .eq('simulador', WORKSPACE_SIMULATOR)
      .order('criado_em', { ascending: false })
      .limit(1);
    if (error) throw error;
    const record = data?.[0];
    return { payload: record?.parametros ?? null, workspaceId: record?.id ?? null, error: null };
  } catch (error) {
    return { payload: null, error };
  }
}

export async function saveCloudWorkspace(session, payload, workspaceId = null) {
  if (!supabase || !session?.user?.id) return { workspaceId: null, error: null };
  try {
    const collaboratorId = await getCollaboratorId(session.user.id);
    if (!collaboratorId) return { workspaceId: null, error: new Error('Usuário autenticado ainda não está vinculado a um colaborador Tconnect.') };
    const body = {
      colaborador_id: collaboratorId,
      simulador: WORKSPACE_SIMULATOR,
      nome: WORKSPACE_NAME,
      parametros: payload,
    };
    if (workspaceId) {
      const { data, error } = await supabase
        .from('cenario_simulador')
        .update(body)
        .eq('id', workspaceId)
        .select('id')
        .single();
      if (error) throw error;
      return { workspaceId: data.id, error: null };
    }
    const { data: existing, error: existingError } = await supabase
      .from('cenario_simulador')
      .select('id')
      .eq('colaborador_id', collaboratorId)
      .eq('simulador', WORKSPACE_SIMULATOR)
      .order('criado_em', { ascending: false })
      .limit(1);
    if (existingError) throw existingError;
    if (existing?.[0]?.id) {
      const { data, error } = await supabase
        .from('cenario_simulador')
        .update(body)
        .eq('id', existing[0].id)
        .select('id')
        .single();
      if (error) throw error;
      return { workspaceId: data.id, error: null };
    }
    const { data, error } = await supabase
      .from('cenario_simulador')
      .insert(body)
      .select('id')
      .single();
    if (error) throw error;
    return { workspaceId: data.id, error: null };
  } catch (error) {
    return { workspaceId: null, error };
  }
}

export function describeCloudError(error) {
  if (!error) return '';
  if (error.message?.includes('not linked')) return 'Conta autenticada sem vínculo no cadastro Tconnect.';
  if (error.message?.includes('Invalid login credentials')) return 'E-mail ou senha não conferem.';
  return error.message || 'Não foi possível sincronizar com o Supabase.';
}
