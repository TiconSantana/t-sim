import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Database,
  Download,
  DollarSign,
  FileText,
  FileSpreadsheet,
  Gauge,
  LineChart,
  Layers3,
  Menu,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Settings,
  TriangleAlert,
  UsersRound,
  X,
} from 'lucide-react';
import { cargos, custo, MESES } from './data/cargos';
import { costAssumptions, operationalCosts, teamClasses } from './data/operacao';
import { calculateSimulation } from './domain/simulation';
import { calculateCoverage, validateScenarioForApproval } from './domain/operations';
import { loadApprovals, loadConfiguration, loadOperations, loadSavedScenarios, saveApproval, saveConfiguration, saveOperations, saveScenario } from './storage/scenarios';
import { cloudEnabled, describeCloudError, getCloudSession, loadCloudWorkspace, signInCloud, signOutCloud, signUpCloud, saveCloudWorkspace, supabase } from './cloud/supabase';
import * as XLSX from 'xlsx';
import './styles.css';

const navItems = [
  { id: 'overview', label: 'Visão geral', icon: Gauge },
  { id: 'simulator', label: 'Simulador', icon: SlidersHorizontal },
  { id: 'people', label: 'Cargos e pessoas', icon: UsersRound },
  { id: 'scenarios', label: 'Cenários', icon: Layers3 },
  { id: 'ops', label: 'Operação', icon: Activity },
  { id: 'reports', label: 'Pareceres', icon: FileText },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', icon: LineChart },
  { id: 'ai', label: 'T-Sim AI', icon: Sparkles },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const platformViews = [
  { id: 'overview', label: 'Visão geral', eyebrow: 'RADAR', decision: 'Encontre o próximo ponto de decisão', source: 'Cargos · cenários · cobertura', accent: 'blue' },
  { id: 'simulator', label: 'Simulador', eyebrow: 'MOVIMENTO', decision: 'Teste origem, destino e quantidade', source: 'Custo empresa · delta · saldo', accent: 'orange' },
  { id: 'people', label: 'People', eyebrow: 'BASE', decision: 'Confirme a grade e a elegibilidade', source: '6 níveis · salários · encargos', accent: 'blue' },
  { id: 'scenarios', label: 'Cenários', eyebrow: 'ALTERNATIVAS', decision: 'Compare escolhas antes de aprovar', source: 'Conservador · equilibrado · agressivo', accent: 'violet' },
  { id: 'ops', label: 'Ops', eyebrow: 'COBERTURA', decision: 'Proteja SLA, equipe e capacidade', source: 'Headcount · requisito · margem', accent: 'green' },
  { id: 'reports', label: 'Pareceres', eyebrow: 'AUDITORIA', decision: 'Registre evidência e aprovação', source: 'Fonte · versão · decisão', accent: 'blue' },
  { id: 'budget', label: 'Budget', eyebrow: 'FOLHA', decision: 'Leia o impacto no orçamento', source: 'Waterfall · ADM · BDI · margem', accent: 'orange' },
  { id: 'analytics', label: 'Analytics', eyebrow: 'INDICADORES', decision: 'Observe custos e padrões', source: 'Campo · sala técnica · equipes', accent: 'violet' },
  { id: 'ai', label: 'T-Sim AI', eyebrow: 'VALIDAÇÃO', decision: 'Pergunte o que ainda falta validar', source: 'Regras locais · lacunas declaradas', accent: 'green' },
  { id: 'settings', label: 'Configurações', eyebrow: 'CONTROLE', decision: 'Gerencie fontes e persistência', source: 'Backup · restauração · versão', accent: 'blue' },
];

function money(value, compact = false) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: compact ? 0 : 2,
  }).format(value);
}

function formatPercent(value) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

function Metric({ label, value, detail, tone = 'neutral', icon: Icon }) {
  return (
    <article className={`metric metric-${tone}`}>
      <div className="metric-topline">
        <span>{label}</span>
        {Icon && <Icon size={15} strokeWidth={1.8} aria-hidden="true" />}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ScenarioCard({ id, title, kicker, value, detail, active, tone, onClick }) {
  return (
    <button className={`scenario-card ${active ? 'is-active' : ''} scenario-${tone}`} onClick={onClick} aria-pressed={active}>
      <span className="scenario-kicker"><span className="scenario-dot" />{kicker}</span>
      <span className="scenario-title">{title}</span>
      <strong>{value}</strong>
      <span className="scenario-detail">{detail}</span>
      <ChevronRight size={16} className="scenario-arrow" aria-hidden="true" />
    </button>
  );
}

function PeopleView({ cargoList, encargos, onSaveConfiguration, onResetConfiguration, saved }) {
  const [draftCargos, setDraftCargos] = useState(() => cargoList.map((cargo) => ({ ...cargo })));
  const [draftEncargos, setDraftEncargos] = useState(Math.round(encargos * 100));
  const [message, setMessage] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef(null);
  const totalMonthly = draftCargos.reduce((sum, cargo) => sum + custo(cargo, draftEncargos / 100), 0);
  const hasChanges = draftEncargos !== Math.round(encargos * 100) || draftCargos.some((cargo, index) => cargo.salary !== cargoList[index].salary);

  function updateSalary(id, value) {
    setDraftCargos((current) => current.map((cargo) => cargo.id === id ? { ...cargo, salary: Math.max(0, Number(value) || 0) } : cargo));
  }

  function saveChanges() {
    onSaveConfiguration({ cargos: draftCargos, encargos: draftEncargos / 100 });
    setMessage('Premissas salvas e aplicadas ao simulador');
  }

  function resetChanges() {
    setDraftCargos(cargos.map((cargo) => ({ ...cargo })));
    setDraftEncargos(113);
    onResetConfiguration();
    setMessage('Valores de referência restaurados');
  }

  function normalizeLabel(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }

  async function importSpreadsheet(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
      const nextCargos = draftCargos.map((cargo) => ({ ...cargo }));
      let found = 0;
      rows.forEach((row) => {
        const label = normalizeLabel(row?.[0]);
        const rawValue = typeof row?.[1] === 'number'
          ? row[1]
          : Number(String(row?.[1] ?? '').replace(/\./g, '').replace(',', '.'));
        if (!Number.isFinite(rawValue) || rawValue <= 0) return;
        let id = null;
        if (label.includes('AUXILIAR')) id = 'auxiliar';
        else if (label.includes('TECNICO') && (label.includes('VI') || label.includes('N/6'))) id = 'tecnico-vi';
        else if (label.includes('TECNICO') && (label.includes('IV') || label.includes('N/4'))) id = 'tecnico-n4';
        else if (label.includes('TECNICO') && (label.includes('III') || label.includes('N/3'))) id = 'tecnico-n3';
        else if (label.includes('TECNICO') && (label.includes('II') || label.includes('N/2'))) id = 'tecnico-ii';
        else if (label.includes('TECNICO') && (label.includes('V') || label.includes('N/5'))) id = 'tecnico-v';
        if (!id) return;
        const index = nextCargos.findIndex((cargo) => cargo.id === id);
        if (index >= 0) {
          nextCargos[index] = { ...nextCargos[index], salary: rawValue };
          found += 1;
        }
      });
      if (!found) {
        setImportMessage('Nenhum cargo compatível encontrado nas duas primeiras colunas.');
      } else {
        setDraftCargos(nextCargos);
        setImportMessage(`${found} cargo(s) importado(s). Revise e salve as premissas.`);
        setMessage('');
      }
    } catch {
      setImportMessage('Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <>
      <section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> BASE DE PESSOAS</div><h1>Conheça a sua<br /><em>estrutura.</em></h1><p>Edite a grade salarial e os encargos de referência. As alterações salvas alimentam imediatamente o simulador e os cenários.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Fonte ativa</div><strong>RH / Controladoria</strong><span>{saved ? 'Configuração local salva' : 'Grade salarial · versão 1.4'}</span><button onClick={() => setMessage('Fonte de referência: arquivos de análise gerencial fornecidos para o T-Sim.')}>Ver origem <ChevronRight size={14} /></button></div></section>
      <section className="metric-grid"><Metric label="Cargos cadastrados" value={draftCargos.length} detail="níveis de fibra óptica" tone="blue" icon={Layers3} /><Metric label="Custo mensal total" value={money(totalMonthly)} detail="salário + encargos configurados" tone="green" icon={BarChart3} /><Metric label="Amplitude salarial" value={`${Math.round((draftCargos.at(-1).salary / Math.max(1, draftCargos[0].salary) - 1) * 100)}%`} detail="entre nível I e nível VI" tone="violet" icon={ArrowUpRight} /><Metric label="Premissa de encargos" value={`${draftEncargos}%`} detail="editável · aplicada no simulador" tone="orange" icon={ClipboardCheck} /></section>
      <section className="panel-surface assumptions-editor"><div className="assumptions-editor-title"><div><span className="section-index">01</span><div><h2>Premissas salariais</h2><p>Valores de referência editáveis. O custo empresa é recalculado automaticamente.</p></div></div><div className="editor-toolbar"><input ref={fileInputRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={importSpreadsheet} /><button className="secondary-button" onClick={() => fileInputRef.current?.click()}>Importar planilha</button><label className="encargo-field"><span>Encargos (%)</span><input aria-label="Percentual de encargos" type="number" min="0" step="0.1" value={draftEncargos} onChange={(event) => setDraftEncargos(Math.max(0, Number(event.target.value) || 0))} /></label></div></div><div className="people-table-wrap"><table className="people-table editable-table"><thead><tr><th>Cargo</th><th>Nível</th><th>Salário base editável</th><th>Encargos</th><th>Custo empresa / mês</th><th>Fonte</th></tr></thead><tbody>{draftCargos.map((cargo) => { const total = custo(cargo, draftEncargos / 100); return <tr key={cargo.id}><td><strong>{cargo.name}</strong><small>{cargo.short}</small></td><td><span className={`level-tag level-${cargo.tone}`}>{cargo.level}</span></td><td><label className="salary-input"><span>R$</span><input aria-label={`Salário base ${cargo.short}`} type="number" min="0" step="0.01" value={cargo.salary} onChange={(event) => updateSalary(cargo.id, event.target.value)} /></label></td><td>{money(total - cargo.salary)}</td><td><strong>{money(total)}</strong></td><td><span className="source-type">Informado</span></td></tr>; })}</tbody></table></div><div className="editor-actions"><div><strong>{importMessage || message || (hasChanges ? 'Há alterações ainda não salvas.' : 'Premissas vinculadas à fonte de referência.')}</strong><span>Salvamento local neste navegador</span></div><div><button className="secondary-button" onClick={resetChanges}>Restaurar referência</button><button className="primary-button editor-save" onClick={saveChanges} disabled={!hasChanges}>Salvar premissas</button></div></div></section>
      <section className="people-grid people-insight-row"><aside className="panel-surface people-side-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Leitura da grade</h2><p>Indicadores recalculados</p></div></div></div><div className="grade-insights"><div><span>Menor salário base</span><strong>{money(draftCargos[0].salary)}</strong><small>{draftCargos[0].name}</small></div><div><span>Maior salário base</span><strong>{money(draftCargos.at(-1).salary)}</strong><small>{draftCargos.at(-1).name}</small></div><div><span>Maior salto entre níveis</span><strong>{money(draftCargos[1].salary - draftCargos[0].salary)}</strong><small>Auxiliar → Técnico II</small></div></div></aside><div className="panel-note people-note"><ClipboardCheck size={16} /><span>Configuração provisória em armazenamento local. Benefícios, ADM, BDI e custos de operação permanecem para o módulo Budget. Valores de RH devem ser validados antes de aprovação.</span></div></section>
    </>
  );
}

function ScenariosView({ savedScenarios, onRestore, onGoSimulator }) {
  return (
    <>
      <section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> BIBLIOTECA DE CENÁRIOS</div><h1>Decisões que<br /><em>continuam salvas.</em></h1><p>Reabra uma simulação para continuar a análise, ajustar a quantidade manual ou preparar a aprovação.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Persistência local</div><strong>{savedScenarios.length} cenário{savedScenarios.length === 1 ? '' : 's'} salvo{savedScenarios.length === 1 ? '' : 's'}</strong><span>Pronto para migrar para banco de dados</span><button onClick={onGoSimulator}>Criar novo cenário <ChevronRight size={14} /></button></div></section>
      <section className="metric-grid"><Metric label="Cenários salvos" value={savedScenarios.length} detail="nesta sessão local" tone="blue" icon={Layers3} /><Metric label="Último movimento" value={savedScenarios[0] ? savedScenarios[0].name : '—'} detail={savedScenarios[0] ? new Date(savedScenarios[0].savedAt).toLocaleDateString('pt-BR') : 'nenhum cenário salvo'} tone="green" icon={ClipboardCheck} /><Metric label="Modo manual" value={savedScenarios.filter((scenario) => scenario.manualMode).length} detail="com ajuste de promoções" tone="orange" icon={SlidersHorizontal} /><Metric label="Fonte" value="MVP local" detail="persistência temporária" tone="violet" icon={BookOpen} /></section>
      <section className="panel-surface scenarios-library"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Histórico de simulações</h2><p>Selecione um cenário para restaurar os parâmetros.</p></div></div></div>{savedScenarios.length === 0 ? <div className="empty-state"><Layers3 size={25} /><strong>Nenhum cenário salvo ainda</strong><p>Execute uma simulação e use “Salvar cenário” para começar a biblioteca.</p><button className="primary-button compact-button" onClick={onGoSimulator}>Abrir simulador</button></div> : <div className="scenario-library-list">{savedScenarios.map((scenario) => <article className="scenario-library-item" key={scenario.id}><div className="scenario-library-main"><div className="scenario-library-icon"><ArrowUpRight size={16} /></div><div><strong>{scenario.name}</strong><span>{scenario.quantity} posição{scenario.quantity === 1 ? '' : 'ões'} · {scenario.automaticPromotions} automáticas{scenario.manualMode ? ` · ${scenario.appliedPromotions} manuais` : ''}</span></div></div><div className="scenario-library-result"><strong>{money(scenario.appliedBalance)}</strong><span>saldo mensal aplicado</span></div><div className="scenario-library-date">{new Date(scenario.savedAt).toLocaleDateString('pt-BR')}<button onClick={() => onRestore(scenario)}>Reabrir <ChevronRight size={13} /></button></div></article>)}</div>}</section>
    </>
  );
}

function PlaceholderView({ title, eyebrow, description, icon: Icon }) {
  return <section className="module-placeholder panel-surface"><div className="placeholder-icon"><Icon size={24} /></div><div className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</div><h1>{title}</h1><p>{description}</p><span className="coming-badge">Próxima etapa do MVP</span></section>;
}

function PlatformRail({ onGoView }) {
  return <section className="platform-rail" aria-labelledby="platform-map-title"><div className="platform-rail-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> MAPA DO WORKSPACE</span><h2 id="platform-map-title">Uma marca para cada decisão.</h2><p>As visões do T-Sim compartilham o mesmo símbolo e deixam explícita a decisão, o dado e a fonte que sustentam cada etapa.</p></div><span className="platform-rail-note"><span className="status-dot" /> Identidade vetorial · v1.0</span></div><div className="platform-view-grid">{platformViews.map((view) => <button key={view.id} className={`platform-view-card platform-view-${view.accent}`} onClick={() => onGoView(view.id)}><div className="platform-view-top"><img src={`/brand/t-sim-${view.id}.svg`} alt="" /><span>{view.eyebrow}</span></div><strong>{view.label}</strong><span>{view.decision}</span><small>{view.source}</small><ChevronRight size={15} aria-hidden="true" /></button>)}</div></section>;
}

function OverviewView({ cargoList, encargos, savedScenarios, onGoSimulator, onGoPeople, onGoReports, onGoView }) {
  const totalMonthly = cargoList.reduce((sum, cargo) => sum + custo(cargo, encargos), 0);
  const latest = savedScenarios[0];
  return (
    <>
      <section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> VISÃO GERAL</div><h1>Um radar para<br /><em>decidir melhor.</em></h1><p>Uma leitura consolidada da estrutura salarial, dos cenários simulados e dos próximos pontos de validação.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Workspace ativo</div><strong>V.TAL · Bahia</strong><span>Dados locais sincronizados no navegador</span><button onClick={onGoSimulator}>Abrir simulador <ChevronRight size={14} /></button></div></section>
      <section className="metric-grid"><Metric label="Custo mensal de referência" value={money(totalMonthly)} detail={`${cargoList.length} cargos · encargos ${formatPercent(encargos)}`} tone="blue" icon={BarChart3} /><Metric label="Cenários salvos" value={savedScenarios.length} detail="simulações reabríveis" tone="green" icon={Layers3} /><Metric label="Último saldo aplicado" value={latest ? money(latest.appliedBalance) : '—'} detail={latest ? latest.name : 'salve uma simulação para acompanhar'} tone={latest && latest.appliedBalance < 0 ? 'orange' : 'violet'} icon={latest && latest.appliedBalance < 0 ? ArrowUpRight : Check} /><Metric label="Premissas rastreadas" value="100%" detail="fonte e classificação na tela" tone="orange" icon={ClipboardCheck} /></section>
      <PlatformRail onGoView={onGoView} />
      <section className="overview-grid"><div className="panel-surface overview-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Fluxo recomendado</h2><p>Próximas ações para fechar uma decisão</p></div></div></div><div className="overview-flow"><button onClick={onGoPeople}><span>01</span><strong>Validar cargos</strong><small>Salários e encargos</small><ChevronRight size={15} /></button><button onClick={onGoSimulator}><span>02</span><strong>Simular movimento</strong><small>Economia e promoção</small><ChevronRight size={15} /></button><button onClick={onGoReports}><span>03</span><strong>Preparar aprovação</strong><small>Premissas e parecer</small><ChevronRight size={15} /></button></div></div><div className="panel-surface overview-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Sinais do workspace</h2><p>Leituras rápidas</p></div></div></div><div className="signal-list"><div><span className="signal-icon signal-green"><Check size={14} /></span><div><strong>Grade carregada</strong><small>{cargoList.length} níveis prontos para simulação</small></div></div><div><span className="signal-icon signal-blue"><Layers3 size={14} /></span><div><strong>{savedScenarios.length ? `${savedScenarios.length} cenário salvo` : 'Nenhum cenário salvo'}</strong><small>{savedScenarios.length ? 'Último cenário disponível para reabertura' : 'Comece pelo simulador'}</small></div></div><div><span className="signal-icon signal-orange"><ShieldCheck size={14} /></span><div><strong>Operação ainda precisa de validação</strong><small>Confira cobertura e SLA antes de aprovar</small></div></div></div></div></section>
      <section className="panel-surface overview-panel recent-panel"><div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Últimas simulações</h2><p>Resumo do que está pronto para continuar</p></div></div><button className="text-action" onClick={onGoReports}>Abrir pareceres <ChevronRight size={15} /></button></div>{savedScenarios.length === 0 ? <div className="overview-empty">Nenhuma simulação salva. <button onClick={onGoSimulator}>Abrir o simulador</button></div> : <div className="recent-scenarios">{savedScenarios.slice(0, 4).map((scenario) => <div className="recent-scenario" key={scenario.id}><div><strong>{scenario.name}</strong><span>{scenario.quantity} posição{scenario.quantity === 1 ? '' : 'ões'} · {scenario.appliedPromotions} promoç{scenario.appliedPromotions === 1 ? 'ão' : 'ões'}</span></div><strong className={scenario.appliedBalance < 0 ? 'negative-value' : 'positive-value'}>{money(scenario.appliedBalance)}</strong></div>)}</div>}</section>
    </>
  );
}

function OperationsView({ operations, onSave, calc, quantity }) {
  const [draft, setDraft] = useState(operations);
  const [message, setMessage] = useState('');
  const coverageResult = calculateCoverage({ ...draft, quantity });
  const { current: coverage, afterMovement: projectedCoverage, risk } = coverageResult;
  function update(field, value) { setDraft((current) => ({ ...current, [field]: Math.max(0, Number(value) || 0) })); }
  function save() { onSave(draft); setMessage('Premissas operacionais salvas'); }
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> OPERAÇÃO</div><h1>Proteja a<br /><em>cobertura.</em></h1><p>Uma economia só é sustentável quando a equipe continua capaz de cumprir o volume e o SLA da operação.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Modelo operacional</div><strong>Campo · FTTH</strong><span>Premissas locais editáveis</span><button onClick={save}>Salvar premissas <ChevronRight size={14} /></button></div></section><section className="metric-grid"><Metric label="Headcount atual" value={draft.teamHeadcount} detail="equipe operacional informada" tone="blue" icon={UsersRound} /><Metric label="Headcount requerido" value={draft.requiredHeadcount} detail="cobertura mínima planejada" tone="violet" icon={Activity} /><Metric label="Cobertura atual" value={`${coverage.toFixed(1)}%`} detail={`alvo de ${draft.slaTarget}%`} tone={coverage >= draft.slaTarget ? 'green' : 'orange'} icon={Gauge} /><Metric label="Cobertura após movimento" value={`${projectedCoverage.toFixed(1)}%`} detail={`risco projetado: ${risk}`} tone={risk === 'Baixo' ? 'green' : 'orange'} icon={ShieldCheck} /></section><section className="ops-grid"><div className="panel-surface ops-editor"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Premissas de cobertura</h2><p>Valores de referência do dimensionamento operacional.</p></div></div></div><div className="ops-fields"><label><span>Headcount atual</span><input type="number" min="0" value={draft.teamHeadcount} onChange={(event) => update('teamHeadcount', event.target.value)} /></label><label><span>Headcount requerido</span><input type="number" min="0" value={draft.requiredHeadcount} onChange={(event) => update('requiredHeadcount', event.target.value)} /></label><label><span>SLA alvo (%)</span><input type="number" min="0" max="100" value={draft.slaTarget} onChange={(event) => update('slaTarget', event.target.value)} /></label><label><span>Margem de segurança (%)</span><input type="number" min="0" max="100" value={draft.safetyBuffer} onChange={(event) => update('safetyBuffer', event.target.value)} /></label></div><div className="editor-actions"><div><strong>{message || 'A configuração controla o alerta de cobertura.'}</strong><span>Persistência local · módulo Ops</span></div><button className="primary-button editor-save" onClick={save}>Salvar operação</button></div></div><aside className="panel-surface ops-impact"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Impacto do cenário atual</h2><p>Movimento selecionado no simulador</p></div></div></div><div className="ops-impact-readout"><div><span>Economia mensal</span><strong>{money(calc.economy)}</strong></div><div><span>Promoções aplicadas</span><strong>{calc.appliedPromotions}</strong></div><div><span>Headcount após desligamentos</span><strong>{Math.max(0, draft.teamHeadcount - quantity)}</strong></div></div><div className={`ops-risk-box risk-box-${risk.toLowerCase()}`}><ShieldCheck size={17} /><div><strong>Risco operacional: {risk}</strong><span>Valide cobertura de SLA e capacidade por região antes de aprovar.</span></div></div></aside></section></>;
}

function ReportsView({ savedScenarios, approvals, onApproval, onGoScenarios, currentSnapshot }) {
  function downloadReport(scenario) {
    const report = { produto: 'T-Sim', geradoEm: new Date().toISOString(), scenario, approval: approvals[scenario.id] || { status: 'Rascunho' } };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `tsim-parecer-${scenario.id}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  function downloadSpreadsheet(scenario) {
    const rows = [{
      Produto: 'T-Sim',
      Cenário: scenario.name,
      Posições: scenario.quantity,
      'Promoções automáticas': scenario.automaticPromotions,
      'Promoções aplicadas': scenario.appliedPromotions,
      'Saldo mensal': scenario.appliedBalance,
      Encargos: scenario.encargos,
      Fonte: scenario.source,
      Status: approvals[scenario.id]?.status || 'Rascunho',
    }];
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parecer');
    XLSX.writeFile(workbook, `tsim-parecer-${scenario.id}.xlsx`);
  }
  function printReport() {
    window.print();
  }
  const list = savedScenarios.length ? savedScenarios : currentSnapshot ? [currentSnapshot] : [];
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> PARECERES E APROVAÇÃO</div><h1>Da simulação à<br /><em>decisão.</em></h1><p>Registre a recomendação, mantenha as premissas visíveis e entregue um resumo que a Diretoria consiga revisar.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Trilha de decisão</div><strong>{Object.values(approvals).filter((item) => item.status === 'Aprovado').length} aprovado(s)</strong><span>Decisões locais registradas</span><button onClick={printReport}><FileText size={13} /> Imprimir / PDF</button></div></section><section className="metric-grid"><Metric label="Prontos para revisão" value={list.length} detail="cenários com resumo" tone="blue" icon={FileText} /><Metric label="Em aprovação" value={list.filter((scenario) => approvals[scenario.id]?.status === 'Enviado').length} detail="aguardando decisão" tone="orange" icon={ClipboardCheck} /><Metric label="Aprovados" value={list.filter((scenario) => approvals[scenario.id]?.status === 'Aprovado').length} detail="trilha registrada" tone="green" icon={Check} /><Metric label="Formato de saída" value="JSON + Excel" detail="relatório local exportável" tone="violet" icon={FileSpreadsheet} /></section><section className="panel-surface reports-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Fila de decisão</h2><p>Envie, aprove ou exporte cada cenário.</p></div></div></div>{list.length === 0 ? <div className="empty-state"><FileText size={25} /><strong>Nenhum cenário pronto</strong><p>Salve uma simulação para gerar um parecer.</p><button className="primary-button compact-button" onClick={onGoScenarios}>Abrir cenários</button></div> : <div className="report-list">{list.map((scenario) => { const status = approvals[scenario.id]?.status || 'Rascunho'; const validation = validateScenarioForApproval({ scenario }); const blocked = !validation.valid; return <article className="report-item" key={scenario.id}><div className="report-main"><div className="report-icon"><FileText size={16} /></div><div><strong>{scenario.name}</strong><span>{scenario.quantity} posição{scenario.quantity === 1 ? '' : 'ões'} · {scenario.appliedPromotions} promoções · saldo {money(scenario.appliedBalance)}</span>{blocked && <small className="report-warning">Bloqueado: {validation.message}</small>}</div></div><span className={`approval-status status-${status.toLowerCase()}`}>{status}</span><div className="report-actions"><button disabled={blocked && status !== 'Aprovado'} title={blocked ? validation.message : undefined} onClick={() => onApproval(scenario.id, status === 'Aprovado' ? 'Rascunho' : status === 'Enviado' ? 'Aprovado' : 'Enviado')}>{status === 'Rascunho' ? 'Enviar' : status === 'Enviado' ? 'Aprovar' : 'Reabrir'}</button><button onClick={() => downloadReport(scenario)}><Download size={12} /> JSON</button><button onClick={() => downloadSpreadsheet(scenario)}><FileSpreadsheet size={12} /> Excel</button></div></article>; })}</div>}</section></>;
}

function BudgetView({ calc, cargoList, encargos }) {
  const [horizon, setHorizon] = useState(MESES);
  const payrollReference = cargoList.reduce((sum, cargo) => sum + custo(cargo, encargos), 0);
  const payrollAfter = payrollReference - calc.economy + (calc.appliedPromotions * Math.max(calc.delta, 0));
  const equivalentRevenue = calc.appliedBalance < 0 ? Math.abs(calc.appliedBalance) / 0.15 : 0;
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> BUDGET</div><h1>Veja o custo<br /><em>antes do compromisso.</em></h1><p>Separe a folha de cargos dos custos operacionais e compare a decisão no horizonte escolhido.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Horizonte de análise</div><strong>{horizon} meses</strong><span>Valores anualizados a partir do cenário atual</span><button onClick={() => setHorizon(horizon === 12 ? 24 : 12)}>Alternar horizonte <ChevronRight size={14} /></button></div></section><section className="metric-grid"><Metric label="Folha de referência" value={money(payrollReference)} detail="grade salarial + encargos People" tone="blue" icon={BarChart3} /><Metric label="Folha após cenário" value={money(payrollAfter)} detail={`${horizon} meses: ${money(payrollAfter * horizon)}`} tone={payrollAfter <= payrollReference ? 'green' : 'orange'} icon={ArrowDownRight} /><Metric label="Saldo aplicado" value={money(calc.appliedBalance)} detail={`${horizon} meses: ${money(calc.appliedBalance * horizon)}`} tone={calc.appliedBalance >= 0 ? 'green' : 'orange'} icon={DollarSign} /><Metric label="Receita equivalente" value={equivalentRevenue ? money(equivalentRevenue) : 'Não necessária'} detail="estimada a 15% de margem" tone="violet" icon={Sparkles} /></section><section className="budget-grid"><div className="panel-surface budget-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Waterfall da movimentação</h2><p>Folha atual → desligamentos → promoções → folha projetada</p></div></div></div><div className="budget-waterfall"><div><span>Folha atual</span><strong>{money(payrollReference)}</strong></div><div className="waterfall-negative"><span>Economia de desligamentos</span><strong>− {money(calc.economy)}</strong></div><div className="waterfall-positive"><span>Custo de promoções</span><strong>+ {money(calc.appliedPromotions * Math.max(calc.delta, 0))}</strong></div><div className="waterfall-total"><span>Folha projetada</span><strong>{money(payrollAfter)}</strong></div></div><div className="budget-formula"><span>Fórmula</span><code>folha projetada = folha atual − economia + promoções</code></div></div><aside className="panel-surface budget-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Premissas financeiras</h2><p>Classificação e origem mantidas visíveis</p></div></div></div><div className="assumption-list">{costAssumptions.map((assumption) => <div key={assumption.label}><div><strong>{assumption.label}</strong><span>{assumption.source}</span></div><b>{assumption.value}{assumption.unit}</b></div>)}</div><div className="panel-note"><Database size={16} /><span>O custo operacional completo está disponível no módulo Analytics e permanece separado da regra simplificada de cargos.</span></div></aside></section></>;
}

function AnalyticsView({ savedScenarios }) {
  const [sourceMessage, setSourceMessage] = useState('');
  const totalOperational = operationalCosts.reduce((sum, item) => sum + item.monthlyCost, 0);
  const totalHeadcount = operationalCosts.reduce((sum, item) => sum + item.headcount, 0);
  const maxCost = Math.max(...operationalCosts.map((item) => item.monthlyCost));
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> ANALYTICS</div><h1>Custos e operação<br /><em>na mesma leitura.</em></h1><p>Use os dados operacionais da planilha de custos para contextualizar a decisão de pessoas e identificar concentração de impacto.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Fonte operacional</div><strong>V.TAL · 2025</strong><span>Controle Local, equipes e sala técnica</span><button onClick={() => setSourceMessage('Fonte: Cópia de Custos e Preço V3 · Encargos atualizados')}>Ver fonte <ChevronRight size={14} /></button>{sourceMessage && <small className="source-message">{sourceMessage}</small>}</div></section><section className="metric-grid"><Metric label="Custo operacional mensal" value={money(totalOperational)} detail="contextos importados da planilha" tone="blue" icon={BarChart3} /><Metric label="Headcount de referência" value={totalHeadcount} detail="soma dos contextos operacionais" tone="violet" icon={UsersRound} /><Metric label="Maior concentração" value={money(maxCost)} detail="Controle Local FTTH" tone="orange" icon={TriangleAlert} /><Metric label="Cenários disponíveis" value={savedScenarios.length} detail="para cruzar com operação" tone="green" icon={Layers3} /></section><section className="panel-surface analytics-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Mapa de custo por contexto</h2><p>Valores mensais informados na fonte operacional</p></div></div><span className="source-chip"><span /> Fonte rastreada</span></div><div className="analytics-bars">{operationalCosts.map((item) => <div className="analytics-bar-row" key={item.id}><div className="analytics-bar-label"><strong>{item.label}</strong><small>{item.headcount} HC · {item.source}</small></div><div className="analytics-track"><span style={{ width: `${(item.monthlyCost / maxCost) * 100}%` }} /></div><b>{money(item.monthlyCost, true)}</b></div>)}</div></section><section className="analytics-grid"><div className="panel-surface analytics-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Classes de equipe</h2><p>Custo unitário e headcount de referência</p></div></div></div><div className="class-table">{teamClasses.map((item) => <div key={item.id}><strong>{item.label}</strong><span>{item.headcount} HC · {item.teamCount} equipes</span><b>{money(item.unitCost)}</b></div>)}</div></div><div className="panel-surface analytics-panel"><div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Leitura executiva</h2><p>Pontos para validação</p></div></div></div><div className="insight-list analytics-insights"><div className="insight-item"><span className="insight-number">01</span><div><strong>Contextos não devem ser misturados</strong><p>A grade de cargos usa 113% de encargos; a operação usa 128%, ADM e BDI próprios.</p></div></div><div className="insight-item"><span className="insight-number">02</span><div><strong>Controle local concentra o maior custo</strong><p>Valide headcount e capacidade antes de aprovar uma economia de folha.</p></div></div><div className="insight-item"><span className="insight-number">03</span><div><strong>ROI permanece estimado</strong><p>Sem histórico de retenção, produtividade e turnover, a recomendação deve permanecer indicativa.</p></div></div></div></div></section></>;
}

function SettingsView({ configuration, operations, savedScenarios, approvals, cloud, onCloudSignIn, onCloudSignUp, onCloudSignOut, onResetConfiguration, onClearWorkspace, onRestoreWorkspace }) {
  const [message, setMessage] = useState('');
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const fileInputRef = useRef(null);
  function reset() { onResetConfiguration(); setMessage('Premissas de cargos restauradas.'); }
  function clear() { if (!window.confirm('Limpar cenários, aprovações e operações locais deste navegador?')) return; onClearWorkspace(); setMessage('Cenários, aprovações e operações locais removidos.'); }
  function exportWorkspace() {
    const payload = { produto: 'T-Sim', schemaVersion: 1, exportedAt: new Date().toISOString(), configuration, operations, savedScenarios, approvals };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'tsim-workspace-backup.json'; anchor.click(); URL.revokeObjectURL(url);
    setMessage('Backup local exportado.');
  }
  async function importWorkspace(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.produto !== 'T-Sim' || !payload.configuration?.cargos || !payload.operations) throw new Error('invalid');
      onRestoreWorkspace(payload);
      setMessage('Backup restaurado neste navegador.');
    } catch {
      setMessage('Arquivo inválido. Escolha um backup JSON exportado pelo T-Sim.');
    } finally {
      event.target.value = '';
    }
  }
  async function submitCloud(action) {
    if (!cloudEmail || !cloudPassword) { setMessage('Informe e-mail e senha para continuar.'); return; }
    const result = await action(cloudEmail, cloudPassword);
    if (result?.error) setMessage(describeCloudError(result.error));
    else setMessage(action === onCloudSignUp ? 'Cadastro enviado. Confirme o e-mail se a conta exigir verificação.' : 'Sessão cloud iniciada.');
    setCloudPassword('');
  }
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> CONFIGURAÇÕES</div><h1>Controle as<br /><em>premissas locais.</em></h1><p>Gerencie o workspace local e, quando autenticado, mantenha a mesma simulação disponível em outros aparelhos.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Ambiente atual</div><strong>{cloud.status === 'ready' ? 'Cloud conectado' : 'Local · navegador'}</strong><span>{cloud.status === 'ready' ? cloud.email : 'Fallback local ativo'}</span><button onClick={() => setMessage(cloud.status === 'ready' ? 'Sincronização cloud ativa.' : 'O T-Sim está operando com fallback local.')}>Ver status <ChevronRight size={14} /></button></div></section><section className="settings-grid"><div className="panel-surface settings-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Fonte e governança</h2><p>Metadados do workspace</p></div></div></div><div className="settings-list"><div><span>Workspace</span><strong>V.TAL · Bahia</strong></div><div><span>Responsável</span><strong>Tiago Santana · Administrador</strong></div><div><span>Persistência</span><strong>{cloud.status === 'ready' ? 'Supabase · sincronização ativa' : 'localStorage · fallback'}</strong></div><div><span>Classificação dos resultados</span><strong>Informados, calculados e estimados</strong></div></div></div><div className="panel-surface settings-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Ações do ambiente</h2><p>Recuperação segura do workspace</p></div></div></div><div className="settings-actions"><button className="secondary-button" onClick={reset}>Restaurar cargos e encargos</button><button className="secondary-button" onClick={clear}>Limpar dados locais do workspace</button></div><div className="settings-backup"><input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={importWorkspace} /><button className="secondary-button" onClick={exportWorkspace}>Exportar backup JSON</button><button className="secondary-button" onClick={() => fileInputRef.current?.click()}>Restaurar backup JSON</button></div>{message && <div className="settings-message"><Check size={15} />{message}</div>}<div className="panel-note"><ShieldCheck size={16} /><span>O fallback local permanece disponível para trabalhar sem rede.</span></div></div></section><section className="panel-surface cloud-panel"><div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Sincronização online</h2><p>Acesse os mesmos cenários em qualquer aparelho</p></div></div><span className={`cloud-status cloud-${cloud.status}`}><span />{cloudEnabled ? (cloud.status === 'ready' ? 'Conectado' : cloud.status === 'loading' ? 'Conectando' : 'Disponível') : 'Não configurado'}</span></div>{cloud.status === 'ready' ? <div className="cloud-connected"><div><strong>{cloud.email}</strong><span>Workspace sincronizado com o Supabase</span></div><button className="secondary-button" onClick={onCloudSignOut}>Sair da conta</button></div> : cloudEnabled ? <div className="cloud-auth-grid"><label className="field"><span>E-mail</span><input type="email" value={cloudEmail} onChange={(event) => setCloudEmail(event.target.value)} placeholder="seu@email.com" /></label><label className="field"><span>Senha</span><input type="password" value={cloudPassword} onChange={(event) => setCloudPassword(event.target.value)} placeholder="mínimo de 6 caracteres" /></label><div className="cloud-actions"><button className="primary-button" onClick={() => submitCloud(onCloudSignIn)}>Entrar e sincronizar</button><button className="secondary-button" onClick={() => submitCloud(onCloudSignUp)}>Criar acesso</button></div></div> : <div className="panel-note"><TriangleAlert size={16} /><span>Defina as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na hospedagem para habilitar esta área.</span></div>}{cloud.message && <div className="settings-message"><Database size={15} />{cloud.message}</div>}</section></>;
}

function AiView({ calc, operations }) {
  const coverage = calculateCoverage({ ...operations, quantity: 1 });
  const recommendation = calc.appliedBalance >= 0 && !coverage.approvalBlocked
    ? 'Cenário pronto para revisão executiva'
    : 'Cenário precisa de validação antes da aprovação';
  const tone = calc.appliedBalance >= 0 && !coverage.approvalBlocked ? 'green' : 'orange';
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> T-SIM AI · LOCAL</div><h1>Uma leitura que<br /><em>explica a decisão.</em></h1><p>O assistente local organiza os números do cenário e transforma as premissas em perguntas de validação, sem enviar dados para serviços externos.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Motor ativo</div><strong>Regras rastreáveis</strong><span>Sem API, assinatura ou custo externo</span><button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>Ver análise <ChevronRight size={14} /></button></div></section><section className="metric-grid"><Metric label="Recomendação" value={calc.appliedBalance >= 0 ? 'Favorável' : 'Revisar'} detail="saldo do cenário atual" tone={tone} icon={Sparkles} /><Metric label="Saldo mensal" value={money(calc.appliedBalance)} detail="após promoções aplicadas" tone={calc.appliedBalance >= 0 ? 'green' : 'orange'} icon={DollarSign} /><Metric label="Cobertura projetada" value={`${coverage.afterMovement.toFixed(1)}%`} detail={`alvo de ${operations.slaTarget}%`} tone={coverage.approvalBlocked ? 'orange' : 'blue'} icon={ShieldCheck} /><Metric label="Classificação" value="Estimativa" detail="ROI e retenção exigem histórico" tone="violet" icon={TriangleAlert} /></section><section className="ai-grid"><div className="panel-surface ai-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Parecer automático</h2><p>Explicação baseada nas regras do T-Sim</p></div></div></div><div className={`ai-recommendation ai-${tone}`}><Sparkles size={18} /><div><strong>{recommendation}</strong><span>{calc.appliedPromotions} promoç{calc.appliedPromotions === 1 ? 'ão' : 'ões'} · saldo anual {money(calc.appliedAnnualBalance)}</span></div></div><div className="ai-reading"><p>O movimento libera <b>{money(calc.economy)}</b> por mês e consome <b>{money(calc.appliedPromotions * Math.max(calc.delta, 0))}</b> em progressões.</p><p>{coverage.approvalBlocked ? 'A cobertura projetada está abaixo do SLA alvo. Registre uma justificativa operacional antes de enviar.' : 'A cobertura permanece acima do SLA alvo informado. Confirme elegibilidade e orçamento antes da aprovação.'}</p></div></div><aside className="panel-surface ai-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Perguntas de validação</h2><p>Checklist antes de decidir</p></div></div></div><div className="ai-checklist"><label><input type="checkbox" /> Elegibilidade da pessoa confirmada</label><label><input type="checkbox" /> Fonte salarial e vigência revisadas</label><label><input type="checkbox" /> Cobertura por região validada</label><label><input type="checkbox" /> Centro de custo e orçamento aprovados</label></div><div className="panel-note"><ShieldCheck size={16} /><span>O T-Sim AI local não inventa dados: apenas explica o resultado calculado e aponta lacunas.</span></div></aside></section></>;
}

function App() {
  const [configuration, setConfiguration] = useState(() => loadConfiguration({ cargos, encargos: 1.13 }));
  const configuredCargos = configuration.cargos;
  const configuredEncargos = configuration.encargos;
  const [dismissedRole, setDismissedRole] = useState('auxiliar');
  const [quantity, setQuantity] = useState(1);
  const [originRole, setOriginRole] = useState('auxiliar');
  const [destinationRole, setDestinationRole] = useState('tecnico-ii');
  const [activeScenario, setActiveScenario] = useState('balanced');
  const [manualMode, setManualMode] = useState(false);
  const [manualPromotions, setManualPromotions] = useState(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [activeView, setActiveView] = useState('simulator');
  const [savedScenarios, setSavedScenarios] = useState(() => loadSavedScenarios());
  const [operations, setOperations] = useState(() => loadOperations({ teamHeadcount: 609, requiredHeadcount: 609, slaTarget: 95, safetyBuffer: 10 }));
  const [approvals, setApprovals] = useState(() => loadApprovals());
  const [saveMessage, setSaveMessage] = useState('');
  const [cloud, setCloud] = useState(() => ({ status: cloudEnabled ? 'loading' : 'disabled', email: '', session: null, message: '' }));
  const [cloudWorkspaceId, setCloudWorkspaceId] = useState(() => window.localStorage.getItem('tsim.cloud.workspace-id.v1') || null);

  const calc = useMemo(() => calculateSimulation({
    dismissedRole,
    quantity,
    originRole,
    destinationRole,
    activeScenario,
    manualMode,
    manualPromotions,
    cargoList: configuredCargos,
    encargos: configuredEncargos,
  }), [activeScenario, configuredCargos, configuredEncargos, destinationRole, dismissedRole, manualMode, manualPromotions, originRole, quantity]);

  function handleSaveConfiguration(nextConfiguration) {
    saveConfiguration(nextConfiguration);
    setConfiguration(nextConfiguration);
    syncCloud({ configuration: nextConfiguration });
  }

  function handleResetConfiguration() {
    window.localStorage.removeItem('tsim.configuration.v1');
    const nextConfiguration = { cargos: cargos.map((cargo) => ({ ...cargo })), encargos: 1.13 };
    setConfiguration(nextConfiguration);
    syncCloud({ configuration: nextConfiguration });
  }

  function handleSaveOperations(nextOperations) {
    saveOperations(nextOperations);
    setOperations(nextOperations);
    syncCloud({ operations: nextOperations });
  }

  function handleApproval(scenarioId, status) {
    const nextApprovals = saveApproval(scenarioId, { status });
    setApprovals(nextApprovals);
    syncCloud({ approvals: nextApprovals });
  }

  function handleClearWorkspace() {
    ['tsim.saved-scenarios.v1', 'tsim.operations.v1', 'tsim.approvals.v1'].forEach((key) => window.localStorage.removeItem(key));
    const nextOperations = { teamHeadcount: 609, requiredHeadcount: 609, slaTarget: 95, safetyBuffer: 10 };
    setSavedScenarios([]);
    setOperations(nextOperations);
    setApprovals({});
    syncCloud({ savedScenarios: [], operations: nextOperations, approvals: {} });
  }

  function handleRestoreWorkspace(payload) {
    saveConfiguration(payload.configuration);
    saveOperations(payload.operations);
    window.localStorage.setItem('tsim.saved-scenarios.v1', JSON.stringify(payload.savedScenarios ?? []));
    window.localStorage.setItem('tsim.approvals.v1', JSON.stringify(payload.approvals ?? {}));
    setConfiguration(payload.configuration);
    setOperations(payload.operations);
    setSavedScenarios(payload.savedScenarios ?? []);
    setApprovals(payload.approvals ?? {});
    syncCloud(payload);
  }

  function currentCloudPayload(overrides = {}) {
    return {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      configuration,
      operations,
      savedScenarios,
      approvals,
      ...overrides,
    };
  }

  async function syncCloud(overrides = {}) {
    if (cloud.status !== 'ready' || !cloud.session) return;
    const result = await saveCloudWorkspace(cloud.session, currentCloudPayload(overrides), cloudWorkspaceId);
    if (result.error) {
      setCloud((current) => ({ ...current, message: describeCloudError(result.error) }));
      return;
    }
    if (result.workspaceId && result.workspaceId !== cloudWorkspaceId) {
      window.localStorage.setItem('tsim.cloud.workspace-id.v1', result.workspaceId);
      setCloudWorkspaceId(result.workspaceId);
    }
    setCloud((current) => ({ ...current, message: 'Workspace sincronizado.' }));
  }

  async function handleCloudSignIn(email, password) {
    setCloud((current) => ({ ...current, status: 'loading', message: '' }));
    const result = await signInCloud(email, password);
    if (result.error) {
      setCloud((current) => ({ ...current, status: 'signed_out', message: describeCloudError(result.error) }));
      return result;
    }
    const session = result.data?.session || await getCloudSession();
    if (!session) return { error: new Error('Sessão não iniciada.') };
    const workspace = await loadCloudWorkspace(session);
    if (workspace.error) {
      setCloud({ status: 'ready', email: session.user.email || email, session, message: describeCloudError(workspace.error) });
    } else {
      if (workspace.payload) handleRestoreWorkspace(workspace.payload);
      if (workspace.workspaceId) {
        window.localStorage.setItem('tsim.cloud.workspace-id.v1', workspace.workspaceId);
        setCloudWorkspaceId(workspace.workspaceId);
      }
      setCloud({ status: 'ready', email: session.user.email || email, session, message: workspace.payload ? 'Workspace cloud carregado.' : 'Sessão cloud iniciada.' });
    }
    return result;
  }

  async function handleCloudSignUp(email, password) {
    setCloud((current) => ({ ...current, status: 'loading', message: '' }));
    const result = await signUpCloud(email, password);
    if (result.error) setCloud((current) => ({ ...current, status: 'signed_out', message: describeCloudError(result.error) }));
    else setCloud((current) => ({ ...current, status: result.data?.session ? 'ready' : 'signed_out', message: result.data?.session ? 'Conta criada e conectada.' : 'Cadastro enviado. Confirme o e-mail para entrar.' }));
    return result;
  }

  async function handleCloudSignOut() {
    await signOutCloud();
    setCloud({ status: cloudEnabled ? 'signed_out' : 'disabled', email: '', session: null, message: 'Sessão encerrada. Fallback local ativo.' });
  }

  useEffect(() => {
    if (!cloudEnabled || !supabase) return undefined;
    let active = true;
    async function hydrate() {
      const session = await getCloudSession();
      if (!active) return;
      if (!session) {
        setCloud({ status: 'signed_out', email: '', session: null, message: '' });
        return;
      }
      const workspace = await loadCloudWorkspace(session);
      if (!active) return;
      if (workspace.payload) handleRestoreWorkspace(workspace.payload);
      if (workspace.workspaceId) {
        window.localStorage.setItem('tsim.cloud.workspace-id.v1', workspace.workspaceId);
        setCloudWorkspaceId(workspace.workspaceId);
      }
      setCloud({ status: 'ready', email: session.user.email || '', session, message: workspace.error ? describeCloudError(workspace.error) : workspace.payload ? 'Workspace cloud carregado.' : '' });
    }
    hydrate();
    const { data } = supabase.auth.onAuthStateChange(() => { hydrate(); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  function snapshotScenario() {
    const coverage = calculateCoverage({ ...operations, quantity });
    return {
      name: `${calc.dismissed.short} → ${calc.destination.short}`,
      dismissedRole,
      quantity,
      originRole,
      destinationRole,
      activeScenario,
      manualMode,
      manualPromotions: manualMode ? calc.selectedManualPromotions : null,
      automaticPromotions: calc.promotions,
      appliedPromotions: calc.appliedPromotions,
      appliedBalance: calc.appliedBalance,
      operationalRisk: calc.operationalRisk,
      operationalCoverage: coverage.afterMovement,
      approvalBlocked: coverage.approvalBlocked,
      encargos: configuredEncargos,
      salarySnapshot: configuredCargos.map(({ id, salary }) => ({ id, salary })),
      source: 'MVP local',
    };
  }

  function handleSaveScenario() {
    saveScenario(snapshotScenario());
    const nextSavedScenarios = loadSavedScenarios();
    setSavedScenarios(nextSavedScenarios);
    syncCloud({ savedScenarios: nextSavedScenarios });
    setSaveMessage('Cenário salvo localmente');
  }

  function restoreScenario(scenario) {
    setDismissedRole(scenario.dismissedRole);
    setQuantity(scenario.quantity);
    setOriginRole(scenario.originRole);
    setDestinationRole(scenario.destinationRole);
    setActiveScenario(scenario.activeScenario);
    setManualMode(Boolean(scenario.manualMode));
    setManualPromotions(scenario.manualPromotions);
    setSaveMessage(`Cenário ${scenario.name} reaberto`);
  }

  const scenarioData = {
    conservative: { title: 'Conservador', kicker: 'Controle de caixa', value: money(calc.economy, true), detail: 'saldo mensal preservado', tone: 'green' },
    balanced: { title: 'Equilibrado', kicker: 'Recomendado', value: money(calc.economy - calc.delta * calc.balancedPromotions, true), detail: `${calc.balancedPromotions} promoções financiadas`, tone: 'blue' },
    aggressive: { title: 'Agressivo', kicker: 'Retenção máxima', value: money(calc.economy - calc.delta * calc.aggressivePromotions, true), detail: `${calc.aggressivePromotions} promoções projetadas`, tone: 'orange' },
  };

  const maxChart = Math.max(...configuredCargos.map((cargo) => custo(cargo, configuredEncargos)));
  const currentSection = navItems.find((item) => item.id === activeView)?.label || 'Simulador';
  const sectionTitle = {
    overview: 'Radar executivo',
    simulator: 'Movimentação de pessoas',
    people: 'Base de cargos e pessoas',
    scenarios: 'Biblioteca de cenários',
    ops: 'Cobertura operacional',
    reports: 'Pareceres e aprovação',
    budget: 'Orçamento e folha',
    analytics: 'Custos e indicadores',
    ai: 'Parecer assistido',
    settings: 'Workspace local',
  }[activeView];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand-block">
          <img className="brand-lockup" src="/brand/t-sim-logo-light.svg" alt="T-Sim — Simular antes. Decidir melhor." />
          <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Fechar navegação"><X size={18} /></button>
        </div>

        <div className="workspace-select">
          <div className="workspace-orb">TS</div>
          <div className="workspace-copy"><span>Workspace</span><strong>V.TAL · Bahia</strong></div>
          <ChevronRight size={15} aria-hidden="true" />
        </div>

        <nav className="primary-nav" aria-label="Navegação principal">
          <p className="nav-label">Navegação</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeView === id ? 'active' : ''}`} onClick={() => { setActiveView(id); setMobileNav(false); }}>
              <Icon size={17} strokeWidth={activeView === id ? 2.1 : 1.8} aria-hidden="true" />
              <span>{label}</span>
              {activeView === id && <span className="nav-pip" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="source-status"><span className="status-dot" /><div><strong>Dados sincronizados</strong><span>Grade salarial · v1.4</span></div></div>
          <button className="nav-item" onClick={() => { setActiveView('settings'); setMobileNav(false); }}><Settings2 size={17} /><span>Configurações</span></button>
          <div className="profile"><div className="avatar">TS</div><div><strong>Tiago Santana</strong><span>Administrador</span></div><ChevronRight size={15} /></div>
        </div>
      </aside>

      {mobileNav && <button className="scrim" aria-label="Fechar menu" onClick={() => setMobileNav(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="menu-trigger" onClick={() => setMobileNav(true)} aria-label="Abrir navegação"><Menu size={21} /></button>
          <div className="breadcrumbs"><span>{currentSection}</span><ChevronRight size={14} /><strong>{sectionTitle}</strong></div>
          <div className="topbar-actions"><span className="last-sync">Última atualização <strong>05 out 2026, 16:42</strong></span><button className="help-button" aria-label="Ajuda"><CircleHelp size={18} /></button></div>
        </header>

        <div className="content-wrap">
          {activeView === 'people' ? <PeopleView cargoList={configuredCargos} encargos={configuredEncargos} onSaveConfiguration={handleSaveConfiguration} onResetConfiguration={handleResetConfiguration} saved={Boolean(window.localStorage.getItem('tsim.configuration.v1'))} /> : activeView === 'scenarios' ? <ScenariosView savedScenarios={savedScenarios} onRestore={(scenario) => { restoreScenario(scenario); setActiveView('simulator'); }} onGoSimulator={() => setActiveView('simulator')} /> : activeView === 'overview' ? <OverviewView cargoList={configuredCargos} encargos={configuredEncargos} savedScenarios={savedScenarios} onGoSimulator={() => setActiveView('simulator')} onGoPeople={() => setActiveView('people')} onGoReports={() => setActiveView('reports')} onGoView={setActiveView} /> : activeView === 'ops' ? <OperationsView operations={operations} onSave={handleSaveOperations} calc={calc} quantity={quantity} /> : activeView === 'reports' ? <ReportsView savedScenarios={savedScenarios} approvals={approvals} onApproval={handleApproval} onGoScenarios={() => setActiveView('scenarios')} currentSnapshot={snapshotScenario()} /> : activeView === 'budget' ? <BudgetView calc={calc} cargoList={configuredCargos} encargos={configuredEncargos} /> : activeView === 'analytics' ? <AnalyticsView savedScenarios={savedScenarios} /> : activeView === 'ai' ? <AiView calc={calc} operations={operations} /> : activeView === 'settings' ? <SettingsView configuration={configuration} operations={operations} savedScenarios={savedScenarios} approvals={approvals} cloud={cloud} onCloudSignIn={handleCloudSignIn} onCloudSignUp={handleCloudSignUp} onCloudSignOut={handleCloudSignOut} onResetConfiguration={handleResetConfiguration} onClearWorkspace={handleClearWorkspace} onRestoreWorkspace={handleRestoreWorkspace} /> : <>
          <section className="hero-intro">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> SIMULADOR DE DECISÃO</div>
              <h1>Movimente pessoas<br /><em>com precisão.</em></h1>
              <p>Teste o impacto financeiro de uma movimentação antes de levá-la para aprovação. O simulador conecta economia, promoção e cobertura operacional em uma única leitura.</p>
            </div>
            <div className="hero-aside">
              <div className="hero-aside-label"><span className="pulse-dot" /> Premissa ativa</div>
              <strong>Encargos de {formatPercent(configuredEncargos)}</strong>
              <span>Fonte: RH / Controladoria · vigência atual</span>
              <button onClick={() => setShowAssumptions(true)}>Ver premissas <ChevronRight size={14} /></button>
            </div>
          </section>

          <section className="metric-grid" aria-label="Resumo do cenário">
            <Metric label="Economia mensal" value={money(calc.economy)} detail={`${quantity} desligamento${quantity > 1 ? 's' : ''} · custo completo`} tone="green" icon={ArrowDownRight} />
            <Metric label="Promoções possíveis" value={calc.promotions || '—'} detail="limitadas pela economia atual" tone="blue" icon={UsersRound} />
            <Metric label="Saldo do cenário" value={money(calc.appliedBalance)} detail={manualMode ? 'após ajuste manual' : 'após movimentações selecionadas'} tone={calc.appliedBalance >= 0 ? 'green' : 'orange'} icon={calc.appliedBalance >= 0 ? Check : ArrowUpRight} />
            <Metric label="ROI estimado" value={calc.roi ? `${calc.roi.toFixed(1)}x` : '—'} detail="custo de substituição · 3 salários" tone="violet" icon={Sparkles} />
          </section>

          <section className="decision-grid">
            <div className="simulator-panel panel-surface">
              <div className="panel-heading">
                <div><span className="section-index">01</span><div><h2>Monte sua movimentação</h2><p>Defina a origem, o destino e a quantidade. O resultado se recalcula a cada escolha.</p></div></div>
                <div className="panel-heading-actions">{saveMessage && <span className="save-message">{saveMessage}</span>}<button className="save-scenario-button" onClick={handleSaveScenario}><ClipboardCheck size={14} /> Salvar cenário</button><span className="live-badge"><span /> Ao vivo</span></div>
              </div>

              {savedScenarios.length > 0 && <div className="saved-scenarios-strip"><span className="saved-label"><BookOpen size={13} /> {savedScenarios.length} cenário{savedScenarios.length === 1 ? '' : 's'} salvo{savedScenarios.length === 1 ? '' : 's'}</span><div className="saved-scenario-list">{savedScenarios.slice(0, 3).map((scenario) => <button key={scenario.id} className="saved-scenario-chip" onClick={() => restoreScenario(scenario)} title={`Reabrir ${scenario.name}`}><span>{scenario.name}</span><small>{new Date(scenario.savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</small></button>)}</div></div>}

              <div className="field-grid">
                <label className="field field-wide"><span>Cargo desligado / vaga aberta</span><select value={dismissedRole} onChange={(event) => setDismissedRole(event.target.value)}>{configuredCargos.map((cargo) => <option key={cargo.id} value={cargo.id}>{cargo.name}</option>)}</select><small>Libera {money(calc.dismissedCost)} por posição / mês</small></label>
                <label className="field"><span>Quantidade</span><div className="quantity-input"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade">−</button><input type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /><button onClick={() => setQuantity(Math.min(20, quantity + 1))} aria-label="Aumentar quantidade">+</button></div><small>Posições impactadas</small></label>
                <label className="field"><span>Origem da promoção</span><select value={originRole} onChange={(event) => setOriginRole(event.target.value)}>{configuredCargos.map((cargo) => <option key={cargo.id} value={cargo.id}>{cargo.short}</option>)}</select><small>Custo atual {money(calc.originCost)}</small></label>
                <label className="field"><span>Destino da promoção</span><select value={destinationRole} onChange={(event) => setDestinationRole(event.target.value)}>{configuredCargos.map((cargo) => <option key={cargo.id} value={cargo.id}>{cargo.short}</option>)}</select><small>Custo projetado {money(calc.destinationCost)}</small></label>
              </div>

              <div className="movement-readout">
                <div className="movement-line"><span className="movement-node node-slate" /><div><span>Economia gerada</span><strong>{money(calc.economy)} <small>/ mês</small></strong></div><div className="movement-connector" /><div><span>Delta por promoção</span><strong className={calc.delta > 0 ? 'value-orange' : 'value-green'}>{calc.delta > 0 ? money(calc.delta) : 'Sem custo adicional'} <small>/ mês</small></strong></div><div className="movement-connector" /><div><span>Saldo disponível</span><strong className={calc.balance >= 0 ? 'value-green' : 'value-orange'}>{money(calc.balance)} <small>/ mês</small></strong></div></div>
              </div>

              <div className="promotion-quantity-panel">
                <div className="quantity-panel-heading">
                  <div><strong>Quantidade de promoções</strong><span>Compare a sugestão automática com o ajuste que deseja aplicar.</span></div>
                  <button className={`manual-toggle ${manualMode ? 'is-on' : ''}`} onClick={() => { if (!manualMode) setManualPromotions(calc.promotions); setManualMode(!manualMode); }} aria-pressed={manualMode}><span className="toggle-track"><i /></span>{manualMode ? 'Ajuste manual ativo' : 'Ajustar manualmente'}</button>
                </div>
                <div className="quantity-comparison">
                  <div className="quantity-option automatic-option"><div className="quantity-option-top"><span>Automático</span><span className="quantity-badge">base</span></div><strong>{calc.promotions}</strong><small>economia ÷ delta da promoção</small></div>
                  <div className="quantity-compare-arrow"><ChevronRight size={17} /></div>
                  <div className={`quantity-option manual-option ${manualMode ? 'is-active' : ''}`}><div className="quantity-option-top"><span>Manual</span>{manualMode && <span className="quantity-badge manual-badge">aplicado</span>}</div><div className="manual-stepper"><button onClick={() => setManualPromotions(Math.max(0, calc.selectedManualPromotions - 1))} disabled={!manualMode} aria-label="Diminuir promoções manuais">−</button><input type="number" min="0" max="99" value={calc.selectedManualPromotions} onChange={(event) => setManualPromotions(Math.max(0, Math.min(99, Number(event.target.value) || 0)))} disabled={!manualMode} aria-label="Quantidade manual de promoções" /><button onClick={() => setManualPromotions(Math.min(99, calc.selectedManualPromotions + 1))} disabled={!manualMode} aria-label="Aumentar promoções manuais">+</button></div><small>{manualMode ? `saldo ${money(calc.manualBalance)} / mês` : 'ative para editar'}</small></div>
                  <div className={`quantity-difference ${calc.manualDifference === 0 ? 'same' : calc.manualDifference > 0 ? 'more' : 'less'}`}><span>Diferença</span><strong>{calc.manualDifference > 0 ? '+' : ''}{calc.manualDifference}</strong><small>{calc.manualDifference === 0 ? 'mesma quantidade' : calc.manualDifference > 0 ? 'a mais que o automático' : 'a menos que o automático'}</small></div>
                </div>
                <div className="quantity-panel-foot"><span><span className="info-marker">i</span> Automático permanece como referência da economia.</span><strong>{manualMode ? `Saldo manual anual: ${money(calc.manualBalance * MESES)}` : 'O ajuste só altera o cenário quando ativado.'}</strong></div>
              </div>

              <div className="promotion-callout">
                <div className="callout-icon"><ArrowUpRight size={17} /></div>
                <div><strong>{calc.appliedPromotions || 0} {calc.appliedPromotions === 1 ? 'promoção' : 'promoções'} de {calc.origin.short} → {calc.destination.short}</strong><span>{manualMode ? 'Ajuste manual aplicado' : activeScenario === 'balanced' ? 'Cenário equilibrado selecionado' : 'Quantidade derivada do cenário selecionado'} · saldo anual {money(calc.appliedAnnualBalance)}</span></div>
                <button onClick={() => setActiveScenario('balanced')}>Aplicar equilíbrio <ChevronRight size={14} /></button>
              </div>
            </div>

            <aside className="scenario-panel">
              <div className="scenario-panel-heading"><div><span className="section-index">02</span><h2>Compare caminhos</h2></div><button className="icon-button" aria-label="Abrir guia"><BookOpen size={16} /></button></div>
              <p className="scenario-intro">A mesma economia pode produzir decisões diferentes. Escolha a intenção de negócio para projetar o próximo passo.</p>
              <div className="scenario-list">
                {Object.entries(scenarioData).map(([id, scenario]) => <ScenarioCard key={id} id={id} {...scenario} active={activeScenario === id} onClick={() => setActiveScenario(id)} />)}
              </div>
              <div className="recommendation"><span className="recommendation-tag"><ShieldCheck size={14} /> Recomendação T-Sim</span><strong>Equilibrado</strong><p>Preserva saldo positivo e transforma a economia em progressão técnica sem comprometer a cobertura.</p><button onClick={() => setActiveScenario('balanced')}>Ver justificativa <ChevronRight size={14} /></button></div>
            </aside>
          </section>

          <section className="analysis-grid">
            <div className="chart-panel panel-surface">
              <div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Arquitetura de custo por cargo</h2><p>Salário base + encargos · visão mensal por posição</p></div></div><span className="legend"><i className="legend-swatch salary" /> Base <i className="legend-swatch burden" /> Encargos</span></div>
              <div className="chart-area" role="img" aria-label="Barras horizontais de custo empresa mensal por cargo">
                {configuredCargos.map((cargo) => { const total = custo(cargo, configuredEncargos); const baseWidth = (cargo.salary / maxChart) * 100; const burdenWidth = ((total - cargo.salary) / maxChart) * 100; return <div className="bar-row" key={cargo.id}><div className="bar-label"><span>{cargo.short}</span><small>{cargo.level}</small></div><div className="bar-track"><span className="bar-base" style={{ width: `${baseWidth}%` }} /><span className="bar-burden" style={{ width: `${burdenWidth}%`, left: `${baseWidth}%` }} /></div><strong>{money(total, true)}</strong></div>; })}
              </div>
              <div className="chart-footnote"><span><span className="info-marker">i</span> Encargos de {formatPercent(configuredEncargos)} calculados sobre o salário base</span><strong>Maior custo: Técnico VI · {money(custo(configuredCargos[5], configuredEncargos))}/mês</strong></div>
            </div>

            <div className="insight-panel panel-surface">
              <div className="panel-heading compact"><div><span className="section-index">04</span><div><h2>Leitura para aprovação</h2><p>O que muda quando você executa este cenário</p></div></div></div>
              <div className="insight-list">
                <div className="insight-item"><span className="insight-number">01</span><div><strong>Caixa preservado</strong><p>O cenário {activeScenario === 'conservative' ? 'conservador' : activeScenario === 'aggressive' ? 'agressivo' : 'equilibrado'} deixa <b>{money(calc.balance)}</b> de saldo mensal após as movimentações.</p></div></div>
                <div className="insight-item"><span className="insight-number">02</span><div><strong>Progressão com rastreabilidade</strong><p>A diferença entre {calc.origin.short} e {calc.destination.short} é de <b>{money(calc.delta)}</b> por pessoa, já com encargos.</p></div></div>
                <div className="insight-item"><span className="insight-number">03</span><div><strong>Cobertura operacional</strong><p>Risco projetado <span className={`risk-pill risk-${calc.operationalRisk.toLowerCase()}`}>{calc.operationalRisk}</span>. Valide SLA e elegibilidade antes de aprovar.</p></div></div>
              </div>
              <button className="text-action" onClick={() => setShowAssumptions(true)}>Abrir trilha de premissas <ChevronRight size={15} /></button>
            </div>
          </section>

          <footer className="page-footer"><span>T-Sim · Simular antes. Decidir melhor.</span><span><span className="footer-dot" /> Dados informados, calculados e estimados identificados por origem</span><span>v0.1 · MVP local</span></footer>
          </>}
        </div>
      </main>

      {showAssumptions && <div className="modal-backdrop" role="presentation" onClick={() => setShowAssumptions(false)}><section className="assumptions-modal" role="dialog" aria-modal="true" aria-labelledby="assumptions-title" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">TRILHA DE PREMISSAS</span><h2 id="assumptions-title">Como este resultado foi calculado</h2></div><button className="icon-button" onClick={() => setShowAssumptions(false)} aria-label="Fechar"><X size={18} /></button></div><div className="assumption-grid"><div><span>Encargos</span><strong>{formatPercent(configuredEncargos)}</strong><small>Informado · RH / Controladoria</small></div><div><span>Horizonte</span><strong>12 meses</strong><small>Informado · período anualizado</small></div><div><span>ROI de retenção</span><strong>3 salários</strong><small>Estimado · custo de substituição</small></div><div><span>Saldo calculado</span><strong>{money(calc.appliedBalance)}</strong><small>Calculado · cenário atual aplicado</small></div></div><div className="formula-box"><span>Fórmula principal</span><code>saldo = (custo cargo desligado × quantidade) − (delta promoção × promoções)</code></div><div className="modal-note"><ClipboardCheck size={17} /><span>O resultado é indicativo até que a cobertura operacional, a elegibilidade e a aprovação orçamentária sejam confirmadas.</span></div><button className="primary-button" onClick={() => setShowAssumptions(false)}>Entendi</button></section></div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // O app continua funcional mesmo quando o modo offline não está disponível.
    });
  });
}
