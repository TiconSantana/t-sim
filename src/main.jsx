import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
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
  Moon,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Settings,
  Sun,
  TriangleAlert,
  UsersRound,
  X,
} from 'lucide-react';
import { cargos, custo, MESES } from './data/cargos';
import { costAssumptions, operationalCosts, operationalSource, operationsDefaults, teamClasses } from './data/operacao';
import { calculateSimulation } from './domain/simulation';
import { calculateCoverage, calculateDimensionCoverage, validateScenarioForApproval } from './domain/operations';
import { createLocalProfile, getActiveProfileId, loadApprovalHistory, loadApprovals, loadConfiguration, loadImportedAssumptions, loadLocalProfiles, loadOperations, loadPeople, loadSavedScenarios, normalizeOperations, saveApproval, saveApprovalHistory, saveConfiguration, saveImportedAssumptions, saveOperations, savePeople, saveScenario, saveScenarioList, setActiveProfile, workspaceStorageKey } from './storage/scenarios';
import { parseDimensionSheet, parseTsimWorkbook, retainExistingIfImportEmpty } from './domain/workbookImport';
import './styles.css';

const navItems = [
  { id: 'overview', label: 'Visão geral', icon: Gauge },
  { id: 'presentation', label: 'Apresentação', icon: BookOpen },
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

function PeopleView({ cargoList, encargos, people = [], onSaveConfiguration, onResetConfiguration, saved }) {
  const [draftCargos, setDraftCargos] = useState(() => cargoList.map((cargo) => ({ ...cargo })));
  const [draftEncargos, setDraftEncargos] = useState(Math.round(encargos * 100));
  const [message, setMessage] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef(null);
  const totalMonthly = draftCargos.reduce((sum, cargo) => sum + custo(cargo, draftEncargos / 100), 0);
  const hasChanges = draftEncargos !== Math.round(encargos * 100) || draftCargos.some((cargo, index) => cargo.salary !== cargoList[index].salary);

  useEffect(() => {
    setDraftCargos(cargoList.map((cargo) => ({ ...cargo })));
    setDraftEncargos(Math.round(encargos * 100));
  }, [cargoList, encargos]);

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
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
      const header = rows[0]?.map(normalizeLabel) || [];
      const salaryColumn = header.findIndex((label) => label.includes('SALARIO') || label.includes('REMUNERACAO') || label.includes('VALOR'));
      const nextCargos = draftCargos.map((cargo) => ({ ...cargo }));
      let found = 0;
      rows.forEach((row) => {
        const label = normalizeLabel(row?.[0]);
        const rawSalary = salaryColumn >= 0 ? row?.[salaryColumn] : row?.[1];
        const rawValue = typeof rawSalary === 'number'
          ? rawSalary
          : Number(String(rawSalary ?? '').replace(/\./g, '').replace(',', '.'));
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
          nextCargos[index] = { ...nextCargos[index], salary: rawValue, source: 'Planilha importada localmente · revisar origem', validity: 'Vigência a confirmar' };
          found += 1;
        }
      });
      if (!found) {
        setImportMessage('Nenhum cargo compatível encontrado. Confira as colunas Cargo e Salário base.');
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
      <section className="panel-surface assumptions-editor"><div className="assumptions-editor-title"><div><span className="section-index">01</span><div><h2>Premissas salariais</h2><p>Valores de referência editáveis. O custo empresa é recalculado automaticamente.</p></div></div><div className="editor-toolbar"><input ref={fileInputRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={importSpreadsheet} /><a className="secondary-button" href="/templates/tsim-planilha-padrao.xlsx" download>Baixar padrão</a><button className="secondary-button" onClick={() => fileInputRef.current?.click()}>Importar planilha</button><label className="encargo-field"><span>Encargos (%)</span><input aria-label="Percentual de encargos" type="number" min="0" step="0.1" value={draftEncargos} onChange={(event) => setDraftEncargos(Math.max(0, Number(event.target.value) || 0))} /></label></div></div><div className="people-table-wrap"><table className="people-table editable-table"><thead><tr><th>Cargo</th><th>Nível</th><th>Salário base editável</th><th>Encargos</th><th>Custo empresa / mês</th><th>Fonte e vigência</th></tr></thead><tbody>{draftCargos.map((cargo) => { const total = custo(cargo, draftEncargos / 100); return <tr key={cargo.id}><td><strong>{cargo.name}</strong><small>{cargo.short}</small></td><td><span className={`level-tag level-${cargo.tone}`}>{cargo.level}</span></td><td><label className="salary-input"><span>R$</span><input aria-label={`Salário base ${cargo.short}`} type="number" min="0" step="0.01" value={cargo.salary} onChange={(event) => updateSalary(cargo.id, event.target.value)} /></label></td><td>{money(total - cargo.salary)}</td><td><strong>{money(total)}</strong></td><td><span className="source-type">{cargo.source || 'Base de referência'}</span><small className="source-validity">{cargo.validity || 'Vigência a confirmar'}</small></td></tr>; })}</tbody></table></div><div className="editor-actions"><div><strong>{importMessage || message || (hasChanges ? 'Há alterações ainda não salvas.' : 'Premissas vinculadas à fonte de referência.')}</strong><span>Salvamento local neste navegador</span></div><div><button className="secondary-button" onClick={resetChanges}>Restaurar referência</button><button className="primary-button editor-save" onClick={saveChanges} disabled={!hasChanges}>Salvar premissas</button></div></div></section>
      <section className="people-grid people-insight-row"><aside className="panel-surface people-side-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Leitura da grade</h2><p>Indicadores recalculados</p></div></div></div><div className="grade-insights"><div><span>Menor salário base</span><strong>{money(draftCargos[0].salary)}</strong><small>{draftCargos[0].name}</small></div><div><span>Maior salário base</span><strong>{money(draftCargos.at(-1).salary)}</strong><small>{draftCargos.at(-1).name}</small></div><div><span>Maior salto entre níveis</span><strong>{money(draftCargos[1].salary - draftCargos[0].salary)}</strong><small>Auxiliar → Técnico II</small></div></div></aside><div className="panel-note people-note"><ClipboardCheck size={16} /><span>Configuração provisória em armazenamento local. Benefícios, ADM, BDI e custos de operação permanecem para o módulo Budget. Valores de RH devem ser validados antes de aprovação.</span></div></section>
      <section className="panel-surface people-roster-panel"><div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Pessoas da base local</h2><p>{people.length} registro(s) importado(s) neste perfil do navegador</p></div></div></div>{people.length ? <div className="dimension-table-wrap"><table className="dimension-table people-roster-table"><caption className="sr-only">Pessoas importadas da planilha</caption><thead><tr><th>Nome</th><th>Matrícula</th><th>Cargo</th><th>Região</th><th>Turno</th><th>Atividade</th><th>Status</th><th>Salário base</th></tr></thead><tbody>{people.map((person) => <tr key={person.id}><td><strong>{person.name}</strong><small>{person.email || 'E-mail não informado'}</small></td><td>{person.employeeId || '—'}</td><td>{person.role || '—'}{person.level ? <small>{person.level}</small> : null}</td><td>{person.region || '—'}</td><td>{person.shift || '—'}</td><td>{person.activity || '—'}</td><td>{person.status || '—'}</td><td>{person.salary === null || person.salary === undefined ? '—' : money(person.salary)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><UsersRound size={22} /><strong>Nenhuma pessoa importada</strong><p>Use Configurações → Importar planilha completa para carregar a aba Pessoas neste perfil local.</p></div>}</section>
    </>
  );
}

function ScenariosView({ savedScenarios, onRestore, onGoSimulator }) {
  return (
    <>
      <section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> BIBLIOTECA DE CENÁRIOS</div><h1>Decisões que<br /><em>continuam salvas.</em></h1><p>Reabra uma simulação para continuar a análise, ajustar a quantidade manual ou preparar a aprovação.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Persistência local</div><strong>{savedScenarios.length} cenário{savedScenarios.length === 1 ? '' : 's'} salvo{savedScenarios.length === 1 ? '' : 's'}</strong><span>Separado por perfil local</span><button onClick={onGoSimulator}>Criar novo cenário <ChevronRight size={14} /></button></div></section>
      <section className="metric-grid"><Metric label="Cenários salvos" value={savedScenarios.length} detail="nesta sessão local" tone="blue" icon={Layers3} /><Metric label="Último movimento" value={savedScenarios[0] ? savedScenarios[0].name : '—'} detail={savedScenarios[0] ? new Date(savedScenarios[0].savedAt).toLocaleDateString('pt-BR') : 'nenhum cenário salvo'} tone="green" icon={ClipboardCheck} /><Metric label="Modo manual" value={savedScenarios.filter((scenario) => scenario.manualMode).length} detail="com ajuste de promoções" tone="orange" icon={SlidersHorizontal} /><Metric label="Fonte" value="MVP local" detail="persistência temporária" tone="violet" icon={BookOpen} /></section>
      <section className="panel-surface scenarios-library"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Histórico de simulações</h2><p>Selecione um cenário para restaurar os parâmetros.</p></div></div></div>{savedScenarios.length === 0 ? <div className="empty-state"><Layers3 size={25} /><strong>Nenhum cenário salvo ainda</strong><p>Execute uma simulação e use “Salvar cenário” para começar a biblioteca.</p><button className="primary-button compact-button" onClick={onGoSimulator}>Abrir simulador</button></div> : <div className="scenario-library-list">{savedScenarios.map((scenario) => <article className="scenario-library-item" key={scenario.id}><div className="scenario-library-main"><div className="scenario-library-icon"><ArrowUpRight size={16} /></div><div><strong>{scenario.name}</strong><span>{scenario.quantity} posição{scenario.quantity === 1 ? '' : 'ões'} · {scenario.automaticPromotions} automáticas{scenario.manualMode ? ` · ${scenario.appliedPromotions} manuais` : ''}</span></div></div><div className="scenario-library-result"><strong>{money(scenario.appliedBalance)}</strong><span>saldo mensal aplicado</span></div><div className="scenario-library-date">{new Date(scenario.savedAt).toLocaleDateString('pt-BR')}<button onClick={() => onRestore(scenario)}>Reabrir <ChevronRight size={13} /></button></div></article>)}</div>}</section>
    </>
  );
}

function OverviewView({ cargoList, encargos, savedScenarios, onGoSimulator, onGoPeople, onGoReports }) {
  const totalMonthly = cargoList.reduce((sum, cargo) => sum + custo(cargo, encargos), 0);
  const latest = savedScenarios[0];
  return (
    <>
      <section className="hero-intro overview-hero"><div><div className="eyebrow"><span className="eyebrow-line" /> VISÃO GERAL</div><h1>Um radar para<br /><em>decidir melhor.</em></h1><p>Uma leitura consolidada da estrutura salarial, dos cenários simulados e dos próximos pontos de validação.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Ambiente local</div><strong>Base T-Sim · Bahia</strong><span>Dados carregados neste navegador</span><button onClick={onGoSimulator}>Abrir simulador <ChevronRight size={14} /></button></div></section>
      <section className="metric-grid"><Metric label="Custo mensal de referência" value={money(totalMonthly)} detail={`${cargoList.length} cargos · encargos ${formatPercent(encargos)}`} tone="blue" icon={BarChart3} /><Metric label="Cenários salvos" value={savedScenarios.length} detail="simulações reabríveis" tone="green" icon={Layers3} /><Metric label="Último saldo aplicado" value={latest ? money(latest.appliedBalance) : '—'} detail={latest ? latest.name : 'salve uma simulação para acompanhar'} tone={latest && latest.appliedBalance < 0 ? 'orange' : 'violet'} icon={latest && latest.appliedBalance < 0 ? ArrowUpRight : Check} /><Metric label="Premissas rastreadas" value="100%" detail="fonte e classificação na tela" tone="orange" icon={ClipboardCheck} /></section>
      <section className="overview-grid"><div className="panel-surface overview-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Fluxo recomendado</h2><p>Próximas ações para fechar uma decisão</p></div></div></div><div className="overview-flow"><button onClick={onGoPeople}><span>01</span><strong>Validar cargos</strong><small>Salários e encargos</small><ChevronRight size={15} /></button><button onClick={onGoSimulator}><span>02</span><strong>Simular movimento</strong><small>Economia e promoção</small><ChevronRight size={15} /></button><button onClick={onGoReports}><span>03</span><strong>Preparar aprovação</strong><small>Premissas e parecer</small><ChevronRight size={15} /></button></div></div><div className="panel-surface overview-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Sinais do workspace</h2><p>Leituras rápidas</p></div></div></div><div className="signal-list"><div><span className="signal-icon signal-green"><Check size={14} /></span><div><strong>Grade carregada</strong><small>{cargoList.length} níveis prontos para simulação</small></div></div><div><span className="signal-icon signal-blue"><Layers3 size={14} /></span><div><strong>{savedScenarios.length ? `${savedScenarios.length} cenário salvo` : 'Nenhum cenário salvo'}</strong><small>{savedScenarios.length ? 'Último cenário disponível para reabertura' : 'Comece pelo simulador'}</small></div></div><div><span className="signal-icon signal-orange"><ShieldCheck size={14} /></span><div><strong>Operação ainda precisa de validação</strong><small>Confira cobertura e SLA antes de aprovar</small></div></div></div></div></section>
      <section className="panel-surface overview-panel recent-panel"><div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Últimas simulações</h2><p>Resumo do que está pronto para continuar</p></div></div><button className="text-action" onClick={onGoReports}>Abrir pareceres <ChevronRight size={15} /></button></div>{savedScenarios.length === 0 ? <div className="overview-empty">Nenhuma simulação salva. <button onClick={onGoSimulator}>Abrir o simulador</button></div> : <div className="recent-scenarios">{savedScenarios.slice(0, 4).map((scenario) => <div className="recent-scenario" key={scenario.id}><div><strong>{scenario.name}</strong><span>{scenario.quantity} posição{scenario.quantity === 1 ? '' : 'ões'} · {scenario.appliedPromotions} promoç{scenario.appliedPromotions === 1 ? 'ão' : 'ões'}</span></div><strong className={scenario.appliedBalance < 0 ? 'negative-value' : 'positive-value'}>{money(scenario.appliedBalance)}</strong></div>)}</div>}</section>
    </>
  );
}

function OperationsView({ operations, onSave, calc, quantity }) {
  const [draft, setDraft] = useState(() => ({ ...operations, dimensions: operations.dimensions ?? [] }));
  const [message, setMessage] = useState('');
  const [dimensionMessage, setDimensionMessage] = useState('');
  const dimensionFileInputRef = useRef(null);
  const dimensionResult = calculateDimensionCoverage(draft.dimensions, quantity);
  const coverageResult = calculateCoverage({ ...draft, quantity });
  const { current: coverage, afterMovement: projectedCoverage, risk, safetyTarget } = coverageResult;

  useEffect(() => {
    setDraft({ ...operations, dimensions: operations.dimensions ?? [] });
  }, [operations]);

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: Math.max(0, Number(value) || 0) }));
  }

  function updateDimension(index, field, value) {
    setDimensionMessage('');
    setDraft((current) => ({
      ...current,
      dimensions: current.dimensions.map((row, rowIndex) => rowIndex === index
        ? (() => {
          const nextRow = { ...row, [field]: ['currentHeadcount', 'requiredHeadcount', 'capacityPerPerson', 'slaTarget', 'safetyBuffer', 'scenarioMovement'].includes(field) ? Math.max(0, Number(value) || 0) : value };
          const missingByField = { region: 'região', shift: 'turno', activity: 'atividade', currentHeadcount: 'HC atual', requiredHeadcount: 'HC requerido' };
          if (missingByField[field]) nextRow.missingFields = (row.missingFields ?? []).filter((item) => item !== missingByField[field] || String(value).trim() === '');
          return nextRow;
        })()
        : row),
    }));
  }

  function toggleAllocationMode(mode) {
    setDraft((current) => ({
      ...current,
      allocationMode: mode,
      dimensions: current.dimensions.map((row, index) => ({ ...row, scenarioMovement: mode === 'manual' ? dimensionResult.rows[index]?.rowMovement ?? 0 : row.scenarioMovement })),
    }));
  }

  function addDimension() {
    setDimensionMessage('');
    setDraft((current) => ({
      ...current,
      dimensions: [...current.dimensions, {
        id: `dimension-${Date.now()}`,
        region: '',
        shift: '',
        activity: '',
        teamClass: 'Campo FTTH',
        currentHeadcount: 0,
        requiredHeadcount: 0,
        capacityPerPerson: 1,
        slaTarget: current.slaTarget,
        safetyBuffer: current.safetyBuffer,
        source: 'A informar',
        validity: 'A informar',
        classification: 'Informada',
        capacityClassification: 'Estimada',
        allocationStatus: 'Nova linha aguardando fonte',
      }],
    }));
  }

  function removeDimension(index) {
    setDimensionMessage('');
    setDraft((current) => ({ ...current, dimensions: current.dimensions.filter((_, rowIndex) => rowIndex !== index) }));
  }

  async function importDimensions(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      let parsed = null;
      let failure = null;
      const sheetNames = [...workbook.SheetNames].sort((a, b) => Number(/oper|dimension/i.test(b)) - Number(/oper|dimension/i.test(a)));
      for (const sheetName of sheetNames) {
        try {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });
          parsed = parseDimensionSheet(rows, { sheetName, fileName: file.name, slaTarget: draft.slaTarget, safetyBuffer: draft.safetyBuffer });
          if (parsed.rows.length) break;
        } catch (error) { failure = error; }
      }
      if (!parsed?.rows.length) throw failure || new Error('Nenhuma linha com HC atual ou requerido foi encontrada.');
      setDraft((current) => ({ ...current, allocationMode: parsed.allocationMode, dimensions: parsed.rows, teamHeadcount: parsed.rows.reduce((sum, row) => sum + row.currentHeadcount, 0), requiredHeadcount: parsed.rows.reduce((sum, row) => sum + row.requiredHeadcount, 0) }));
      setDimensionMessage(`${parsed.rows.length} dimensão(ões) importada(s) da aba ${parsed.sheetName}; ${parsed.pendingRows} linha(s) com campos pendentes preservadas${parsed.skippedRows ? ` e ${parsed.skippedRows} linha(s) sem HC ignoradas` : ''}. Complete os campos antes de salvar/aprovar.${parsed.allocationMode === 'manual' ? ' A coluna Movimento alocado ativou o rateio manual.' : ''}`);
    } catch (error) {
      setDimensionMessage(error.message || 'Use uma tabela com Região, Turno, Atividade, HC atual e HC requerido. Linhas incompletas serão preservadas para correção.');
    } finally {
      event.target.value = '';
    }
  }

  function save() {
    onSave({ ...draft, teamHeadcount: dimensionResult.totalCurrent || draft.teamHeadcount, requiredHeadcount: dimensionResult.totalRequired || draft.requiredHeadcount });
    setMessage('Premissas e dimensões operacionais salvas');
  }

  return <>
    <section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> OPERAÇÃO</div><h1>Proteja a<br /><em>cobertura.</em></h1><p>Uma economia só é sustentável quando a equipe continua capaz de cumprir o volume e o SLA da operação.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Modelo operacional</div><strong>Campo · FTTH</strong><span>Região, turno e atividade</span><button onClick={save}>Salvar premissas <ChevronRight size={14} /></button></div></section>
    <section className="metric-grid"><Metric label="Headcount atual" value={dimensionResult.totalCurrent || draft.teamHeadcount} detail="soma das dimensões" tone="blue" icon={UsersRound} /><Metric label="Headcount requerido" value={dimensionResult.totalRequired || draft.requiredHeadcount} detail="soma das dimensões" tone="violet" icon={Activity} /><Metric label="Cobertura atual" value={`${dimensionResult.current.toFixed(1)}%`} detail="capacidade por dimensão" tone={dimensionResult.current >= safetyTarget ? 'green' : 'orange'} icon={Gauge} /><Metric label="Cobertura após movimento" value={`${dimensionResult.afterMovement.toFixed(1)}%`} detail={`risco global: ${risk}`} tone={dimensionResult.approvalBlocked ? 'orange' : 'green'} icon={ShieldCheck} /></section>
    <section className="ops-grid"><div className="panel-surface ops-editor"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Premissas globais</h2><p>Referência legada mantida para comparação com as dimensões.</p></div></div></div><div className="ops-fields"><label><span>Headcount atual</span><input type="number" min="0" value={draft.teamHeadcount} onChange={(event) => update('teamHeadcount', event.target.value)} /></label><label><span>Headcount requerido</span><input type="number" min="0" value={draft.requiredHeadcount} onChange={(event) => update('requiredHeadcount', event.target.value)} /></label><label><span>SLA alvo (%)</span><input type="number" min="0" max="100" value={draft.slaTarget} onChange={(event) => update('slaTarget', event.target.value)} /></label><label><span>Margem de segurança (%)</span><input type="number" min="0" max="100" value={draft.safetyBuffer} onChange={(event) => update('safetyBuffer', event.target.value)} /></label></div><div className="editor-actions"><div><strong>{message || 'A configuração controla o alerta de cobertura.'}</strong><span>Persistência local · módulo Ops</span></div><button className="primary-button editor-save" onClick={save}>Salvar operação</button></div></div><aside className="panel-surface ops-impact"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Impacto do cenário atual</h2><p>Movimento selecionado no simulador</p></div></div></div><div className="ops-impact-readout"><div><span>Economia mensal</span><strong>{money(calc.economy)}</strong></div><div><span>Promoções aplicadas</span><strong>{calc.appliedPromotions}</strong></div><div><span>Headcount após desligamentos</span><strong>{Math.max(0, dimensionResult.totalCurrent - quantity)}</strong></div></div><div className={`ops-risk-box risk-box-${risk.toLowerCase()}`}><ShieldCheck size={17} /><div><strong>Risco operacional: {risk}</strong><span>{draft.allocationMode === 'manual' ? 'Você define a lotação das posições movimentadas por dimensão.' : 'O T-Sim distribui as posições proporcionalmente ao HC atual de cada dimensão.'}</span></div></div></aside></section>
    <section className="panel-surface ops-dimensions-panel"><div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Dimensionamento por contexto</h2><p>Região, turno, atividade, capacidade e cobertura</p></div></div><div className="panel-heading-actions"><input ref={dimensionFileInputRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={importDimensions} /><a className="secondary-button" href="/templates/tsim-planilha-padrao.xlsx" download>Baixar padrão</a><button className="secondary-button" onClick={() => dimensionFileInputRef.current?.click()}>Importar dimensões</button><button className="text-action" onClick={addDimension}><Plus size={14} /> Adicionar dimensão</button></div></div><div className="dimension-allocation-controls"><span>Distribuição do movimento ({quantity} posição(ões))</span><div role="group" aria-label="Modo de distribuição do movimento"><button type="button" className={draft.allocationMode !== 'manual' ? 'is-active' : ''} onClick={() => toggleAllocationMode('auto')}>Automática proporcional</button><button type="button" className={draft.allocationMode === 'manual' ? 'is-active' : ''} onClick={() => toggleAllocationMode('manual')}>Ajustar por dimensão</button></div></div><div className="dimension-table-wrap"><table className="dimension-table"><caption className="sr-only">Dimensões operacionais editáveis</caption><thead><tr><th>Região</th><th>Turno</th><th>Atividade</th><th>HC atual</th><th>HC requerido</th><th>Cap./HC</th><th>Movimento</th><th>Cobertura</th><th>Fonte</th><th>Vigência</th><th /></tr></thead><tbody>{draft.dimensions.map((row, index) => { const result = dimensionResult.rows[index]; return <tr key={row.id}><td><input aria-label={`Região ${index + 1}`} value={row.region} onChange={(event) => updateDimension(index, 'region', event.target.value)} placeholder="Ex.: Bahia" /></td><td><input aria-label={`Turno ${index + 1}`} value={row.shift} onChange={(event) => updateDimension(index, 'shift', event.target.value)} placeholder="Ex.: Diurno" /></td><td><input aria-label={`Atividade ${index + 1}`} value={row.activity} onChange={(event) => updateDimension(index, 'activity', event.target.value)} placeholder="Ex.: Instalação" /></td><td><input aria-label={`HC atual ${index + 1}`} type="number" min="0" value={row.currentHeadcount} onChange={(event) => updateDimension(index, 'currentHeadcount', event.target.value)} /></td><td><input aria-label={`HC requerido ${index + 1}`} type="number" min="0" value={row.requiredHeadcount} onChange={(event) => updateDimension(index, 'requiredHeadcount', event.target.value)} /></td><td><input aria-label={`Capacidade por HC ${index + 1}`} type="number" min="0" step="0.1" value={row.capacityPerPerson} onChange={(event) => updateDimension(index, 'capacityPerPerson', event.target.value)} /></td><td><input aria-label={`Movimento alocado ${index + 1}`} type="number" min="0" max={row.currentHeadcount} step="1" disabled={draft.allocationMode !== 'manual'} value={draft.allocationMode === 'manual' ? row.scenarioMovement ?? 0 : result?.rowMovement ?? 0} onChange={(event) => updateDimension(index, 'scenarioMovement', event.target.value)} /></td><td><strong>{result?.afterMovement.toFixed(1) ?? '0.0'}%</strong><small>{result?.risk ?? 'Sem dados'}{result?.missingAllocation ? ' · rateio pendente' : ''}</small></td><td><input aria-label={`Fonte ${index + 1}`} value={row.source || ''} onChange={(event) => updateDimension(index, 'source', event.target.value)} placeholder="Planilha / sistema" /></td><td><input aria-label={`Vigência ${index + 1}`} value={row.validity || ''} onChange={(event) => updateDimension(index, 'validity', event.target.value)} placeholder="Ex.: out/2026" /></td><td><button className="icon-button" aria-label={`Remover dimensão ${index + 1}`} onClick={() => removeDimension(index)}><X size={14} /></button></td></tr>; })}</tbody></table></div><div className="panel-note"><Database size={16} /><span>{dimensionMessage || (dimensionResult.allocationMismatch ? `Movimento manual totaliza ${dimensionResult.allocatedMovement}; o cenário selecionado exige ${dimensionResult.requestedMovement}. Ajuste a distribuição antes de aprovar.` : dimensionResult.missingAllocation.length ? `${dimensionResult.missingAllocation.length} dimensão(ões) com região, turno, atividade, fonte, vigência ou dados obrigatórios pendentes. A cobertura fica visível, mas a aprovação permanece bloqueada até a correção.` : 'Distribuição do movimento aplicada. Confira região, turno, atividade, fonte e vigência antes de aprovar.')}</span></div></section>
    <section className="panel-surface ops-source-panel"><div className="panel-heading compact"><div><span className="section-index">04</span><div><h2>Rastreabilidade da base</h2><p>Fonte e classificação preservadas por linha</p></div></div></div><div className="dimension-source-list">{draft.dimensions.map((row) => <div key={`${row.id}-source`}><strong>{row.region || 'Região pendente'} · {row.activity || 'Atividade pendente'}</strong><span>{row.source || 'Fonte pendente'} · {row.validity || 'Vigência pendente'} · capacidade {row.capacityClassification || 'não classificada'}</span></div>)}</div></section>
  </>;
}

function ReportsView({ savedScenarios, approvals, auditHistory, activeProfileName, onApproval, onGoScenarios, currentSnapshot }) {
  function downloadReport(scenario) {
    const report = {
      produto: 'T-Sim',
      assinatura: 'Simular antes. Decidir melhor.',
      geradoEm: new Date().toISOString(),
      identificacao: { produto: 'T-Sim', versao: '0.1 · MVP local', ambiente: 'Base T-Sim · Bahia' },
      scenario,
      approval: approvals[scenario.id] || { status: 'Rascunho' },
      decisionHistory: auditHistory.filter((event) => event.scenarioId === scenario.id),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `tsim-parecer-${scenario.id}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function downloadSpreadsheet(scenario) {
    const XLSX = await import('xlsx');
    const rows = [{
      Produto: 'T-Sim',
      Cenário: scenario.name,
      Posições: scenario.quantity,
      'Promoções automáticas': scenario.automaticPromotions,
      'Promoções aplicadas': scenario.appliedPromotions,
      'Saldo mensal': scenario.appliedBalance,
      'Saldo anual': scenario.appliedAnnualBalance ?? scenario.appliedBalance * 12,
      'Delta por promoção': scenario.delta,
      'Cobertura após movimento (%)': scenario.operationalCoverage,
      Elegibilidade: scenario.promotionBlocked ? 'Bloqueada' : 'Elegível',
      Encargos: scenario.encargos,
      Fonte: scenario.source,
      Status: approvals[scenario.id]?.status || 'Rascunho',
    }];
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
    worksheet['!cols'] = [
      { wch: 16 }, { wch: 26 }, { wch: 12 }, { wch: 22 }, { wch: 21 }, { wch: 17 },
      { wch: 16 }, { wch: 20 }, { wch: 27 }, { wch: 16 }, { wch: 14 }, { wch: 34 }, { wch: 16 },
    ];
    const metadata = XLSX.utils.aoa_to_sheet([
      ['T-SIM · PARECER DE CENÁRIO'],
      ['Simular antes. Decidir melhor.'],
      ['Ambiente', 'Base T-Sim · Bahia'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['Uso', 'Documento de trabalho · validar premissas antes da aprovação'],
    ]);
    metadata['!cols'] = [{ wch: 18 }, { wch: 72 }];
    XLSX.utils.book_append_sheet(workbook, metadata, 'Identidade');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parecer');
    XLSX.writeFile(workbook, `tsim-parecer-${scenario.id}.xlsx`);
  }
  function printReport() {
    window.print();
  }
  const list = savedScenarios.length ? savedScenarios : currentSnapshot ? [currentSnapshot] : [];
  const recentEvents = auditHistory.slice(0, 12);
  const dateTime = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Data indisponível' : parsed.toLocaleString('pt-BR');
  };
  return <><div className="print-brand"><img src="/brand/t-sim-mark-on-light.svg" alt="" /><div><strong>T-SIM</strong><span>Simular antes. Decidir melhor.</span></div><small>Base T-Sim · Bahia</small></div><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> PARECERES E APROVAÇÃO</div><h1>Da simulação à<br /><em>decisão.</em></h1><p>Registre a recomendação, mantenha as premissas visíveis e entregue um resumo que a Diretoria consiga revisar.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Trilha de decisão</div><strong>{Object.values(approvals).filter((item) => item.status === 'Aprovado').length} aprovado(s)</strong><span>Decisões locais registradas</span><button onClick={printReport}><FileText size={13} /> Imprimir / PDF</button></div></section><section className="metric-grid"><Metric label="Prontos para revisão" value={list.length} detail="cenários com resumo" tone="blue" icon={FileText} /><Metric label="Em aprovação" value={list.filter((scenario) => approvals[scenario.id]?.status === 'Enviado').length} detail="aguardando decisão" tone="orange" icon={ClipboardCheck} /><Metric label="Aprovados" value={list.filter((scenario) => approvals[scenario.id]?.status === 'Aprovado').length} detail="trilha registrada" tone="green" icon={Check} /><Metric label="Formato de saída" value="JSON + Excel" detail="relatório local exportável" tone="violet" icon={FileSpreadsheet} /></section><section className="panel-surface reports-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Fila de decisão</h2><p>Envie, aprove ou exporte cada cenário.</p></div></div></div>{list.length === 0 ? <div className="empty-state"><FileText size={25} /><strong>Nenhum cenário pronto</strong><p>Salve uma simulação para gerar um parecer.</p><button className="primary-button compact-button" onClick={onGoScenarios}>Abrir cenários</button></div> : <div className="report-list">{list.map((scenario) => { const status = approvals[scenario.id]?.status || 'Rascunho'; const validation = validateScenarioForApproval({ scenario }); const unsaved = !scenario.id; const blocked = !validation.valid || unsaved; const blockMessage = unsaved ? 'Salve o cenário antes de registrar uma decisão.' : validation.message; return <article className="report-item" key={scenario.id || 'current-draft'}><div className="report-main"><div className="report-icon"><FileText size={16} /></div><div><strong>{scenario.name}</strong><span>{scenario.quantity} posição{scenario.quantity === 1 ? '' : 'ões'} · {scenario.appliedPromotions} promoções · saldo {money(scenario.appliedBalance)}</span>{blocked && <small className="report-warning">Bloqueado: {blockMessage}</small>}</div></div><span className={`approval-status status-${status.toLowerCase()}`}>{status}</span><div className="report-actions"><button disabled={blocked} title={blocked ? blockMessage : undefined} onClick={() => onApproval(scenario.id, status === 'Aprovado' ? 'Rascunho' : status === 'Enviado' ? 'Aprovado' : 'Enviado')}>{status === 'Rascunho' ? 'Enviar' : status === 'Enviado' ? 'Aprovar' : 'Reabrir'}</button><button onClick={() => downloadReport(scenario)}><Download size={12} /> JSON</button><button onClick={() => downloadSpreadsheet(scenario)}><FileSpreadsheet size={12} /> Excel</button></div></article>; })}</div>}</section><section className="panel-surface reports-panel audit-history-panel" aria-labelledby="audit-history-title"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2 id="audit-history-title">Histórico local de decisões</h2><p>{activeProfileName} · eventos guardados neste navegador</p></div></div><span className="source-chip">{recentEvents.length} evento(s) recentes</span></div>{recentEvents.length ? <ol className="audit-history-list">{recentEvents.map((event) => { const snapshot = event.scenarioSnapshot || {}; const action = event.nextStatus === 'Aprovado' ? 'Aprovação registrada' : event.nextStatus === 'Enviado' ? 'Enviado para decisão' : 'Cenário reaberto'; return <li className="audit-history-entry" key={event.id}><time dateTime={event.recordedAt}>{dateTime(event.recordedAt)}</time><div className="audit-history-detail"><div className="audit-history-heading"><strong>{event.scenarioName}</strong><span className={`approval-status status-${String(event.nextStatus).toLowerCase()}`}>{action}</span></div><p>{event.previousStatus} → {event.nextStatus} · {snapshot.quantity ?? '—'} posição(ões) · {snapshot.appliedPromotions ?? '—'} promoção(ões) · saldo {money(snapshot.appliedBalance)}</p><details><summary>Ver snapshot da decisão</summary><dl><div><dt>Identificador da versão</dt><dd>{snapshot.id || event.scenarioId}</dd></div><div><dt>Registrado por</dt><dd>Usuário local não identificado</dd></div><div><dt>Cobertura operacional</dt><dd>{Number.isFinite(snapshot.operationalCoverage) ? `${snapshot.operationalCoverage.toFixed(1)}%` : 'Não registrada'}</dd></div><div><dt>Fonte do cenário</dt><dd>{snapshot.source || 'Não informada'}</dd></div><div><dt>Encargos</dt><dd>{Number.isFinite(snapshot.encargos) ? `${(snapshot.encargos * 100).toFixed(1)}%` : 'Não registrados'}</dd></div></dl></details></div></li>; })}</ol> : <p className="audit-history-empty">Nenhuma transição de status foi registrada neste perfil local.</p>}<div className="panel-note audit-history-limit"><ShieldCheck size={16} /><span>Registro informativo armazenado apenas neste navegador. A autoria não é verificada; quem usa o aparelho pode alterar ou apagar os dados. Não é uma auditoria independente ou um registro em servidor.</span></div></section></>;
}

function BudgetView({ calc, cargoList, encargos }) {
  const [horizon, setHorizon] = useState(MESES);
  const payrollReference = cargoList.reduce((sum, cargo) => sum + custo(cargo, encargos), 0);
  const payrollAfter = payrollReference - calc.economy + (calc.appliedPromotions * Math.max(calc.delta, 0));
  const equivalentRevenue = calc.appliedBalance < 0 ? Math.abs(calc.appliedBalance) / 0.15 : 0;
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> BUDGET</div><h1>Veja o custo<br /><em>antes do compromisso.</em></h1><p>Separe a folha de cargos dos custos operacionais e compare a decisão no horizonte escolhido.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Horizonte de análise</div><strong>{horizon} meses</strong><span>Valores anualizados a partir do cenário atual</span><button onClick={() => setHorizon(horizon === 12 ? 24 : 12)}>Alternar horizonte <ChevronRight size={14} /></button></div></section><section className="metric-grid"><Metric label="Folha de referência" value={money(payrollReference)} detail="grade salarial + encargos People" tone="blue" icon={BarChart3} /><Metric label="Folha após cenário" value={money(payrollAfter)} detail={`${horizon} meses: ${money(payrollAfter * horizon)}`} tone={payrollAfter <= payrollReference ? 'green' : 'orange'} icon={ArrowDownRight} /><Metric label="Saldo aplicado" value={money(calc.appliedBalance)} detail={`${horizon} meses: ${money(calc.appliedBalance * horizon)}`} tone={calc.appliedBalance >= 0 ? 'green' : 'orange'} icon={DollarSign} /><Metric label="Receita equivalente" value={equivalentRevenue ? money(equivalentRevenue) : 'Não necessária'} detail="estimada a 15% de margem" tone="violet" icon={Sparkles} /></section><section className="budget-grid"><div className="panel-surface budget-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Waterfall da movimentação</h2><p>Folha atual → desligamentos → promoções → folha projetada</p></div></div></div><div className="budget-waterfall"><div><span>Folha atual</span><strong>{money(payrollReference)}</strong></div><div className="waterfall-negative"><span>Economia de desligamentos</span><strong>− {money(calc.economy)}</strong></div><div className="waterfall-positive"><span>Custo de promoções</span><strong>+ {money(calc.appliedPromotions * Math.max(calc.delta, 0))}</strong></div><div className="waterfall-total"><span>Folha projetada</span><strong>{money(payrollAfter)}</strong></div></div><div className="budget-formula"><span>Fórmula</span><code>folha projetada = folha atual − economia + promoções</code></div></div><aside className="panel-surface budget-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Premissas financeiras</h2><p>Classificação, vigência e origem mantidas visíveis</p></div></div></div><div className="assumption-list">{costAssumptions.map((assumption) => <div key={assumption.label}><div><strong>{assumption.label}</strong><span>{assumption.classification} · {assumption.validity} · {assumption.source}</span></div><b>{assumption.value}{assumption.unit}</b></div>)}</div><div className="panel-note"><Database size={16} /><span>O custo operacional completo está disponível no módulo Analytics e permanece separado da regra simplificada de cargos.</span></div></aside></section></>;
}

function AnalyticsView({ savedScenarios, operations }) {
  const [sourceMessage, setSourceMessage] = useState('');
  const costs = operations.costs?.length ? operations.costs : operationalCosts;
  const headcountBases = operations.headcountBases?.length ? operations.headcountBases : operationalSource.headcountBases;
  const rateioHeadcount = headcountBases.find((item) => /custos|oficial/i.test(`${item.id} ${item.label}`))?.headcount ?? 0;
  const comparisonHeadcount = headcountBases.find((item) => /controle|comparacao/i.test(`${item.id} ${item.label}`))?.headcount ?? 0;
  const totalOperational = costs.reduce((sum, item) => sum + (Number(item.monthlyCost) || 0), 0);
  const headcountDifference = rateioHeadcount - comparisonHeadcount;
  const maxCost = Math.max(...costs.map((item) => Number(item.monthlyCost) || 0), 1);
  const importedClasses = costs.filter((item) => /classe/i.test(item.label || '') && (item.unitCost || item.headcount));
  const classRows = importedClasses.length ? importedClasses : teamClasses;
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> ANALYTICS</div><h1>Custos e operação<br /><em>na mesma leitura.</em></h1><p>Use os dados operacionais da planilha de custos para contextualizar a decisão de pessoas e identificar concentração de impacto.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Fonte operacional</div><strong>{operations.basisSource || 'V.TAL · 2025'}</strong><span>Custos, headcount e dimensões do perfil atual</span><button onClick={() => setSourceMessage('A fonte exibida vem da importação local mais recente.')}>Ver fonte <ChevronRight size={14} /></button>{sourceMessage && <small className="source-message">{sourceMessage}</small>}</div></section><section className="metric-grid"><Metric label="Custo operacional mensal" value={money(totalOperational)} detail="base de referência · / mês" tone="blue" icon={BarChart3} /><Metric label="HC base operacional" value={rateioHeadcount} detail="Custos Equipes · base oficial" tone="violet" icon={UsersRound} /><Metric label="HC Controle Local" value={comparisonHeadcount} detail={`comparação · diferença de ${headcountDifference} HC`} tone="orange" icon={TriangleAlert} /><Metric label="Cenários disponíveis" value={savedScenarios.length} detail="para cruzar com operação" tone="green" icon={Layers3} /></section><section className="panel-surface analytics-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Custos por contexto</h2><p>Valores mensais de referência da fonte operacional</p></div></div><span className="source-chip"><span /> Fonte rastreada</span></div><div className="analytics-bars">{costs.map((item) => <div className="analytics-bar-row" key={item.id}><div className="analytics-bar-label"><strong>{item.label}</strong><small>{item.headcount} HC informado · {item.classification} · {item.validity} · {item.source}</small></div><div className="analytics-track"><span style={{ width: `${((Number(item.monthlyCost) || 0) / maxCost) * 100}%` }} /></div><b>{money(Number(item.monthlyCost) || 0, true)}<small className="metric-unit"> / mês</small></b></div>)}</div><div className="panel-note"><Database size={16} /><span>{operations.basisSource || operationalSource.reconciliation} O rateio operacional e a cobertura usam {rateioHeadcount} HC.</span></div></section><section className="analytics-grid"><div className="panel-surface analytics-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Classes de equipe</h2><p>Custo de referência por equipe · mês</p></div></div></div><div className="class-table">{classRows.map((item) => <div key={item.id}><strong>{item.label}</strong><span>{item.headcount || 0} HC · {item.teamCount || '—'} equipes · {item.classification || 'Informada'} · {item.validity || 'A informar'}</span><b>{money(item.unitCost || 0)}<small className="metric-unit"> / equipe</small></b></div>)}</div></div><div className="panel-surface analytics-panel"><div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Leitura executiva</h2><p>Pontos para validação</p></div></div></div><div className="insight-list analytics-insights"><div className="insight-item"><span className="insight-number">01</span><div><strong>Contextos não devem ser misturados</strong><p>A grade de cargos usa 113% de encargos; a operação pode usar encargos, ADM e BDI próprios.</p></div></div><div className="insight-item"><span className="insight-number">02</span><div><strong>Base operacional definida</strong><p>O rateio usa a base oficial importada; referências comparativas permanecem visíveis.</p></div></div><div className="insight-item"><span className="insight-number">03</span><div><strong>ROI permanece estimado</strong><p>Sem histórico de retenção, produtividade e turnover, a recomendação deve permanecer indicativa.</p></div></div></div></div></section></>;
}

function SettingsView({ configuration, operations, savedScenarios, approvals, auditHistory, people, assumptions, profiles, activeProfileId, onProfileChange, onCreateProfile, onResetConfiguration, onClearWorkspace, onRestoreWorkspace, onImportWorkbook }) {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  function reset() { onResetConfiguration(); setMessage('Premissas de cargos restauradas.'); }
  function clear() { if (!window.confirm('Limpar configuração local, cenários, aprovações, histórico de decisões e operações deste perfil?')) return; onClearWorkspace(); setMessage('Dados locais do ambiente restaurados para a referência inicial.'); }
  function exportWorkspace() { const payload = { produto: 'T-Sim', schemaVersion: 3, exportedAt: new Date().toISOString(), configuration, operations, savedScenarios, approvals, auditHistory, people, assumptions }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'tsim-workspace-backup.json'; anchor.click(); URL.revokeObjectURL(url); setMessage('Backup local exportado com histórico de decisões.'); }
  const workbookInputRef = useRef(null);
  const [profileName, setProfileName] = useState('');
  async function importWorkspace(event) { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); if (payload?.produto !== 'T-Sim' || !payload.configuration?.cargos || !payload.operations) throw new Error('invalid'); onRestoreWorkspace(payload); setMessage('Backup restaurado neste navegador.'); } catch { setMessage('Arquivo inválido. Escolha um backup JSON exportado pelo T-Sim.'); } finally { event.target.value = ''; } }
  async function importWorkbook(event) { const file = event.target.files?.[0]; if (!file) return; try { const result = await onImportWorkbook(file); const preserved = result.preservedSections?.length ? ` Seções sem registros válidos preservadas no perfil: ${result.preservedSections.join(', ')}.` : ''; setMessage(`Planilha importada: ${result.counts.cargos} cargos, ${result.counts.people} pessoas, ${result.counts.assumptions} premissas, ${result.counts.dimensions} dimensões, ${result.counts.costs} custos e ${result.counts.scenarios} cenários.${preserved}`); } catch (error) { setMessage(error.message || 'Não foi possível importar a planilha completa.'); } finally { event.target.value = ''; } }
  function createProfile() { const profile = onCreateProfile(profileName); if (profile) { setProfileName(''); setMessage(`Perfil local “${profile.name}” criado.`); } }
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> CONFIGURAÇÕES</div><h1>Controle as<br /><em>premissas locais.</em></h1><p>O T-Sim usa uma base própria por ambiente. Os dados importados ficam disponíveis somente neste navegador e não são enviados a outro sistema.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Ambiente atual</div><strong>{profiles.find((profile) => profile.id === activeProfileId)?.name || 'Base própria · local'}</strong><span>Dados disponíveis neste aparelho</span><button onClick={() => setMessage('O T-Sim está operando com a base própria local deste navegador.')}>Ver status <ChevronRight size={14} /></button></div></section><section className="settings-grid"><div className="panel-surface settings-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Base própria e governança</h2><p>Dados carregados pelo usuário</p></div></div></div><div className="settings-list"><div><span>Ambiente</span><strong>{profiles.find((profile) => profile.id === activeProfileId)?.name || 'Base T-Sim · usuário atual'}</strong></div><div><span>Persistência</span><strong>localStorage · perfil local selecionado</strong></div><div><span>Compartilhamento externo</span><strong>Desativado</strong></div><div><span>Registros importados</span><strong>{people.length} pessoas · {assumptions.length} premissas</strong></div><div><span>Classificação dos resultados</span><strong>Informados, calculados e estimados</strong></div></div><div className="profile-switcher"><label><span>Perfil local</span><select value={activeProfileId} onChange={(event) => onProfileChange(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><div className="profile-create"><input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Nome da nova base" /><button className="secondary-button" type="button" onClick={createProfile}>Criar perfil</button></div></div><div className="panel-note profile-limit-note"><ShieldCheck size={16} /><span>Perfis são uma organização local, não contas protegidas: qualquer pessoa com acesso a este navegador pode alternar entre eles. Não guarde aqui dados pessoais que exijam controle de acesso.</span></div></div><div className="panel-surface settings-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Planilha padrão</h2><p>Alimente todas as áreas do seu ambiente</p></div></div></div><div className="settings-actions"><a className="secondary-button" href="/templates/tsim-planilha-padrao.xlsx" download>Baixar planilha padrão</a><input ref={workbookInputRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={importWorkbook} /><button className="secondary-button" onClick={() => workbookInputRef.current?.click()}>Importar planilha completa</button><button className="secondary-button" onClick={reset}>Restaurar cargos e encargos</button><button className="secondary-button" onClick={clear}>Limpar dados locais</button></div><div className="settings-backup"><input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={importWorkspace} /><button className="secondary-button" onClick={exportWorkspace}>Exportar backup JSON</button><button className="secondary-button" onClick={() => fileInputRef.current?.click()}>Restaurar backup JSON</button></div>{message && <div className="settings-message"><Check size={15} />{message}</div>}<div className="panel-note"><ShieldCheck size={16} /><span>As abas Cargos, Pessoas, Premissas, Operação e Cenários são processadas localmente. Revise fonte, vigência e cobertura antes de salvar.</span></div></div></section></>;
}
function AiView({ calc, operations }) {
  const coverage = operations.dimensions?.length ? calculateDimensionCoverage(operations.dimensions, 1, operations.allocationMode) : calculateCoverage({ ...operations, quantity: 1 });
  const recommendation = calc.appliedBalance >= 0 && !coverage.approvalBlocked
    ? 'Cenário pronto para revisão executiva'
    : 'Cenário precisa de validação antes da aprovação';
  const tone = calc.appliedBalance >= 0 && !coverage.approvalBlocked ? 'green' : 'orange';
  return <><section className="hero-intro"><div><div className="eyebrow"><span className="eyebrow-line" /> T-SIM AI · LOCAL</div><h1>Uma leitura que<br /><em>explica a decisão.</em></h1><p>O assistente local organiza os números do cenário e transforma as premissas em perguntas de validação, sem enviar dados para serviços externos.</p></div><div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Motor ativo</div><strong>Regras rastreáveis</strong><span>Sem API, assinatura ou custo externo</span><button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>Ver análise <ChevronRight size={14} /></button></div></section><section className="metric-grid"><Metric label="Recomendação" value={calc.appliedBalance >= 0 ? 'Favorável' : 'Revisar'} detail="saldo do cenário atual" tone={tone} icon={Sparkles} /><Metric label="Saldo mensal" value={money(calc.appliedBalance)} detail="após promoções aplicadas" tone={calc.appliedBalance >= 0 ? 'green' : 'orange'} icon={DollarSign} /><Metric label="Cobertura projetada" value={`${coverage.afterMovement.toFixed(1)}%`} detail={`alvo de ${operations.slaTarget}%`} tone={coverage.approvalBlocked ? 'orange' : 'blue'} icon={ShieldCheck} /><Metric label="Classificação" value="Estimativa" detail="ROI e retenção exigem histórico" tone="violet" icon={TriangleAlert} /></section><section className="ai-grid"><div className="panel-surface ai-panel"><div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Parecer automático</h2><p>Explicação baseada nas regras do T-Sim</p></div></div></div><div className={`ai-recommendation ai-${tone}`}><Sparkles size={18} /><div><strong>{recommendation}</strong><span>{calc.appliedPromotions} promoç{calc.appliedPromotions === 1 ? 'ão' : 'ões'} · saldo anual {money(calc.appliedAnnualBalance)}</span></div></div><div className="ai-reading"><p>O movimento libera <b>{money(calc.economy)}</b> por mês e consome <b>{money(calc.appliedPromotions * Math.max(calc.delta, 0))}</b> em progressões.</p><p>{coverage.approvalBlocked ? 'A cobertura projetada está abaixo do SLA alvo. Registre uma justificativa operacional antes de enviar.' : 'A cobertura permanece acima do SLA alvo informado. Confirme elegibilidade e orçamento antes da aprovação.'}</p></div></div><aside className="panel-surface ai-panel"><div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Perguntas de validação</h2><p>Checklist antes de decidir</p></div></div></div><div className="ai-checklist"><label><input type="checkbox" /> Elegibilidade da pessoa confirmada</label><label><input type="checkbox" /> Fonte salarial e vigência revisadas</label><label><input type="checkbox" /> Cobertura por região validada</label><label><input type="checkbox" /> Centro de custo e orçamento aprovados</label></div><div className="panel-note"><ShieldCheck size={16} /><span>O T-Sim AI local não inventa dados: apenas explica o resultado calculado e aponta lacunas.</span></div></aside></section></>;
}

function InstitutionalView({ onGoSimulator }) {
  return (
    <>
      <section className="institutional-hero">
        <div className="institutional-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> T-SIM · PLATAFORMA</div>
          <h1>Decisões com<br /><em>visão de campo.</em></h1>
          <p>O T-Sim conecta pessoas, orçamento e operação em uma bancada de decisão clara, rastreável e pronta para revisão.</p>
          <button className="primary-button institutional-action" type="button" onClick={onGoSimulator}>Abrir simulador <ArrowRight size={16} /></button>
        </div>
        <div className="institutional-mockup"><img src="/brand/t-sim-app-mockup.png" alt="Mockup do T-Sim em monitor e tablet" /><span className="mockup-caption">Representação visual do workspace T-Sim</span></div>
      </section>
      <section className="institutional-grid">
        <article className="institutional-card"><span className="section-index">01</span><strong>People</strong><p>Grade salarial, cargos, encargos e premissas com fonte e vigência visíveis.</p></article>
        <article className="institutional-card"><span className="section-index">02</span><strong>Budget</strong><p>Folha atual, economia, promoções e impacto projetado no horizonte escolhido.</p></article>
        <article className="institutional-card"><span className="section-index">03</span><strong>Ops + Analytics</strong><p>Cobertura operacional e concentração de custos para validar o risco da decisão.</p></article>
      </section>
      <section className="institutional-principles panel-surface"><div className="panel-heading compact"><div><span className="section-index">04</span><div><h2>Como a plataforma trabalha</h2><p>Uma sequência curta para transformar dado em decisão.</p></div></div></div><div className="principle-list"><div><Check size={17} /><span><strong>Simular antes</strong> comparar caminhos antes da aprovação.</span></div><div><ShieldCheck size={17} /><span><strong>Rastrear sempre</strong> manter fonte, unidade e classificação junto do número.</span></div><div><ArrowRight size={17} /><span><strong>Agir com contexto</strong> cruzar a economia com cobertura e capacidade.</span></div></div></section>
    </>
  );
}

function EntryExperience({ stage, onStageChange, onEnter }) {
  const onboarding = stage === 'onboarding';
  return (
    <main className="entry-shell">
      <section className="entry-visual">
        <div className="entry-visual-grid" />
        <img src="/brand/t-sim-lockup-stacked-dark.svg" alt="T-SIM — Decisão inteligente" />
        <div className="entry-signal"><span /><span /><span /></div>
        <p>Uma bancada visual para simular pessoas, orçamento e cobertura antes da aprovação.</p>
      </section>
      <section className="entry-content">
        <div className="entry-content-inner">
          <div className="entry-kicker"><span className="eyebrow-line" /> {onboarding ? 'PRIMEIRO ACESSO' : 'ACESSO AO AMBIENTE'}</div>
          {onboarding ? (
            <>
              <h1>Prepare a base<br /><em>antes da decisão.</em></h1>
              <p className="entry-lead">O T-Sim organiza a leitura em três movimentos curtos. Você pode revisar as premissas antes de abrir qualquer cenário.</p>
              <div className="onboarding-steps">
                <article><span>01</span><div><strong>Conheça a base</strong><p>Veja cargos, encargos e fontes carregadas.</p></div><Check size={16} /></article>
                <article><span>02</span><div><strong>Valide as premissas</strong><p>Confirme vigência, origem e classificação.</p></div><ShieldCheck size={16} /></article>
                <article><span>03</span><div><strong>Simule o movimento</strong><p>Compare economia, promoção e cobertura.</p></div><ArrowRight size={16} /></article>
              </div>
              <button className="primary-button entry-submit" type="button" onClick={onEnter}>Abrir workspace <ArrowRight size={16} /></button>
              <button className="entry-back" type="button" onClick={() => onStageChange('login')}>Voltar ao acesso</button>
            </>
          ) : (
            <>
              <h1>Entre para<br /><em>decidir melhor.</em></h1>
              <p className="entry-lead">Acesse a base local do T-Sim e continue suas simulações com as premissas visíveis.</p>
              <div className="entry-field"><label htmlFor="entry-workspace">Ambiente de trabalho</label><div className="entry-input"><Database size={16} /><input id="entry-workspace" value="Base T-Sim · Bahia" readOnly /></div><small>Ambiente local · dados permanecem neste navegador</small></div>
              <button className="primary-button entry-submit" type="button" onClick={() => onStageChange('onboarding')}>Continuar <ArrowRight size={16} /></button>
              <div className="entry-note"><ShieldCheck size={16} /><span>Esta experiência não envia dados para serviços externos e não representa autenticação de produção.</span></div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function App() {
  const [profiles, setProfiles] = useState(() => loadLocalProfiles());
  const [activeProfileId, setActiveProfileIdState] = useState(() => getActiveProfileId());
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
  const [activeView, setActiveView] = useState('overview');
  // O ambiente local abre direto no workspace, sem login ou sincronização externa.
  const [entryStage, setEntryStage] = useState('workspace');
  const [savedScenarios, setSavedScenarios] = useState(() => loadSavedScenarios());
  const [operations, setOperations] = useState(() => loadOperations(operationsDefaults));
  const [approvals, setApprovals] = useState(() => loadApprovals());
  const [auditHistory, setAuditHistory] = useState(() => loadApprovalHistory());
  const [people, setPeople] = useState(() => loadPeople());
  const [assumptions, setAssumptions] = useState(() => loadImportedAssumptions());
  const [saveMessage, setSaveMessage] = useState('');
  const [theme, setTheme] = useState(() => window.localStorage.getItem('tsim.theme.v1') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('tsim.theme.v1', theme);
  }, [theme]);

  const enterWorkspace = () => {
    window.localStorage.setItem('tsim.onboarding.v1', 'completed');
    setEntryStage('workspace');
    setActiveView('overview');
  };

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
  }

  function handleResetConfiguration() {
    window.localStorage.removeItem(workspaceStorageKey('tsim.configuration.v1'));
    const nextConfiguration = { cargos: cargos.map((cargo) => ({ ...cargo })), encargos: 1.13 };
    setConfiguration(nextConfiguration);
  }

  function handleSaveOperations(nextOperations) {
    saveOperations(nextOperations);
    setOperations(nextOperations);
  }

  function handleApproval(scenarioId, status) {
    const scenario = savedScenarios.find((item) => item.id === scenarioId);
    if (!scenario) return;
    const nextApprovals = saveApproval(scenarioId, { status }, scenario);
    setApprovals(nextApprovals);
    setAuditHistory(loadApprovalHistory());
  }

  function handleClearWorkspace() {
    ['tsim.configuration.v1', 'tsim.saved-scenarios.v1', 'tsim.operations.v1', 'tsim.approvals.v1', 'tsim.approval-history.v1', 'tsim.people.v1', 'tsim.imported-assumptions.v1'].forEach((key) => window.localStorage.removeItem(workspaceStorageKey(key)));
    const nextOperations = { ...operationsDefaults };
    setConfiguration({ cargos: cargos.map((cargo) => ({ ...cargo })), encargos: 1.13 });
    setSavedScenarios([]);
    setOperations(nextOperations);
    setApprovals({});
    setAuditHistory([]);
    setPeople([]);
    setAssumptions([]);
  }

  function handleRestoreWorkspace(payload) {
    saveConfiguration(payload.configuration);
    const nextOperations = normalizeOperations(payload.operations, operationsDefaults);
    saveOperations(nextOperations);
    saveScenarioList(payload.savedScenarios ?? []);
    savePeople(payload.people ?? []);
    saveImportedAssumptions(payload.assumptions ?? []);
    window.localStorage.setItem(workspaceStorageKey('tsim.approvals.v1'), JSON.stringify(payload.approvals ?? {}));
    saveApprovalHistory(payload.auditHistory ?? []);
    setConfiguration(payload.configuration);
    setOperations(nextOperations);
    setSavedScenarios(payload.savedScenarios ?? []);
    setApprovals(payload.approvals ?? {});
    setAuditHistory(loadApprovalHistory());
    setPeople(payload.people ?? []);
    setAssumptions(payload.assumptions ?? []);
  }

  function handleProfileChange(profileId) {
    if (!setActiveProfile(profileId)) return;
    setActiveProfileIdState(profileId);
    setConfiguration(loadConfiguration({ cargos, encargos: 1.13 }));
    setOperations(loadOperations(operationsDefaults));
    setSavedScenarios(loadSavedScenarios());
    setApprovals(loadApprovals());
    setAuditHistory(loadApprovalHistory());
    setPeople(loadPeople());
    setAssumptions(loadImportedAssumptions());
    setSaveMessage('Perfil local alterado.');
  }

  function handleCreateProfile(name) {
    const profile = createLocalProfile(name);
    if (profile) setProfiles(loadLocalProfiles());
    return profile;
  }

  async function handleImportWorkbook(file) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheets = Object.fromEntries(workbook.SheetNames.map((name) => [name, XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null })]));
    const result = parseTsimWorkbook(sheets, { configuration, operations });
    if (!result.counts.cargos && !result.counts.people && !result.counts.assumptions && !result.counts.dimensions && !result.counts.costs && !result.counts.scenarios) throw new Error('Nenhuma aba compatível ou linha preenchida foi encontrada.');
    const nextConfiguration = result.configuration;
    const nextOperations = normalizeOperations(result.operations, operationsDefaults);
    saveConfiguration(nextConfiguration);
    saveOperations(nextOperations);
    const nextPeople = retainExistingIfImportEmpty(result.people, people);
    const nextAssumptions = retainExistingIfImportEmpty(result.assumptions, assumptions);
    const nextScenarios = retainExistingIfImportEmpty(result.scenarios, savedScenarios);
    if (result.people.length) savePeople(nextPeople);
    if (result.assumptions.length) saveImportedAssumptions(nextAssumptions);
    if (result.scenarios.length) saveScenarioList(nextScenarios);
    const nextApprovals = result.scenarios.length
      ? Object.fromEntries(result.scenarios.filter((scenario) => scenario.importedStatus).map((scenario) => [scenario.id, { status: scenario.importedStatus.includes('aprov') ? 'Aprovado' : scenario.importedStatus.includes('envi') ? 'Enviado' : 'Rascunho', updatedAt: new Date().toISOString() }]))
      : approvals;
    if (result.scenarios.length) window.localStorage.setItem(workspaceStorageKey('tsim.approvals.v1'), JSON.stringify(nextApprovals));
    setConfiguration(nextConfiguration);
    setOperations(nextOperations);
    setPeople(nextPeople);
    setAssumptions(nextAssumptions);
    setSavedScenarios(nextScenarios);
    setApprovals(nextApprovals);
    return {
      ...result,
      preservedSections: [
        !result.people.length && 'Pessoas',
        !result.assumptions.length && 'Premissas',
        !result.scenarios.length && 'Cenários',
      ].filter(Boolean),
    };
  }

  function snapshotScenario() {
    const coverage = calculateCoverage({ ...operations, quantity });
    const dimensionCoverage = operations.dimensions?.length ? calculateDimensionCoverage(operations.dimensions, quantity, operations.allocationMode) : null;
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
      operationalCoverage: dimensionCoverage?.afterMovement ?? coverage.afterMovement,
      operationalAllocationMode: dimensionCoverage?.allocationMode ?? 'global',
      operationalMovementAllocated: dimensionCoverage?.allocatedMovement ?? quantity,
      approvalBlocked: coverage.approvalBlocked || Boolean(dimensionCoverage?.approvalBlocked),
      budgetBlocked: calc.appliedBalance < 0,
      promotionBlocked: !calc.promotionEligible,
      delta: calc.delta,
      appliedAnnualBalance: calc.appliedAnnualBalance,
      encargos: configuredEncargos,
      salarySnapshot: configuredCargos.map(({ id, salary }) => ({ id, salary })),
      source: 'MVP local',
    };
  }

  function handleSaveScenario() {
    saveScenario(snapshotScenario());
    const nextSavedScenarios = loadSavedScenarios();
    setSavedScenarios(nextSavedScenarios);
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

  const recommendationLabel = manualMode ? 'Ajuste manual' : activeScenario === 'conservative' ? 'Conservador' : activeScenario === 'aggressive' ? 'Agressivo' : 'Equilibrado';
  const appliedScenarioLabel = manualMode ? 'ajuste manual' : activeScenario === 'conservative' ? 'conservador' : activeScenario === 'aggressive' ? 'agressivo' : 'equilibrado';
  const recommendationText = calc.appliedBalance < 0
    ? 'O saldo ficou negativo. Reduza promoções ou valide uma fonte orçamentária adicional antes de aprovar.'
    : manualMode
      ? 'O ajuste manual está aplicado. Compare o saldo mensal e confirme a capacidade operacional antes de aprovar.'
      : activeScenario === 'conservative'
        ? 'Preserva o caixa e adia progressões até que a capacidade e o orçamento sejam confirmados.'
        : activeScenario === 'aggressive'
          ? 'Maximiza a retenção projetada, mas exige validação do saldo e da cobertura operacional.'
          : 'Preserva saldo positivo e transforma a economia em progressão técnica sem comprometer a cobertura.';
  const scenarioData = {
    conservative: { title: 'Conservador', kicker: 'Controle de caixa', value: money(calc.economy, true), detail: 'saldo mensal preservado', tone: 'green' },
    balanced: { title: 'Equilibrado', kicker: 'Recomendado', value: money(calc.economy - calc.delta * calc.balancedPromotions, true), detail: `${calc.balancedPromotions} promoções financiadas`, tone: 'blue' },
    aggressive: { title: 'Agressivo', kicker: 'Retenção máxima', value: money(calc.economy - calc.delta * calc.aggressivePromotions, true), detail: `${calc.aggressivePromotions} promoções projetadas`, tone: 'orange' },
  };

  const maxChart = Math.max(...configuredCargos.map((cargo) => custo(cargo, configuredEncargos)));
  const currentSection = navItems.find((item) => item.id === activeView)?.label || 'Simulador';
  const sectionTitle = {
    overview: 'Radar executivo',
    presentation: 'Plataforma e identidade',
    simulator: 'Movimentação de pessoas',
    people: 'Base de cargos e pessoas',
    scenarios: 'Biblioteca de cenários',
    ops: 'Cobertura operacional',
    reports: 'Pareceres e aprovação',
    budget: 'Orçamento e folha',
    analytics: 'Custos e indicadores',
    ai: 'Parecer assistido',
    settings: 'Ambiente local',
  }[activeView];

  if (entryStage !== 'workspace') {
    return <EntryExperience stage={entryStage} onStageChange={setEntryStage} onEnter={enterWorkspace} />;
  }

  return (
    <>
      <a className="skip-link" href="#workspace-content">Pular para o conteúdo</a>
      <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand-block">
          <img className="brand-lockup" src="/brand/t-sim-logo-header.png" alt="T-SIM — Decisão inteligente" />
          <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Fechar navegação"><X size={18} /></button>
        </div>

        <button className="workspace-select" type="button" aria-label="Abrir configurações do ambiente" onClick={() => setActiveView('settings')}>
          <div className="workspace-orb">TS</div>
          <div className="workspace-copy"><span>Ambiente local</span><strong>{profiles.find((profile) => profile.id === activeProfileId)?.name || 'Base T-Sim · Bahia'}</strong></div>
          <ChevronRight size={15} aria-hidden="true" />
        </button>

        <nav className="primary-nav" aria-label="Navegação principal">
          <p className="nav-label">Navegação</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeView === id ? 'active' : ''}`} aria-current={activeView === id ? 'page' : undefined} onClick={() => { setActiveView(id); setMobileNav(false); }}>
              <Icon size={17} strokeWidth={activeView === id ? 2.1 : 1.8} aria-hidden="true" />
              <span>{label}</span>
              {activeView === id && <span className="nav-pip" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="source-status"><span className="status-dot" /><div><strong>Base local carregada</strong><span>Grade salarial · v1.4</span></div></div>
          <div className="profile"><div className="avatar">TS</div><div><strong>Usuário atual</strong><span>Base local</span></div><ChevronRight size={15} /></div>
        </div>
      </aside>

      {mobileNav && <button className="scrim" aria-label="Fechar menu" onClick={() => setMobileNav(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="menu-trigger" onClick={() => setMobileNav(true)} aria-label="Abrir navegação"><Menu size={21} /></button>
          <div className="breadcrumbs"><span>{currentSection}</span><ChevronRight size={14} /><strong>{sectionTitle}</strong></div>
          <div className="topbar-actions"><span className="last-sync">Dados neste navegador <strong>salvamento local</strong></span><button className="theme-toggle" type="button" role="switch" aria-checked={theme === 'dark'} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span></button><button className="help-button" aria-label="Ajuda"><CircleHelp size={18} /></button></div>
        </header>

        <div className="content-wrap" id="workspace-content" tabIndex="-1">
          {activeView === 'people' ? <PeopleView cargoList={configuredCargos} encargos={configuredEncargos} people={people} onSaveConfiguration={handleSaveConfiguration} onResetConfiguration={handleResetConfiguration} saved={Boolean(window.localStorage.getItem(workspaceStorageKey('tsim.configuration.v1')))} /> : activeView === 'scenarios' ? <ScenariosView savedScenarios={savedScenarios} onRestore={(scenario) => { restoreScenario(scenario); setActiveView('simulator'); }} onGoSimulator={() => setActiveView('simulator')} /> : activeView === 'overview' ? <OverviewView cargoList={configuredCargos} encargos={configuredEncargos} savedScenarios={savedScenarios} onGoSimulator={() => setActiveView('simulator')} onGoPeople={() => setActiveView('people')} onGoReports={() => setActiveView('reports')} /> : activeView === 'presentation' ? <InstitutionalView onGoSimulator={() => setActiveView('simulator')} /> : activeView === 'ops' ? <OperationsView operations={operations} onSave={handleSaveOperations} calc={calc} quantity={quantity} /> : activeView === 'reports' ? <ReportsView savedScenarios={savedScenarios} approvals={approvals} auditHistory={auditHistory} activeProfileName={profiles.find((profile) => profile.id === activeProfileId)?.name || 'Base local'} onApproval={handleApproval} onGoScenarios={() => setActiveView('scenarios')} currentSnapshot={snapshotScenario()} /> : activeView === 'budget' ? <BudgetView calc={calc} cargoList={configuredCargos} encargos={configuredEncargos} /> : activeView === 'analytics' ? <AnalyticsView savedScenarios={savedScenarios} operations={operations} /> : activeView === 'ai' ? <AiView calc={calc} operations={operations} /> : activeView === 'settings' ? <SettingsView configuration={configuration} operations={operations} savedScenarios={savedScenarios} approvals={approvals} auditHistory={auditHistory} people={people} assumptions={assumptions} profiles={profiles} activeProfileId={activeProfileId} onProfileChange={handleProfileChange} onCreateProfile={handleCreateProfile} onResetConfiguration={handleResetConfiguration} onClearWorkspace={handleClearWorkspace} onRestoreWorkspace={handleRestoreWorkspace} onImportWorkbook={handleImportWorkbook} /> : <>
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
                <div className="panel-heading-actions">{saveMessage && <span className="save-message" aria-live="polite">{saveMessage}</span>}<button className="save-scenario-button" onClick={handleSaveScenario}><ClipboardCheck size={14} /> Salvar cenário</button><span className="live-badge"><span /> Recalcula ao alterar</span></div>
              </div>

              {savedScenarios.length > 0 && <div className="saved-scenarios-strip"><span className="saved-label"><BookOpen size={13} /> {savedScenarios.length} cenário{savedScenarios.length === 1 ? '' : 's'} salvo{savedScenarios.length === 1 ? '' : 's'}</span><div className="saved-scenario-list">{savedScenarios.slice(0, 3).map((scenario) => <button key={scenario.id} className="saved-scenario-chip" onClick={() => restoreScenario(scenario)} title={`Reabrir ${scenario.name}`}><span>{scenario.name}</span><small>{new Date(scenario.savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</small></button>)}</div></div>}

              <div className="field-grid">
                <label className="field field-wide"><span>Cargo desligado / vaga aberta</span><select value={dismissedRole} onChange={(event) => setDismissedRole(event.target.value)}>{configuredCargos.map((cargo) => <option key={cargo.id} value={cargo.id}>{cargo.name}</option>)}</select><small>Libera {money(calc.dismissedCost)} por posição / mês</small></label>
                <label className="field"><span>Quantidade</span><div className="quantity-input"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade">−</button><input type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} /><button onClick={() => setQuantity(Math.min(20, quantity + 1))} aria-label="Aumentar quantidade">+</button></div><small>Posições impactadas</small></label>
                <label className="field"><span>Origem da promoção</span><select value={originRole} onChange={(event) => { const nextOrigin = event.target.value; const nextIndex = configuredCargos.findIndex((cargo) => cargo.id === nextOrigin); const destinationIndex = configuredCargos.findIndex((cargo) => cargo.id === destinationRole); setOriginRole(nextOrigin); if (destinationIndex <= nextIndex) setDestinationRole(configuredCargos[nextIndex + 1]?.id || nextOrigin); }}>{configuredCargos.map((cargo) => <option key={cargo.id} value={cargo.id}>{cargo.short}</option>)}</select><small>Custo atual {money(calc.originCost)}</small></label>
                <label className="field"><span>Destino da promoção</span><select value={destinationRole} onChange={(event) => setDestinationRole(event.target.value)}>{configuredCargos.map((cargo, index) => <option key={cargo.id} value={cargo.id} disabled={index <= calc.originIndex}>{cargo.short}{index <= calc.originIndex ? ' · não elegível' : ''}</option>)}</select><small>{calc.promotionEligible ? `Custo projetado ${money(calc.destinationCost)}` : calc.promotionBlockReason}</small></label>
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
                  <div className={`quantity-option manual-option ${manualMode ? 'is-active' : ''}`}><div className="quantity-option-top"><span>Manual</span>{manualMode && <span className="quantity-badge manual-badge">aplicado</span>}</div><div className="manual-stepper"><button onClick={() => setManualPromotions(Math.max(0, calc.selectedManualPromotions - 1))} disabled={!manualMode} aria-label="Diminuir promoções manuais">−</button><input type="number" min="0" max="99" value={calc.selectedManualPromotions} onChange={(event) => setManualPromotions(Math.max(0, Math.min(99, Number(event.target.value) || 0)))} disabled={!manualMode} aria-label="Quantidade manual de promoções" /><button onClick={() => setManualPromotions(Math.min(99, calc.selectedManualPromotions + 1))} disabled={!manualMode} aria-label="Aumentar promoções manuais">+</button></div><small className={calc.manualBalance < 0 ? 'budget-warning' : ''}>{manualMode ? `saldo ${money(calc.manualBalance)} / mês` : 'ative para editar'}</small></div>
                  <div className={`quantity-difference ${calc.manualDifference === 0 ? 'same' : calc.manualDifference > 0 ? 'more' : 'less'}`}><span>Diferença</span><strong>{calc.manualDifference > 0 ? '+' : ''}{calc.manualDifference}</strong><small>{calc.manualDifference === 0 ? 'mesma quantidade' : calc.manualDifference > 0 ? 'a mais que o automático' : 'a menos que o automático'}</small></div>
                </div>
                <div className="quantity-panel-foot"><span><span className="info-marker">i</span> Automático permanece como referência da economia.</span><strong className={calc.appliedBalance < 0 ? 'budget-warning' : ''}>{manualMode ? calc.appliedBalance < 0 ? `Déficit mensal: ${money(Math.abs(calc.appliedBalance))}` : `Saldo manual anual: ${money(calc.manualBalance * MESES)}` : 'O ajuste só altera o cenário quando ativado.'}</strong></div>
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
              <div className="recommendation"><span className="recommendation-tag"><ShieldCheck size={14} /> Leitura T-Sim</span><strong>{recommendationLabel}</strong><p>{recommendationText}</p><button onClick={() => setShowAssumptions(true)}>Ver justificativa <ChevronRight size={14} /></button></div>
            </aside>
          </section>

          <section className="analysis-grid">
            <div className="chart-panel panel-surface">
              <div className="panel-heading compact"><div><span className="section-index">03</span><div><h2>Arquitetura de custo por cargo</h2><p>Salário base + encargos · visão mensal por posição</p></div></div><span className="legend"><i className="legend-swatch salary" /> Base <i className="legend-swatch burden" /> Encargos</span></div>
              <div className="chart-area" role="img" aria-label="Barras horizontais de custo empresa mensal por cargo">
                {configuredCargos.map((cargo) => { const total = custo(cargo, configuredEncargos); const baseWidth = (cargo.salary / maxChart) * 100; const burdenWidth = ((total - cargo.salary) / maxChart) * 100; return <div className="bar-row" key={cargo.id}><div className="bar-label"><span>{cargo.short}</span><small>{cargo.level}</small></div><div className="bar-track"><span className="bar-base" style={{ width: `${baseWidth}%` }} /><span className="bar-burden" style={{ width: `${burdenWidth}%`, left: `${baseWidth}%` }} /></div><strong>{money(total, true)}</strong></div>; })}
              </div>
              <details className="chart-table-details"><summary>Ver valores em tabela</summary><div className="accessible-table-wrap"><table><thead><tr><th>Cargo</th><th>Base / mês</th><th>Encargos / mês</th><th>Custo empresa / mês</th></tr></thead><tbody>{configuredCargos.map((cargo) => { const total = custo(cargo, configuredEncargos); return <tr key={cargo.id}><th scope="row">{cargo.short}</th><td>{money(cargo.salary)}</td><td>{money(total - cargo.salary)}</td><td>{money(total)}</td></tr>; })}</tbody></table></div></details>
              <div className="chart-footnote"><span><span className="info-marker">i</span> Encargos de {formatPercent(configuredEncargos)} calculados sobre o salário base</span><strong>Maior custo: Técnico VI · {money(custo(configuredCargos[5], configuredEncargos))}/mês</strong></div>
            </div>

            <div className="insight-panel panel-surface">
              <div className="panel-heading compact"><div><span className="section-index">04</span><div><h2>Leitura para aprovação</h2><p>O que muda quando você executa este cenário</p></div></div></div>
              <div className="insight-list">
                <div className="insight-item"><span className="insight-number">01</span><div><strong>Caixa preservado</strong><p>O cenário {appliedScenarioLabel} deixa <b>{money(calc.appliedBalance)}</b> de saldo mensal após as movimentações.</p></div></div>
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
    </>
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
