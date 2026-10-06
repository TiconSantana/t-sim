import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  : null;

export const cloudConfig = {
  enabled: Boolean(supabase),
  url: supabaseUrl || '',
};

export async function getCloudSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInCloud(email, password) {
  if (!supabase) throw new Error('Supabase não configurado neste ambiente.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUpCloud(email, password) {
  if (!supabase) throw new Error('Supabase não configurado neste ambiente.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  return data.session;
}

export async function signOutCloud() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function currentCollaborator() {
  if (!supabase) throw new Error('Supabase não configurado neste ambiente.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Faça login para acessar o workspace compartilhado.');
  const { data, error } = await supabase
    .from('colaborador')
    .select('id, empresa_id')
    .eq('auth_user_id', authData.user.id)
    .single();
  if (error) throw new Error('Sua conta ainda não está vinculada a uma empresa no Tconnect.');
  return data;
}

export async function listCloudWorkspaces() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('tsim_workspace')
    .select('id, nome, schema_version, payload, criado_em, atualizado_em, arquivado_em')
    .is('arquivado_em', null)
    .order('atualizado_em', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCloudWorkspace({ name, payload }) {
  const collaborator = await currentCollaborator();
  const { data: workspace, error } = await supabase
    .from('tsim_workspace')
    .insert({ empresa_id: collaborator.empresa_id, owner_id: collaborator.id, nome: name, payload })
    .select('id, nome, schema_version, payload, criado_em, atualizado_em')
    .single();
  if (error) throw error;
  const { error: memberError } = await supabase.from('tsim_workspace_member').insert({
    workspace_id: workspace.id,
    colaborador_id: collaborator.id,
    papel: 'owner',
  });
  if (memberError) throw memberError;
  return workspace;
}

export async function updateCloudWorkspace(workspaceId, payload) {
  const { data, error } = await supabase
    .from('tsim_workspace')
    .update({ payload })
    .eq('id', workspaceId)
    .select('id, nome, schema_version, payload, criado_em, atualizado_em')
    .single();
  if (error) throw error;
  return data;
}
