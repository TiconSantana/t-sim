import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Gauge, Save, Upload, UsersRound } from 'lucide-react';
import { exportHeadcountBase, exportHeadcountTemplate, exportScenarios } from '../lib/workbookExports';
import { headcountRecordToRow } from '../domain/headcount';
import { calculateHeadcountPlan, isHeadcountPlanValid, normalizeHeadcountPlan } from '../domain/headcountPlanning';

const HEADERS = ['Regional', 'UF', 'Matrícula', 'Nome', 'Cargo', 'Nível', 'Gestor responsável', 'Data admissão', 'Seguimento', 'Turno', 'Carro agregado', 'Status'];

const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function UserWorkspaceView({ profileName, people, scenarios, cargos, encargos, salaryReference, approvals, headcountPlan, onImportHeadcount, onSaveHeadcountPlan }) {
  const inputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [planMessage, setPlanMessage] = useState('');
  const [planDraft, setPlanDraft] = useState({ campo: '', ga: '' });
  const planResult = calculateHeadcountPlan(people, cargos, encargos, planDraft);
  const savedPlan = normalizeHeadcountPlan(headcountPlan);
  const planDirty = ['campo', 'ga'].some((key) => (planDraft[key] === '' ? null : Number(planDraft[key])) !== savedPlan[key]);

  useEffect(() => {
    const normalized = normalizeHeadcountPlan(headcountPlan);
    setPlanDraft({ campo: normalized.campo ?? '', ga: normalized.ga ?? '' });
  }, [headcountPlan]);

  async function download(action) {
    setMessage('');
    try {
      const result = await action();
      if (result?.omitted) setMessage(`${result.exported} cenário(s) exportado(s); ${result.omitted} cenário(s) permaneceram fora do arquivo por bloqueio orçamentário, operacional ou de fonte.`);
    }
    catch (error) { setMessage(error.message || 'Não foi possível gerar a planilha.'); }
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await onImportHeadcount(file);
      setMessage(`${result.count} colaborador(es) carregado(s) somente na sua conta.`);
    } catch (error) {
      setMessage(error.message || 'Não foi possível importar a planilha.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function saveHeadcountPlan() {
    const nextPlan = normalizeHeadcountPlan(planDraft);
    if (!isHeadcountPlanValid(nextPlan) || ['campo', 'ga'].some((key) => planDraft[key] !== '' && nextPlan[key] === null)) {
      setPlanMessage('Informe um headcount previsto inteiro igual ou maior que zero para cada categoria.');
      return;
    }
    setPlanBusy(true);
    setPlanMessage('');
    try {
      await onSaveHeadcountPlan(nextPlan);
      setPlanMessage('Headcount previsto salvo na sua conta.');
    } catch (error) {
      setPlanMessage(error.message || 'Não foi possível salvar o headcount previsto.');
    } finally {
      setPlanBusy(false);
    }
  }

  const categoryStatus = (item) => {
    if (item.planned === null) return 'Informe o previsto para comparar';
    if (item.difference > 0) return `${item.difference} acima do previsto`;
    if (item.difference < 0) return `${Math.abs(item.difference)} abaixo do previsto`;
    return 'Dentro do previsto';
  };

  return <>
    <section className="hero-intro">
      <div><div className="eyebrow"><span className="eyebrow-line" /> BASE DA CONTA</div><h1>Dados operacionais<br /><em>da sua equipe.</em></h1><p>Importe o headcount que você acompanha e baixe documentos separados para análise e aprovação.</p></div>
      <div className="hero-aside"><div className="hero-aside-label"><span className="pulse-dot" /> Perfil autenticado</div><strong>{profileName}</strong><span>{people.length} colaborador(es) · dados vinculados à sua conta</span></div>
    </section>
    <section className="user-workspace-grid" aria-label="Planilhas da sua conta">
      <article className="panel-surface user-file-panel">
        <div className="panel-heading compact"><div><span className="section-index">01</span><div><h2>Headcount base operacional</h2><p>Uma aba · 12 colunas · uma linha por colaborador</p></div></div><span className="source-chip">{people.length} registros</span></div>
        <div className="user-file-actions">
          <button type="button" className="secondary-button" onClick={() => download(() => exportHeadcountTemplate(profileName))}><Download size={15} /> Baixar modelo vazio</button>
          <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={15} /> {busy ? 'Validando…' : 'Importar headcount'}</button>
          <button type="button" className="primary-button" onClick={() => download(() => exportHeadcountBase(people, profileName))} disabled={!people.length}><FileSpreadsheet size={15} /> Baixar minha base</button>
          <input ref={inputRef} hidden type="file" accept=".xlsx" onChange={importFile} />
        </div>
        <p className="user-file-note">O modelo contém somente os 12 cabeçalhos. A importação substitui a base atual da sua conta depois que todas as linhas passam pela validação.</p>
        {people.length ? <div className="dimension-table-wrap user-headcount-wrap"><table className="dimension-table user-headcount-table"><caption className="sr-only">Headcount carregado nesta conta</caption><thead><tr>{HEADERS.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{people.map((person) => <tr key={person.id || person.employeeId}>{headcountRecordToRow(person).map((value, index) => <td key={`${person.id || person.employeeId}-${index}`}>{value || '—'}</td>)}</tr>)}</tbody></table></div> : <div className="empty-state user-workspace-empty"><UsersRound size={22} /><strong>Base ainda vazia</strong><p>Baixe o modelo, preencha as 12 colunas e carregue o arquivo para guardar o headcount no seu perfil.</p></div>}
      </article>
      <article className="panel-surface user-file-panel scenario-file-panel">
        <div className="panel-heading compact"><div><span className="section-index">02</span><div><h2>Cenários de análise</h2><p>Planilha consolidada dos cenários da sua conta</p></div></div><span className="source-chip">{scenarios.length} cenários</span></div>
        <div className="scenario-download-strip"><FileSpreadsheet size={24} /><div><strong>Documento para análise e aprovação</strong><span>Inclui cenário sem bloqueios, saldo, situação e observações. Itens com erro, cobertura insuficiente ou fonte incompleta ficam fora do arquivo.</span></div></div>
        <button type="button" className="primary-button" onClick={() => download(() => exportScenarios(scenarios, cargos, approvals, profileName))}><Download size={15} /> Baixar Cenário</button>
        {!scenarios.length && <p className="user-file-note">Crie e salve um cenário no Simulador para preencher esta planilha.</p>}
        {message && <p className="settings-message" role="status">{message}</p>}
      </article>
    </section>
    <section className="panel-surface headcount-planning-panel" aria-labelledby="headcount-planning-title">
      <div className="panel-heading compact"><div><span className="section-index">03</span><div><h2 id="headcount-planning-title">Headcount previsto da operação</h2><p>Defina seu teto por categoria e compare com a base carregada</p></div></div><span className={`source-chip ${planDirty ? 'headcount-draft-chip' : ''}`}>{planDirty ? 'Prévia não salva' : 'Previsto salvo'}</span></div>
      <p className="user-file-note">O headcount atual é contado automaticamente pelos cargos da sua planilha. O financeiro estima o custo mensal com os salários e encargos da referência; benefícios e demais custos operacionais não estão incluídos.</p>
      <div className="headcount-plan-table-wrap">
        <table className="headcount-plan-table">
          <caption className="sr-only">Headcount atual, previsto e diferença por categoria</caption>
          <thead><tr><th scope="col">Categoria</th><th scope="col">HC atual</th><th scope="col">HC previsto</th><th scope="col">Variação HC</th><th scope="col">Custo atual estimado / mês</th><th scope="col">Custo previsto estimado / mês</th><th scope="col">Diferença estimada / mês</th></tr></thead>
          <tbody>{[['campo', 'Campo'], ['ga', 'GA'], ['total', 'Total']].map(([key, label]) => {
            const item = planResult[key];
            const difference = item.difference;
            const financial = item.costDifference;
            return <tr key={key}>
              <th scope="row"><strong>{label}</strong><small>{key === 'campo' ? '8 cargos operacionais' : key === 'ga' ? 'Gestor de Área Fibra Óptica I' : 'Campo + GA'}</small></th>
              <td><span className="headcount-actual-number">{item.current}</span><small>calculado da base atual</small></td>
              <td>{key === 'total' ? <span className="headcount-plan-total">{item.planned ?? '—'}</span> : <label className="headcount-plan-input"><span className="sr-only">Headcount previsto para {label}</span><input type="number" min="0" step="1" max="100000" inputMode="numeric" value={planDraft[key]} onChange={(event) => { setPlanDraft((current) => ({ ...current, [key]: event.target.value })); setPlanMessage(''); }} placeholder="Defina o teto" /></label>}</td>
              <td><span className={`headcount-status ${difference > 0 ? 'over' : difference < 0 ? 'under' : 'balanced'}`}>{key === 'total' ? categoryStatus(item) : difference === null ? categoryStatus(item) : `${difference > 0 ? '+' : ''}${difference} HC · ${difference > 0 ? 'acima do teto' : difference < 0 ? 'abaixo do teto' : 'dentro do teto'}`}</span><small>{difference === null ? 'previsto não informado' : difference > 0 ? 'HC atual maior que o teto' : difference < 0 ? 'HC atual menor que o teto' : 'sem diferença'}</small></td>
              <td>{item.currentCost === null ? <span className="headcount-finance-unavailable">Indisponível sem salário mapeado</span> : <strong className="headcount-finance-value">{money(item.currentCost)}</strong>}</td>
              <td>{item.plannedCost === null ? <span className="headcount-finance-unavailable">Indisponível sem composição atual</span> : <strong className="headcount-finance-value">{money(item.plannedCost)}</strong>}</td>
              <td>{financial === null ? <span className="headcount-finance-unavailable">Indisponível sem composição salarial completa</span> : <><strong className={financial > 0 ? 'headcount-finance-over' : 'headcount-finance-under'}>{financial > 0 ? '+' : ''}{money(financial)}</strong><small>{financial > 0 ? 'custo atual acima do teto estimado' : financial < 0 ? 'custo atual abaixo do teto estimado' : 'sem diferença estimada'}</small></>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {!people.length && <div className="headcount-plan-empty"><Gauge size={18} /><span>Carregue a planilha Headcount para calcular as quantidades atuais e a diferença financeira.</span></div>}
      {planResult.excludedPeople > 0 && <p className="headcount-plan-warning" role="status">{planResult.excludedPeople} colaborador(es) fora do cálculo por status diferente de Ativo. A contagem considera apenas status Ativo, Ativa ou Em atividade.</p>}
      {planResult.unclassifiedPeople > 0 && <p className="headcount-plan-warning" role="status">{planResult.unclassifiedPeople} colaborador(es) ativos têm cargos fora das categorias Campo e GA informadas e não entram no total.</p>}
      {(planResult.campo.missingSalary > 0 || planResult.ga.missingSalary > 0) && <p className="headcount-plan-warning" role="status">Há {planResult.campo.missingSalary + planResult.ga.missingSalary} colaborador(es) sem correspondência de salário na referência. A diferença financeira pode não estar disponível.</p>}
      <p className="headcount-plan-formula">Estimativa financeira = (HC atual − HC previsto) × custo médio mensal por pessoa da composição atual da categoria. Fonte: {salaryReference?.source || 'referência global de Cargos e Salário'} · versão {salaryReference?.version || 'não informada'} · encargos configurados de {Math.round(Number(encargos || 0) * 100)}%. Não inclui benefícios, veículos, ADM, BDI ou outros custos.</p>
      <div className="headcount-plan-actions"><p role="status" aria-live="polite">{planMessage || 'O valor previsto pertence somente ao seu perfil.'}</p><button type="button" className="primary-button" onClick={saveHeadcountPlan} disabled={planBusy}><Save size={15} />{planBusy ? 'Salvando…' : 'Salvar headcount previsto'}</button></div>
    </section>
  </>;
}
