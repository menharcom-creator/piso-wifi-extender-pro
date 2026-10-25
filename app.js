const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const cfg=()=>({api:'http://localhost:8787',portal:'',router:'',...LS.get('cfg',{})});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.className='on';clearTimeout(tt);tt=setTimeout(()=>t.className='',3000)}
function alertAdd(m){const a=LS.get('alerts',[]);a.unshift(new Date().toLocaleString()+' — '+m);LS.set('alerts',a.slice(0,8));drawAlerts()}
function drawAlerts(){$('#alerts').innerHTML=LS.get('alerts',[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>No alerts yet.</li>'}
function show(v){$$('.view').forEach(e=>e.hidden=e.id!=='v-'+v);$$('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));if(v==='admin')adminInit()}
$$('nav button').forEach(b=>b.onclick=()=>show(b.dataset.v));$$('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));
document.documentElement.dataset.t=LS.get('theme','light');
$('#theme').onclick=()=>{const t=document.documentElement.dataset.t==='dark'?'light':'dark';document.documentElement.dataset.t=t;LS.set('theme',t)};

async function timed(url,ms=5000){const c=new AbortController(),id=setTimeout(()=>c.abort(),ms),t=performance.now();
 try{await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(),{mode:'no-cors',cache:'no-store',signal:c.signal});return performance.now()-t}catch{return null}finally{clearTimeout(id)}}
const NET='https://www.cloudflare.com/cdn-cgi/trace';
async function pings(n=5){const r=[];for(let i=0;i<n;i++){const p=await timed(NET);if(p!=null)r.push(p)}
 if(!r.length)return null;const avg=r.reduce((a,b)=>a+b)/r.length;const jit=r.length>1?r.slice(1).reduce((s,x,i)=>s+Math.abs(x-r[i]),0)/(r.length-1):0;return{avg,jit}}

async function refresh(){const c=cfg(),cn=navigator.connection;
 $('#h-router').textContent=c.router||'Not set';
 $('#h-type').textContent=cn?`${cn.effectiveType||'?'} · ${cn.downlink??'?'} Mbps est.`:'Not detected';
 if(!navigator.onLine){$('#h-net').textContent='Offline';alertAdd('Device is offline');return}
 const p=await pings(3);$('#h-net').innerHTML=p?'<span class="ok">Online</span>':'<span class="err">No internet</span>';
 $('#h-ping').textContent=p?Math.round(p.avg)+' ms':'—';if(!p)alertAdd('Connected to Wi-Fi but internet unreachable (captive portal login or no credit?)');
 $('#h-down').textContent=cn&&cn.downlink?cn.downlink+' Mbps (est.)':'Run speed test'}
$('#b-refresh').onclick=$('#b-test').onclick=async()=>{toast('Testing…');await refresh();toast('Done')};
$('#b-portal').onclick=()=>{const u=cfg().portal;if(u)window.open(u,'_blank');else{toast('Set the portal URL first');show('extender')}};
$('#b-wifi').onclick=()=>alert('Browsers and iOS apps cannot join Wi-Fi directly.\n\nOpen Settings → Wi-Fi, choose your Piso WiFi network, then come back and tap Open Captive Portal.');
$('#b-trouble').onclick=()=>{show('settings');$('#g-run').click()};
addEventListener('online',refresh);addEventListener('offline',refresh);

function drawX(){const l=LS.get('devs',[]);$('#x-list').innerHTML=l.map((d,i)=>`<div class="card"><b>${esc(d.name)}</b><small>${esc(d.host)} · ${esc(d.mode)}</small><div class="btns"><button data-chk="${i}">Check availability</button><button data-cfg="${i}" class="ghost">Configure / Restart</button><button data-rm="${i}" class="ghost">Remove</button></div><span id="xs${i}" class="note"></span></div>`).join('')||'<p class="note">No extenders saved.</p>';
 $$('[data-rm]').forEach(b=>b.onclick=()=>{if(confirm('Remove this device?')){l.splice(+b.dataset.rm,1);LS.set('devs',l);drawX()}});
 $$('[data-cfg]').forEach(b=>b.onclick=()=>toast('Unsupported: no router adapter installed for this model. Use the manual setup steps.'));
 $$('[data-chk]').forEach(b=>b.onclick=async()=>{const s=$('#xs'+b.dataset.chk);s.textContent='Checking…';const t=await timed('http://'+l[+b.dataset.chk].host,4000);s.textContent=t==null?'No response (offline, blocked, or not on this network)':`Responded in ${Math.round(t)} ms`})}
$('#x-save').onclick=()=>{const h=$('#x-host').value.trim();if(!/^[\w.\-:]+$/.test(h))return toast('Enter a valid IP or hostname');const l=LS.get('devs',[]);l.push({name:$('#x-name').value.trim()||'Extender',host:h,mode:$('#x-mode').value});LS.set('devs',l);drawX();toast('Saved')};
function loadCfg(){const c=cfg();$('#c-portal').value=c.portal;$('#c-router').value=c.router;$('#c-api').value=c.api}
$('#c-save').onclick=()=>{LS.set('cfg',{portal:$('#c-portal').value.trim(),router:$('#c-router').value.trim(),api:$('#c-api').value.trim().replace(/\/$/,'')});toast('Settings saved');refresh()};

let ac;const hist=()=>{$('#s-hist').innerHTML=LS.get('hist',[]).map(h=>`<li>${esc(h)}</li>`).join('')||'<li>None</li>'};
$('#s-stop').onclick=()=>ac&&ac.abort();
$('#s-start').onclick=async()=>{ac=new AbortController();const bar=$('#s-bar');$('#s-down').textContent=$('#s-up').textContent='…';bar.value=0;
 try{const p=await pings(6);if(!p)throw Error('No internet');$('#s-ping').textContent=Math.round(p.avg)+' ms';$('#s-jit').textContent=p.jit.toFixed(1)+' ms';bar.value=20;
 let t=performance.now(),got=0;const r=await fetch('https://speed.cloudflare.com/__down?bytes=15000000',{signal:ac.signal,cache:'no-store'});const rd=r.body.getReader();
 for(;;){const{done,value}=await rd.read();if(done)break;got+=value.length;bar.value=20+60*got/15e6}
 const dn=got*8/1e6/((performance.now()-t)/1000);$('#s-down').textContent=dn.toFixed(2)+' Mbps';
 const blob=new Blob([new Uint8Array(3e6)]);t=performance.now();await fetch('https://speed.cloudflare.com/__up',{method:'POST',body:blob,signal:ac.signal});
 const up=3e6*8/1e6/((performance.now()-t)/1000);$('#s-up').textContent=up.toFixed(2)+' Mbps';bar.value=100;
 const h=LS.get('hist',[]);h.unshift(`${new Date().toLocaleString()} — ↓${dn.toFixed(1)} ↑${up.toFixed(1)} Mbps, ${Math.round(p.avg)} ms`);LS.set('hist',h.slice(0,10));hist()}
 catch(e){$('#s-down').textContent=$('#s-up').textContent='—';toast(e.name==='AbortError'?'Test stopped':'Test failed: '+e.message)}};

$('#g-run').onclick=async()=>{const o=$('#g-out'),c=cfg();o.innerHTML='Running…';const add=(ok,m)=>o.insertAdjacentHTML('beforeend',`<li class="${ok?'ok':'err'}">${ok?'✔':'✘'} ${m}</li>`);
 o.innerHTML='';add(navigator.onLine,'Device network: '+(navigator.onLine?'connected':'offline'));
 const p=await pings(3);add(!!p,p?`Internet reachable, latency ${Math.round(p.avg)} ms`:'Internet unreachable — log in via the captive portal or check credit');
 const d=await timed('https://dns.google/resolve?name=example.com',5000);add(d!=null,d!=null?'DNS/HTTPS lookup works':'DNS lookup failed');
 if(c.router){const g=await timed('http://'+c.router,4000);add(g!=null,g!=null?`Router ${esc(c.router)} responded (${Math.round(g)} ms)`:`Router ${esc(c.router)} did not respond`)}else o.insertAdjacentHTML('beforeend','<li>Router IP not set — skipped</li>');
 for(const x of LS.get('devs',[])){const t=await timed('http://'+x.host,4000);add(t!=null,`Extender ${esc(x.name)} ${t!=null?'reachable':'offline/unreachable'}`)}};

$('#k-exp').onclick=()=>{const b=new Blob([JSON.stringify({v:1,cfg:LS.get('cfg',{}),devs:LS.get('devs',[])},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='piso-backup.json';a.click()};
$('#k-imp').onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());if(j.v!==1||typeof j.cfg!=='object'||!Array.isArray(j.devs))throw 0;if(confirm('Overwrite current settings?')){LS.set('cfg',j.cfg);LS.set('devs',j.devs);loadCfg();drawX();toast('Restored')}}catch{toast('Invalid backup file')}};

const api=async(p,body,auth)=>{const h={'Content-Type':'application/json'};const t=sessionStorage.getItem('tok');if(auth&&t)h.Authorization='Bearer '+t;
 let r;try{r=await fetch(cfg().api+p,{method:body?'POST':'GET',headers:h,body:body?JSON.stringify(body):undefined})}catch{throw Error('Backend unreachable at '+cfg().api)}
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Error '+r.status);return j};
const aview=v=>{$('#a-login').hidden=v!=='login';$('#a-rec').hidden=v!=='rec';$('#a-panel').hidden=v!=='panel'};
function adminInit(){$('#a-u').value=LS.get('user','');if(sessionStorage.getItem('tok')){aview('panel');panel()}else aview('login')}
async function panel(){try{const m=await api('/api/me',null,true);$('#a-over').innerHTML=`Signed in as <b>${esc(m.user)}</b><br><small>Router IP: ${esc(cfg().router||'Not set')} · Extenders: ${LS.get('devs',[]).length}</small>`}catch{sessionStorage.removeItem('tok');aview('login')}}
$('#a-show').onclick=()=>{const p=$('#a-p');p.type=p.type==='password'?'text':'password';$('#a-show').textContent=p.type==='password'?'Show':'Hide'};
$('#a-in').onclick=async()=>{$('#a-msg').textContent='';try{const s=await api('/api/status');const u=$('#a-u').value,p=$('#a-p').value;
 if(!s.setup){if(!confirm('No admin exists yet. Create it with these credentials?'))return;await api('/api/setup',{u,p})}
 const j=await api('/api/login',{u,p});sessionStorage.setItem('tok',j.token);LS.set('user',u);$('#a-p').value='';aview('panel');panel()}catch(e){$('#a-msg').textContent=e.message}};
$('#a-forgot').onclick=()=>aview('rec');$('#r-back').onclick=()=>aview('login');
$('#r-go').onclick=async()=>{try{await api('/api/recover',{token:$('#r-t').value.trim(),u:$('#r-u').value,p:$('#r-p').value});$('#r-msg').className='ok';$('#r-msg').textContent='Password reset. Please sign in with the new credentials.';sessionStorage.removeItem('tok');setTimeout(()=>aview('login'),1500)}catch(e){$('#r-msg').className='err';$('#r-msg').textContent=e.message}};
$('#n-save').onclick=async()=>{try{await api('/api/account',{u:$('#n-u').value,p:$('#n-p').value},true);sessionStorage.removeItem('tok');toast('Updated. Please sign in again.');aview('login')}catch(e){toast(e.message)}};
$('#a-out').onclick=async()=>{try{await api('/api/logout',{},true)}catch{}sessionStorage.removeItem('tok');aview('login')};
$('#d-refresh').onclick=async()=>{try{const j=await api('/api/devices',null,true);$('#d-out').innerHTML=j.devices.map(d=>`<div>${esc(d.name)} · ${esc(d.ip)} · ${esc(d.mac)}</div>`).join('')}catch(e){$('#d-out').textContent=e.message}};
loadCfg();drawX();hist();drawAlerts();refresh();
