const state={data:null};

const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

const fmtDateTime=s=>{
  if(!s)return'—';
  const d=new Date(s);
  if(Number.isNaN(d.getTime()))return s;
  return new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Zurich',year:'numeric',month:'short',day:'2-digit',
    hour:'2-digit',minute:'2-digit',timeZoneName:'short'
  }).format(d);
};

const fmtDate=s=>{
  if(!s)return'—';
  const d=new Date(s);
  return Number.isNaN(d.getTime())?s:new Intl.DateTimeFormat('en-GB',{
    year:'numeric',month:'short',day:'2-digit'
  }).format(d);
};

const regionalClass=s=>{
  if(['COVERAGE_OK_WITH_ITEMS','COVERAGE_OK_NO_NEW_DEVELOPMENT','COMPLETE'].includes(s))return'complete';
  if(['COVERAGE_PARTIAL','PARTIAL'].includes(s))return'partial';
  return'failed';
};

const regionalLabel=s=>({
  COVERAGE_OK_WITH_ITEMS:'Complete · items',
  COVERAGE_OK_NO_NEW_DEVELOPMENT:'Complete · no new development',
  COVERAGE_PARTIAL:'Partial',
  COVERAGE_GAP:'Coverage gap',
  COVERAGE_FAILED:'Failed'
}[s]||s||'Unknown');

function normalizeSnapshot(p){
  if(!p||typeof p!=='object')return null;
  if(p.snapshot_type==='OFFICIAL_WEEKLY'){
    return {
      snapshot:p,
      run:{
        run_id:p.run_id,
        run_started_at:p.run_started_at,
        run_completed_at:p.run_completed_at,
        workflow_version:p.workflow_version,
        overall_status:p.overall_status,
        source_success_count:p.source_success_count,
        source_failure_count:p.source_failure_count,
        new_item_count:p.new_item_count,
        changed_item_count:p.changed_item_count,
        pending_retry_count:p.pending_retry_count
      },
      coverage_areas:Array.isArray(p.coverage_areas)?p.coverage_areas:[],
      sources:Array.isArray(p.sources)?p.sources:[],
      items:Array.isArray(p.items)?p.items:[]
    };
  }
  return p.run?{...p,snapshot:null}:null;
}

function renderSummary(d){
  const r=d.run||{};
  const total=(Number(r.source_success_count)||0)+(Number(r.source_failure_count)||0);
  const metrics=[
    ['Overall status',r.overall_status||'—'],
    ['Sources successful',`${r.source_success_count||0}/${total}`],
    ['New items',r.new_item_count||0],
    ['Pending retry',r.pending_retry_count||0],
    ['Completed',fmtDateTime(r.run_completed_at)]
  ];
  document.querySelector('#run-summary').innerHTML=metrics.map(([l,v])=>
    `<div class="metric"><div class="label">${esc(l)}</div><div class="value">${esc(v)}</div></div>`
  ).join('');
  document.querySelector('#run-id').textContent=`Run: ${r.run_id||'—'} · Workflow ${r.workflow_version||'—'}`;
  const meta=document.querySelector('#snapshot-meta');
  if(meta){
    const s=d.snapshot||{};
    meta.textContent=`Saved ${fmtDateTime(s.snapshot_created_at||r.run_completed_at)} · Status ${r.overall_status||'—'}.`;
  }
}

function renderCoverage(d){
  const areas=d.coverage_areas||[];
  document.querySelector('#coverage-grid').innerHTML=areas.map(c=>{
    const status=c.regional_status||c.status;
    const successful=c.sources_successful ?? c.sources_completed ?? 0;
    const enabled=c.sources_configured_enabled ?? c.sources_expected ?? 0;
    const items=c.new_item_count ?? c.new_items ?? 0;
    const reason=c.regional_status_reason||'';
    const nonExhaustive=c.coverage_non_exhaustive?' · non-exhaustive':'';
    return `<article class="coverage-card">
      <div class="row">
        <div class="title">${esc(c.coverage_area)}</div>
        <span class="badge ${regionalClass(status)}">${esc(regionalLabel(status))}</span>
      </div>
      <div class="meta">${successful}/${enabled} enabled source(s) successful · ${items} new item(s)${esc(nonExhaustive)}</div>
      ${reason?`<div class="reason">${esc(reason)}</div>`:''}
    </article>`;
  }).join('');
}

function renderItems(){
  const items=state.data.items||[];
  const q=document.querySelector('#search').value.trim().toLowerCase();
  const coverage=document.querySelector('#coverage-filter').value;
  const rows=items.filter(i=>{
    const hay=`${i.source_title||''} ${i.source_institution||''} ${i.factual_summary||''}`.toLowerCase();
    return(!q||hay.includes(q))&&(!coverage||i.coverage_area===coverage);
  });

  document.querySelector('#items').innerHTML=rows.map(i=>`
    <article class="item-card">
      <div class="item-top">
        <div>
          <div class="eyebrow">${esc(i.coverage_area)}</div>
          <div class="item-title">${esc(i.source_title)}</div>
          <div class="item-meta">
            <span>${esc(i.source_institution)}</span>
            <span>${fmtDate(i.publication_date)}</span>
            <span>Original language: ${esc(i.original_language)}</span>
          </div>
        </div>
        <span class="badge ${i.relevance_decision==='MATERIAL'?'complete':'partial'}">${esc(i.relevance_decision)}</span>
      </div>
      <div class="item-body">
        <div class="panel"><h3>Factual summary</h3><p>${esc(i.factual_summary)}</p></div>
        <div class="panel"><h3>AI-assisted interpretation</h3><p>${esc(i.ai_interpretation)}</p></div>
        <div class="panel"><h3>Regulatory significance</h3><p>${esc(i.regulatory_significance)}</p></div>
        <div class="panel"><h3>Analysis provenance</h3><p>${esc(i.analysis_provenance?.generated_by||'AI')} · ${esc(i.analysis_provenance?.model||'—')} · Confidence ${esc(i.analysis_provenance?.confidence||'—')}</p></div>
      </div>
      <div class="item-footer">
        <a class="source-link" href="${esc(i.original_official_url)}" target="_blank" rel="noopener noreferrer">Open authoritative source ↗</a>
        <span class="model">Validation: ${esc(i.validation_status)}</span>
      </div>
    </article>`).join('');

  const empty=document.querySelector('#empty-state');
  empty.classList.toggle('hidden',rows.length!==0);
  if(rows.length===0){
    if(items.length===0){
      empty.innerHTML='<strong>No new validated developments in this weekly snapshot.</strong><span>Coverage health above remains part of the official saved snapshot.</span>';
    }else{
      empty.innerHTML='<strong>No matching items.</strong><span>Try clearing the search or coverage filter.</span>';
    }
  }
}

async function init(){
  const res=await fetch('/latest-weekly-snapshot.json',{cache:'no-store'});
  if(!res.ok)throw new Error(`HTTP ${res.status}`);
  let payload=await res.json();
  if(Array.isArray(payload))payload=payload[0]||{};
  const normalized=normalizeSnapshot(payload);
  if(!normalized)throw new Error('No official weekly snapshot is available yet.');
  state.data=normalized;

  renderSummary(state.data);
  renderCoverage(state.data);

  const areas=(state.data.coverage_areas||[]).map(x=>x.coverage_area).filter(Boolean);
  const sel=document.querySelector('#coverage-filter');
  [...new Set(areas)].sort().forEach(a=>{
    const o=document.createElement('option');
    o.value=a;o.textContent=a;sel.appendChild(o);
  });

  document.querySelector('#search').addEventListener('input',renderItems);
  document.querySelector('#coverage-filter').addEventListener('change',renderItems);
  renderItems();
}

window.initRegulatoryWatcher=async function(){
  try{
    await init();
  }catch(err){
    document.querySelector('#signed-in-view').innerHTML=
      `<div style="padding:32px;font-family:system-ui"><strong>No official weekly snapshot is available yet.</strong><br><br>${esc(err.message||'Snapshot unavailable.')}</div>`;
  }
};
