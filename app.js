'use strict';
const KEY = 'campo.compras.layout.v2';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const statuses = ['Em conferência', 'Pendente', 'Concluída'];
const money = n => Number.isFinite(n) ? n.toLocaleString('pt-BR', {style:'currency',currency:'BRL'}) : '—';
const dec = (n, digits = 2) => Number.isFinite(n) ? n.toLocaleString('pt-BR', {maximumFractionDigits:digits,minimumFractionDigits:digits}) : '—';
const integer = n => Number.isFinite(n) ? n.toLocaleString('pt-BR', {maximumFractionDigits:0}) : '—';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => {const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2);
const number = v => {const n=Number(v);return Number.isFinite(n)?n:0};
const blank = () => ({id:uid(),supplier:'',originFarm:'',supplierState:'',supplierType:'',category:'',breed:'',receivingFarm:'',managerCompany:'',buyerCompany:'',buyerFarm:'',destinationIE:'',buyerType:'',buyerState:'',purpose:'',buyer:'',purchaseDate:today(),orderCode:'',status:'Em conferência',funruralOption:'',deductFunrural:'Não',purchaseType:'',distance:0,commissionType:'S/N',broker:'',commissionRate:0,otherCosts:0,freightPerHead:0,dueDate:'',groups:[],headAdjust:0,weightAdjust:0,valueAdjust:0,baseValue:0,invoices:[],returnValue:0,shippingDate:'',arrivalDate:'',shippingCity:'',originator:'',shippingLead:'',beneficiary:'',taxId:'',bank:'',agency:'',account:'',supplierCode:'',notes:''});
const numericFields = new Set(['distance','commissionRate','otherCosts','freightPerHead','headAdjust','weightAdjust','valueAdjust','baseValue','returnValue']);
let records=[],draft=null,current='list',storageAvailable=true,toastTimer;
try {const raw=localStorage.getItem(KEY);records=raw?JSON.parse(raw):[];if(!Array.isArray(records))throw Error('Formato inválido');}
catch(e){records=[];storageAvailable=false;notify('Não foi possível carregar os dados locais. Nenhum dado anterior será sobrescrito.');}
function persist(next){
 if(storageAvailable)try{localStorage.setItem(KEY,JSON.stringify(next))}catch(e){storageAvailable=false;notify('Armazenamento indisponível. Exporte um backup antes de sair.')}
 records=next;renderList();
}
function notify(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,4500)}
function weightsOf(g){let raw=String(g.weights||'').trim();if(!raw)return {values:[],invalid:[]};let parts=raw.split(/[;\s]+/).filter(Boolean),values=[],invalid=[];for(const part of parts){let v=Number(part.replace(',','.'));if(!Number.isFinite(v)||v<=0)invalid.push(part);else values.push(v)}return {values,invalid}}
function calculate(r){
 const groups=(r.groups||[]).map(g=>{const parsed=weightsOf(g),kg=parsed.values.reduce((a,b)=>a+b,0),yieldPct=number(g.yield);return {...g,count:parsed.values.length,kg,yieldPct,invalid:parsed.invalid}});
 const countRaw=groups.reduce((a,g)=>a+g.count,0),kgRaw=groups.reduce((a,g)=>a+g.kg,0);
 const heads=countRaw+number(r.headAdjust),kg=kgRaw+number(r.weightAdjust),romaneio=number(r.baseValue)+number(r.valueAdjust);
 const weightedKg=groups.reduce((a,g)=>a+g.kg*g.yieldPct/100,0);
 const yieldRate=kg>0?weightedKg/kg:NaN;
 const pricePerAt=kg>0?romaneio/(kg/30):NaN;
 const atCarcass=kg>0?kg*yieldRate/15:NaN;
 const cattleValue=Number.isFinite(pricePerAt)&&Number.isFinite(atCarcass)?pricePerAt*atCarcass:NaN;
 const supplierF=r.supplierType==='Física',supplierJ=r.supplierType==='Jurídica',buyerF=r.buyerType==='Física',buyerJ=r.buyerType==='Jurídica';
 let rate=NaN;
 if(r.funruralOption==='S/N'&&((supplierF&&buyerF)||(supplierJ&&buyerJ)||(supplierJ&&buyerF)))rate=0;
 else if(supplierF&&buyerJ)rate=r.funruralOption==='Faturamento'?.015:r.funruralOption==='Folha de pagamento'?.002:r.funruralOption==='S/N'?0:NaN;
 const effectiveAt=Number.isFinite(pricePerAt)&&Number.isFinite(rate)?(r.deductFunrural==='Sim'?pricePerAt:pricePerAt*(1+rate)):NaN;
 const retention=Number.isFinite(pricePerAt)&&Number.isFinite(atCarcass)&&Number.isFinite(rate)?-pricePerAt*rate*atCarcass:NaN;
 const commission=r.commissionType==='R$/cb'?number(r.commissionRate)*heads:r.commissionType==='% valor da @'?number(r.commissionRate)/100*pricePerAt*heads:r.commissionType==='% valor do romaneio'?number(r.commissionRate)/100*cattleValue:0;
 const invoices=r.invoices||[],invoiceHeads=invoices.reduce((a,n)=>a+number(n.heads),0),invoiceValue=invoices.reduce((a,n)=>a+number(n.value),0),arrivalKg=invoices.reduce((a,n)=>a+number(n.arrivalKg),0);
 const invoiceConsidered=r.deductFunrural==='Sim'?cattleValue:cattleValue-retention;
 const invoiceDifference=invoiceConsidered-invoiceValue+number(r.returnValue);
 const gross=r.deductFunrural==='Sim'?cattleValue+retention+number(r.returnValue):effectiveAt*atCarcass+number(r.returnValue);
 const net=r.deductFunrural==='Sim'?cattleValue+retention+number(r.returnValue):cattleValue+number(r.returnValue);
 const avgKg=heads>0?kg/heads:NaN,arrivalAvg=invoiceHeads>0?arrivalKg/invoiceHeads:NaN;
 const shrink=Number.isFinite(avgKg)&&Number.isFinite(arrivalAvg)&&avgKg>0?arrivalAvg/avgKg-1:NaN;
 return {groups,countRaw,kgRaw,heads,kg,romaneio,weightedKg,yieldRate,pricePerAt,atCarcass,cattleValue,rate,effectiveAt,retention,commission,invoiceHeads,invoiceValue,arrivalKg,invoiceConsidered,invoiceDifference,gross,net,avgKg,arrivalAvg,shrink};
}
function warnings(r,c){
 const out=[];
 if(!r.supplier.trim())out.push('Informe o fornecedor.');
 if(!r.groups.length)out.push('Adicione pelo menos um grupo de pesagem.');
 if(c.groups.some(g=>g.invalid.length))out.push('Há pesos inválidos na pesagem. Use números positivos separados por espaço, ponto e vírgula ou linha.');
 if(c.groups.some(g=>g.count&&!g.yieldPct))out.push('Informe o rendimento de cada grupo com pesos.');
 if(c.groups.some(g=>g.yieldPct<0||g.yieldPct>100))out.push('O rendimento deve ficar entre 0% e 100%.');
 if(!c.heads||c.heads<0||!Number.isInteger(c.heads))out.push('O total de cabeças após descontos deve ser inteiro e positivo.');
 if(c.kg<=0)out.push('O peso final precisa ser positivo.');
 if(c.romaneio<0)out.push('O valor final do romaneio não pode ser negativo.');
 if(!Number.isFinite(c.rate))out.push('Confira os tipos de fornecedor e compradora e a opção de Funrural.');
 if(r.headAdjust>0||r.weightAdjust>0||r.valueAdjust>0||r.returnValue>0)out.push('Descontos e devolução devem ser informados com sinal negativo.');
 if(r.invoices.length&&c.invoiceHeads!==c.heads)out.push('A quantidade das notas ('+integer(c.invoiceHeads)+') difere da quantidade recebida ('+integer(c.heads)+').');
 if(r.invoices.length&&Math.abs(c.invoiceDifference)>.01)out.push('Há diferença entre o valor considerado e as notas. Verifique nota complementar ou devolução.');
 if(r.buyerState&&r.supplierState&&r.buyerState===r.supplierState&&number(r.otherCosts)>0)out.push('A planilha sinaliza outros custos em operação dentro da mesma UF: revise a incidência de ICMS.');
 return out;
}
function view(name){
 current=name;$('#list-view').hidden=name!=='list';$('#guide-view').hidden=name!=='guide';$('#editor-view').hidden=name!=='editor';
 $('#nav-list').classList.toggle('active',name!=='guide');$('#nav-guide').classList.toggle('active',name==='guide');window.scrollTo(0,0);
}
function renderList(){
 const buyer=$('#buyer-filter'),prior=buyer.value;
 buyer.innerHTML='<option value="">Todos os compradores</option>'+[...new Set(records.map(r=>r.buyer).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(v=>'<option>'+esc(v)+'</option>').join('');
 buyer.value=prior;
 const q=$('#query').value.trim().toLocaleLowerCase('pt-BR'),status=$('#status-filter').value,b=buyer.value,from=$('#date-from').value,to=$('#date-to').value;
 const shown=records.filter(r=>(!q||[r.supplier,r.originFarm,r.receivingFarm,r.buyer,r.orderCode].join(' ').toLocaleLowerCase('pt-BR').includes(q))&&(!status||r.status===status)&&(!b||r.buyer===b)&&(!from||r.purchaseDate>=from)&&(!to||r.purchaseDate<=to)).sort((a,b)=>String(b.purchaseDate||'').localeCompare(String(a.purchaseDate||'')));
 const totalHeads=shown.reduce((a,r)=>a+Math.max(0,calculate(r).heads),0),totalValue=shown.reduce((a,r)=>a+(calculate(r).cattleValue||0),0);
 $('#metrics').innerHTML=[['Compras',integer(shown.length),'No filtro selecionado'],['Cabeças recebidas',integer(totalHeads),'Conforme pesagem'],['Valor do gado',money(totalValue),'Cálculo estimado da planilha'],['Concluídas',integer(shown.filter(r=>r.status==='Concluída').length),'No filtro selecionado']].map((m,i)=>'<div class="metric '+(i===2?'highlight':'')+'"><span>'+m[0]+'</span><strong>'+m[1]+'</strong><em>'+m[2]+'</em></div>').join('');
 $('#purchase-rows').innerHTML=shown.length?shown.map(r=>{const c=calculate(r),cls=r.status==='Pendente'?'pending':r.status==='Concluída'?'done':'';return '<tr><td><strong>'+esc(r.orderCode||'Compra sem O.C.')+'</strong><span class="muted">'+esc(r.supplier||'Fornecedor não informado')+' · '+esc(r.originFarm||'Fazenda não informada')+'</span></td><td>'+esc(r.buyer||'—')+'</td><td><span class="badge '+cls+'">'+esc(r.status)+'</span></td><td>'+esc(r.receivingFarm||'—')+'</td><td class="num">'+integer(c.heads)+'</td><td class="num">'+money(c.cattleValue)+'</td><td><button class="button light small" data-open="'+esc(r.id)+'">Abrir</button> <button class="button light small" data-delete="'+esc(r.id)+'" aria-label="Excluir compra">Excluir</button></td></tr>'}).join(''):'<tr><td colspan="7" class="empty">Nenhuma compra encontrada. Cadastre uma compra ou ajuste os filtros.</td></tr>';
 $('#table-count').textContent=shown.length+' de '+records.length+' compras';
}
function fillForm(r){
 $$('[data-key]').forEach(el=>{el.value=r[el.dataset.key]??''});
 renderGroups();renderInvoices();renderComputed();
 $('#editor-title').textContent=r.orderCode?'Compra '+r.orderCode:r.supplier||'Nova compra';$('#save-state').textContent='Alterações ainda não salvas.';
}
function edit(r){draft=structuredClone(r);fillForm(draft);switchTab('commercial');view('editor')}
function switchTab(id){$$('.tab').forEach(el=>el.classList.toggle('active',el.dataset.tab===id));$$('.tab-panel').forEach(el=>el.hidden=el.id!==id)}
function groupHtml(g,i){return '<div class="group" data-group="'+i+'"><div class="group-top"><label>Folha / romaneio<input data-group-key="reference" maxlength="80" value="'+esc(g.reference)+'" placeholder="Ex.: Folha 1"></label><label>Proprietário<input data-group-key="owner" maxlength="150" value="'+esc(g.owner)+'"></label><label>Fazenda<input data-group-key="farm" maxlength="150" value="'+esc(g.farm)+'"></label><label>Rendimento (%)<input data-group-key="yield" type="number" min="0" max="100" step="0.01" value="'+esc(g.yield)+'"></label><button class="button light small" data-remove-group="'+i+'">Remover</button></div><label class="weights">Pesos individuais (kg)<textarea data-group-key="weights" placeholder="403 450 432 …" rows="3">'+esc(g.weights)+'</textarea></label><div class="group-note" data-group-summary></div></div>'}
function renderGroups(){ $('#groups').innerHTML=draft.groups.map(groupHtml).join('');renderComputed()}
function renderInvoices(){
 $('#invoice-rows').innerHTML=draft.invoices.map((n,i)=>'<tr data-invoice="'+i+'"><td><input aria-label="Data da nota" data-invoice-key="date" type="date" value="'+esc(n.date)+'"></td><td><input aria-label="Número da nota" data-invoice-key="number" maxlength="50" value="'+esc(n.number)+'"></td><td><input aria-label="IE de origem" data-invoice-key="originIE" maxlength="40" value="'+esc(n.originIE)+'"></td><td><input aria-label="GTA" data-invoice-key="gta" maxlength="40" value="'+esc(n.gta)+'"></td><td><input aria-label="Cabeças da nota" data-invoice-key="heads" type="number" min="0" step="1" value="'+esc(n.heads)+'"></td><td><input aria-label="Valor da nota" data-invoice-key="value" type="number" min="0" step="0.01" value="'+esc(n.value)+'"></td><td><input aria-label="Peso na chegada" data-invoice-key="arrivalKg" type="number" min="0" step="0.01" value="'+esc(n.arrivalKg)+'"></td><td><button class="remove" data-remove-invoice="'+i+'" aria-label="Remover nota">×</button></td></tr>').join('');
}
function renderComputed(){
 if(!draft)return;const c=calculate(draft),warn=warnings(draft,c);
 $$('[data-group]').forEach((node,i)=>{const g=c.groups[i];$('[data-group-summary]',node).textContent=integer(g.count)+' cabeças · '+dec(g.kg)+' kg'+(g.invalid.length?' · '+g.invalid.length+' peso(s) inválido(s)':'')});
 $('#weighing-summary').innerHTML=[['Cabeças finais',integer(c.heads)],['Peso final',dec(c.kg)+' kg'],['Rendimento ponderado',Number.isFinite(c.yieldRate)?dec(c.yieldRate*100)+'%':'—'],['Valor final do romaneio',money(c.romaneio)]].map(a=>'<div><span>'+a[0]+'</span><strong>'+a[1]+'</strong></div>').join('');
 $('#warnings').innerHTML=warn.map(s=>'<div class="warning">'+esc(s)+'</div>').join('');
 const vals=[
 ['Animais recebidos',integer(c.heads),'Pesagem C47'],['Peso do romaneio',dec(c.kg)+' kg','Pesagem C48'],['Peso médio',dec(c.avgKg)+' kg/cb','Layout N16'],
 ['Rendimento ponderado',Number.isFinite(c.yieldRate)?dec(c.yieldRate*100,4)+'%':'—','Layout N17'],['Preço negociado',money(c.pricePerAt)+' / @','Pesagem C54'],['Custo efetivo',money(c.effectiveAt)+' / @','Layout N13'],
 ['Arrobas estimadas',dec(c.atCarcass)+' @','Layout N18'],['Valor do gado',money(c.cattleValue),'Layout N21'],['Valor por cabeça',money(c.heads>0?c.cattleValue/c.heads:NaN),'Layout N22'],
 ['Alíquota Funrural',Number.isFinite(c.rate)?dec(c.rate*100)+'%':'—','Layout I24'],['Retenção Funrural',money(c.retention),'Layout N23'],['Corretagem do lote',money(c.commission),'Layout I32'],
 ['Total das notas',money(c.invoiceValue),'Layout I42'],['Cabeças nas notas',integer(c.invoiceHeads),'Layout H42'],['Nota complementar / devolução',money(c.invoiceDifference),'Layout I40'],
 ['Bruto com impostos',money(c.gross),'Layout N29'],['Líquido fornecedor',money(c.net),'Layout N30'],['Quebra de viagem',Number.isFinite(c.shrink)?dec(c.shrink*100)+'%':'—','Layout N43']
 ];
 $('#results-grid').innerHTML=vals.map((v,i)=>'<div class="result-item '+([7,15,16].includes(i)?'key':'')+'"><span>'+v[0]+'</span><strong>'+v[1]+'</strong><small>'+v[2]+'</small></div>').join('');
}
function syncField(el){if(!draft)return;let key=el.dataset.key;if(key){draft[key]=numericFields.has(key)?number(el.value):el.value;$('#save-state').textContent='Alterações ainda não salvas.'}else if(el.dataset.groupKey){let i=Number(el.closest('[data-group]').dataset.group);draft.groups[i][el.dataset.groupKey]=el.dataset.groupKey==='yield'?number(el.value):el.value}else if(el.dataset.invoiceKey){let i=Number(el.closest('[data-invoice]').dataset.invoice);let k=el.dataset.invoiceKey;draft.invoices[i][k]=['heads','value','arrivalKg'].includes(k)?number(el.value):el.value}renderComputed()}
document.addEventListener('input',e=>{if(e.target.matches('[data-key],[data-group-key],[data-invoice-key]'))syncField(e.target);else if(e.target.matches('#query,#status-filter,#buyer-filter,#date-from,#date-to'))renderList()});
document.addEventListener('change',e=>{if(e.target.matches('[data-key],[data-group-key],[data-invoice-key]'))syncField(e.target);else if(e.target.matches('#status-filter,#buyer-filter,#date-from,#date-to'))renderList()});
$('#groups').onclick=e=>{let b=e.target.closest('[data-remove-group]');if(b){draft.groups.splice(Number(b.dataset.removeGroup),1);renderGroups()}};
$('#invoice-rows').onclick=e=>{let b=e.target.closest('[data-remove-invoice]');if(b){draft.invoices.splice(Number(b.dataset.removeInvoice),1);renderInvoices();renderComputed()}};
$('#purchase-rows').onclick=e=>{let b=e.target.closest('button');if(!b)return;let r=records.find(x=>x.id===(b.dataset.open||b.dataset.delete));if(!r)return;if(b.dataset.open)edit(r);else if(confirm('Excluir esta compra? Faça um backup antes se precisar recuperá-la.')){persist(records.filter(x=>x.id!==r.id));notify('Compra excluída.')}};
$('#nav-list').onclick=()=>view('list');$('#nav-guide').onclick=()=>view('guide');$('#back').onclick=()=>view('list');
$('#new').onclick=()=>edit(blank());
$$('.tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$('#add-group').onclick=()=>{if(draft.groups.length>=9)return notify('Máximo de nove grupos, conforme a aba Pesagem.');draft.groups.push({reference:'',owner:'',farm:'',yield:50,weights:''});renderGroups()};
$('#add-invoice').onclick=()=>{if(draft.invoices.length>=22)return notify('Máximo de 22 notas nesta ficha, como no Layout.');draft.invoices.push({date:'',number:'',originIE:'',gta:'',heads:0,value:0,arrivalKg:0});renderInvoices();renderComputed()};
function saveDraft(){
 if(!draft)return;
 const c=calculate(draft),issues=warnings(draft,c).filter(s=>s.startsWith('Informe o fornecedor')||s.startsWith('Há pesos inválidos')||s.startsWith('O rendimento deve')||s.startsWith('Descontos e devolução'));
 if(issues.length){notify(issues[0]);switchTab(issues[0].includes('fornecedor')?'commercial':'weighing');return}
 const next=records.some(x=>x.id===draft.id)?records.map(x=>x.id===draft.id?structuredClone(draft):x):[structuredClone(draft),...records];
 persist(next);$('#save-state').textContent=storageAvailable?'Compra salva neste navegador.':'Compra somente nesta sessão. Exporte um backup.';notify('Compra salva.');view('list');
}
$('#save').onclick=saveDraft;$('#save-bottom').onclick=saveDraft;
$('#print').onclick=()=>window.print();
$('#reset-filters').onclick=()=>{['query','status-filter','buyer-filter','date-from','date-to'].forEach(k=>$('#'+k).value='');renderList()};
$('#backup').onclick=()=>{
 const blob=new Blob([JSON.stringify({format:'campo-layout-v2',exportedAt:new Date().toISOString(),records},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='compras-gado-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('Backup gerado. Guarde o arquivo em local seguro.');
};
$('#import').onclick=()=>$('#backup-file').click();
$('#backup-file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try {
  if(file.size>8*1024*1024)throw Error('O backup deve ter até 8 MB.');
  const data=JSON.parse(await file.text());if(data.format!=='campo-layout-v2'||!Array.isArray(data.records)||data.records.length>5000||!data.records.every(r=>r&&typeof r.id==='string'&&typeof r.supplier==='string'&&Array.isArray(r.groups)&&Array.isArray(r.invoices)))throw Error('Backup inválido ou de outra versão.');
  let ids=new Set(records.map(r=>r.id));let incoming=data.records.filter(r=>{if(ids.has(r.id))return false;ids.add(r.id);return true});
  if(!incoming.length)return notify('Nenhuma compra nova encontrada.');
  if(!confirm('Adicionar '+incoming.length+' compras do arquivo? As atuais serão preservadas.'))return;
  persist([...records,...incoming]);notify(incoming.length+' compras importadas.');
 }catch(err){notify(err instanceof SyntaxError?'Arquivo JSON inválido.':err.message)}finally{e.target.value=''}
};
renderList();
