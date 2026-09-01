/* =========================================================
     V20 — GOOGLE SHEETS / APPS SCRIPT
     Cole abaixo a URL /exec da implantação do Apps Script.
     ========================================================= */
  const API_URL='https://script.google.com/macros/s/AKfycbyp1D-qXqN1hje7LuZngzH57SvLImS8YOSXt0dippk0QuLLeZ2q1FdoY-6Loct5QEQ/exec';
  const TOKEN_KEY='temrumo_token';
  const DASHBOARD_CACHE_KEY='temrumo_dashboard_cache';
  const SESSION_CACHE_KEY='temrumo_session_cache';

  function apiConfigured(){
    return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(API_URL);
  }

  function apiStatus(text,error=false){
    const el=document.getElementById('apiStatus');
    if(!el) return;
    el.querySelector('span').textContent=text;
    el.classList.toggle('error',!!error);
    el.classList.add('show');
    clearTimeout(window.__apiStatusTimer);
    window.__apiStatusTimer=setTimeout(()=>el.classList.remove('show'),1800);
  }

  async function api(action,payload={},auth=true){
    if(!apiConfigured()) throw new Error('Cole a URL /exec do Apps Script em API_URL.');
    const token=auth ? (localStorage.getItem(TOKEN_KEY)||'') : '';
    const res=await fetch(API_URL,{
      method:'POST',
      redirect:'follow',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action,payload,token})
    });
    const text=await res.text();
    let json;
    try{json=JSON.parse(text)}catch(_){throw new Error('Resposta inválida do servidor. Verifique a implantação do Apps Script.');}
    if(!json.ok) throw new Error(json.error||'Erro no servidor.');
    return json.data;
  }


  function saveSessionCache(token,dashboard){
    try{
      if(token) localStorage.setItem(TOKEN_KEY,token);
      if(dashboard) localStorage.setItem(DASHBOARD_CACHE_KEY,JSON.stringify(dashboard));
      localStorage.setItem(SESSION_CACHE_KEY,JSON.stringify({
        logged:true,
        savedAt:Date.now()
      }));
    }catch(_){}
  }

  function readDashboardCache(){
    try{
      const raw=localStorage.getItem(DASHBOARD_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(_){return null}
  }

  function clearSessionCache(){
    clearSessionCache();
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    localStorage.removeItem(SESSION_CACHE_KEY);
  }


  function selectedBank(){
    return document.querySelector('.modal .bank-option.active')?.dataset.bank||'';
  }

  function txIcon(tx){
    if(tx.type==='entrada') return 'fa-solid fa-arrow-trend-up';
    if(tx.type==='guardar') return 'fa-solid fa-piggy-bank';
    const c=(tx.category||'').toLowerCase();
    if(c.includes('alimenta')) return 'fa-solid fa-utensils';
    if(c.includes('transporte')) return 'fa-solid fa-car';
    if(c.includes('lazer')) return 'fa-solid fa-martini-glass-citrus';
    return 'fa-solid fa-receipt';
  }

  function txDateLabel(value){
    if(!value) return 'Agora';
    const d=new Date(value);
    if(Number.isNaN(d.getTime())) return 'Agora';
    return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(d).replace('.','');
  }

  function renderServerMovements(){
    const txs=Array.isArray(state.transactions)?state.transactions:[];
    const row=tx=>`<div class="transaction">
      <div class="tx-icon"><i class="${txIcon(tx)}"></i></div>
      <div class="tx-info"><strong>${escapeHtml(tx.description||'Movimento')}</strong><span>${txDateLabel(tx.date)}${tx.bank?' • '+escapeHtml(tx.bank):''}</span></div>
      <div class="tx-value ${tx.type==='entrada'?'in':''}">${tx.type==='entrada'?'+ ':tx.type==='saida'?'− ':''}${money(Number(tx.value||0))}</div>
    </div>`;
    const empty='<div class="empty-data"><i class="fa-solid fa-receipt"></i>Ainda não tem movimento por aqui.<br>Quando entrar ou sair grana, aparece aqui.</div>';
    const home=document.getElementById('homeRecentTransactions');
    const all=document.getElementById('allTransactions');
    if(home) home.innerHTML=txs.length?txs.slice(0,3).map(row).join(''):empty;
    if(all) all.innerHTML=txs.length?txs.map(row).join(''):empty;
  }

  function renderServerWallets(){
    const host=document.getElementById('walletList');
    if(!host) return;
    const wallets=Array.isArray(state.wallets)?state.wallets:[];
    if(!wallets.length){
      host.innerHTML='<div class="empty-data" style="grid-column:1/-1"><i class="fa-solid fa-wallet"></i>Você ainda não criou nenhuma carteira.<br>Cria uma e dá um rumo pra primeira meta.</div>';
      return;
    }
    host.innerHTML=wallets.map(w=>{
      const goal=Number(w.goal||0), amount=Number(w.amount||0);
      const pct=goal>0?Math.max(0,Math.min(100,(amount/goal)*100)):0;
      return `<div class="wallet-card">
        <div class="top"><i class="fa-solid fa-wallet"></i><small>${goal>0?'META '+money(goal):'SEM META DEFINIDA'}</small></div>
        <h3>${escapeHtml(w.name||'Carteira')}</h3>
        <strong>${money(amount)}</strong>
        <div class="progress"><div style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  }

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  function applyDashboard(data){
    if(!data) return;
    state.balance=Number(data.balance||0);
    state.free=Number(data.free||0);
    state.wallets=Array.isArray(data.wallets)?data.wallets:[];
    state.transactions=Array.isArray(data.movements)?data.movements:[];
    state.debts=Array.isArray(data.debts)?data.debts:[];
    state.banks=Array.isArray(data.banks)?data.banks:[];
    state.missionsCompleted=Number(data.missionsCompleted||0);
    state.missionSavings=Number(data.missionSavings||0);
    if(data.profile) state.financialProfile={...state.financialProfile,...data.profile};
    state.user=data.user||state.user;

    const firstName=(data.user?.name||'Você').trim().split(/\s+/)[0];
    document.querySelectorAll('.user strong').forEach(el=>el.textContent=`Olá, ${firstName}!`);
    document.querySelectorAll('.profile-card h3').forEach(el=>el.textContent=data.user?.name||firstName);
    document.querySelectorAll('.profile-card p').forEach(el=>el.textContent=data.user?.email||'');

    render();
    renderServerMovements();
    renderServerWallets();
    renderHomeBanks();
    if(typeof renderContextChallenges==='function') renderContextChallenges(true);
    if(typeof renderPainSummary==='function') renderPainSummary();
    if(typeof renderMeDashboard==='function') renderMeDashboard();
  }

  async function syncDashboard(silent=false){
    try{
      if(!silent) apiStatus('Sincronizando...');
      const data=await api('getDashboard');
      applyDashboard(data);
      if(!silent) apiStatus('Tudo sincronizado ✓');
      return data;
    }catch(err){
      if(!silent) apiStatus(err.message,true);
      throw err;
    }
  }

  const state = {
    balance: 0,
    free: 0,
    hidden:false,
    advisorBusy:false,
    banks:[],
    spendMoment:'Fim de semana / rolê',
    spendTrigger:'Comida e delivery',
    financialProfile:{
      spend:'delivery',
      mainPain:'impulso',
      compulsive:'medio',
      debt:'nao'
    },
    missionsCompleted:0,
    missionSavings:0,
    transactions:[],
    debts:[],
    user:null,
    wallets:[]
  };

  const banks = [
    {name:'Mercado Pago',logo:'https://http2.mlstatic.com/D_NQ_NP_678228-MLA91027862512_092025-F.jpg'},
    {name:'Nubank',logo:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3OHc6k8XRfgn36CJN8QLPRXzYLCaNhYpETp5ZmBAtkTOVc7VfsCit-g-f&s=10'},
    {name:'Banco Inter',logo:'https://pbs.twimg.com/profile_images/1956066192948654080/aLrE9IrH_400x400.jpg'},
    {name:'PicPay',logo:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ75l_-kpLm1QinGSz3asELm96Y5rccgFSfPgNh5y1ZDfHVJo8ZDvdIX6Simk6z2QQ&s=10&ec=121966386'},
    {name:'PagBank',logo:'https://play-lh.googleusercontent.com/X-KPLh6j19b9C0qz38_pO1lbpug_HOOwRkYaZFdrdFzMFlv2Vg1gsZ9RDjFrlUgj0LPlwSVqLVW5Q9lqJaG5aQ'},
    {name:'Caixa',logo:'https://www.freepnglogos.com/uploads/logo-caixa-png/caixa-download-png-5.png'},
    {name:'Banco do Brasil',logo:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdFVGfVs3-DnW8GchJU5il6WlUZyO0a0x45aWaIK9MsBBIHbLy-l6QyIY9WX12RUx3&s=10&ec=121966386'},
    {name:'Itaú',logo:'https://logodownload.org/wp-content/uploads/2014/05/itau-logo-8.png'},
    {name:'Bradesco',logo:'https://play-lh.googleusercontent.com/NOTihl2S2EqNRJBZWxpuJwbqEQl74TmwV6COB_3RJ6YQs2SteMFxmbAdNJaeASZyVa78fS_QYGwKrZCyyd2puQ'},
    {name:'Santander',logo:'https://static.vecteezy.com/system/resources/previews/069/864/321/non_2x/glossy-santander-bank-logo-rounded-square-icon-free-png.png'}
  ];


  function bankInfo(name){
    return banks.find(b=>b.name===name)||null;
  }

  function renderHomeBanks(){
    const wrap=document.getElementById('homeBankLogos');
    if(!wrap) return;

    const selected=Array.isArray(state.banks)?state.banks:[];
    if(!selected.length){
      wrap.innerHTML=`
        <button class="bank-empty-add" type="button" data-modal="bancos">
          <i class="fa-solid fa-plus"></i>
          <span>Adicionar banco</span>
        </button>`;
      wrap.querySelector('[data-modal="bancos"]')?.addEventListener('click',()=>openModal('bancos'));
      return;
    }

    wrap.innerHTML=selected.map(name=>{
      const b=bankInfo(name);
      if(b){
        return `<button class="home-bank-logo" type="button" title="${escapeHtml(name)}" aria-label="${escapeHtml(name)}">
          <img src="${b.logo}" alt="${escapeHtml(name)}">
        </button>`;
      }
      return `<button class="home-bank-logo home-bank-other" type="button" title="${escapeHtml(name)}" aria-label="${escapeHtml(name)}">
        <i class="fa-solid fa-building-columns"></i>
      </button>`;
    }).join('');
  }

  function bankManageGrid(){
    const selected=new Set(Array.isArray(state.banks)?state.banks:[]);
    return `
      <div class="bank-manage-picker">
        ${banks.map(b=>`
          <button class="bank-manage-option ${selected.has(b.name)?'selected':''}" type="button" data-bank="${b.name}" title="${b.name}" aria-label="${b.name}">
            <img src="${b.logo}" alt="${b.name}">
            <i class="fa-solid fa-check bank-check"></i>
          </button>
        `).join('')}
      </div>`;
  }

  function bindBankManagePicker(){
    document.querySelectorAll('.bank-manage-option').forEach(btn=>{
      btn.addEventListener('click',()=>btn.classList.toggle('selected'));
    });
  }

  window.saveUserBanks=async function(){
    const selected=[...document.querySelectorAll('.bank-manage-option.selected')].map(btn=>btn.dataset.bank);
    try{
      apiStatus('Salvando seus bancos...');
      const data=await api('saveBanks',{banks:selected});
      applyDashboard(data);
      saveSessionCache(localStorage.getItem(TOKEN_KEY),data);
      closeModal();
      apiStatus('Bancos atualizados ✓');
      showToast(selected.length?'Bancos atualizados 😎':'Nenhum banco selecionado.');
    }catch(err){
      apiStatus(err.message,true);
      showToast(err.message);
    }
  }


  const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);

  const balanceValue = document.getElementById('balanceValue');
  const freeValue = document.getElementById('freeValue');
  const eyeBtn = document.getElementById('eyeBtn');
  const toast = document.getElementById('toast');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  function render(){
    balanceValue.textContent = state.hidden ? 'R$ ••••••' : money(state.balance);
    freeValue.textContent = state.hidden ? 'R$ ••••' : money(state.free);
    eyeBtn.innerHTML = state.hidden ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
  }

  function showToast(text){
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),2200);
  }

  eyeBtn.addEventListener('click',()=>{
    state.hidden=!state.hidden;
    render();
  });

  function setPage(page){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-'+page)?.classList.add('active');

    document.querySelectorAll('[data-page]').forEach(b=>{
      b.classList.toggle('active',b.dataset.page===page);
    });

    window.scrollTo({top:0,behavior:'smooth'});

    if(page==='assessor'){
      setTimeout(()=>document.getElementById('advisorInput')?.focus(),250);
    }

    if(page==='eu'){
      renderMeDashboard();
    }
  }

  document.querySelectorAll('[data-page]').forEach(btn=>{
    btn.addEventListener('click',()=>setPage(btn.dataset.page));
  });

  function bankGrid(){
    return `
      <div class="bank-picker">
        ${banks.map((b,i)=>`
          <button class="bank-option ${i===0?'active':''}" data-bank="${b.name}" title="${b.name}">
            <img src="${b.logo}" alt="${b.name}">
          </button>
        `).join('')}
        <button class="bank-option" data-bank="Outro banco" title="Outro banco">
          <i class="fa-solid fa-plus" style="color:#29AB87;font-size:18px"></i>
        </button>
      </div>
    `;
  }

  function bindBankPicker(){
    document.querySelectorAll('.bank-option').forEach(btn=>{
      btn.addEventListener('click',()=>{
        btn.closest('.bank-picker')?.querySelectorAll('.bank-option').forEach(x=>x.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function openModal(type){
    if(type==='entrada'){
      modalTitle.textContent='Caiu dinheiro';
      modalBody.innerHTML=`
        <div class="field">
          <label>VALOR RECEBIDO</label>
          <input id="valueInput" type="number" placeholder="R$ 0,00">
        </div>
        <div class="field">
          <label>ORIGEM</label>
          <input id="entryDescription" placeholder="Ex.: cliente, salário, venda...">
        </div>
        <div class="field">
          <label>ONDE ESSE DINHEIRO ESTÁ?</label>
          ${bankGrid()}
        </div>
        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Cancelar</button>
          <button class="primary" onclick="saveEntry()">Registrar</button>
        </div>
      `;
    }

    if(type==='saida'){
      modalTitle.textContent='Registrar saída';
      modalBody.innerHTML=`
        <div class="field">
          <label>VALOR GASTO</label>
          <input id="valueInput" type="number" placeholder="R$ 0,00">
        </div>
        <div class="field">
          <label>CATEGORIA</label>
          <select id="expenseCategory">
            <option>Alimentação</option>
            <option>Lazer</option>
            <option>Transporte</option>
            <option>Casa</option>
            <option>Saúde</option>
            <option>Outro</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Cancelar</button>
          <button class="primary" onclick="saveExpense()">Registrar</button>
        </div>
      `;
    }

    if(type==='guardar'){
      modalTitle.textContent='Guardar dinheiro';
      modalBody.innerHTML=`
        <div class="field">
          <label>QUANTO VOCÊ QUER GUARDAR?</label>
          <input id="saveValueInput" type="number" min="0" step="0.01" placeholder="R$ 0,00">
        </div>

        <div class="field">
          <label>ONDE ESSE DINHEIRO VAI GANHAR RUMO?</label>
          <div class="save-destination" id="saveDestination">
            <button type="button" class="save-option" data-save-mode="existing">
              <i class="fa-solid fa-wallet"></i>
              <div>
                <strong>Carteira existente</strong>
                <small>Guardar em uma carteira que você já criou</small>
              </div>
              <i class="fa-solid fa-chevron-right" style="margin-left:auto;background:none;width:auto;height:auto"></i>
            </button>

            <button type="button" class="save-option" data-save-mode="new">
              <i class="fa-solid fa-plus"></i>
              <div>
                <strong>Criar nova carteira</strong>
                <small>Crie um novo objetivo sem sair daqui</small>
              </div>
              <i class="fa-solid fa-chevron-right" style="margin-left:auto;background:none;width:auto;height:auto"></i>
            </button>
          </div>
          <div id="saveExtra" style="margin-top:10px"></div>
        </div>

        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Cancelar</button>
          <button class="primary" onclick="saveMoney()">Guardar agora</button>
        </div>
      `;

      setTimeout(()=>{
        const extra=document.getElementById('saveExtra');
        document.querySelector('[data-save-mode="existing"]')?.addEventListener('click',()=>{
          document.querySelectorAll('#saveDestination .save-option').forEach(x=>x.classList.remove('active'));
          document.querySelector('[data-save-mode="existing"]')?.classList.add('active');
          extra.innerHTML=`
            <select id="saveWalletSelect" class="wallet-select">
              <option value="">Escolha a carteira</option>
              ${state.wallets.map((w,i)=>`<option value="${i}">${w.name}</option>`).join('')}
            </select>
          `;
        });

        document.querySelector('[data-save-mode="new"]')?.addEventListener('click',()=>{
          document.querySelectorAll('#saveDestination .save-option').forEach(x=>x.classList.remove('active'));
          document.querySelector('[data-save-mode="new"]')?.classList.add('active');
          extra.innerHTML=`
            <input id="newSaveWallet" class="wallet-select" placeholder="Nome da nova carteira">
          `;
        });
      },0);
    }

    if(type==='carteira'){
      modalTitle.textContent='Nova carteira';
      modalBody.innerHTML=`
        <div class="field">
          <label>NOME</label>
          <input id="walletName" placeholder="Ex.: Reserva de segurança">
        </div>
        <div class="field">
          <label>META</label>
          <input id="walletGoal" type="number" placeholder="R$ 0,00">
        </div>
        <div class="field">
          <label>BANCO DE REFERÊNCIA</label>
          ${bankGrid()}
        </div>
        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Cancelar</button>
          <button class="primary" onclick="createWallet()">Criar carteira</button>
        </div>
      `;
    }

    if(type==='divida'){
      modalTitle.textContent='Registrar dívida';
      modalBody.innerHTML=`
        <div class="field">
          <label>NOME DA DÍVIDA</label>
          <input id="debtName" placeholder="Ex.: Parcela da moto">
        </div>
        <div class="field">
          <label>VALOR TOTAL</label>
          <input id="debtTotal" type="number" placeholder="R$ 0,00">
        </div>
        <div class="field">
          <label>VALOR MENSAL</label>
          <input id="debtMonthly" type="number" placeholder="R$ 0,00">
        </div>
        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Cancelar</button>
          <button class="primary" onclick="saveDebt()">Salvar</button>
        </div>
      `;
    }

    if(type==='advisorInfo'){
      modalTitle.textContent='Como o “Posso gastar?” pensa';
      modalBody.innerHTML=`
        <div class="profile-note">
          O TemRumo não foi feito para dar respostas automáticas sem contexto.
          Ele cruza seu dinheiro livre, seus objetivos e as dificuldades que você contou no seu perfil financeiro.
        </div>
        <div class="learn-card" style="margin:10px 0 0">
          <div class="progress-list">
            <div class="progress-row">
              <i class="fa-solid fa-wallet"></i>
              <div><strong>1. Olha o dinheiro livre</strong><span>Saldo total não é limite de gasto.</span></div>
            </div>
            <div class="progress-row">
              <i class="fa-solid fa-scale-balanced"></i>
              <div><strong>2. Mede o peso da decisão</strong><span>Compara o gasto com o que está realmente livre.</span></div>
            </div>
            <div class="progress-row">
              <i class="fa-solid fa-graduation-cap"></i>
              <div><strong>3. Explica o porquê</strong><span>A resposta precisa ensinar, não só autorizar.</span></div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="primary" onclick="closeModal()">Entendi</button>
        </div>
      `;
    }

    if(type==='lesson'){
      const lesson=window.pendingLesson||{};
      modalTitle.textContent=lesson.title||'Aprender';
      modalBody.innerHTML=`
        <div class="profile-note" style="font-size:9px;line-height:1.65">
          ${lesson.text||''}
        </div>
        <div class="modal-actions">
          <button class="primary" onclick="closeModal()">Entendi</button>
        </div>
      `;
    }

    if(type==='conta'){
      modalTitle.textContent='Minha conta';
      modalBody.innerHTML=`
        <div class="field">
          <label>COMO VOCÊ QUER SER CHAMADO?</label>
          <input value="Marllus" placeholder="Seu nome">
        </div>
        <div class="field">
          <label>SEU MOMENTO</label>
          <select>
            <option>Ensino médio</option>
            <option>Terminei a escola</option>
            <option>Primeiro emprego</option>
            <option>Trabalhando</option>
            <option>Empreendendo</option>
            <option>Recomeçando minha vida financeira</option>
            <option>Outro</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Cancelar</button>
          <button class="primary" onclick="closeModal();showToast('Perfil atualizado!')">Salvar</button>
        </div>
      `;
    }

    if(type==='preferencias'){
      modalTitle.textContent='Como eu lido com dinheiro';
      modalBody.innerHTML=`
        <div class="profile-note">
          Isso aqui é sobre onde você mais se enrola com dinheiro.
          O TemRumo usa isso pra deixar missões, dicas e o “Posso gastar?” com a sua cara.
        </div>

        <div class="field">
          <label>ONDE SUA GRANA MAIS SOME?</label>
          <select id="painSpend">
            <option value="delivery">Comida e delivery</option>
            <option value="role">Rolê com amigos</option>
            <option value="compras">Compras online</option>
            <option value="games">Games e assinaturas</option>
            <option value="transporte">Transporte</option>
            <option value="geral">Gasto um pouco em tudo</option>
          </select>
        </div>

        <div class="field">
          <label>O QUE MAIS TE PEGA HOJE?</label>
          <select id="painMain">
            <option value="impulso">Compro no impulso</option>
            <option value="planejamento">Meu dinheiro some antes do fim do mês</option>
            <option value="guardar">Guardo e depois acabo gastando</option>
            <option value="dividas">Tô cheio de dívida</option>
            <option value="cartao">O cartão sempre foge do controle</option>
            <option value="renda">Minha renda é apertada ou muda muito</option>
          </select>
        </div>

        <div class="field">
          <label>E O IMPULSO, COMO TÁ?</label>
          <select id="painCompulsive">
            <option value="baixo">Quase nunca compro no impulso</option>
            <option value="medio">Às vezes compro e depois bate arrependimento</option>
            <option value="alto">Eu compro no impulso direto</option>
          </select>
        </div>

        <div class="field">
          <label>TÁ COM DÍVIDA HOJE?</label>
          <select id="painDebt">
            <option value="nao">Não</option>
            <option value="sim-controlada">Sim, mas tá sob controle</option>
            <option value="sim-apertada">Sim, e tá pesando no mês</option>
            <option value="sim-atrasada">Sim, tô com conta atrasada</option>
          </select>
        </div>

        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Cancelar</button>
          <button class="primary" onclick="saveFinancialProfile()">Salvar meu jeito</button>
        </div>
      `;
    }

    if(type==='privacidade'){
      modalTitle.textContent='Segurança';
      modalBody.innerHTML=`
        <div class="profile-note">Aqui você pode atualizar sua senha de acesso ao TemRumo.</div>
        <div class="field">
          <label>SENHA ATUAL</label>
          <input id="currentPassword" type="password" placeholder="Digite sua senha atual">
        </div>
        <div class="field">
          <label>NOVA SENHA</label>
          <input id="newPassword" type="password" placeholder="Crie uma nova senha">
        </div>
        <div class="field">
          <label>CONFIRMAR NOVA SENHA</label>
          <input id="confirmNewPassword" type="password" placeholder="Repita a nova senha">
        </div>
        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Cancelar</button>
          <button class="primary" onclick="changePasswordConnected()">Trocar senha</button>
        </div>
      `;
    }

    if(type==='excluir'){
      modalTitle.textContent='Excluir minha conta';
      modalBody.innerHTML=`
        <div class="profile-note" style="background:#FFF4F4;color:#A84444">
          <strong style="display:block;margin-bottom:5px;color:#C63D3D">Tem certeza?</strong>
          Ao excluir sua conta, seus dados, carteiras e histórico serão removidos. Essa ação não pode ser desfeita.
        </div>
        <div class="field">
          <label>DIGITE EXCLUIR PARA CONFIRMAR</label>
          <input id="deleteConfirm" autocomplete="off" placeholder="EXCLUIR">
        </div>
        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Quero ficar</button>
          <button style="background:#D94C4C;color:white" onclick="deleteAccount()">Excluir conta</button>
        </div>
      `;
    }

    if(type==='bancos'){
      modalTitle.textContent='Meus bancos';
      modalBody.innerHTML=`
        <div style="font-size:8px;color:#7A8884;line-height:1.5;margin-bottom:12px">
          Toque nas logos dos bancos que você usa. Só os que você escolher vão aparecer no início.
        </div>
        ${bankManageGrid()}
        <div class="modal-actions">
          <button class="light" onclick="closeModal()">Cancelar</button>
          <button class="primary" onclick="saveUserBanks()">Salvar bancos</button>
        </div>
      `;
    }

    modalBackdrop.classList.add('show');
    setTimeout(()=>{ bindBankPicker(); bindBankManagePicker(); },0);
  }

  function closeModal(){modalBackdrop.classList.remove('show')}
  window.closeModal=closeModal;

  modalClose.addEventListener('click',closeModal);
  modalBackdrop.addEventListener('click',e=>{if(e.target===modalBackdrop) closeModal()});

  document.querySelectorAll('[data-modal]').forEach(btn=>{
    btn.addEventListener('click',()=>openModal(btn.dataset.modal));
  });

  window.saveEntry=async function(){
    const v=Number(document.getElementById('valueInput')?.value||0);
    if(v<=0){showToast('Informe um valor válido.');return}
    const description=document.getElementById('entryDescription')?.value.trim()||'Entrada';
    try{
      apiStatus('Salvando entrada...');
      const data=await api('saveMovement',{type:'entrada',value:v,description,bank:selectedBank()});
      applyDashboard(data); closeModal(); apiStatus('Entrada salva ✓');
      setTimeout(()=>showTransactionFeedback('income',v),120);
    }catch(err){apiStatus(err.message,true);showToast(err.message)}
  }

  window.saveExpense=async function(){
    const v=Number(document.getElementById('valueInput')?.value||0);
    if(v<=0){showToast('Informe um valor válido.');return}
    if(v>state.balance){showToast('Esse gasto é maior que seu saldo.');return}
    const category=document.getElementById('expenseCategory')?.value||'Outro';
    try{
      apiStatus('Salvando gasto...');
      const data=await api('saveMovement',{type:'saida',value:v,description:category,category});
      applyDashboard(data); closeModal(); apiStatus('Gasto salvo ✓');
      setTimeout(()=>showTransactionFeedback('expense',v),120);
    }catch(err){apiStatus(err.message,true);showToast(err.message)}
  }

  window.saveMoney=async function(){
    const v=Number(document.getElementById('saveValueInput')?.value||0);
    if(v<=0){showToast('Informe quanto você quer guardar.');return}
    if(v>state.free){showToast('Esse valor é maior que o dinheiro livre para gastar.');return}

    const select=document.getElementById('saveWalletSelect');
    const newName=document.getElementById('newSaveWallet')?.value.trim();
    let payload={value:v}; let walletName='';
    if(select){
      if(select.value===''){showToast('Escolha uma carteira.');return}
      const wallet=state.wallets[Number(select.value)];
      if(!wallet){showToast('Carteira não encontrada.');return}
      payload.walletId=wallet.id; walletName=wallet.name;
    }else if(document.getElementById('newSaveWallet')){
      if(!newName){showToast('Dê um nome para a nova carteira.');return}
      payload.newWalletName=newName; walletName=newName;
    }else{showToast('Escolha uma carteira existente ou crie uma nova.');return}

    try{
      apiStatus('Guardando...');
      const data=await api('saveMoney',payload);
      applyDashboard(data); closeModal(); apiStatus('Guardado ✓');
      setTimeout(()=>showTransactionFeedback('save',v,walletName),120);
    }catch(err){apiStatus(err.message,true);showToast(err.message)}
  }

  window.createWallet=async function(){
    const name=document.getElementById('walletName')?.value.trim();
    if(!name){showToast('Dê um nome para a carteira.');return}
    const goal=Number(document.getElementById('walletGoal')?.value||0);
    try{
      apiStatus('Criando carteira...');
      const data=await api('createWallet',{name,goal,bank:selectedBank()});
      applyDashboard(data); closeModal(); apiStatus('Carteira criada ✓');
      setTimeout(()=>showTransactionFeedback('wallet',0,name),120);
    }catch(err){apiStatus(err.message,true);showToast(err.message)}
  }

  window.saveDebt=async function(){
    const name=document.getElementById('debtName')?.value.trim();
    const total=Number(document.getElementById('debtTotal')?.value||0);
    const monthly=Number(document.getElementById('debtMonthly')?.value||0);
    if(!name||total<=0){showToast('Preencha a dívida e o valor total.');return}
    try{
      apiStatus('Salvando dívida...');
      const data=await api('saveDebt',{name,total,monthly});
      applyDashboard(data); closeModal(); apiStatus('Dívida registrada ✓');
      setTimeout(()=>showTransactionFeedback('debt',0),120);
    }catch(err){apiStatus(err.message,true);showToast(err.message)}
  }

  document.querySelectorAll('[data-challenge="20"]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(state.free<20){showToast('Seu dinheiro livre não comporta R$ 20 agora.');return}
      state.free-=20;
      render();
      btn.textContent='Concluído';
      setTimeout(()=>showTransactionFeedback('save',20,'Desafio do dia'),100);
    });
  });

  /* ASSESSOR */
  const chat=document.getElementById('chat');
  const advisorInput=document.getElementById('advisorInput');
  const advisorSend=document.getElementById('advisorSend');

  function addMessage(text,type='bot'){
    const div=document.createElement('div');
    div.className='msg '+type;
    div.innerHTML=text;
    chat.appendChild(div);
    chat.scrollTop=chat.scrollHeight;
  }

  function addOptions(options){
    const wrap=document.createElement('div');
    wrap.className='options';
    options.forEach(opt=>{
      const b=document.createElement('button');
      b.textContent=opt;
      b.addEventListener('click',()=>askAdvisor(opt));
      wrap.appendChild(b);
    });
    chat.appendChild(wrap);
    chat.scrollTop=chat.scrollHeight;
  }

  function typingOn(){
    const div=document.createElement('div');
    div.className='msg bot typing';
    div.id='typing';
    div.innerHTML='<span></span><span></span><span></span>';
    chat.appendChild(div);
    chat.scrollTop=chat.scrollHeight;
  }

  function typingOff(){
    document.getElementById('typing')?.remove();
  }

  function extractAmount(text){
    const t=text.toLowerCase().replace(/r\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');
    const m=t.match(/\d+(?:\.\d{1,2})?/);
    return m?Number(m[0]):null;
  }

  function advisorBrain(text){
    const q=text.toLowerCase();
    const amount=extractAmount(text);

    if(q.includes('quanto posso gastar') && !q.includes('fim de semana')){
      return {
        text:`Hoje você tem <strong>${money(state.free)}</strong> livres. Eu não gastaria tudo. Um valor confortável seria entre <strong>${money(state.free*.35)}</strong> e <strong>${money(state.free*.50)}</strong>.`,
        options:['E no fim de semana?','Posso gastar R$ 100?','Quanto devo guardar?']
      }
    }

    if(q.includes('fim de semana')){
      const safe=state.free*.45;
      return {
        text:`Para o fim de semana, eu colocaria um teto de <strong>${money(safe)}</strong>. Assim você ainda termina o período com <strong>${money(state.free-safe)}</strong> de margem.`,
        options:['E se eu gastar R$ 250?','Quero reduzir esse limite','Onde estou gastando mais?']
      }
    }

    if(q.includes('guardar') || q.includes('reserva')){
      const suggested=Math.min(80,state.free*.2);
      return {
        text:`Eu guardaria cerca de <strong>${money(suggested)}</strong> agora. É suficiente para manter o hábito sem deixar seu mês apertado.`,
        options:['Guardar R$ 20 agora','E se eu guardar R$ 100?','Quanto sobra depois?']
      }
    }

    if(q.includes('dívida') || q.includes('divida') || q.includes('moto')){
      return {
        text:`Se esse dinheiro competir com uma dívida atrasada, eu priorizaria a dívida. Gasto livre vem depois de proteger obrigações importantes.`,
        options:['Quanto posso separar para dívida?','Posso gastar R$ 50?','O que já está comprometido?']
      }
    }

    if(amount!==null){
      if(amount<=state.free*.35){
        return {
          text:`Dá pra fazer esse gasto de <strong>${money(amount)}</strong> sem bagunçar seu rumo. Depois dele, você ainda terá <strong>${money(state.free-amount)}</strong> livres.`,
          options:['Registrar esse gasto','E se eu gastar o dobro?','Quanto sobra para o fim de semana?']
        }
      }

      if(amount<=state.free){
        return {
          text:`Cabe, mas vai comer uma parte boa do seu dinheiro livre. Depois disso, você ficaria com <strong>${money(state.free-amount)}</strong>. Se for lazer, eu tentaria reduzir.`,
          options:['Qual valor seria melhor?','Mesmo assim quero gastar','Quanto sobra depois?']
        }
      }

      return {
        text:`Eu seguraria essa. Você até tem <strong>${money(state.balance)}</strong> no total, mas só <strong>${money(state.free)}</strong> estão realmente livres. O resto já tem rumo.`,
        options:['Qual meu limite hoje?','Como liberar mais dinheiro?','O que está comprometido?']
      }
    }

    return {
      text:`Me diz se você está pensando em <strong>gastar</strong>, <strong>guardar</strong>, <strong>pagar uma dívida</strong> ou quer saber <strong>quanto pode usar</strong>.`,
      options:['Quero gastar','Quero guardar','Quero pagar dívida','Quanto posso usar?']
    }
  }

  async function askAdvisor(text){
    if(state.advisorBusy || !text.trim()) return;
    state.advisorBusy=true;
    advisorInput.disabled=true;
    advisorSend.disabled=true;

    addMessage(text,'user');
    typingOn();

    const result=advisorBrain(text);
    const delay=900+Math.min(2200,result.text.replace(/<[^>]+>/g,'').length*11);
    await new Promise(r=>setTimeout(r,delay));

    typingOff();
    addMessage(result.text,'bot');

    await new Promise(r=>setTimeout(r,320));
    addOptions(result.options);

    state.advisorBusy=false;
    advisorInput.disabled=false;
    advisorSend.disabled=false;
    advisorInput.focus();
  }

  advisorSend.addEventListener('click',()=>{
    const t=advisorInput.value.trim();
    if(!t) return;
    advisorInput.value='';
    askAdvisor(t);
  });

  advisorInput.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      advisorSend.click();
    }
  });

  document.querySelectorAll('.options button').forEach(btn=>{
    btn.addEventListener('click',()=>askAdvisor(btn.textContent));
  });


  window.buildFirstPlan=function(){
    const income=Number(document.getElementById('planIncome')?.value||0);
    const stage=document.getElementById('lifeStage')?.value||'inicio';
    const host=document.getElementById('planResult');
    if(!host) return;

    if(income<=0){
      showToast('Coloca quanto entra pra você no mês.');
      return;
    }

    let parts, intro, tip;

    if(stage==='medio'){
      parts=[
        {name:'Guardar pro futuro',pct:35,icon:'fa-solid fa-piggy-bank',desc:'Reserva, estudo, curso ou primeiro objetivo'},
        {name:'Usar no mês',pct:40,icon:'fa-solid fa-basket-shopping',desc:'Lanche, transporte, lazer e pequenas coisas'},
        {name:'Objetivo grande',pct:20,icon:'fa-solid fa-bullseye',desc:'Celular, viagem, notebook ou outro plano'},
        {name:'Aprender / testar',pct:5,icon:'fa-solid fa-seedling',desc:'Livros, curso ou primeiros investimentos'}
      ];
      intro='Como você ainda está no ensino médio, a maior vantagem é o tempo. Se seus gastos fixos são baixos, dá pra criar o hábito de guardar cedo.';
      tip='Não precisa seguir esses percentuais como regra. A ideia é aprender uma coisa: antes de gastar, dê um destino para cada parte do dinheiro.';
    }else if(stage==='adulto'){
      parts=[
        {name:'Essenciais',pct:55,icon:'fa-solid fa-house',desc:'Moradia, alimentação, transporte e contas'},
        {name:'Reserva',pct:15,icon:'fa-solid fa-shield-heart',desc:'Proteção para imprevistos'},
        {name:'Objetivos',pct:15,icon:'fa-solid fa-bullseye',desc:'Planos de médio e longo prazo'},
        {name:'Livre',pct:15,icon:'fa-solid fa-face-smile',desc:'Lazer e escolhas sem culpa'}
      ];
      intro='Pra começar do zero, o primeiro passo não é investir em coisa complicada. É saber o que entra, o que é obrigação, o que precisa ser guardado e o que pode ser usado.';
      tip='Se suas contas essenciais já passam de 55%, não é fracasso. Use isso como diagnóstico e ajuste aos poucos.';
    }else{
      parts=[
        {name:'Essenciais',pct:45,icon:'fa-solid fa-house',desc:'Transporte, alimentação e responsabilidades'},
        {name:'Reserva',pct:20,icon:'fa-solid fa-shield-heart',desc:'Seu colchão para imprevistos'},
        {name:'Objetivos',pct:20,icon:'fa-solid fa-bullseye',desc:'Planos que você quer tirar do papel'},
        {name:'Livre',pct:15,icon:'fa-solid fa-face-smile',desc:'Rolê, compras e coisas que você curte'}
      ];
      intro='No começo da vida financeira, o mais importante é não deixar todo dinheiro virar gasto do mês. Separar antes ajuda você a crescer sem sentir que está “se proibindo” de viver.';
      tip='Recebeu dinheiro? Tenta dividir no mesmo dia. Quando você deixa tudo junto, fica muito mais fácil gastar sem perceber.';
    }

    host.innerHTML=`
      <div class="plan-intro">${intro}</div>
      ${parts.map(p=>`
        <div class="plan-slice">
          <i class="${p.icon}"></i>
          <div><strong>${p.name} • ${p.pct}%</strong><span>${p.desc}</span></div>
          <b>${money(income*(p.pct/100))}</b>
        </div>
      `).join('')}
      <div class="plan-tip"><i class="fa-solid fa-compass"></i> ${tip}</div>
    `;
    host.classList.add('show');
  }

  window.showLesson=function(kind){
    const lessons={
      saldo:{
        title:'Saldo não é dinheiro livre',
        text:'Se você tem R$ 500 na conta, mas R$ 300 já são para uma conta e R$ 100 para uma meta, seu dinheiro livre é R$ 100. O TemRumo existe justamente para mostrar essa diferença.'
      },
      reserva:{
        title:'Reserva vem antes do aperto',
        text:'Reserva é um dinheiro que você separa para imprevistos. Começar com R$ 5, R$ 10 ou R$ 20 já vale. O hábito vem antes do valor alto.'
      },
      cartao:{
        title:'Cartão não aumenta sua renda',
        text:'Limite do cartão é dinheiro emprestado. Comprar no crédito significa trazer um gasto do futuro para agora. Antes de parcelar, pense se as próximas parcelas cabem nos próximos meses.'
      },
      juros:{
        title:'Juros podem jogar dos dois lados',
        text:'Quando você deve, os juros podem fazer a dívida crescer. Quando você guarda ou investe, eles podem ajudar seu dinheiro a crescer. O segredo é evitar juros caros contra você e aprender a usar o tempo a seu favor.'
      }
    };
    window.pendingLesson=lessons[kind]||lessons.saldo;
    openModal('lesson');
  }

  window.answerQuiz=function(btn,correct){
    const box=btn.closest('.money-quiz');
    box.querySelectorAll('.quiz-options button').forEach(b=>{
      b.disabled=true;
      if(b!==btn) b.style.opacity='.65';
    });
    btn.classList.add(correct?'correct':'wrong');
    const fb=document.getElementById('quizFeedback');
    if(fb){
      fb.innerHTML=correct
        ? '<strong style="color:#29AB87">Acertou.</strong> R$ 350 já têm destino, então só R$ 150 estão realmente livres.'
        : '<strong style="color:#D05C5C">Quase.</strong> O saldo total é R$ 500, mas R$ 350 já têm destino. O livre de verdade é R$ 150.';
      fb.classList.add('show');
    }
  }

  window.saveFinancialProfile=async function(){
    const fp={...(state.financialProfile||{})};
    fp.spend=document.getElementById('painSpend')?.value||fp.spend||'geral';
    fp.mainPain=document.getElementById('painMain')?.value||fp.mainPain||'planejamento';
    fp.compulsive=document.getElementById('painCompulsive')?.value||fp.compulsive||'medio';
    fp.debt=document.getElementById('painDebt')?.value||fp.debt||'nao';
    try{
      apiStatus('Salvando seu perfil...');
      const data=await api('updateFinancialProfile',fp);
      applyDashboard(data); closeModal(); apiStatus('Perfil sincronizado ✓');
      showToast('Fechou 😎 Agora o TemRumo vai jogar no seu time.');
    }catch(err){apiStatus(err.message,true);showToast(err.message)}
  }

  window.deleteAccount=async function(){
    const v=(document.getElementById('deleteConfirm')?.value||'').trim().toUpperCase();
    if(v!=='EXCLUIR'){showToast('Digite EXCLUIR para confirmar.');return}
    try{
      apiStatus('Excluindo conta...');
      await api('deleteAccount');
      clearSessionCache();
      closeModal();
      setTimeout(()=>showTransactionFeedback('delete',0),120);
      setTimeout(()=>location.reload(),1700);
    }catch(err){apiStatus(err.message,true);showToast(err.message)}
  }

  render();

// V9: guardar em carteira, desafios contextuais e feedback de transação
(function(){
  function moneyBR(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  window.showTransactionFeedback=function(kind,amount,label){
    const wrap=document.getElementById('fullFeedback'); if(!wrap) return;
    const loading=document.getElementById('feedbackLoading');
    const success=document.getElementById('feedbackSuccess');
    const title=document.getElementById('feedbackTitle');
    const text=document.getElementById('feedbackText');
    const icon=document.getElementById('feedbackIcon');
    const loadingTitle=document.getElementById('feedbackLoadingTitle');
    const loadingText=document.getElementById('feedbackLoadingText');

    const loadingCopy={
      save:['Guardando seu dinheiro...','Organizando esse valor no seu rumo.'],
      income:['Registrando sua entrada...','Atualizando seu dinheiro disponível.'],
      expense:['Registrando sua saída...','Recalculando seu rumo financeiro.'],
      wallet:['Criando sua carteira...','Preparando um novo destino para seu dinheiro.'],
      debt:['Organizando essa conta...','Deixando seus compromissos no lugar.'],
      delete:['Excluindo sua conta...','Removendo seus dados do TemRumo.']
    }[kind] || ['Processando...','Só um instante.'];

    loadingTitle.textContent=loadingCopy[0];
    loadingText.textContent=loadingCopy[1];

    wrap.classList.add('show');
    loading.style.display='grid';
    success.style.display='none';

    setTimeout(()=>{
      loading.style.display='none';
      success.style.display='block';

      let msg='', ttl='Tudo certo!', cls='fa-solid fa-check';

      if(kind==='save'){
        ttl='Aí sim! '+moneyBR(amount)+' ganharam rumo!';
        msg=(label ? 'Foi direto pra “'+label+'”. ' : '')+'Seu próximo objetivo agradece.';
        cls='fa-solid fa-piggy-bank';
      }else if(kind==='income'){
        ttl='Você adicionou '+moneyBR(amount)+' no rumo!';
        msg='Entrada registrada. Seu saldo já foi atualizado.';
        cls='fa-solid fa-arrow-trend-up';
      }else if(kind==='expense'){
        ttl='Saída registrada';
        msg=moneyBR(amount)+' saiu do seu saldo e o TemRumo recalculou o que continua livre.';
        cls='fa-solid fa-receipt';
      }else if(kind==='wallet'){
        ttl='Carteira criada!';
        msg=(label||'Sua nova carteira')+' já está pronta para receber dinheiro.';
        cls='fa-solid fa-wallet';
      }else if(kind==='debt'){
        ttl='Boa, isso ficou organizado!';
        msg='A dívida entrou no seu planejamento. Menos surpresa, mais controle.';
        cls='fa-solid fa-file-invoice-dollar';
      }else if(kind==='delete'){
        ttl='Conta excluída';
        msg='Seus dados foram removidos desta simulação do TemRumo.';
        cls='fa-solid fa-user-xmark';
      }

      title.textContent=ttl;
      text.textContent=msg;
      icon.className=cls;
    },1000);
  };

  window.closeTransactionFeedback=function(){
    document.getElementById('fullFeedback')?.classList.remove('show');
  };

  function getContextChallenges(){
    const now=new Date();
    const h=now.getHours(), d=now.getDay();
    const weekend=d===5||d===6||d===0;
    const fp=state.financialProfile||{};
    const arr=[];

    if(weekend){
      arr.push({
        icon:'fa-solid fa-martini-glass-citrus',
        t:'Rolê com limite antes de sair',
        d:'Antes de sair, define quanto você aceita gastar hoje e tenta não passar disso.',
        meta:'Fim de semana • comportamento',
        saving:30
      });
    }

    if(h>=18 || h<2){
      arr.push({
        icon:'fa-solid fa-moon',
        t:'20 minutos antes do “comprar”',
        d:'Bateu vontade de pedir delivery ou comprar algo? Espera 20 minutos antes de decidir.',
        meta:'Noite • impulso',
        saving:20
      });
    }else if(h>=11&&h<15){
      arr.push({
        icon:'fa-solid fa-utensils',
        t:'Almoço sem automático',
        d:'Hoje, compara pelo menos duas opções antes de escolher. A missão é decidir, não repetir o hábito.',
        meta:'Horário de almoço',
        saving:12
      });
    }else{
      arr.push({
        icon:'fa-solid fa-eye',
        t:'1 gasto consciente',
        d:'Em uma compra de hoje, para alguns segundos e pergunta: eu quero ou só estou no automático?',
        meta:'Pra agora',
        saving:15
      });
    }

    if(fp.compulsive==='alto' || fp.mainPain==='impulso'){
      arr.push({
        icon:'fa-solid fa-hand',
        t:'Compra em espera',
        d:'Escolhe uma vontade de compra e deixa para amanhã. Se ainda fizer sentido, você decide depois.',
        meta:'Baseado na sua impulsividade',
        saving:40
      });
    }

    if(fp.debt && fp.debt!=='nao'){
      arr.push({
        icon:'fa-solid fa-file-invoice-dollar',
        t:'Sem nova parcela hoje',
        d:'Por hoje, não cria uma nova parcela. Primeiro olha o que já está comprometido.',
        meta:'Baseado nas suas dívidas',
        saving:25
      });
    }

    if(fp.spend==='delivery'){
      arr.push({
        icon:'fa-solid fa-burger',
        t:'1 delivery a menos',
        d:'Se der, troca um delivery por algo que já tem em casa. A ideia é quebrar o automático.',
        meta:'Baseado no seu maior gasto',
        saving:20
      });
    }else if(fp.spend==='compras'){
      arr.push({
        icon:'fa-solid fa-cart-shopping',
        t:'Carrinho dormindo',
        d:'Coloca no carrinho, mas não finaliza hoje. Amanhã você vê se ainda quer de verdade.',
        meta:'Baseado no seu maior gasto',
        saving:35
      });
    }else if(fp.spend==='role'){
      arr.push({
        icon:'fa-solid fa-people-group',
        t:'Rolê sem acompanhar os outros',
        d:'Hoje você não precisa gastar no ritmo dos amigos. Escolhe seu limite e fica nele.',
        meta:'Baseado no seu maior gasto',
        saving:30
      });
    }else if(fp.spend==='games'){
      arr.push({
        icon:'fa-solid fa-gamepad',
        t:'Sem compra dentro do game',
        d:'Hoje joga sem gastar dentro do app. Amanhã você decide se ainda vale a pena.',
        meta:'Baseado no seu maior gasto',
        saving:25
      });
    }

    arr.push({
      icon:'fa-solid fa-receipt',
      t:'Registra o que rolou',
      d:'No fim do dia, registra pelo menos um gasto que você normalmente esqueceria.',
      meta:'Consciência financeira',
      saving:10
    });

    return arr.slice(0,4);
  }






  window.renderMeDashboard=function(){
    const free=Number(state.free||0);
    const balance=Number(state.balance||0);
    const walletsTotal=(state.wallets||[]).reduce((s,w)=>s+Number(w.amount||0),0);
    const missions=Number(state.missionsCompleted||0);
    const missionSavings=Number(state.missionSavings||0);

    document.getElementById('meFree')?.replaceChildren(document.createTextNode(money(free)));
    document.getElementById('meSaved')?.replaceChildren(document.createTextNode(money(walletsTotal)));
    document.getElementById('meMissions')?.replaceChildren(document.createTextNode(String(missions)));
    document.getElementById('progressWallets')?.replaceChildren(document.createTextNode(String((state.wallets||[]).length)));
    document.getElementById('progressMissions')?.replaceChildren(document.createTextNode(String(missions)));
    document.getElementById('progressSaved')?.replaceChildren(document.createTextNode(money(missionSavings)));

    const total=Math.max(1,balance+walletsTotal);
    const freePct=Math.max(0,Math.min(100,(free/total)*100));
    const walletPct=Math.max(0,Math.min(100,(walletsTotal/total)*100));
    const committedPct=Math.max(0,100-freePct-walletPct);

    const setBar=(id,labelId,pct)=>{
      const el=document.getElementById(id);
      const lb=document.getElementById(labelId);
      if(el) el.style.width=pct.toFixed(0)+'%';
      if(lb) lb.textContent=pct.toFixed(0)+'%';
    };
    setBar('barFree','barFreeLabel',freePct);
    setBar('barWallets','barWalletsLabel',walletPct);
    setBar('barCommitted','barCommittedLabel',committedPct);

    const fp=state.financialProfile||{};
    let score=52;
    score += Math.min(18,(state.wallets||[]).length*7);
    score += Math.min(15,missions*3);
    if(free>0) score+=8;
    if(fp.debt==='nao') score+=7;
    if(fp.compulsive==='alto') score-=10;
    if(fp.debt==='sim-atrasada') score-=15;
    score=Math.max(18,Math.min(96,Math.round(score)));

    const ring=document.getElementById('scoreRing');
    const scoreValue=document.getElementById('scoreValue');
    if(scoreValue) scoreValue.textContent=score;
    if(ring) ring.style.background=`conic-gradient(var(--primary) 0 ${score}%, #E8EFED ${score}% 100%)`;

    const status=document.getElementById('scoreStatus');
    if(status){
      status.textContent=
        score>=80
          ? 'Você está criando uma relação mais consciente com dinheiro. O próximo passo é manter a constância.'
          : score>=60
          ? 'Você está evoluindo. Ainda tem pontos de atenção, mas já existe mais organização do que antes.'
          : 'Seu momento pede mais atenção. O foco agora é ganhar controle antes de assumir novos gastos.';
    }

    const insight=document.getElementById('meInsight');
    if(insight){
      let text='Continue olhando o dinheiro livre antes de gastar e use as missões para reduzir compras no automático.';
      if(fp.mainPain==='dividas' || (fp.debt||'').startsWith('sim')){
        text='Seu foco principal deve ser evitar novas parcelas e entender exatamente quanto do mês já está comprometido.';
      }else if(fp.mainPain==='guardar'){
        text='Seu maior ganho agora vem de consistência: mantenha suas carteiras visíveis e evite tirar dinheiro delas por impulso.';
      }else if(fp.mainPain==='cartao'){
        text='Olhe sempre a fatura total, não só as parcelas. O cartão pode esconder quanto do próximo mês já foi gasto.';
      }else if(fp.mainPain==='planejamento'){
        text='Registre entradas e saídas com frequência. Quanto mais real for o histórico, melhor o TemRumo entende seu padrão.';
      }else if(fp.mainPain==='impulso'){
        text='Seu ponto principal é o impulso. Use a regra da espera e o “Posso gastar?” antes de compras não planejadas.';
      }
      insight.innerHTML=`<strong>Pra focar agora</strong>${text}`;
    }
  }

  window.showMissionFeedback=function(title,saving){
    const wrap=document.getElementById('fullFeedback'); if(!wrap) return;
    const loading=document.getElementById('feedbackLoading');
    const success=document.getElementById('feedbackSuccess');
    const ttl=document.getElementById('feedbackTitle');
    const text=document.getElementById('feedbackText');
    const icon=document.getElementById('feedbackIcon');
    const loadingTitle=document.getElementById('feedbackLoadingTitle');
    const loadingText=document.getElementById('feedbackLoadingText');

    loadingTitle.textContent='Boa, segura aí...';
    loadingText.textContent='Marcando mais uma missão feita.';
    wrap.classList.add('show');
    loading.style.display='grid';
    success.style.display='none';

    setTimeout(()=>{
      loading.style.display='none';
      success.style.display='block';
      icon.className='fa-solid fa-trophy';
      ttl.textContent='Aí sim! Missão feita 🔥';
      text.textContent=`“${title}” feita. Com essa escolha, você pode ter economizado até ${moneyBR(saving)}. É uma estimativa, beleza? A gente não mexeu em nenhum dinheiro seu.`;
    },850);
  }


  window.renderContextChallenges=function(force=false){
    const host=document.querySelector('#page-home .challenge-row');
    if(!host) return;
    if(!force && host.dataset.personalized==='1') return;

    host.dataset.personalized='1';
    host.innerHTML=getContextChallenges().map((c,i)=>`
      <div class="challenge">
        <span class="context-badge"><i class="fa-regular fa-clock"></i> Pra agora</span>
        <i class="${c.icon}"></i>
        <strong>${c.t}</strong>
        <span>${c.d}</span>
        <div class="challenge-meta"><i class="fa-solid fa-wand-magic-sparkles"></i>${c.meta}</div>
        <div class="challenge-reward"><i class="fa-solid fa-coins"></i> Dá pra economizar até ${moneyBR(c.saving)}</div>
        <button data-smart-mission="${i}" data-saving="${c.saving}" data-mission-title="${c.t}">Fechar missão</button>
      </div>
    `).join('');

    host.querySelectorAll('[data-smart-mission]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(btn.dataset.done==='1') return;
        btn.dataset.done='1';
        btn.disabled=true;
        btn.textContent='Feita ✅';

        const saving=Number(btn.dataset.saving||0);
        const title=btn.dataset.missionTitle||'Missão';
        state.missionsCompleted=(state.missionsCompleted||0)+1;
        state.missionSavings=(state.missionSavings||0)+saving;
        renderMeDashboard();
        showMissionFeedback(title,saving);
      });
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{renderContextChallenges(true);renderMeDashboard();});
})();

  /* V15 — POSSO GASTAR? */
  window.sendQuickAdvisor=function(text){
    const input=document.getElementById('advisorInput');
    if(input) input.value=text;
    sendAdvisorMessage();
  }

  function advisorMoneyFromText(text){
    if(!text) return null;
    const m=text.match(/(?:r\$\s*)?(\d{1,6}(?:[.,]\d{1,2})?)/i);
    if(!m) return null;
    return Number(m[1].replace('.','').replace(',','.'));
  }

  function advisorEducationResponse(text){
    const amount=advisorMoneyFromText(text);
    const free=Math.max(0,Number(state.free||0));
    const fp=state.financialProfile||{};
    const lower=(text||'').toLowerCase();

    let intro='';
    let lesson='';
    let action='';

    if(amount!==null){
      const ratio=free>0 ? amount/free : 999;

      if(amount>free){
        intro=`Eu seguraria essa agora 😬 Esse gasto é de ${money(amount)} e você tem ${money(free)} realmente livres.`;
        lesson='Quando o gasto passa do que tá livre, ele começa a roubar espaço de conta, meta ou dinheiro que já tinha destino.';
        action='Melhor jogada: baixar o valor, deixar pra depois ou juntar primeiro.';
      }else if(ratio>=0.50){
        intro=`Até cabe, mas pesa bastante: ${money(amount)} consumiria cerca de ${Math.round(ratio*100)}% do que você pode usar hoje.`;
        lesson='Tem gasto que cabe e mesmo assim bagunça tudo. O que importa é quanto ele come da sua grana livre, não só o saldo da conta.';
        action='Se não for algo importante agora, eu daria uma segurada e pensaria no que esse dinheiro poderia fazer por você depois.';
      }else if(ratio>=0.25){
        intro=`Dá pra fazer, mas sem desligar o cérebro 😅. ${money(amount)} usa cerca de ${Math.round(ratio*100)}% do seu dinheiro livre.`;
        lesson='O perigo é ir fazendo vários gastos “nem tão grandes” e no fim do mês não saber onde a grana foi parar.';
        action='Se for gastar, beleza — só faz sabendo que esse valor saiu do seu limite livre.';
      }else{
        intro=`Esse gasto parece bem mais tranquilo pro seu momento. ${money(amount)} representa cerca de ${Math.max(1,Math.round(ratio*100))}% do seu dinheiro livre.`;
        lesson='Mesmo cabendo, vale aquele check: eu quero mesmo ou só bateu vontade agora?';
        action='Se você quer de verdade e não vai mexer numa meta, dá pra considerar de boa.';
      }
    }else{
      intro='Me passa mais ou menos o valor que eu consigo te responder melhor.';
      lesson='Pra decidir bem, precisa transformar a vontade em número: quanto custa, de onde sai e o que você deixa de fazer com essa grana.';
      action='Manda tipo: “posso gastar R$ 60 nisso?”';
    }

    if(fp.compulsive==='alto' || fp.mainPain==='impulso'){
      action += ' Como você já contou que compra no impulso às vezes, segura 20 minutinhos antes de confirmar.';
    }

    if(fp.debt && fp.debt!=='nao'){
      action += ' Como você já tem dívida no perfil, nova parcela merece atenção dobrada.';
    }

    if(lower.includes('parcel')){
      lesson += ' Parcelar não deixa mais barato. Só joga parte do gasto pros próximos meses e prende um pedaço da sua grana futura.';
    }

    return {
      intro,
      lesson,
      action
    };
  }

  function addAdvisorBubble(role,htmlText){
    const chat=document.getElementById('advisorChat');
    if(!chat) return;

    const row=document.createElement('div');
    row.className='message-row '+role;

    if(role==='assistant'){
      row.innerHTML=`
        <div class="message-avatar"><i class="fa-solid fa-compass"></i></div>
        <div class="bubble assistant-bubble">
          <div class="bubble-text">${htmlText}</div>
          <div class="bubble-meta">Rumo • agora</div>
        </div>
      `;
    }else{
      row.innerHTML=`
        <div class="bubble user-bubble">
          <div class="bubble-text"></div>
          <div class="bubble-meta">Você • agora <i class="fa-solid fa-check-double"></i></div>
        </div>
      `;
      row.querySelector('.bubble-text').textContent=htmlText;
    }

    const typing=document.getElementById('advisorTyping');
    chat.insertBefore(row,typing||null);
    chat.scrollTop=chat.scrollHeight;
  }

  window.sendAdvisorMessage=function(){
    const input=document.getElementById('advisorInput');
    const typing=document.getElementById('advisorTyping');
    const chat=document.getElementById('advisorChat');
    if(!input||!chat) return;

    const text=input.value.trim();
    if(!text) return;

    addAdvisorBubble('user',text);
    input.value='';
    input.style.height='auto';

    if(typing){
      typing.style.display='flex';
      chat.scrollTop=chat.scrollHeight;
    }

    const r=advisorEducationResponse(text);

    setTimeout(()=>{
      if(typing) typing.style.display='none';

      addAdvisorBubble(
        'assistant',
        `<strong>${r.intro}</strong><br><br>${r.lesson}<br><br><strong>Minha visão:</strong> ${r.action}`
      );

      const suggestions=document.getElementById('advisorSuggestions');
      if(suggestions) suggestions.style.display='none';
    },900);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const input=document.getElementById('advisorInput');
    const send=document.getElementById('advisorSend');

    if(send && !send.dataset.boundV15){
      send.dataset.boundV15='1';
      send.addEventListener('click',sendAdvisorMessage);
    }

    if(input && !input.dataset.boundV15){
      input.dataset.boundV15='1';
      input.addEventListener('input',()=>{
        input.style.height='auto';
        input.style.height=Math.min(input.scrollHeight,110)+'px';
      });
      input.addEventListener('keydown',(e)=>{
        if(e.key==='Enter' && !e.shiftKey){
          e.preventDefault();
          sendAdvisorMessage();
        }
      });
    }
  });



  /* V19 — AUTH + ONBOARDING */
  window.showAuthView=function(view){
    const map={
      login:'authLogin',
      signup:'authSignup',
      forgot:'authForgot',
      onboarding:'authOnboarding'
    };
    Object.values(map).forEach(id=>document.getElementById(id)?.classList.remove('active'));
    document.getElementById(map[view]||map.login)?.classList.add('active');

    const forgotForm=document.getElementById('forgotFormWrap');
    const forgotSuccess=document.getElementById('forgotSuccess');
    if(view==='forgot'){
      if(forgotForm) forgotForm.style.display='block';
      if(forgotSuccess) forgotSuccess.classList.remove('show');
    }
  }

  window.toggleAuthPassword=function(id,btn){
    const input=document.getElementById(id);
    if(!input) return;
    const show=input.type==='password';
    input.type=show?'text':'password';
    const icon=btn?.querySelector('i');
    if(icon) icon.className=show?'fa-regular fa-eye-slash':'fa-regular fa-eye';
  }


  window.showLoginLoading=function(title='Entrando...',text='Puxando sua vida financeira rapidinho.'){
    const el=document.getElementById('loginLoading');
    if(!el) return;
    document.getElementById('loginLoadingTitle').textContent=title;
    document.getElementById('loginLoadingText').textContent=text;
    el.classList.add('show');
    el.setAttribute('aria-hidden','false');
  }

  window.hideLoginLoading=function(){
    const el=document.getElementById('loginLoading');
    if(!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden','true');
  }


  window.enterApp=function(){
    const screen=document.getElementById('authScreen');
    if(screen) screen.classList.add('hidden');
    document.body.style.overflow='';
  }

  window.doLogin=async function(e){
    e.preventDefault();
    const email=document.getElementById('loginEmail')?.value.trim();
    const pass=document.getElementById('loginPassword')?.value.trim();
    if(!email||!pass) return;
    showLoginLoading('Entrando...','Puxando sua vida financeira rapidinho.');
    try{
      apiStatus('Entrando...');
      const result=await api('login',{email,password:pass},false);
      saveSessionCache(result.token,result.dashboard);
      applyDashboard(result.dashboard);
      setTimeout(()=>{
        enterApp();
        hideLoginLoading();
        apiStatus('Conectado ✓');
        showToast('Aí sim, você entrou 😎');
      },450);
    }catch(err){
      hideLoginLoading();
      apiStatus(err.message,true);
      showToast(err.message);
    }
  }

  window.doSignup=function(e){
    e.preventDefault();
    const name=document.getElementById('signupName')?.value.trim();
    const email=document.getElementById('signupEmail')?.value.trim();
    const pass=document.getElementById('signupPassword')?.value.trim();
    if(!name||!email||!pass) return;

    window.pendingNewUser={
      name,
      email,
      firstName:name.split(/\s+/)[0],
      password:pass
    };

    showAuthView('onboarding');
    resetFinancialOnboarding();
  }


  let onboardingStep=1;
  const onboardingAnswers={
    spend:null,
    mainPain:null,
    compulsive:null,
    debt:null
  };

  window.resetFinancialOnboarding=function(){
    onboardingStep=1;
    Object.keys(onboardingAnswers).forEach(k=>onboardingAnswers[k]=null);
    document.querySelectorAll('.onboard-options button').forEach(btn=>btn.classList.remove('selected'));
    updateOnboardingUI();
  }

  window.updateOnboardingUI=function(){
    document.querySelectorAll('.onboard-step').forEach(step=>{
      step.classList.toggle('active',Number(step.dataset.onboardStep)===onboardingStep);
    });
    const fill=document.getElementById('onboardProgressFill');
    const text=document.getElementById('onboardProgressText');
    if(fill) fill.style.width=(onboardingStep*25)+'%';
    if(text) text.textContent=`${onboardingStep} de 4`;
  }

  window.nextOnboardingStep=function(){
    const fields=['spend','mainPain','compulsive','debt'];
    const currentField=fields[onboardingStep-1];
    if(!onboardingAnswers[currentField]){
      showToast('Escolhe uma opção pra continuar 👀');
      return;
    }
    if(onboardingStep<4){
      onboardingStep++;
      updateOnboardingUI();
    }
  }

  window.prevOnboardingStep=function(){
    if(onboardingStep>1){
      onboardingStep--;
      updateOnboardingUI();
    }else{
      showAuthView('signup');
    }
  }

  window.finishFinancialOnboarding=async function(e){
    e.preventDefault();
    if(!onboardingAnswers.debt){showToast('Só falta responder essa última 😅');return}
    const pending=window.pendingNewUser||{};
    if(!pending.name||!pending.email||!pending.password){showAuthView('signup');showToast('Preenche seus dados de cadastro de novo.');return}

    const profile={
      spend:onboardingAnswers.spend,
      mainPain:onboardingAnswers.mainPain,
      compulsive:onboardingAnswers.compulsive,
      debt:onboardingAnswers.debt
    };
    showLoginLoading('Criando seu TemRumo...','Montando tudo do seu jeito 👀');
    try{
      apiStatus('Criando seu TemRumo...');
      const result=await api('signup',{name:pending.name,email:pending.email,password:pending.password,financialProfile:profile},false);
      saveSessionCache(result.token,result.dashboard);
      window.pendingNewUser=null;
      applyDashboard(result.dashboard);
      setTimeout(()=>{
        enterApp();
        hideLoginLoading();
        apiStatus('Tudo pronto ✓');
        showToast('Pronto 😎 Agora o TemRumo já te conhece melhor.');
      },500);
    }catch(err){
      hideLoginLoading();
      apiStatus(err.message,true);
      showToast(err.message);
    }
  }

  document.addEventListener('click',(e)=>{
    const btn=e.target.closest('.onboard-options button[data-value]');
    if(!btn) return;

    const group=btn.closest('.onboard-options');
    const field=group?.dataset.field;
    if(!field) return;

    group.querySelectorAll('button').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    onboardingAnswers[field]=btn.dataset.value;
  });


  window.doForgot=async function(e){
    e.preventDefault();
    const email=document.getElementById('forgotEmail')?.value.trim();
    if(!email) return;
    try{
      apiStatus('Enviando código...');
      await api('forgotPassword',{email},false);
      const wrap=document.getElementById('forgotFormWrap');
      const success=document.getElementById('forgotSuccess');
      if(wrap) wrap.style.display='none';
      if(success){
        success.classList.add('show');
        const span=success.querySelector('span');
        if(span) span.textContent='Se esse e-mail estiver cadastrado, você vai receber um código de recuperação. Ele vale por 15 minutos.';
      }
      apiStatus('E-mail enviado ✓');
    }catch(err){apiStatus(err.message,true);showToast(err.message)}
  }

  window.socialAuth=function(provider){
    enterApp();
    showToast(`Entrou com ${provider} ✨`);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const auth=document.getElementById('authScreen');
    if(auth){
      document.body.style.overflow='hidden';
    }
  });


  window.changePasswordConnected=async function(){
    const currentPassword=document.getElementById('currentPassword')?.value||'';
    const newPassword=document.getElementById('newPassword')?.value||'';
    const confirm=document.getElementById('confirmNewPassword')?.value||'';
    if(!currentPassword||newPassword.length<6){showToast('Preencha a senha atual e uma nova senha com 6+ caracteres.');return}
    if(newPassword!==confirm){showToast('As novas senhas não conferem.');return}
    try{
      apiStatus('Atualizando senha...');
      await api('changePassword',{currentPassword,newPassword});
      closeModal(); apiStatus('Senha atualizada ✓'); showToast('Senha atualizada!');
    }catch(err){apiStatus(err.message,true);showToast(err.message)}
  }

  async function restoreSession(){
    const token=localStorage.getItem(TOKEN_KEY);
    if(!token) return;

    // Abre imediatamente com o último dashboard salvo.
    // Assim o usuário não vê a tela de login toda vez que volta ao app.
    const cached=readDashboardCache();
    if(cached){
      try{
        applyDashboard(cached);
        enterApp();
      }catch(_){}
    }

    // Depois valida/atualiza silenciosamente com o Sheets.
    if(!apiConfigured()) return;
    try{
      const data=await api('getDashboard',{},true);
      applyDashboard(data);
      saveSessionCache(token,data);
      enterApp();
    }catch(_){
      clearSessionCache();
      const auth=document.getElementById('authScreen');
      if(auth) auth.classList.remove('hidden');
      document.body.style.overflow='hidden';
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{restoreSession()});
