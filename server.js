// Zero-dependency backend. Run: npm run backend | Recovery token: npm run reset-token
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const DB=path.join(__dirname,'..','database','admin.json'),PORT=process.env.PORT||8787,DEV=process.env.DEV_MODE==='1';
const load=()=>{try{return JSON.parse(fs.readFileSync(DB))}catch{return{}}},save=d=>fs.writeFileSync(DB,JSON.stringify(d,null,1),{mode:0o600});
const hashPw=(p,s=crypto.randomBytes(16).toString('hex'))=>({s,h:crypto.scryptSync(p,s,64).toString('hex')});
const okPw=(p,{s,h})=>crypto.timingSafeEqual(Buffer.from(crypto.scryptSync(p,s,64).toString('hex')),Buffer.from(h));
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
const log=m=>fs.appendFileSync(path.join(__dirname,'..','database','security.log'),new Date().toISOString()+' '+m+'\n');
if(process.argv[2]==='reset-token'){const t=crypto.randomBytes(16).toString('hex'),d=load();d.rec={h:sha(t),exp:Date.now()+9e5};save(d);log('recovery token issued via server console');console.log('Recovery token (15 min, single use):',t);process.exit()}
const sessions=new Map(),tries=new Map();
const limited=ip=>{const n=(tries.get(ip)||[]).filter(t=>Date.now()-t<6e5);tries.set(ip,n);return n.length>=8},hit=ip=>tries.set(ip,[...(tries.get(ip)||[]),Date.now()]);
const valid=(u,p)=>/^[\w.\-]{3,32}$/.test(u||'')&&typeof p==='string'&&p.length>=8&&p.length<=128;
http.createServer((q,r)=>{
 const send=(c,o)=>{r.writeHead(c,{'Content-Type':'application/json','Access-Control-Allow-Origin':process.env.ALLOWED_ORIGIN||'*','Access-Control-Allow-Headers':'Content-Type,Authorization','X-Content-Type-Options':'nosniff'});r.end(JSON.stringify(o))};
 if(q.method==='OPTIONS')return send(204,{});
 let b='';q.on('data',c=>{b+=c;if(b.length>1e4)q.destroy()});q.on('end',()=>{
 let j={};try{j=b?JSON.parse(b):{}}catch{return send(400,{error:'Bad JSON'})}
 const ip=q.socket.remoteAddress,tok=(q.headers.authorization||'').slice(7),ses=sessions.get(tok),d=load(),url=q.url.split('?')[0];
 if(url==='/api/status')return send(200,{setup:!!d.user});
 if(url==='/api/setup'&&q.method==='POST'){if(d.user)return send(403,{error:'Admin already exists'});if(!valid(j.u,j.p))return send(400,{error:'Username 3-32 chars; password 8+ chars'});save({...d,user:j.u,pw:hashPw(j.p)});log('admin created');return send(200,{ok:1})}
 if(url==='/api/login'&&q.method==='POST'){if(limited(ip))return send(429,{error:'Too many attempts. Wait 10 minutes.'});hit(ip);
  if(!d.user||j.u!==d.user||!okPw(String(j.p||''),d.pw)){log('login failed '+ip);return send(401,{error:'Invalid username or password'})}
  const t=crypto.randomBytes(32).toString('hex');sessions.set(t,{user:d.user,exp:Date.now()+36e5});log('login ok '+ip);return send(200,{token:t})}
 if(url==='/api/recover'&&q.method==='POST'){if(limited(ip))return send(429,{error:'Too many attempts'});hit(ip);
  const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);
  const tokOk=d.rec&&d.rec.exp>Date.now()&&j.token&&sha(String(j.token))===d.rec.h,devOk=DEV&&local&&j.dev;
  if(!tokOk&&!devOk){log('recovery rejected '+ip);return send(403,{error:'Invalid or expired recovery token'})}
  if(!valid(j.u,j.p))return send(400,{error:'Username 3-32 chars; password 8+ chars'});
  delete d.rec;d.user=j.u;d.pw=hashPw(j.p);save(d);sessions.clear();log('admin reset via '+(tokOk?'token':'DEV mode'));return send(200,{ok:1})}
 if(!ses||ses.exp<Date.now())return send(401,{error:'Login required'});
 if(url==='/api/me')return send(200,{user:ses.user});
 if(url==='/api/logout'){sessions.delete(tok);return send(200,{ok:1})}
 if(url==='/api/account'&&q.method==='POST'){if(!valid(j.u,j.p))return send(400,{error:'Username 3-32 chars; password 8+ chars'});d.user=j.u;d.pw=hashPw(j.p);save(d);sessions.clear();log('account changed');return send(200,{ok:1})}
 if(url==='/api/devices')return send(501,{error:'No router adapter configured. Add one in backend/ for your router model to list devices.'});
 send(404,{error:'Not found'})})}).listen(PORT,()=>console.log('Backend on :'+PORT+(DEV?' (DEV_MODE: localhost reset enabled)':'')));
