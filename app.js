/* ===================== Storage helpers ===================== */
const DB = {
  profileKey: 'weblly_business_profile',
  quotesKey: 'weblly_quotes',
  getProfile(){ try{ return JSON.parse(localStorage.getItem(this.profileKey)) || null; }catch(e){ return null; } },
  saveProfile(p){ localStorage.setItem(this.profileKey, JSON.stringify(p)); },
  getQuotes(){ try{ return JSON.parse(localStorage.getItem(this.quotesKey)) || []; }catch(e){ return []; } },
  saveQuotes(list){ localStorage.setItem(this.quotesKey, JSON.stringify(list)); },
};

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function fmtMoney(n){ n = Number(n)||0; return '₪' + n.toLocaleString('he-IL', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function fmtDate(d){ const dt = new Date(d); return dt.toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit',year:'numeric'}); }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function nl2br(s){ return escapeHtml(s||'').replace(/\n/g,'<br>'); }

function toast(msg){
  let t = document.querySelector('.toast');
  if(!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ===================== Project presets (characterization helpers) ===================== */
const PROJECT_PRESETS = {
  'אתר תדמית': [
    {desc:'עיצוב UI/UX לאתר', qty:1, price:0, discount:0},
    {desc:'פיתוח אתר תדמית רספונסיבי', qty:1, price:0, discount:0},
    {desc:'אחסון ודומיין (שנה ראשונה)', qty:1, price:0, discount:0},
  ],
  'חנות אונליין (Ecommerce)': [
    {desc:'עיצוב חנות אונליין', qty:1, price:0, discount:0},
    {desc:'פיתוח והטמעת מערכת סליקה', qty:1, price:0, discount:0},
    {desc:'העלאת מוצרים ראשונית', qty:1, price:0, discount:0},
  ],
  'אפליקציית ווב / מערכת': [
    {desc:'אפיון ועיצוב מערכת', qty:1, price:0, discount:0},
    {desc:'פיתוח Frontend', qty:1, price:0, discount:0},
    {desc:'פיתוח Backend ובסיס נתונים', qty:1, price:0, discount:0},
  ],
  'עיצוב גרפי / מיתוג': [
    {desc:'עיצוב לוגו', qty:1, price:0, discount:0},
    {desc:'בניית שפה עיצובית ומדריך מיתוג', qty:1, price:0, discount:0},
  ],
  'קידום ושיווק דיגיטלי': [
    {desc:'ניהול קמפיינים ממומנים - חודשי', qty:1, price:0, discount:0},
    {desc:'קידום אורגני (SEO) - חודשי', qty:1, price:0, discount:0},
  ],
  'אחר': []
};

const PAYMENT_PRESETS = [
  '50% מקדמה, 50% בסיום העבודה',
  'תשלום מלא מראש',
  '3 תשלומים שווים',
  'שוטף + 30 מיום הגשת החשבונית',
];

/* ===================== App State ===================== */
const state = {
  view: 'dashboard',
  wizardStep: 1,
  draft: null,       // quote object being built
  editingId: null,   // if editing existing saved quote
};

function newDraft(){
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    docNumber: null,
    client: { name:'', contact:'', phone:'', email:'', address:'' },
    projectType: '',
    title: '',
    description: '',
    items: [ {desc:'', qty:1, price:0, discount:0} ],
    vatMode: 'excluded', // included | excluded | exempt
    vatRate: 18,
    validityDays: 14,
    paymentTerms: PAYMENT_PRESETS[0],
    notes: '',
  };
}

/* ===================== Router ===================== */
const app = document.getElementById('app');

function go(view, opts={}){
  state.view = view;
  Object.assign(state, opts);
  render();
  window.scrollTo({top:0, behavior:'smooth'});
}

document.getElementById('homeLink').addEventListener('click', ()=> go('dashboard'));
document.querySelectorAll('.navbtn').forEach(b=>{
  b.addEventListener('click', ()=> go(b.dataset.view));
});

function updateNavActive(){
  document.querySelectorAll('.navbtn').forEach(b=>{
    b.classList.toggle('active', b.dataset.view === state.view);
  });
}

function render(){
  updateNavActive();
  if(state.view === 'dashboard') return renderDashboard();
  if(state.view === 'profile') return renderProfile();
  if(state.view === 'newDocType') return renderNewDocType();
  if(state.view === 'wizard') return renderWizard();
  if(state.view === 'preview') return renderPreview();
}

/* ===================== Dashboard ===================== */
function renderDashboard(){
  const quotes = DB.getQuotes().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  app.innerHTML = `
    <div class="view-header">
      <h1>המסמכים שלי</h1>
      <p>כל הצעות המחיר שיצרת, שמורות אצלך בדפדפן בלבד.</p>
    </div>
    <div class="toolbar">
      <div></div>
      <button class="btn btn-primary" id="newDocBtn">+ מסמך חדש</button>
    </div>
    ${quotes.length === 0 ? `
      <div class="empty-state">
        <span class="icon">📄</span>
        <div>עדיין לא יצרת אף מסמך.</div>
        <div style="margin-top:14px;"><button class="btn btn-primary" id="newDocBtn2">צור הצעת מחיר ראשונה</button></div>
      </div>
    ` : `
      <div class="doc-list">
        ${quotes.map(q => renderDocRow(q)).join('')}
      </div>
    `}
  `;

  document.getElementById('newDocBtn')?.addEventListener('click', ()=> go('newDocType'));
  document.getElementById('newDocBtn2')?.addEventListener('click', ()=> go('newDocType'));

  quotes.forEach(q=>{
    document.getElementById('open-'+q.id)?.addEventListener('click', ()=>{
      go('preview', { draft: q, editingId: q.id });
    });
    document.getElementById('edit-'+q.id)?.addEventListener('click', ()=>{
      go('wizard', { draft: JSON.parse(JSON.stringify(q)), editingId: q.id, wizardStep:1 });
    });
    document.getElementById('dup-'+q.id)?.addEventListener('click', ()=>{
      const copy = JSON.parse(JSON.stringify(q));
      copy.id = uid(); copy.createdAt = new Date().toISOString(); copy.docNumber = null;
      const list = DB.getQuotes(); list.push(copy); DB.saveQuotes(list);
      toast('המסמך שוכפל');
      renderDashboard();
    });
    document.getElementById('del-'+q.id)?.addEventListener('click', ()=>{
      if(!confirm('למחוק את המסמך "'+ (q.title || 'ללא כותרת') +'"? הפעולה בלתי הפיכה.')) return;
      const list = DB.getQuotes().filter(x=>x.id!==q.id);
      DB.saveQuotes(list);
      toast('המסמך נמחק');
      renderDashboard();
    });
  });
}

function renderDocRow(q){
  const total = computeTotals(q).total;
  return `
    <div class="doc-row">
      <div class="doc-main">
        <div class="title">${escapeHtml(q.title || 'הצעת מחיר ללא כותרת')} ${q.docNumber ? `<span style="color:var(--text-dim);font-weight:400;">· ${q.docNumber}</span>` : ''}</div>
        <div class="meta">${escapeHtml(q.client?.name || 'ללא לקוח')} · ${fmtDate(q.createdAt)}</div>
      </div>
      <div class="doc-total">${fmtMoney(total)}</div>
      <div class="doc-actions">
        <button class="btn btn-sm" id="open-${q.id}">צפייה</button>
        <button class="btn btn-sm" id="edit-${q.id}">עריכה</button>
        <button class="btn btn-sm" id="dup-${q.id}">שכפול</button>
        <button class="btn btn-sm btn-danger" id="del-${q.id}">מחיקה</button>
      </div>
    </div>
  `;
}

/* ===================== Business Profile ===================== */
function renderProfile(){
  const p = DB.getProfile() || { name:'', taxLine:'', phone:'', email:'', website:'', address:'', logo:'', bankDetails:'', signatureName:'' };
  app.innerHTML = `
    <div class="view-header">
      <h1>הגדרות עסק</h1>
      <p>הפרטים האלו יופיעו בכל הצעת מחיר שתייצר. תצטרך למלא אותם רק פעם אחת.</p>
    </div>
    <div class="card">
      <div class="field">
        <label>לוגו העסק</label>
        <div class="logo-upload">
          <div class="logo-preview" id="logoPreview">${p.logo ? `<img src="${p.logo}">` : 'ללא לוגו'}</div>
          <div>
            <input type="file" id="logoInput" accept="image/*" style="display:none;">
            <button class="btn btn-sm" id="logoBtn">העלאת לוגו</button>
            ${p.logo ? `<button class="btn btn-sm btn-ghost" id="logoRemoveBtn">הסרה</button>` : ''}
          </div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field"><label>שם העסק *</label><input type="text" id="f_name" value="${escapeHtml(p.name)}" placeholder="Weblly"></div>
        <div class="field"><label>ח.פ / עוסק מורשה (אופציונלי)</label><input type="text" id="f_taxLine" value="${escapeHtml(p.taxLine)}" placeholder="עוסק מורשה 123456789"></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>טלפון</label><input type="tel" id="f_phone" value="${escapeHtml(p.phone)}" placeholder="050-0000000"></div>
        <div class="field"><label>אימייל</label><input type="email" id="f_email" value="${escapeHtml(p.email)}" placeholder="info@weblly.co.il"></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>אתר אינטרנט</label><input type="text" id="f_website" value="${escapeHtml(p.website)}" placeholder="www.weblly.co.il"></div>
        <div class="field"><label>כתובת</label><input type="text" id="f_address" value="${escapeHtml(p.address)}" placeholder="עיר, רחוב"></div>
      </div>
      <div class="field"><label>פרטי תשלום / בנק (יופיעו בתחתית ההצעה, אופציונלי)</label><textarea id="f_bank" placeholder="בנק, סניף, מספר חשבון / קישור לתשלום">${escapeHtml(p.bankDetails)}</textarea></div>
      <div class="field"><label>שם החותם/ת (יופיע בתחתית המסמך)</label><input type="text" id="f_sig" value="${escapeHtml(p.signatureName)}" placeholder="ישראל ישראלי, Weblly"></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
        <button class="btn btn-primary" id="saveProfileBtn">שמירת פרטים</button>
      </div>
    </div>
  `;

  let logoData = p.logo || '';

  document.getElementById('logoBtn').addEventListener('click', ()=> document.getElementById('logoInput').click());
  document.getElementById('logoInput').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    resizeImageToDataURL(file, 240, (dataUrl)=>{
      logoData = dataUrl;
      document.getElementById('logoPreview').innerHTML = `<img src="${dataUrl}">`;
    });
  });
  document.getElementById('logoRemoveBtn')?.addEventListener('click', ()=>{
    logoData = '';
    document.getElementById('logoPreview').innerHTML = 'ללא לוגו';
  });

  document.getElementById('saveProfileBtn').addEventListener('click', ()=>{
    const name = document.getElementById('f_name').value.trim();
    if(!name){ toast('נא להזין שם עסק'); return; }
    const profile = {
      name,
      taxLine: document.getElementById('f_taxLine').value.trim(),
      phone: document.getElementById('f_phone').value.trim(),
      email: document.getElementById('f_email').value.trim(),
      website: document.getElementById('f_website').value.trim(),
      address: document.getElementById('f_address').value.trim(),
      bankDetails: document.getElementById('f_bank').value.trim(),
      signatureName: document.getElementById('f_sig').value.trim(),
      logo: logoData,
    };
    DB.saveProfile(profile);
    toast('פרטי העסק נשמרו');
    go('dashboard');
  });
}

function resizeImageToDataURL(file, maxDim, cb){
  const reader = new FileReader();
  reader.onload = (e)=>{
    const img = new Image();
    img.onload = ()=>{
      let w = img.width, h = img.height;
      if(w > maxDim || h > maxDim){
        const ratio = Math.min(maxDim/w, maxDim/h);
        w = Math.round(w*ratio); h = Math.round(h*ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/png'));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ===================== New Doc Type Selection ===================== */
function renderNewDocType(){
  app.innerHTML = `
    <div class="view-header">
      <h1>מסמך חדש</h1>
      <p>מה תרצה לבנות?</p>
    </div>
    <div class="choice-grid">
      <div class="choice-card" id="chooseQuote">
        <span class="icon">💰</span>
        <h3>הצעת מחיר</h3>
        <p>בניית הצעת מחיר מעוצבת עבור לקוח, כולל פריטים, מחירים ותנאים.</p>
      </div>
      <div class="choice-card disabled">
        <span class="badge-soon">בקרוב</span>
        <span class="icon">📝</span>
        <h3>חוזה</h3>
        <p>בניית חוזה התקשרות מול לקוח.</p>
      </div>
    </div>
  `;
  document.getElementById('chooseQuote').addEventListener('click', ()=>{
    if(!DB.getProfile()){
      toast('קודם נמלא את פרטי העסק שלך');
      go('profile');
      return;
    }
    go('wizard', { draft: newDraft(), editingId: null, wizardStep: 1 });
  });
}

/* ===================== Wizard ===================== */
const WIZARD_STEPS = [
  { id:1, label:'לקוח' },
  { id:2, label:'הפרויקט' },
  { id:3, label:'פריטים ומחירים' },
  { id:4, label:'תנאים' },
  { id:5, label:'תצוגה מקדימה' },
];

function renderWizard(){
  if(!state.draft) state.draft = newDraft();
  const d = state.draft;
  const step = state.wizardStep;

  if(step === 5){ return go('preview'); }

  app.innerHTML = `
    <div class="view-header">
      <h1>${state.editingId ? 'עריכת הצעת מחיר' : 'הצעת מחיר חדשה'}</h1>
      <p>מלא/י את הפרטים בכל שלב - נבנה בשבילך הצעת מחיר מעוצבת בסוף התהליך.</p>
    </div>
    <div class="wizard-steps">
      ${WIZARD_STEPS.map(s => `<div class="wstep ${s.id===step?'active':''} ${s.id<step?'done':''}" data-step="${s.id}">${s.id}. ${s.label}</div>`).join('')}
    </div>
    <div class="card" id="wizardBody"></div>
    <div class="wizard-nav">
      <button class="btn" id="prevBtn" ${step===1?'disabled':''}>&rarr; הקודם</button>
      <button class="btn btn-primary" id="nextBtn">${step===4 ? 'צפייה בהצעה' : 'הבא ←'}</button>
    </div>
  `;

  const body = document.getElementById('wizardBody');
  if(step===1) renderStepClient(body, d);
  if(step===2) renderStepProject(body, d);
  if(step===3) renderStepItems(body, d);
  if(step===4) renderStepTerms(body, d);

  document.querySelectorAll('.wstep').forEach(el=>{
    el.addEventListener('click', ()=>{
      const s = Number(el.dataset.step);
      if(s <= step || s < 5){ state.wizardStep = s; render(); }
    });
  });

  document.getElementById('prevBtn').addEventListener('click', ()=>{
    state.wizardStep = Math.max(1, step-1);
    render();
  });
  document.getElementById('nextBtn').addEventListener('click', ()=>{
    if(step===1 && !d.client.name.trim()){ toast('נא להזין שם לקוח'); return; }
    if(step===2 && !d.title.trim()){ toast('נא להזין כותרת להצעה'); return; }
    if(step===3 && d.items.every(it=>!it.desc.trim())){ toast('נא להוסיף לפחות פריט אחד'); return; }
    state.wizardStep = Math.min(5, step+1);
    render();
  });
}

function renderStepClient(body, d){
  body.innerHTML = `
    <div class="grid-2">
      <div class="field"><label>שם הלקוח / החברה *</label><input type="text" id="c_name" value="${escapeHtml(d.client.name)}" placeholder="שם הלקוח"></div>
      <div class="field"><label>איש קשר</label><input type="text" id="c_contact" value="${escapeHtml(d.client.contact)}" placeholder="שם איש הקשר"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>טלפון</label><input type="tel" id="c_phone" value="${escapeHtml(d.client.phone)}"></div>
      <div class="field"><label>אימייל</label><input type="email" id="c_email" value="${escapeHtml(d.client.email)}"></div>
    </div>
    <div class="field"><label>כתובת</label><input type="text" id="c_address" value="${escapeHtml(d.client.address)}"></div>
  `;
  ['name','contact','phone','email','address'].forEach(k=>{
    document.getElementById('c_'+k).addEventListener('input', e=> d.client[k] = e.target.value);
  });
}

function renderStepProject(body, d){
  body.innerHTML = `
    <div class="field">
      <label>סוג הפרויקט</label>
      <select id="p_type">
        <option value="">בחר/י סוג פרויקט (יציע פריטים מתאימים)</option>
        ${Object.keys(PROJECT_PRESETS).map(k=>`<option value="${escapeHtml(k)}" ${d.projectType===k?'selected':''}>${escapeHtml(k)}</option>`).join('')}
      </select>
      <div class="hint">בחירה תציע רשימת פריטים לדוגמה בשלב הבא - ניתן לערוך הכל בהמשך.</div>
    </div>
    <div class="field"><label>כותרת ההצעה *</label><input type="text" id="p_title" value="${escapeHtml(d.title)}" placeholder="לדוגמה: בניית אתר תדמית לעסק"></div>
    <div class="field"><label>תיאור כללי של הפרויקט / השירות</label><textarea id="p_desc" placeholder="כמה משפטים שמסבירים ללקוח מה כלול בהצעה ומה המטרה">${escapeHtml(d.description)}</textarea></div>
  `;
  document.getElementById('p_type').addEventListener('change', e=>{
    d.projectType = e.target.value;
    const preset = PROJECT_PRESETS[d.projectType];
    if(preset && preset.length && d.items.every(it=>!it.desc.trim())){
      d.items = preset.map(it=>({...it}));
      toast('נוספו פריטים מוצעים - ניתן לערוך בשלב הבא');
    }
  });
  document.getElementById('p_title').addEventListener('input', e=> d.title = e.target.value);
  document.getElementById('p_desc').addEventListener('input', e=> d.description = e.target.value);
}

function renderStepItems(body, d){
  body.innerHTML = `
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-desc">תיאור הפריט</th>
          <th class="col-qty">כמות</th>
          <th class="col-price">מחיר יחידה</th>
          <th class="col-disc">הנחה %</th>
          <th class="col-total">סה"כ</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="itemsBody"></tbody>
    </table>
    <button class="btn btn-sm add-item-btn" id="addItemBtn">+ הוספת פריט</button>
    <div class="totals-box" id="totalsBox"></div>
  `;
  paintItems();

  document.getElementById('addItemBtn').addEventListener('click', ()=>{
    d.items.push({desc:'', qty:1, price:0, discount:0});
    paintItems();
  });

  function paintItems(){
    const tbody = document.getElementById('itemsBody');
    tbody.innerHTML = d.items.map((it, idx) => `
      <tr data-idx="${idx}">
        <td class="col-desc"><input type="text" class="it_desc" value="${escapeHtml(it.desc)}" placeholder="תיאור פריט/שירות"></td>
        <td class="col-qty"><input type="number" min="0" step="1" class="it_qty" value="${it.qty}"></td>
        <td class="col-price"><input type="number" min="0" step="0.01" class="it_price" value="${it.price}"></td>
        <td class="col-disc"><input type="number" min="0" max="100" step="1" class="it_disc" value="${it.discount}"></td>
        <td class="col-total">${fmtMoney(lineTotal(it))}</td>
        <td><button class="row-remove" data-remove="${idx}">✕</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr').forEach(row=>{
      const idx = Number(row.dataset.idx);
      row.querySelector('.it_desc').addEventListener('input', e=>{ d.items[idx].desc = e.target.value; });
      row.querySelector('.it_qty').addEventListener('input', e=>{ d.items[idx].qty = Number(e.target.value)||0; paintItems(); paintTotals(); });
      row.querySelector('.it_price').addEventListener('input', e=>{ d.items[idx].price = Number(e.target.value)||0; paintItems(); paintTotals(); });
      row.querySelector('.it_disc').addEventListener('input', e=>{ d.items[idx].discount = Number(e.target.value)||0; paintItems(); paintTotals(); });
    });
    tbody.querySelectorAll('[data-remove]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = Number(btn.dataset.remove);
        if(d.items.length<=1){ d.items[idx] = {desc:'',qty:1,price:0,discount:0}; }
        else d.items.splice(idx,1);
        paintItems(); paintTotals();
      });
    });
    paintTotals();
  }

  function paintTotals(){
    const t = computeTotals(d);
    const box = document.getElementById('totalsBox');
    box.innerHTML = `
      <div class="totals-row"><span>סכום ביניים</span><span>${fmtMoney(t.subtotal)}</span></div>
      ${d.vatMode!=='exempt' ? `<div class="totals-row"><span>מע"מ (${d.vatRate}%)</span><span>${fmtMoney(t.vat)}</span></div>`:''}
      <div class="totals-row grand"><span>סה"כ לתשלום</span><span>${fmtMoney(t.total)}</span></div>
    `;
  }
}

function renderStepTerms(body, d){
  body.innerHTML = `
    <div class="field">
      <label>מע"מ</label>
      <select id="t_vatmode">
        <option value="excluded" ${d.vatMode==='excluded'?'selected':''}>המחירים אינם כוללים מע"מ (יתווסף)</option>
        <option value="included" ${d.vatMode==='included'?'selected':''}>המחירים כוללים מע"מ</option>
        <option value="exempt" ${d.vatMode==='exempt'?'selected':''}>עוסק פטור - ללא מע"מ</option>
      </select>
    </div>
    <div class="grid-2">
      <div class="field" id="vatRateField" style="${d.vatMode==='exempt'?'display:none':''}">
        <label>שיעור מע"מ (%)</label>
        <input type="number" id="t_vatrate" value="${d.vatRate}" min="0" max="100">
      </div>
      <div class="field">
        <label>תוקף ההצעה (ימים מהיום)</label>
        <input type="number" id="t_validity" value="${d.validityDays}" min="1">
      </div>
    </div>
    <div class="field">
      <label>תנאי תשלום</label>
      <select id="t_payment_preset">
        <option value="">בחר/י תנאי תשלום נפוץ, או כתוב/כתבי בעצמך למטה</option>
        ${PAYMENT_PRESETS.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}
      </select>
      <textarea id="t_payment" style="margin-top:8px;">${escapeHtml(d.paymentTerms)}</textarea>
    </div>
    <div class="field">
      <label>הערות נוספות (יופיעו בתחתית ההצעה)</label>
      <textarea id="t_notes" placeholder="לדוגמה: ההצעה אינה כוללת תוכן/צילום, שינויים מעבר להיקף יתומחרו בנפרד וכו'">${escapeHtml(d.notes)}</textarea>
    </div>
  `;
  document.getElementById('t_vatmode').addEventListener('change', e=>{
    d.vatMode = e.target.value;
    document.getElementById('vatRateField').style.display = d.vatMode==='exempt' ? 'none':'';
  });
  document.getElementById('t_vatrate').addEventListener('input', e=> d.vatRate = Number(e.target.value)||0);
  document.getElementById('t_validity').addEventListener('input', e=> d.validityDays = Number(e.target.value)||0);
  document.getElementById('t_payment_preset').addEventListener('change', e=>{
    if(e.target.value){ d.paymentTerms = e.target.value; document.getElementById('t_payment').value = e.target.value; }
  });
  document.getElementById('t_payment').addEventListener('input', e=> d.paymentTerms = e.target.value);
  document.getElementById('t_notes').addEventListener('input', e=> d.notes = e.target.value);
}

/* ===================== Totals ===================== */
function lineTotal(it){
  const q = Number(it.qty)||0, p = Number(it.price)||0, disc = Number(it.discount)||0;
  return q*p*(1-disc/100);
}
function computeTotals(d){
  const subtotal = d.items.reduce((sum,it)=> sum + lineTotal(it), 0);
  let vat = 0, total = subtotal;
  if(d.vatMode === 'excluded'){ vat = subtotal * (d.vatRate/100); total = subtotal + vat; }
  else if(d.vatMode === 'included'){ vat = subtotal - subtotal/(1+d.vatRate/100); total = subtotal; }
  else { vat = 0; total = subtotal; }
  return { subtotal, vat, total };
}

/* ===================== Preview / Document render ===================== */
function nextDocNumber(){
  const list = DB.getQuotes();
  const year = new Date().getFullYear();
  const countThisYear = list.filter(q => q.docNumber && q.docNumber.includes(String(year))).length;
  return `Q-${year}-${String(countThisYear+1).padStart(3,'0')}`;
}

function renderPreview(){
  const d = state.draft;
  if(!d.docNumber) d.docNumber = nextDocNumber();
  const profile = DB.getProfile() || {};
  const t = computeTotals(d);
  const validUntil = new Date(Date.now() + (d.validityDays||0)*86400000);

  const docHtml = buildQuoteDocHtml(d, profile, t, validUntil);

  app.innerHTML = `
    <div class="view-header">
      <h1>תצוגה מקדימה</h1>
      <p>כך תיראה הצעת המחיר. ניתן לחזור אחורה לעריכה, לשמור, או להוריד כ-PDF.</p>
    </div>
    <div class="preview-toolbar">
      <button class="btn" id="backEditBtn">&rarr; חזרה לעריכה</button>
      <button class="btn btn-primary" id="saveDocBtn">💾 שמירת המסמך</button>
      <button class="btn btn-primary" id="pdfBtn">⬇ הורדה כ-PDF</button>
    </div>
    <div class="doc-preview-wrap">
      <div class="quote-doc" id="quoteDoc">${docHtml}</div>
    </div>
  `;

  document.getElementById('backEditBtn').addEventListener('click', ()=>{
    go('wizard', { wizardStep: 4 });
  });
  document.getElementById('saveDocBtn').addEventListener('click', ()=>{
    persistDraft();
    toast('המסמך נשמר');
    go('dashboard');
  });
  document.getElementById('pdfBtn').addEventListener('click', ()=>{
    persistDraft();
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `<div class="quote-doc">${docHtml}</div>`;
    window.print();
  });
}

function persistDraft(){
  const d = state.draft;
  const list = DB.getQuotes();
  const idx = list.findIndex(q=>q.id===d.id);
  if(idx>=0) list[idx] = d; else list.push(d);
  DB.saveQuotes(list);
  state.editingId = d.id;
}

function buildQuoteDocHtml(d, profile, t, validUntil){
  return `
    <div class="qd-header">
      <div class="qd-biz">
        ${profile.logo ? `<img src="${profile.logo}">` : ''}
        <div>
          <div class="qd-biz-name">${escapeHtml(profile.name || '')}</div>
          <div class="qd-biz-sub">${escapeHtml(profile.taxLine || '')}</div>
          <div class="qd-biz-sub">${[profile.phone, profile.email, profile.website].filter(Boolean).map(escapeHtml).join(' · ')}</div>
        </div>
      </div>
      <div class="qd-doctitle">
        <div class="type">הצעת מחיר</div>
        <div class="num">מס' ${escapeHtml(d.docNumber)}</div>
        <div class="num">תאריך: ${fmtDate(d.createdAt)}</div>
      </div>
    </div>

    <div class="qd-meta">
      <div class="qd-meta-block">
        <h4>לכבוד</h4>
        <div><strong>${escapeHtml(d.client.name)}</strong></div>
        ${d.client.contact ? `<div>לידי: ${escapeHtml(d.client.contact)}</div>`:''}
        ${d.client.phone ? `<div>${escapeHtml(d.client.phone)}</div>`:''}
        ${d.client.email ? `<div>${escapeHtml(d.client.email)}</div>`:''}
        ${d.client.address ? `<div>${escapeHtml(d.client.address)}</div>`:''}
      </div>
      <div class="qd-meta-block">
        <h4>תוקף ההצעה</h4>
        <div>בתוקף עד ${fmtDate(validUntil)}</div>
      </div>
    </div>

    <div class="qd-title-line">${escapeHtml(d.title)}</div>
    ${d.description ? `<div class="qd-desc">${nl2br(d.description)}</div>` : ''}

    <table class="qd-items">
      <thead>
        <tr>
          <th>תיאור</th><th>כמות</th><th>מחיר יחידה</th><th>הנחה</th><th>סה"כ</th>
        </tr>
      </thead>
      <tbody>
        ${d.items.filter(it=>it.desc.trim()).map(it=>`
          <tr>
            <td>${escapeHtml(it.desc)}</td>
            <td>${it.qty}</td>
            <td>${fmtMoney(it.price)}</td>
            <td>${it.discount ? it.discount+'%' : '-'}</td>
            <td>${fmtMoney(lineTotal(it))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="qd-totals">
      <div class="trow"><span>סכום ביניים</span><span>${fmtMoney(t.subtotal)}</span></div>
      ${d.vatMode==='exempt'
        ? `<div class="trow"><span>עוסק פטור ממע"מ</span><span>-</span></div>`
        : `<div class="trow"><span>מע"מ (${d.vatRate}%)${d.vatMode==='included'?' - כלול':''}</span><span>${fmtMoney(t.vat)}</span></div>`
      }
      <div class="trow grand"><span>סה"כ לתשלום</span><span>${fmtMoney(t.total)}</span></div>
    </div>

    <div class="qd-terms">
      <div class="qd-terms-grid">
        <div><strong>תנאי תשלום:</strong> ${escapeHtml(d.paymentTerms)}</div>
      </div>
      ${d.notes ? `<h4>הערות</h4><div class="qd-notes">${nl2br(d.notes)}</div>` : ''}
      ${profile.bankDetails ? `<h4 style="margin-top:12px;">פרטי תשלום</h4><div class="qd-notes">${nl2br(profile.bankDetails)}</div>` : ''}
    </div>

    <div class="qd-footer">
      ${profile.signatureName ? `בברכה, ${escapeHtml(profile.signatureName)} · ` : ''}${escapeHtml(profile.name || '')}
      ${profile.website ? ' · ' + escapeHtml(profile.website) : ''}
    </div>
  `;
}

/* ===================== Init ===================== */
(function init(){
  if(!DB.getProfile()){
    go('profile');
  } else {
    go('dashboard');
  }
})();
