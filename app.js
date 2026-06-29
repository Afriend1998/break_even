/* ── SUPABASE ── */
    const SB_URL = 'https://ysdpmvrvkhvjnkuxznec.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZHBtdnJ2a2h2am5rdXh6bmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjUwNjQsImV4cCI6MjA5NzQ0MTA2NH0.OfpmMItFa2DfnZYAuC-Ci2G7go4QxufH1VHzevjfiO8';
    const sb = supabase.createClient(SB_URL, SB_KEY);

    /* ── NAVIGATION ── */
    const screens = {
      intro:      document.getElementById('screen-intro'),
      auth:       document.getElementById('screen-auth'),
      dashboard:  document.getElementById('screen-dashboard'),
      portfolio:  document.getElementById('screen-portfolio'),
      brokers:    document.getElementById('screen-brokers'),
      fire:       document.getElementById('screen-fire'),
      impuestos:  document.getElementById('screen-impuestos'),
      libros:     document.getElementById('screen-libros'),
      about:      document.getElementById('screen-about'),
      assets:     document.getElementById('screen-assets'),
      reset:      document.getElementById('screen-reset'),
      comunidad:        null,
      'portfolio-mauro': document.getElementById('screen-portfolio-mauro'),
      'my-portfolio':    document.getElementById('screen-my-portfolio'),
      blog:              document.getElementById('screen-blog'),
    };
    function goTo(target) {
      Object.keys(screens).forEach(key => {
        const el = screens[key];
        if (!el) return;
        if (key === target) {
          el.classList.remove('hidden', 'out');
        } else if (!el.classList.contains('hidden')) {
          el.classList.add('out');
          setTimeout(() => el.classList.add('hidden'), 500);
        }
      });
    }

    /* ── DETECTAR RECOVERY TOKEN EN LA URL AL CARGAR ── */
    (async () => {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.includes('type=signup')) {
        // Supabase ya procesó el token vía onAuthStateChange,
        // pero por si acaso forzamos la sesión manualmente
        const { data } = await sb.auth.getSession();
        if (data.session) {
          if (hash.includes('type=recovery')) {
            goTo('reset');
          } else {
            const { data: { user } } = await sb.auth.getUser();
            if (user) setupUI(user.email);
            goTo('dashboard');
          }
          // Limpiar el hash de la URL
          history.replaceState(null, '', window.location.pathname);
        }
      }
    })();

    /* ── CONTROL DE ACCESO — Admin vs Usuario normal ── */
    const ADMIN_EMAIL = 'miguelalonsoarnedo@gmail.com';
    let isAdmin = false;

    function updatePortTabBar() {
      const tab = document.getElementById('port-tab-assets');
      if (tab) tab.classList.toggle('visible', isAdmin);
    }

    function setupUI(email) {
      isAdmin = (email === ADMIN_EMAIL);

      // MI PORTFOLIO: visible solo para usuarios normales
      const myCard = document.getElementById('card-my-portfolio');
      if (myCard) myCard.style.display = isAdmin ? 'none' : '';

      // card-assets (importar/editar activos de Miguel) solo visible para admin
      const assetsCard = document.getElementById('card-assets');
      if (assetsCard) assetsCard.style.display = isAdmin ? '' : 'none';

      // Todo lo demás (Libros, Blog, Sobre mí) visible para todos — lectura pública
      updatePortTabBar();
    }

    /* ── AUTH FLOW ── */
    document.getElementById('btn-continue').addEventListener('click', async () => {
      const { data } = await sb.auth.getSession();
      if (data.session) {
        const { data: { user } } = await sb.auth.getUser();
        if (user) setupUI(user.email);
        goTo('dashboard');
      } else goTo('auth');
    });

    let authMode = 'login';
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        authMode = tab.dataset.auth;
        document.getElementById('auth-submit-label').textContent = authMode === 'login' ? 'Entrar' : 'Crear cuenta';
        document.getElementById('auth-msg').innerHTML = '';
      });
    });

    function showAuthMsg(msg, ok) {
      document.getElementById('auth-msg').innerHTML = '<div class="auth-msg ' + (ok ? 'ok' : 'err') + '">' + msg + '</div>';
    }

    document.getElementById('btn-auth-submit').addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      if (!email || !password) { showAuthMsg('Rellena email y contraseña.', false); return; }

      if (authMode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { showAuthMsg(error.message, false); return; }
        setupUI(email);
        goTo('dashboard');
      } else {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) { showAuthMsg(error.message, false); return; }
        showAuthMsg('Cuenta creada. Si pide confirmación, revisa tu email. Si no, ya puedes entrar.', true);
        const { data } = await sb.auth.getSession();
        if (data.session) { setupUI(email); goTo('dashboard'); }
      }
    });

    document.getElementById('btn-google-login').addEventListener('click', async () => {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://afriend1998.github.io/break_even/' }
      });
      if (error) showAuthMsg(error.message, false);
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
      await sb.auth.signOut();
      goTo('intro');
    });

    /* ── RECUPERAR CONTRASEÑA ── */
    document.getElementById('btn-forgot-password').addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      if (!email) { showAuthMsg('Escribe tu email arriba primero y vuelve a pulsar.', false); return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://afriend1998.github.io/break_even/',
      });
      if (error) { showAuthMsg(error.message, false); return; }
      showAuthMsg('Te hemos enviado un email con un link para crear una contraseña nueva.', true);
    });

    function showResetMsg(msg, ok) {
      document.getElementById('reset-msg').innerHTML = '<div class="auth-msg ' + (ok ? 'ok' : 'err') + '">' + msg + '</div>';
    }

    document.getElementById('btn-reset-submit').addEventListener('click', async () => {
      const newPassword = document.getElementById('reset-password').value;
      if (!newPassword || newPassword.length < 6) { showResetMsg('Mínimo 6 caracteres.', false); return; }
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) { showResetMsg(error.message, false); return; }
      showResetMsg('Contraseña actualizada. Ya puedes entrar normal.', true);
      setTimeout(() => goTo('dashboard'), 1500);
    });

    // Supabase detecta el link de recuperación en la URL y dispara este evento
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        goTo('reset');
        history.replaceState(null, '', window.location.pathname);
      }
      if (event === 'SIGNED_IN' && session?.user) {
        setupUI(session.user.email);
        // Solo redirigir al dashboard si estamos en intro o auth
        const current = Object.keys(screens).find(k => screens[k] && !screens[k].classList.contains('hidden'));
        if (current === 'intro' || current === 'auth') goTo('dashboard');
      }
    });


    function on(id, fn) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    }

    on('card-portfolio',       () => { goTo('portfolio'); initAllocChart(); refreshPortfolio(); });
    on('card-portfolio-mauro', () => goTo('portfolio-mauro'));
    on('btn-back-mauro',       () => goTo('dashboard'));
    on('card-mauro-brokers',   () => goTo('brokers'));
    on('card-mauro-fire',      () => goTo('fire'));
    on('card-mauro-impuestos', () => goTo('impuestos'));

    on('btn-back', () => {
      goTo('dashboard');
      document.querySelectorAll('.port-tab').forEach(t => t.classList.remove('active'));
      const first = document.querySelector('.port-tab[data-screen="none"]');
      if (first) first.classList.add('active');
    });

    on('btn-back-brokers',       () => goTo('portfolio'));
    on('btn-back-fire',          () => goTo('portfolio'));
    on('btn-back-impuestos',     () => goTo('portfolio'));
    on('btn-back-libros',        () => goTo('portfolio'));
    on('btn-back-about',         () => goTo('portfolio'));
    on('btn-back-blog',          () => goTo('portfolio'));

    let assetsFrom = 'portfolio';
    on('btn-back-assets',        () => goTo(assetsFrom));
    on('card-my-portfolio',      () => goTo('my-portfolio'));
    on('btn-back-my-portfolio',  () => goTo('dashboard'));
    on('card-my-assets',         () => { assetsFrom = 'my-portfolio'; goTo('assets'); });

    /* ── FIRE CALCULATOR ── */
    function calcFIRE() {
      const gastos = +document.getElementById('fire-gastos').value;
      const actual = +document.getElementById('fire-actual').value;
      const ahorro = +document.getElementById('fire-ahorro').value;
      const rate   = +document.getElementById('fire-rate').value / 100;
      const r      = rate / 12;

      document.getElementById('fire-disp-gastos').textContent = fmtEur(gastos);
      document.getElementById('fire-disp-actual').textContent = fmtEur(actual);
      document.getElementById('fire-disp-ahorro').textContent = fmtEur(ahorro);
      document.getElementById('fire-disp-rate').textContent   = (+document.getElementById('fire-rate').value) + '%';

      const fireNum = gastos * 12 * 25;
      const pct     = Math.min((actual / fireNum) * 100, 100);

      let anos = 0;
      if (actual < fireNum) {
        let pat = actual;
        while (pat < fireNum && anos < 200) {
          pat = pat * (1 + r) + ahorro;
          anos++;
        }
        anos = (anos / 12).toFixed(1);
      } else {
        anos = '0';
      }

      document.getElementById('fire-r-numero').textContent = fmtEur(fireNum);
      document.getElementById('fire-r-anos').textContent   = anos === '0' ? '¡Ya!' : anos + ' años';
      document.getElementById('fire-r-pct').textContent    = pct.toFixed(1) + '%';
      document.getElementById('fire-r-bar').style.width    = pct + '%';
    }
    ['fire-gastos','fire-actual','fire-ahorro','fire-rate'].forEach(id =>
      document.getElementById(id).addEventListener('input', calcFIRE)
    );
    calcFIRE();

    /* ── TAX CALCULATOR (SPAIN) ── */
    function calcTax() {
      const buy  = +document.getElementById('tax-buy').value;
      const sell = +document.getElementById('tax-sell').value;

      document.getElementById('tax-disp-buy').textContent  = fmtEur(buy);
      document.getElementById('tax-disp-sell').textContent = fmtEur(sell);

      const gain = sell - buy;
      const brackets = [
        { limit: 6000,   rate: 0.19 },
        { limit: 50000,  rate: 0.21 },
        { limit: 200000, rate: 0.23 },
        { limit: Infinity, rate: 0.27 },
      ];

      let remaining = Math.max(gain, 0);
      let totalTax  = 0;
      const amounts = [];
      let prev = 0;

      brackets.forEach((b, i) => {
        const span     = b.limit - prev;
        const taxable  = Math.min(remaining, span);
        const taxAmt   = taxable * b.rate;
        totalTax      += taxAmt;
        remaining     -= taxable;
        amounts.push(taxAmt);
        prev = b.limit === Infinity ? prev : b.limit;
      });

      const maxAmt = Math.max(...amounts, 1);
      amounts.forEach((amt, i) => {
        const el = document.getElementById('tb-amt-' + i);
        const bar = document.getElementById('tb-bar-' + i);
        if (el)  el.textContent = amt > 0 ? fmtEur(amt) : '—';
        if (bar) bar.style.width = ((amt / maxAmt) * 100) + '%';
      });

      const grossEl = document.getElementById('tax-r-gross');
      const taxEl   = document.getElementById('tax-r-tax');
      const netEl   = document.getElementById('tax-r-net');

      if (gain <= 0) {
        grossEl.textContent = fmtEur(gain); grossEl.className = 'calc-res-val negative';
        taxEl.textContent   = '€0';         taxEl.className   = 'calc-res-val';
        netEl.textContent   = fmtEur(gain); netEl.className   = 'calc-res-val negative';
      } else {
        grossEl.textContent = fmtEur(gain);            grossEl.className = 'calc-res-val positive';
        taxEl.textContent   = '−' + fmtEur(totalTax);  taxEl.className   = 'calc-res-val negative';
        netEl.textContent   = fmtEur(gain - totalTax); netEl.className   = 'calc-res-val positive';
      }
    }
    ['tax-buy','tax-sell'].forEach(id =>
      document.getElementById(id).addEventListener('input', calcTax)
    );
    calcTax();

    /* ── EDITABLE METRICS ── */
    function fmtEur(n) {
      return '€' + Math.round(n).toLocaleString('es-ES');
    }

    function updatePnL() {
      const total    = parseFloat(localStorage.getItem('be_total') || '');
      const invested = parseFloat(localStorage.getItem('be_invested') || '');
      const elT = document.getElementById('mv-total');
      const elI = document.getElementById('mv-invested');
      const elP = document.getElementById('mv-pnl');

      if (elT) elT.textContent = isNaN(total)    ? '—' : fmtEur(total);
      if (elI) elI.textContent = isNaN(invested) ? '—' : fmtEur(invested);

      if (elP) {
        if (!isNaN(total) && !isNaN(invested)) {
          const diff = total - invested;
          const pct  = ((diff / invested) * 100).toFixed(1);
          elP.textContent = (diff >= 0 ? '+' : '') + fmtEur(diff) + ' (' + pct + '%)';
          elP.className   = 'metric-value ' + (diff >= 0 ? 'positive' : 'negative');
        } else {
          elP.textContent = '—';
          elP.className   = 'metric-value';
        }
      }
    }

    function makeEditable(cardId, valueId, storageKey, placeholder) {
      const card = document.getElementById(cardId);
      if (!card) return;
      card.addEventListener('click', () => {
        if (card.querySelector('.metric-input')) return;
        const current = localStorage.getItem(storageKey) || '';
        const input = document.createElement('input');
        input.type        = 'number';
        input.className   = 'metric-input';
        input.placeholder = placeholder;
        input.value       = current;
        input.min         = '0';
        const valEl = document.getElementById(valueId);
        valEl.replaceWith(input);
        input.focus(); input.select();

        function save() {
          const n = parseFloat(input.value);
          if (!isNaN(n) && n >= 0) localStorage.setItem(storageKey, n);
          else localStorage.removeItem(storageKey);
          const newVal = document.createElement('div');
          newVal.className = 'metric-value';
          newVal.id        = valueId;
          input.replaceWith(newVal);
          updatePnL();
        }
        input.addEventListener('blur', save);
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter')  { input.blur(); }
          if (e.key === 'Escape') { input.value = ''; input.blur(); }
        });
      });
    }

    updatePnL();

    /* ── MIS ACTIVOS (Supabase) ── */
    const BROKERS_LIST = [
      'Revolut', 'MyInvestor', 'Interactive Brokers', 'Bybit',
      'CoinDepo', 'Equito', 'IG', 'Sin clasificar'
    ];

    async function getUserId() {
      const { data } = await sb.auth.getUser();
      return data.user ? data.user.id : null;
    }

    const MIGUEL_USER_ID = 'dc904296-a124-4c1e-9ad9-97c40e3cf9fc';

    async function loadAssets() {
      const userId = await getUserId();
      if (!userId) return [];
      const { data, error } = await sb.from('assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) { console.error(error); return []; }
      return data || [];
    }

    async function loadMiguelAssets() {
      const { data, error } = await sb.from('assets')
        .select('*')
        .eq('user_id', MIGUEL_USER_ID)
        .order('created_at', { ascending: true });
      if (error) { console.error(error); return []; }
      return data || [];
    }

    async function saveSnapshot(total) {
      const userId = await getUserId();
      if (!userId) return;
      await sb.from('portfolio_snapshots').insert({ user_id: userId, total_value: total });
    }

    function populateBrokerSuggestions() {
      const dl = document.getElementById('broker-suggestions');
      dl.innerHTML = '';
      BROKERS_LIST.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        dl.appendChild(opt);
      });
    }

    async function renderAssets() {
      const container = document.getElementById('assets-container');
      const assets = await loadAssets();
      container.innerHTML = '';

      // ── Filtros activos ──
      const searchVal  = (document.getElementById('assets-search')?.value || '').trim().toUpperCase();
      const activeFilter = document.querySelector('.assets-filter-btn.active')?.dataset.filter || 'all';

      // ── Vista especial: Dividendos ──
      if (activeFilter === 'dividendo') {
        const divAssets = assets.filter(a => a.type === 'dividendo');
        if (divAssets.length === 0) {
          container.innerHTML = '<div class="assets-empty" style="padding:32px">No hay dividendos registrados. Importa un extracto de Revolut para añadirlos automáticamente.</div>';
          return;
        }
        // Agrupar por ticker
        const byTicker = {};
        divAssets.forEach(a => {
          const t = (a.ticker || '?').toUpperCase();
          if (!byTicker[t]) byTicker[t] = [];
          byTicker[t].push(a);
        });
        Object.keys(byTicker).filter(t => !searchVal || t.includes(searchVal)).sort().forEach(ticker => {
          const divs   = byTicker[ticker].sort((a,b) => (a.name||'').localeCompare(b.name||''));
          const total  = divs.reduce((s,a) => s + (parseFloat(a.value)||0), 0);
          const ccy    = divs[0]?.currency || 'USD';
          const group  = document.createElement('div');
          group.className = 'ticker-group expanded';
          group.innerHTML =
            '<div class="ticker-group-header" style="cursor:default">' +
              '<div class="ticker-left"><span class="ticker-symbol">' + ticker + '</span><span class="ticker-count">' + divs.length + ' pago' + (divs.length !== 1 ? 's' : '') + '</span></div>' +
              '<div class="ticker-right"><span style="color:#fac850;font-family:Space Grotesk,sans-serif;font-size:14px;font-weight:700">💰 ' + ccy + '$' + total.toFixed(2) + ' total</span></div>' +
            '</div>' +
            '<div class="ticker-body" style="display:block">' +
              divs.map(d => {
                const fecha = (d.name || '').replace('Dividendo ', '');
                return '<div style="display:flex;align-items:center;gap:14px;padding:10px 20px;border-bottom:1px solid var(--border);font-size:12px;">' +
                  '<span style="color:var(--muted);min-width:100px">' + fecha + '</span>' +
                  '<span style="color:#fac850;font-weight:700">DIVIDENDO</span>' +
                  '<span style="color:var(--accent);margin-left:auto;font-family:Space Grotesk,sans-serif;font-weight:700">' + ccy + '$' + (parseFloat(d.value)||0).toFixed(2) + '</span>' +
                  '<span style="color:var(--muted);font-size:10px">' + (d.broker||'') + '</span>' +
                '</div>';
              }).join('') +
            '</div>';
          container.appendChild(group);
        });
        return;
      }

      if (assets.length === 0) {
        const exampleWrap = document.createElement('div');
        exampleWrap.innerHTML =
          '<div class="example-banner">' +
            '<span>👁️ Esto es un <strong>ejemplo visual</strong> de cómo se verá. Importa un archivo o añade un activo para empezar.</span>' +
          '</div>' +
          '<div class="ticker-group example-group expanded">' +
            '<div class="ticker-group-header">' +
              '<div class="ticker-left"><span class="ticker-symbol">ASTS <span class="example-tag">ejemplo</span></span><span class="ticker-count">1 compra</span></div>' +
              '<div class="ticker-right"><span class="ticker-avg">Compra media: €120</span><span class="ticker-total">€120</span></div>' +
            '</div>' +
            '<div class="ticker-body">' +
              '<div class="asset-row">' +
                '<input value="ASTS" disabled class="asset-ticker-input">' +
                '<input value="AST SpaceMobile · cuenta Revolut" disabled class="asset-name-input">' +
                '<input value="RULE" disabled class="asset-broker-input">' +
                '<button class="type-toggle compra" disabled style="opacity:0.6">Compra</button>' +
                '<input value="120" disabled class="asset-value-input">' +
                '<button class="asset-delete" disabled style="opacity:0.3"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>' +
              '</div>' +
            '</div>' +
          '</div>';
        container.appendChild(exampleWrap);
        return;
      }

      // Agrupar por TICKER
      const grouped = {};
      assets.forEach(a => {
        const ticker = (a.ticker || 'SIN TICKER').toUpperCase();
        if (!grouped[ticker]) grouped[ticker] = [];
        grouped[ticker].push(a);
      });

      Object.keys(grouped).sort().filter(ticker => !searchVal || ticker.includes(searchVal)).forEach(ticker => {
        const items = grouped[ticker];
        const buys      = items.filter(a => (a.type || 'compra') === 'compra');
        const sells     = items.filter(a => a.type === 'venta');
        const dividends = items.filter(a => a.type === 'dividendo');

        const totalBuy  = buys.reduce((s, a)  => s + (parseFloat(a.value) || 0), 0);
        const totalSell = sells.reduce((s, a) => s + (parseFloat(a.value) || 0), 0);
        const net = totalBuy - totalSell;

        // ── Estadísticas con qty/precio si están disponibles ──
        const hasQty    = buys.some(a => a.quantity > 0);
        const totalQtyBuy  = buys.reduce((s, a)  => s + (parseFloat(a.quantity) || 0), 0);
        const totalQtySell = sells.reduce((s, a) => s + (parseFloat(a.quantity) || 0), 0);
        const netQty = totalQtyBuy - totalQtySell;
        const currency  = buys.find(a => a.currency && a.currency !== 'EUR')?.currency || 'EUR';
        const hasPrice  = buys.some(a => a.price_local > 0);

        // Precio medio ponderado por acción
        const totalCostLocal = buys.reduce((s, a) => s + ((parseFloat(a.quantity) || 0) * (parseFloat(a.price_local) || 0)), 0);
        const avgPriceLocal  = hasQty && totalQtyBuy > 0 ? totalCostLocal / totalQtyBuy : 0;

        let countLabel = buys.length + ' compra' + (buys.length !== 1 ? 's' : '');
        if (sells.length > 0) countLabel += ' · ' + sells.length + ' venta' + (sells.length !== 1 ? 's' : '');
        if (hasQty && netQty > 0) countLabel += ' · ' + netQty.toLocaleString('es-ES') + ' acc.';
        if (dividends.length > 0) countLabel += ' · ' + dividends.length + ' div.';

        const totalDividends = dividends.reduce((s, a) => s + (parseFloat(a.value) || 0), 0);

        let avgLabel = '';
        if (hasPrice && avgPriceLocal > 0) {
          avgLabel = 'Precio medio: ' + avgPriceLocal.toFixed(4) + ' ' + currency;
        } else if (buys.length > 0) {
          avgLabel = 'Coste medio: ' + fmtEur(totalBuy / buys.length);
        }

        // net = compras - ventas
        // net < 0 → recuperaste más de lo que metiste → beneficio realizado → verde
        // net > 0 y posición cerrada (netQty ≤ 0) → perdiste dinero → rojo
        // net > 0 y posición abierta (netQty > 0) → aún invertido → azul
        const isClosed  = sells.length > 0 && netQty <= 0.001;
        const netColor  = net < 0 ? '#22c55e'
                        : (isClosed ? '#ef4444' : 'var(--accent)');
        const netLabel  = net < 0
          ? '+' + fmtEur(Math.abs(net)) + ' beneficio'
          : isClosed
            ? '-' + fmtEur(Math.abs(net)) + ' pérdida'
            : fmtEur(net);

        // ── Datos en vivo si disponibles ──
        const live = liveData[ticker];
        let liveHtml = '';
        if (live && live.price) {
          const liveCcy  = live.currency || 'USD';
          const pnlPct   = avgPrice > 0 ? (((live.price - avgPrice) / avgPrice) * 100).toFixed(1) : null;
          const pnlColor = pnlPct === null ? 'var(--muted)' : parseFloat(pnlPct) >= 0 ? '#22c55e' : '#ef4444';
          const liveVal  = netQty > 0 ? live.price * netQty : null;
          liveHtml =
            '<span style="font-size:10px;color:var(--muted)">→</span>' +
            '<span style="font-size:12px;font-weight:700;color:var(--txt)">' + liveCcy + ' ' + live.price.toFixed(2) + '</span>' +
            (pnlPct !== null ? '<span style="font-size:11px;font-weight:600;color:' + pnlColor + '">' + (parseFloat(pnlPct)>=0?'+':'') + pnlPct + '%</span>' : '') +
            (liveVal ? '<span style="font-size:11px;color:#06b6d4">~€' + Math.round(liveVal).toLocaleString('es-ES') + '</span>' : '') +
            (live.dividendRate > 0 ? '<span style="font-size:10px;color:#fac850" title="Dividendo anualizado">💰$' + live.dividendRate.toFixed(2) + '/acc</span>' : '');
        }

        const group = document.createElement('div');
        group.className = 'ticker-group';

        const header = document.createElement('div');
        header.className = 'ticker-group-header';
        header.innerHTML =
          '<div class="ticker-left">' +
            '<span class="ticker-symbol">' + ticker + '</span>' +
            '<span class="ticker-count">' + countLabel + '</span>' +
          '</div>' +
          '<div class="ticker-right">' +
            '<span class="ticker-avg">' + avgLabel + '</span>' +
            liveHtml +
            (totalDividends > 0 ? '<span style="font-size:11px;color:#fac850;font-weight:600">💰' + fmtEur(totalDividends) + '</span>' : '') +
            '<span class="ticker-total" style="color:' + netColor + '">' + netLabel + '</span>' +
            '<svg class="ticker-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>';
        header.addEventListener('click', () => group.classList.toggle('expanded'));
        group.appendChild(header);

        const body = document.createElement('div');
        body.className = 'ticker-body';

        items.forEach(a => {
          const row = document.createElement('div');
          row.className = 'asset-row';

          const tickerInput = document.createElement('input');
          tickerInput.className = 'asset-ticker-input';
          tickerInput.value = a.ticker || '';
          tickerInput.placeholder = 'Ticker';
          tickerInput.addEventListener('blur', async () => {
            await sb.from('assets').update({ ticker: tickerInput.value.toUpperCase() }).eq('id', a.id);
            renderAssets();
          });

          const nameInput = document.createElement('input');
          nameInput.className = 'asset-name-input';
          nameInput.value = a.name || '';
          nameInput.placeholder = 'Nombre / nota';
          nameInput.addEventListener('blur', async () => {
            await sb.from('assets').update({ name: nameInput.value }).eq('id', a.id);
            renderAssets();
          });

          const brokerInput = document.createElement('input');
          brokerInput.className = 'asset-broker-input';
          brokerInput.value = a.broker || 'Sin clasificar';
          brokerInput.setAttribute('list', 'broker-suggestions');
          brokerInput.placeholder = 'Broker';
          brokerInput.addEventListener('blur', async () => {
            await sb.from('assets').update({ broker: brokerInput.value.trim() || 'Sin clasificar' }).eq('id', a.id);
            renderAssets();
          });

          const currentType = a.type === 'venta' ? 'venta' : a.type === 'dividendo' ? 'dividendo' : 'compra';
          const typeBtn = document.createElement('button');
          typeBtn.className = 'type-toggle ' + currentType;
          typeBtn.textContent = currentType === 'venta' ? 'Venta' : currentType === 'dividendo' ? 'Dividendo' : 'Compra';
          typeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const cycle = { 'compra': 'venta', 'venta': 'dividendo', 'dividendo': 'compra' };
            const newType = cycle[currentType] || 'compra';
            await sb.from('assets').update({ type: newType }).eq('id', a.id);
            renderAssets();
          });

          const valueInput = document.createElement('input');
          valueInput.className = 'asset-value-input';
          valueInput.type = 'number';
          valueInput.value = a.value || '';
          valueInput.placeholder = '€';
          valueInput.addEventListener('blur', async () => {
            await sb.from('assets').update({ value: parseFloat(valueInput.value) || 0 }).eq('id', a.id);
            renderAssets();
          });

          const delBtn = document.createElement('button');
          delBtn.className = 'asset-delete';
          delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
          delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await sb.from('assets').delete().eq('id', a.id);
            renderAssets();
          });

          row.appendChild(tickerInput);
          row.appendChild(nameInput);
          row.appendChild(brokerInput);
          row.appendChild(typeBtn);
          row.appendChild(valueInput);
          row.appendChild(delBtn);
          body.appendChild(row);

          // ── Sub-fila con qty / precio / moneda (si disponibles) ──
          if (a.quantity > 0 || a.price_local > 0) {
            const subRow = document.createElement('div');
            subRow.className = 'asset-subrow';
            const ccy = a.currency || 'EUR';
            const qtyVal   = a.quantity   ? a.quantity.toLocaleString('es-ES')   : '—';
            const priceVal = a.price_local ? a.price_local.toFixed(4) : '—';
            subRow.innerHTML =
              '<span class="subrow-label">Cantidad:</span>' +
              '<span class="subrow-val">' + qtyVal + ' acc.</span>' +
              '<span class="subrow-sep">·</span>' +
              '<span class="subrow-label">Precio:</span>' +
              '<span class="subrow-val" style="color:#fac850">' + priceVal + ' ' + ccy + '</span>' +
              '<span class="subrow-sep">·</span>' +
              '<span class="subrow-label">Valor ~EUR:</span>' +
              '<span class="subrow-val" style="color:var(--accent)">' + fmtEur(a.value || 0) + '</span>';
            body.appendChild(subRow);
          }
        });

        group.appendChild(body);
        container.appendChild(group);
      });

      // Actualiza gráfica de evolución cada vez que se renderiza
      renderEvolutionChart();
    }

    async function addAsset(ticker, broker, value, type) {
      const userId = await getUserId();
      if (!userId) return;
      await sb.from('assets').insert({
        user_id: userId,
        ticker: (ticker || '').toUpperCase(),
        name: '',
        broker: broker || 'Sin clasificar',
        value: parseFloat(value) || 0,
        type: type === 'venta' ? 'venta' : type === 'dividendo' ? 'dividendo' : 'compra',
      });
      renderAssets();
    }

    async function addAssetFull(ticker, broker, value, type, qty, price, currency) {
      const userId = await getUserId();
      if (!userId) return;
      const { error } = await sb.from('assets').insert({
        user_id:     userId,
        ticker:      (ticker || '').toUpperCase(),
        name:        '',
        broker:      broker || 'Sin clasificar',
        value:       parseFloat(value) || 0,
        type:        type === 'venta' ? 'venta' : type === 'dividendo' ? 'dividendo' : 'compra',
        quantity:    qty   > 0 ? qty   : null,
        price_local: price > 0 ? price : null,
        currency:    currency || 'USD',
      });
      if (error) { alert('Error: ' + error.message); return; }
      renderAssets();
    }

    /* ── EVOLUCIÓN (snapshots) ── */
    let evolutionChart = null;

    async function renderEvolutionChart() {
      const canvas = document.getElementById('evolution-chart');
      if (!canvas) return;

      const { data: snapshots } = await sb
        .from('portfolio_snapshots')
        .select('total_value, created_at')
        .order('created_at', { ascending: true });

      const wrap = document.getElementById('evolution-wrap');
      const empty = document.getElementById('evolution-empty');

      if (!snapshots || snapshots.length === 0) {
        wrap.style.display = 'none';
        empty.style.display = 'block';
        return;
      }
      wrap.style.display = 'block';
      empty.style.display = 'none';

      const labels = snapshots.map(s => new Date(s.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }));
      const values = snapshots.map(s => s.total_value);

      if (evolutionChart) {
        evolutionChart.data.labels = labels;
        evolutionChart.data.datasets[0].data = values;
        evolutionChart.update('none');
        return;
      }

      evolutionChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Valor total',
            data: values,
            borderColor: '#00ff6a',
            backgroundColor: 'rgba(0,255,106,0.08)',
            borderWidth: 2, fill: true, tension: 0.3,
            pointRadius: 3, pointBackgroundColor: '#00ff6a',
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0c1018', borderColor: '#1a2235', borderWidth: 1,
              titleColor: '#dde8ff', bodyColor: '#3a4d6a', padding: 12,
              callbacks: { label: c => '  ' + fmtEur(c.raw) }
            }
          },
          scales: {
            x: { grid: { color: '#111827' }, ticks: { color: '#3a4d6a', font: { size: 10 } } },
            y: { grid: { color: '#111827' }, ticks: { color: '#3a4d6a', font: { size: 10 },
              callback: v => v >= 1000 ? '€' + (v/1000).toFixed(1) + 'k' : '€' + v } }
          }
        }
      });
    }

    async function handleSaveSnapshot() {
      const assets = await loadAssets();
      const total = assets.reduce((s, a) => s + (parseFloat(a.value) || 0), 0);
      await saveSnapshot(total);
      renderEvolutionChart();
      const btn = document.getElementById('btn-save-snapshot');
      const original = btn.textContent;
      btn.textContent = '✓ Guardado';
      setTimeout(() => { btn.textContent = original; }, 1500);
    }

    // Parsea números en formato europeo (1.234,56) o americano (1,234.56) o con símbolo de moneda
    function parseEuropeanNum(str) {
      if (!str && str !== 0) return 0;
      let s = String(str).trim().replace(/[€$£%\s\u2212]/g, '');
      if (!s) return 0;
      // Formato europeo con cualquier nº de decimales: 158,0900 o 1.234,56
      if (/^\-?[\d.]+,\d+$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
      // Formato americano con comas de miles: 1,234.56
      if (/^\-?[\d,]+\.\d+$/.test(s)) return parseFloat(s.replace(/,/g, ''));
      // Solo comas como miles anglosajón (máx 3 dígitos tras coma): 16,000
      if (/^\-?[\d,]+$/.test(s) && s.includes(',') && !/,\d{4}/.test(s)) return parseFloat(s.replace(/,/g, ''));
      return parseFloat(s.replace(',', '.'));
    }

    /* ══════════════════════════════════════════════
       PRECIOS EN VIVO — Yahoo Finance
    ══════════════════════════════════════════════ */
    let liveData = {}; // { TICKER: { price, currency, dividendRate, dividendYield } }

    async function fetchLivePrices(tickers) {
      if (!tickers || tickers.length === 0) return;
      const symbols = tickers.join(',');
      const urls = [
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,currency,trailingAnnualDividendRate,trailingAnnualDividendYield`,
        `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,currency,trailingAnnualDividendRate,trailingAnnualDividendYield`,
        `https://corsproxy.io/?${encodeURIComponent('https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + symbols + '&fields=regularMarketPrice,currency,trailingAnnualDividendRate,trailingAnnualDividendYield')}`,
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
          if (!res.ok) continue;
          const json = await res.json();
          const quotes = json?.quoteResponse?.result || [];
          if (quotes.length === 0) continue;
          quotes.forEach(q => {
            liveData[q.symbol] = {
              price:         q.regularMarketPrice || null,
              currency:      q.currency || 'USD',
              dividendRate:  q.trailingAnnualDividendRate || 0,
              dividendYield: q.trailingAnnualDividendYield || 0,
            };
          });
          return; // éxito, salir del loop
        } catch(e) { continue; }
      }
    }

    async function refreshLivePrices() {
      const btn   = document.getElementById('btn-live-prices');
      const label = document.getElementById('live-btn-label');
      if (btn) { btn.disabled = true; label.textContent = 'Actualizando...'; }

      const assets = await loadAssets();
      const tickers = [...new Set(assets.map(a => a.ticker?.toUpperCase()).filter(Boolean))];

      // Separar cripto de bolsa
      const stockTickers  = tickers.filter(t => !CRYPTO_TICKERS.has(t));
      const cryptoTickers = tickers.filter(t =>  CRYPTO_TICKERS.has(t));

      await fetchLivePrices(stockTickers);

      // CoinGecko para cripto
      if (cryptoTickers.length > 0) {
        const cgMap = { XRP:'ripple', XLM:'stellar', BTC:'bitcoin', ETH:'ethereum', SOL:'solana', FLR:'flare-networks' };
        const ids = cryptoTickers.map(t => cgMap[t]).filter(Boolean).join(',');
        if (ids) {
          try {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
            if (res.ok) {
              const json = await res.json();
              cryptoTickers.forEach(t => {
                const id = cgMap[t];
                if (id && json[id]) liveData[t] = { price: json[id].usd, currency: 'USD', dividendRate: 0, dividendYield: 0 };
              });
            }
          } catch(e) {}
        }
      }

      renderAssets();
      if (btn) {
        btn.disabled = false;
        label.textContent = '✓ Precios actualizados · ' + new Date().toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'});
        setTimeout(() => { if (label) label.textContent = 'Actualizar precios en vivo'; }, 30000);
      }
    }

    function initAssetsScreen() {
      populateBrokerSuggestions();

      // ── Buscador y filtros ──
      document.getElementById('assets-search').addEventListener('input', () => renderAssets());
      document.querySelectorAll('.assets-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.assets-filter-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'var(--bg)';
            b.style.color = b.dataset.filter === 'dividendo' ? '#fac850' : 'var(--muted)';
          });
          btn.classList.add('active');
          btn.style.background = 'var(--surface)';
          btn.style.color = btn.dataset.filter === 'dividendo' ? '#fac850' : 'var(--text)';
          renderAssets();
        });
      });

      let selectedNewType = 'compra';
      document.querySelectorAll('.new-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.new-type-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedNewType = btn.dataset.type;
        });
      });

      document.getElementById('btn-add-asset').addEventListener('click', () => {
        const t    = document.getElementById('new-ticker').value.trim();
        const b    = document.getElementById('new-broker').value.trim() || 'Sin clasificar';
        const price = parseFloat(document.getElementById('new-price').value) || 0;
        const qty   = parseFloat(document.getElementById('new-qty').value)   || 0;
        const ccy   = (document.getElementById('new-currency').value.trim() || 'USD').toUpperCase();
        if (!t) return;
        const value = price * qty || price; // si no hay qty, usa precio como valor total
        addAssetFull(t, b, value, selectedNewType, qty, price, ccy);
        document.getElementById('new-ticker').value   = '';
        document.getElementById('new-broker').value   = '';
        document.getElementById('new-price').value    = '';
        document.getElementById('new-qty').value      = '';
        document.getElementById('new-currency').value = '';
      });

      document.getElementById('btn-live-prices').addEventListener('click', refreshLivePrices);

      document.getElementById('btn-download-template').addEventListener('click', () => {
        const csv = 'ticker,broker,valor,tipo\nAASPL,Revolut,182.50,compra\nAAPL,Revolut,195.00,compra\nAAPL,Revolut,190.00,venta\nNVDA,Interactive Brokers,420.00,compra\nBTC,Bybit,28000.00,compra\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'plantilla_activos.csv';
        a.click();
      });

      const zone   = document.getElementById('upload-zone');
      const input  = document.getElementById('upload-input');
      const status = document.getElementById('upload-status');
      const reviewPanel = document.getElementById('import-review');

      let pendingFile = null;
      let pendingHeaders = [];
      let pendingRows = [];

      zone.addEventListener('click', () => input.click());
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('dragover');
        if (e.dataTransfer.files.length) triggerAbsorb(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', () => { if (input.files.length) triggerAbsorb(input.files[0]); });

      function triggerAbsorb(file) {
        zone.classList.add('absorbing');
        handleFile(file);
        setTimeout(() => zone.classList.remove('absorbing'), 600);
      }

      function showStatus(msg, ok) {
        status.innerHTML = '<div class="upload-msg ' + (ok ? 'ok' : 'err') + '">' + msg + '</div>';
      }

      function guessKey(headers, candidates) {
        for (const c of candidates) {
          const k = headers.find(h => h.toLowerCase().trim() === c);
          if (k) return k;
        }
        return null;
      }

      function buildSelect(id, headers, guessed, withNone) {
        const sel = document.getElementById(id);
        sel.innerHTML = '';
        if (withNone) {
          const opt = document.createElement('option');
          opt.value = ''; opt.textContent = '— No usar —';
          sel.appendChild(opt);
        }
        headers.forEach(h => {
          const opt = document.createElement('option');
          opt.value = h; opt.textContent = h;
          if (h === guessed) opt.selected = true;
          sel.appendChild(opt);
        });
      }

      function showReviewPanel(filename, headers, rows) {
        pendingHeaders = headers;
        pendingRows = rows;

        document.getElementById('review-filename').textContent = '📄 ' + filename;
        document.getElementById('review-broker').value = '';

        const tickerGuess = guessKey(headers, ['ticker','symbol','simbolo','activo','asset']);
        const valueGuess  = guessKey(headers, ['value','valor','amount','importe','total']);
        const typeGuess   = guessKey(headers, ['type','tipo','operacion','operación','operation','side']);

        buildSelect('map-ticker', headers, tickerGuess, false);
        buildSelect('map-value', headers, valueGuess, false);
        buildSelect('map-type', headers, typeGuess, true);

        const previewTable = document.getElementById('review-preview-table');
        previewTable.innerHTML = '';
        rows.slice(0, 4).forEach(r => {
          const rowDiv = document.createElement('div');
          rowDiv.className = 'review-preview-row';
          rowDiv.textContent = headers.map(h => h + ': ' + (r[h] ?? '—')).join('   ·   ');
          previewTable.appendChild(rowDiv);
        });

        reviewPanel.classList.remove('hidden');
        reviewPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      document.getElementById('btn-cancel-import').addEventListener('click', () => {
        reviewPanel.classList.add('hidden');
        input.value = '';
        pendingFile = null;
      });

      function normalizeType(raw) {
        const v = (raw || '').toString().trim().toLowerCase();
        if (['venta','sell','v','s'].includes(v)) return 'venta';
        if (['dividendo','dividend','div','d'].includes(v)) return 'dividendo';
        return 'compra';
      }

      document.getElementById('btn-confirm-import').addEventListener('click', async () => {
        const broker = document.getElementById('review-broker').value.trim() || 'Sin clasificar';
        const tickerKey = document.getElementById('map-ticker').value;
        const valueKey  = document.getElementById('map-value').value;
        const typeKey   = document.getElementById('map-type').value;

        if (!tickerKey) { showStatus('Selecciona qué columna es el ticker.', false); return; }

        const userId = await getUserId();
        if (!userId) { showStatus('Tienes que iniciar sesión.', false); return; }

        const toInsert = [];
        pendingRows.forEach(r => {
          const ticker = (r[tickerKey] || '').toString().trim();
          if (!ticker) return;
          const rawVal = valueKey ? r[valueKey].toString().trim() : '0';
          const value  = parseEuropeanNum(rawVal);
          const type   = typeKey ? normalizeType(r[typeKey]) : 'compra';
          toInsert.push({
            user_id: userId, ticker: ticker.toUpperCase(), name: '',
            broker, value: isNaN(value) ? 0 : Math.abs(value), type,
          });
        });

        if (toInsert.length) {
          const { error: csvErr } = await sb.from('assets').insert(toInsert);
          if (csvErr) {
            showStatus('❌ Error al guardar: ' + csvErr.message + ' — ¿estás logueado?', false);
            return;
          }
        }

        await sb.from('imports').insert({
          user_id: userId,
          filename: pendingFile ? pendingFile.name : 'archivo',
          broker,
          row_count: toInsert.length,
        });

        reviewPanel.classList.add('hidden');
        input.value = '';
        renderAssets();
        renderImportsHistory();
        showStatus('Importadas ' + toInsert.length + ' filas de "' + broker + '" correctamente.', true);
      });

      function handleFile(file) {
        pendingFile = file;
        const name = file.name.toLowerCase();
        if (name.endsWith('.csv')) {
          Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: res => {
              const headers = res.meta.fields || [];
              if (!headers.length) { showStatus('No se pudieron leer las columnas del CSV.', false); return; }
              showReviewPanel(file.name, headers, res.data);
            },
            error: () => showStatus('No se pudo leer el CSV.', false),
          });
        } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
          const reader = new FileReader();
          reader.onload = e => {
            try {
              const wb = XLSX.read(e.target.result, { type: 'array' });
              const sheet = wb.Sheets[wb.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json(sheet);
              if (!rows.length) { showStatus('El archivo está vacío.', false); return; }
              const headers = Object.keys(rows[0]);
              showReviewPanel(file.name, headers, rows);
            } catch { showStatus('No se pudo leer el archivo Excel.', false); }
          };
          reader.readAsArrayBuffer(file);
        } else if (name.endsWith('.pdf')) {
          extractPdfText(file);
        } else {
          showStatus('Formato no soportado. Usa CSV, Excel (.xlsx) o PDF.', false);
        }
      }

      async function extractPdfText(file) {
        try {
          showStatus('Leyendo el PDF...', true);
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const buffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
          }

          // ── Detectar si es un informe de Interactive Brokers ──
          if (fullText.includes('Interactive Brokers') && fullText.includes('Operaciones')) {
            const ibTrades = parseIBReport(fullText);
            if (ibTrades && ibTrades.length > 0) {
              showIBReviewPanel(file.name, ibTrades);
              status.innerHTML = '';
              return;
            }
          }

          // ── Detectar si es un informe de Revolut ──
          if ((fullText.includes('USD Transactions') || fullText.includes('EUR Transactions') ||
               fullText.includes('Otras transacciones de la cuenta de corretaje') ||
               fullText.includes('Unidades que se han vendido')) &&
              (fullText.includes('Revolut') || fullText.includes('Account Statement'))) {
            const revData = parseRevolutReport(fullText);
            if (revData && (revData.buys.length > 0 || revData.sells.length > 0)) {
              showRevolutReviewPanel(file.name, revData, fullText);
              status.innerHTML = '';
              return;
            }
          }

          // ── Detectar si es un informe de MyInvestor ──
          if (fullText.includes('MyInvestor') || fullText.includes('ANDBANK') || fullText.includes('Andbank') ||
              fullText.includes('MyInvestor Banco')) {
            const myiData = parseMyInvestorReport(fullText);
            if (myiData && myiData.positions.length > 0) {
              showMyInvestorReviewPanel(file.name, myiData, fullText);
              status.innerHTML = '';
              return;
            }
          }

          // Si no es ningún broker conocido, mostrar el texto como antes
          document.getElementById('pdf-filename').textContent = '📄 ' + file.name;
          document.getElementById('pdf-text-output').textContent = fullText.replace(/ {2,}/g, '\n') || '(No se encontró texto seleccionable — puede ser una imagen escaneada.)';
          document.getElementById('pdf-review').classList.remove('hidden');
          document.getElementById('pdf-review').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          status.innerHTML = '';
        } catch (err) {
          showStatus('No se pudo leer el PDF: ' + err.message, false);
        }
      }

      // ── Parser específico para informes de Interactive Brokers ──
      function parseIBReport(text) {
        const trades = [];

        const opIdx = text.indexOf('Operaciones');
        if (opIdx === -1) return null;
        const opText = text.slice(opIdx);

        // ── Detectar moneda de las acciones (CAD, USD, EUR) ──
        const currencyMatch = text.match(/Acciones\s*([A-Z]{3})\s+[A-Z]{2,}/);
        const localCurrency = currencyMatch ? currencyMatch[1] : 'USD';

        // ── Buscar el total en EUR de las operaciones (primera línea "Total en EUR") ──
        const eurLine = opText.match(/Total en EUR\s+([-\d,.]+)/);
        const totalEurProducts = eurLine ? Math.abs(parseNumIB(eurLine[1])) : null;

        // ── Buscar el total en moneda local: saltar la columna cantidad, coger el coste ──
        // Formato: "Total SCD   16,770   -2,836.05   ..."
        //           totalLocalMatch[1]=qty  [2]=coste_local  ← este es el correcto
        const totalLocalMatch = opText.match(/Total\s+[A-Z]{2,10}\s+([\d,.]+)\s+([-\d,.]+)/);
        const totalLocalProducts = totalLocalMatch ? Math.abs(parseNumIB(totalLocalMatch[2])) : null;

        const eurPerLocal = (totalEurProducts && totalLocalProducts && totalLocalProducts > 0)
          ? totalEurProducts / totalLocalProducts : null;

        // ── Regex para líneas de operación ──
        // TICKER  YYYY-MM-DD, HH:MM:SS  CANTIDAD  PRECIO_TRANS  PRECIO_CIER  PRODUCTOS  ...
        const tradeRegex = /([A-Z]{2,10})\s+(\d{4}-\d{2}-\d{2}),\s+\d{2}:\d{2}:\d{2}\s+([-\d,.]+)\s+([\d.]+)\s+([\d.]+)\s+([-\d,.]+)/g;

        let match;
        while ((match = tradeRegex.exec(opText)) !== null) {
          const ticker   = match[1];
          const date     = match[2];
          const qty      = parseNumIB(match[3]);
          const price    = parseFloat(match[4]);
          const productos = parseNumIB(match[6]); // coste real (negativo = compra)

          if (['EUR', 'CAD', 'USD', 'GBP', 'CHF', 'Total'].includes(ticker)) continue;

          const type          = qty >= 0 ? 'compra' : 'venta';
          const costLocal     = Math.abs(productos); // coste real en moneda local
          const valueEur      = eurPerLocal ? +(costLocal * eurPerLocal).toFixed(2) : 0;

          trades.push({
            ticker,
            date,
            qty:        Math.abs(qty),
            price,
            currency:   localCurrency,
            costLocal,
            valueEur,
            type,
          });
        }

        return trades.length > 0 ? trades : null;
      }

      function parseNumIB(str) {
        // Maneja tanto "16,000" (miles) como "-2,720.00" y también "1.234,56" europeo
        if (!str) return 0;
        const s = str.trim();
        // Si tiene punto antes de coma: formato europeo 1.234,56 → 1234.56
        if (/\d\.\d{3},\d{2}/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
        // Si tiene solo coma como miles (sin decimales tras coma): 16,000 → 16000
        if (/,\d{3}$/.test(s)) return parseFloat(s.replace(/,/g, ''));
        // Si tiene coma como decimal y punto como miles: -2,720.00 → ya está bien
        return parseFloat(s.replace(/,/g, ''));
      }

      // ── Panel de revisión específico para IB ──
      function showIBReviewPanel(filename, ibTrades) {
        pendingFile = { name: filename };

        document.getElementById('review-filename').textContent = '📄 ' + filename + '   —   Interactive Brokers detectado ✓';
        document.getElementById('review-broker').value = 'Interactive Brokers';
        document.querySelector('.review-mapping').style.display = 'none';

        const previewTable = document.getElementById('review-preview-table');
        previewTable.innerHTML = '';
        ibTrades.slice(0, 8).forEach(t => {
          const div = document.createElement('div');
          div.className = 'review-preview-row';
          div.style.cssText = 'display:flex;gap:14px;align-items:center;flex-wrap:wrap;';
          const eurStr = t.valueEur > 0 ? '~€' + t.valueEur.toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—';
          div.innerHTML =
            '<strong style="color:var(--text);min-width:44px">' + t.ticker + '</strong>' +
            '<span style="color:var(--muted)">' + t.date + '</span>' +
            '<span style="color:var(--text)">' + t.qty.toLocaleString('es-ES') + ' acc.</span>' +
            '<span style="color:#fac850">@ ' + t.price + ' ' + t.currency + '</span>' +
            '<span style="color:' + (t.type === 'compra' ? '#22c55e' : '#ef4444') + ';font-weight:700">' + t.type.toUpperCase() + '</span>' +
            '<span style="color:var(--accent)">' + eurStr + '</span>';
          previewTable.appendChild(div);
        });
        if (ibTrades.length > 8) {
          const more = document.createElement('div');
          more.className = 'review-preview-row';
          more.style.color = 'var(--muted)';
          more.textContent = '... y ' + (ibTrades.length - 8) + ' operaciones más';
          previewTable.appendChild(more);
        }

        const confirmBtn = document.getElementById('btn-confirm-import');
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.addEventListener('click', async () => {
          const broker = document.getElementById('review-broker').value.trim() || 'Interactive Brokers';
          const userId = await getUserId();
          if (!userId) return;

          const toInsert = ibTrades.map(t => ({
            user_id:     userId,
            ticker:      t.ticker,
            name:        t.date,
            broker,
            value:       t.valueEur > 0 ? t.valueEur : t.costLocal,
            type:        t.type,
            quantity:    t.qty,
            price_local: t.price,
            currency:    t.currency,
          }));

          const { error: ibErr } = await sb.from('assets').insert(toInsert);
          if (ibErr) {
            showStatus('❌ Error al guardar: ' + ibErr.message + ' — ¿estás logueado?', false);
            return;
          }
          await sb.from('imports').insert({user_id:userId,filename,broker,row_count:ibTrades.length});
          document.querySelector('.review-mapping').style.display = '';
          document.getElementById('import-review').classList.add('hidden');
          renderAssets();
          renderImportsHistory();
          showStatus('✓ Importadas ' + ibTrades.length + ' operaciones de Interactive Brokers con precio y cantidad.', true);
        });

        document.getElementById('import-review').classList.remove('hidden');
        document.getElementById('import-review').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // ════════════════════════════════════════════
      // PARSER — Revolut (formato inglés "Account Statement")
      // ════════════════════════════════════════════
      function parseRevolutReport(text) {
        const result = { buys: [], sells: [], dividends: [], positions: [] };
        const norm = text.replace(/\s+/g, ' ');

        // ── Posiciones actuales (Portfolio breakdown) ──
        // Patrón: TICKER Company ISIN qty US$price US$value pct%
        // Ej: "PLTR Palantir US69608A1088 0.11119292 US$119.52 US$13.29 4.23%"
        const posRx = /([A-Z]{2,5})\s+[\w\s]+?\s+US[A-Z0-9]{10,12}\s+([\d.]+)\s+US\$([\d.]+)\s+US\$([\d.]+)\s+([\d.]+)%/g;
        let m;
        while ((m = posRx.exec(norm)) !== null) {
          const ticker = m[1];
          if (['USD','EUR','GBP'].includes(ticker)) continue;
          result.positions.push({
            ticker,
            qty:      parseFloat(m[2]),
            price:    parseFloat(m[3]),
            valueUSD: parseFloat(m[4]),
            pct:      parseFloat(m[5]),
          });
        }

        // ── Transacciones ──
        // Patrón: "20 Jan 2026 15:03:24 GMT ASTS Trade - Market 26.00889863 US$112.50 Sell US$2,925.99 US$0.01 US$0"
        const MONTHS = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
        const tradeRx = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+\d{2}:\d{2}:\d{2}\s+GMT\s+([A-Z]{2,5})\s+Trade\s*-\s*[\w\s]+?([\d.]+)\s+US\$([\d.]+)\s+(Buy|Sell)\s+US\$([\d.,]+)/gi;

        while ((m = tradeRx.exec(norm)) !== null) {
          const day    = m[1]; const mon = m[2]; const year = m[3];
          const ticker = m[4].toUpperCase();
          const qty    = parseFloat(m[5]);
          const price  = parseFloat(m[6]);
          const side   = m[7].toLowerCase();
          const value  = parseFloat(m[8].replace(/,/g, ''));
          const date   = day + ' ' + mon + ' ' + year;

          const trade = { date, ticker, qty, price, valueUSD: value, currency: 'USD', type: side === 'sell' ? 'venta' : 'compra' };
          if (side === 'sell') result.sells.push(trade); else result.buys.push(trade);
        }

        // ── Dividendos ──
        // Patrón: "10 Feb 2026 07:30:16 GMT MA Dividend US$0.21 US$0 US$0"
        const divRx = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+\d{2}:\d{2}:\d{2}\s+GMT\s+([A-Z]{2,5})\s+Dividend\s+US\$([\d.]+)/gi;
        while ((m = divRx.exec(norm)) !== null) {
          const date   = m[1] + ' ' + m[2] + ' ' + m[3];
          const ticker = m[4].toUpperCase();
          const value  = parseFloat(m[5]);
          result.dividends.push({ date, ticker, valueUSD: value, currency: 'USD', type: 'dividendo' });
        }

        // Fallback formato español antiguo ──
        if (result.buys.length === 0 && result.sells.length === 0) {
          const SKIP = new Set(['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC','EUR','USD','CAD','GBP','CHF']);
          const buyIdx  = norm.indexOf('Otras transacciones de la cuenta de corretaje');
          const sellIdx = norm.indexOf('Unidades que se han vendido');
          if (buyIdx !== -1) {
            const buysText = norm.slice(buyIdx, sellIdx !== -1 ? sellIdx : norm.length);
            const r1 = /(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+\d{4})\s+(?:Compra de acciones\s+)?(?:Compra\s+)?([A-Z]{2,6})\s+€?([\d.,]+)\s+([\d.,]+)\s+[−\-]?€?([\d.,]+)/gi;
            let ms;
            while ((ms = r1.exec(buysText)) !== null) {
              const ticker = ms[2].toUpperCase(); if (SKIP.has(ticker)) continue;
              result.buys.push({ date:ms[1].trim(), ticker, price:Math.abs(parseEuropeanNum(ms[3])), qty:Math.abs(parseEuropeanNum(ms[4])), valueUSD:Math.abs(parseEuropeanNum(ms[5])), currency:'EUR', type:'compra' });
            }
          }
          if (sellIdx !== -1) {
            const sellsText = norm.slice(sellIdx);
            const r1 = /([A-Z]{2,6})\s+(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+\d{4})\s+(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+\d{4})\s+([\d.,]+)\s+€?([\d.,]+)\s+€?([\d.,]+)/gi;
            let ms;
            while ((ms = r1.exec(sellsText)) !== null) {
              const ticker = ms[1].toUpperCase(); if (SKIP.has(ticker)) continue;
              const qty=parseEuropeanNum(ms[4]), sp=parseEuropeanNum(ms[6]);
              result.sells.push({ ticker, buyDate:ms[2].trim(), sellDate:ms[3].trim(), qty, buyPrice:parseEuropeanNum(ms[5]), sellPrice:sp, valueUSD:+(qty*sp).toFixed(2), currency:'EUR', type:'venta' });
            }
          }
        }

        return result;
      }

      function showRevolutReviewPanel(filename, revData, rawText) {
        pendingFile = { name: filename };
        const allTrades = [...revData.buys, ...revData.sells];

        document.getElementById('review-filename').textContent =
          '📄 ' + filename + '   —   Revolut detectado ✓   (' + revData.buys.length + ' compras · ' + revData.sells.length + ' ventas' + (revData.dividends.length > 0 ? ' · ' + revData.dividends.length + ' dividendos' : '') + ')';
        document.getElementById('review-broker').value = 'Revolut';
        document.querySelector('.review-mapping').style.display = 'none';

        const previewTable = document.getElementById('review-preview-table');
        previewTable.innerHTML = '';

        if (allTrades.length === 0) {
          previewTable.innerHTML =
            '<div style="color:#fac850;font-size:12px;padding:8px 0">⚠️ No se detectaron operaciones. Texto extraído abajo para revisión manual.</div>' +
            '<div class="pdf-text-output" style="max-height:180px;margin-top:8px">' + rawText.slice(0, 2000).replace(/</g, '&lt;') + '</div>';
        } else {
          allTrades.forEach(t => {
            const div = document.createElement('div');
            div.className = 'review-preview-row';
            div.style.cssText = 'display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--border);';
            const ccy     = t.currency || 'USD';
            const valStr  = t.valueUSD > 0 ? ccy + '$' + t.valueUSD.toLocaleString('en-US', {minimumFractionDigits:2}) : '—';
            const qtyStr  = t.qty > 0 ? t.qty.toLocaleString('en-US', {maximumFractionDigits:5}) + ' acc.' : '';
            const priceStr= t.price > 0 ? '@ ' + ccy + '$' + t.price.toFixed(2) : '';
            const dateStr = t.sellDate || t.date || '—';
            div.innerHTML =
              '<strong style="color:var(--text);min-width:48px">' + t.ticker + '</strong>' +
              '<span style="color:var(--muted);font-size:11px">' + dateStr + '</span>' +
              (qtyStr   ? '<span style="color:var(--text);font-size:11px">' + qtyStr + '</span>' : '') +
              (priceStr ? '<span style="color:#fac850;font-size:11px">' + priceStr + '</span>' : '') +
              '<span style="color:' + (t.type === 'venta' ? '#ef4444' : '#22c55e') + ';font-weight:700;font-size:11px">' + t.type.toUpperCase() + '</span>' +
              '<span style="color:var(--accent);font-size:11px">' + valStr + '</span>';
            previewTable.appendChild(div);
          });
        }

        // Dividendos detectados
        if (revData.dividends && revData.dividends.length > 0) {
          const divHdr = document.createElement('div');
          divHdr.style.cssText = 'margin-top:14px;margin-bottom:6px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#fac850;';
          divHdr.textContent = '💰 Dividendos detectados';
          previewTable.appendChild(divHdr);
          revData.dividends.forEach(d => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;gap:14px;align-items:center;padding:4px 0;font-size:11px;border-bottom:1px solid var(--border);';
            div.innerHTML =
              '<strong style="color:var(--text);min-width:48px">' + d.ticker + '</strong>' +
              '<span style="color:var(--muted)">' + d.date + '</span>' +
              '<span style="color:#fac850;font-weight:700">DIVIDENDO</span>' +
              '<span style="color:#fac850">US$' + d.valueUSD.toFixed(2) + '</span>';
            previewTable.appendChild(div);
          });
        }

        // Posiciones actuales si existen
        if (revData.positions && revData.positions.length > 0) {
          const hdr = document.createElement('div');
          hdr.style.cssText = 'margin-top:14px;margin-bottom:6px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);';
          hdr.textContent = 'Posiciones actuales detectadas (portfolio breakdown)';
          previewTable.appendChild(hdr);
          revData.positions.forEach(pos => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;gap:14px;align-items:center;padding:4px 0;font-size:11px;';
            div.innerHTML =
              '<strong style="color:var(--text);min-width:48px">' + pos.ticker + '</strong>' +
              '<span style="color:var(--muted)">' + pos.qty.toLocaleString('en-US', {maximumFractionDigits:5}) + ' acc.</span>' +
              '<span style="color:#fac850">@ US$' + pos.price.toFixed(2) + '</span>' +
              '<span style="color:var(--accent)">= US$' + pos.valueUSD.toFixed(2) + '</span>' +
              '<span style="color:var(--muted)">(' + pos.pct + '%)</span>';
            previewTable.appendChild(div);
          });
        }

        // Aviso KO/PLTR si tienen fecha anterior
        const note = document.createElement('div');
        note.style.cssText = 'margin-top:10px;padding:8px 12px;border:1px solid rgba(250,200,80,0.25);border-radius:6px;font-size:11px;color:#fac850;line-height:1.6;';
        note.textContent = '⚠️ Los valores están en USD. KO y PLTR aparecen solo en el portfolio breakdown (posiciones actuales), no en transacciones si se compraron antes de enero 2026.';
        previewTable.appendChild(note);

        const confirmBtn = document.getElementById('btn-confirm-import');
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        newBtn.addEventListener('click', async () => {
          const broker = document.getElementById('review-broker').value.trim() || 'Revolut';
          const userId = await getUserId(); if (!userId) return;

          const toInsert = [];

          // Importar transacciones (compras y ventas)
          allTrades.forEach(t => {
            toInsert.push({
              user_id:     userId,
              ticker:      t.ticker,
              name:        t.sellDate ? 'Venta ' + t.sellDate : t.date || '',
              broker,
              value:       t.valueUSD || 0,
              type:        t.type,
              quantity:    t.qty > 0 ? t.qty : null,
              price_local: t.price > 0 ? t.price : null,
              currency:    t.currency || 'USD',
            });
          });

          // Importar dividendos
          if (revData.dividends) {
            revData.dividends.forEach(d => {
              toInsert.push({
                user_id:     userId,
                ticker:      d.ticker,
                name:        'Dividendo ' + d.date,
                broker,
                value:       d.valueUSD || 0,
                type:        'dividendo',
                quantity:    null,
                price_local: null,
                currency:    d.currency || 'USD',
              });
            });
          }

          if (toInsert.length === 0) {
            document.querySelector('.review-mapping').style.display = '';
            document.getElementById('import-review').classList.add('hidden'); return;
          }

          const { error: insErr } = await sb.from('assets').insert(toInsert);
          if (insErr) {
            showStatus('❌ Error al guardar: ' + insErr.message + ' — ¿estás logueado?', false);
            return;
          }
          await sb.from('imports').insert({ user_id: userId, filename, broker, row_count: toInsert.length });
          document.querySelector('.review-mapping').style.display = '';
          document.getElementById('import-review').classList.add('hidden');
          renderAssets(); renderImportsHistory();
          showStatus('✓ Importadas ' + toInsert.length + ' operaciones de Revolut (' + revData.buys.length + ' compras · ' + revData.sells.length + ' ventas).', true);
        });

        document.getElementById('import-review').classList.remove('hidden');
        document.getElementById('import-review').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // ════════════════════════════════════════════
      // PARSER — MyInvestor
      // ════════════════════════════════════════════
      function parseMyInvestorReport(text) {
        const result = { positions: [] };
        const norm = text.replace(/\s+/g, ' ');

        // ── Estrategia 1: ISIN + nombre fondo + divisa + títulos + valor ──
        // Formato real: "LU1598719752 COBAS INTERNATIONAL FD P AC EU EUR 0.9019 158,0900 € 158,0900 €"
        const isinRx = /([A-Z]{2}[A-Z0-9]{10})\s+([A-Z][A-Z0-9\s\.\-&]{3,60}(?:FD|FUND|FI|ACC?|EU|EUR|INT|INTL|GLOB|WORLD)(?:\s+[A-Z0-9\.]{1,6})*)\s+(?:EUR|USD|GBP)\s+([\d.]+)\s+([\d,.]+)\s*€/gi;
        let m;
        while ((m = isinRx.exec(norm)) !== null) {
          const isin  = m[1];
          const name  = m[2].trim().replace(/\s+/g,' ');
          const qty   = parseFloat(m[3]);
          const value = parseEuropeanNum(m[4]);
          if (qty > 0 && value > 0 && !result.positions.find(p => p.isin === isin)) {
            result.positions.push({ isin, name, participaciones: qty, valueEur: value, broker: 'MyInvestor' });
          }
        }

        // ── Estrategia 2: buscar sección "Posiciones" y leer línea con valor ──
        if (result.positions.length === 0) {
          const posIdx = norm.indexOf('Posiciones');
          if (posIdx !== -1) {
            const posText = norm.slice(posIdx, posIdx + 600);
            // Buscar ISIN solo
            const isinOnly = /([A-Z]{2}[A-Z0-9]{10})/g;
            while ((m = isinOnly.exec(posText)) !== null) {
              const isin    = m[1];
              const after   = posText.slice(m.index);
              const numRx   = /([\d.]+)\s+([\d,.]+)/;
              const nums    = after.match(numRx);
              if (nums) {
                const qty   = parseFloat(nums[1]);
                const value = parseEuropeanNum(nums[2]);
                const nameM = after.match(/[A-Z]{2}[A-Z0-9]{10}\s+([A-Z][A-Z0-9\s\.&]{3,50}?)\s+(?:EUR|USD)/);
                const name  = nameM ? nameM[1].trim() : 'Fondo ' + isin;
                if (qty > 0 && value > 0 && !result.positions.find(p => p.isin === isin)) {
                  result.positions.push({ isin, name, participaciones: qty, valueEur: value, broker: 'MyInvestor' });
                }
              }
            }
          }
        }

        // ── Estrategia 3 (fallback): nombre fondo caps + qty + valor ──
        if (result.positions.length === 0) {
          const fundRx = /([A-Z][A-Z\s\.&]{4,60}(?:FD|FUND|FI|ACC?|EU|EUR|USD)(?:\s+[A-Z]{1,5})*)\s+([\d.]+)\s+([\d.,]+)/g;
          while ((m = fundRx.exec(norm)) !== null) {
            const name  = m[1].trim();
            const partic= parseEuropeanNum(m[2]);
            const value = parseEuropeanNum(m[3]);
            if (partic > 0 && partic < 100000 && value > 10 && !result.positions.find(p => p.name === name)) {
              result.positions.push({ name, participaciones: partic, valueEur: value, broker: 'MyInvestor' });
            }
          }
        }

        return result;
      }

      function showMyInvestorReviewPanel(filename, myiData, rawText) {
        pendingFile = { name: filename };

        document.getElementById('review-filename').textContent =
          '📄 ' + filename + '   —   MyInvestor detectado ✓   (' + myiData.positions.length + ' posición/es)';
        document.getElementById('review-broker').value = 'MyInvestor';
        document.querySelector('.review-mapping').style.display = 'none';

        const previewTable = document.getElementById('review-preview-table');
        previewTable.innerHTML = '';

        if (myiData.positions.length === 0) {
          previewTable.innerHTML =
            '<div style="color:#fac850;font-size:12px;padding:8px 0">⚠️ No se detectaron posiciones automáticamente.</div>' +
            '<div class="pdf-text-output" style="max-height:180px;margin-top:8px">' + rawText.slice(0, 2000).replace(/</g, '&lt;') + '</div>';
        } else {
          myiData.positions.forEach(pos => {
            const div = document.createElement('div');
            div.className = 'review-preview-row';
            div.style.cssText = 'display:flex;gap:14px;align-items:center;flex-wrap:wrap;';
            div.innerHTML =
              '<strong style="color:var(--text);flex:1">' + pos.name + '</strong>' +
              (pos.isin ? '<span style="color:var(--muted);font-size:10px;font-family:monospace">' + pos.isin + '</span>' : '') +
              '<span style="color:var(--muted)">' + pos.participaciones.toLocaleString('es-ES', {maximumFractionDigits:4}) + ' títulos</span>' +
              '<span style="color:var(--accent);font-weight:700">€' + pos.valueEur.toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</span>';
            previewTable.appendChild(div);
          });
        }

        const confirmBtn = document.getElementById('btn-confirm-import');
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        newBtn.addEventListener('click', async () => {
          const broker = document.getElementById('review-broker').value.trim() || 'MyInvestor';
          const userId = await getUserId(); if (!userId) return;
          if (myiData.positions.length === 0) {
            document.querySelector('.review-mapping').style.display = '';
            document.getElementById('import-review').classList.add('hidden'); return;
          }
          const toInsert = myiData.positions.map(pos => {
            const ticker       = pos.name.split(/\s+/)[0].slice(0, 6).toUpperCase();
            const pricePerUnit = pos.participaciones > 0 ? +(pos.valueEur / pos.participaciones).toFixed(4) : null;
            return { user_id: userId, ticker, name: pos.name, broker, value: pos.valueEur, type: 'compra', quantity: pos.participaciones, price_local: pricePerUnit, currency: 'EUR' };
          });
          const { error: myiErr } = await sb.from('assets').insert(toInsert);
          if (myiErr) {
            showStatus('❌ Error al guardar: ' + myiErr.message + ' — ¿estás logueado?', false);
            return;
          }
          await sb.from('imports').insert({ user_id: userId, filename, broker, row_count: toInsert.length });
          document.querySelector('.review-mapping').style.display = '';
          document.getElementById('import-review').classList.add('hidden');
          renderAssets(); renderImportsHistory();
          showStatus('✓ Importada' + (toInsert.length !== 1 ? 's' : '') + ' ' + toInsert.length + ' posición/es de MyInvestor.', true);
        });

        document.getElementById('import-review').classList.remove('hidden');
        document.getElementById('import-review').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      document.getElementById('btn-cancel-import').addEventListener('click', () => {
        document.querySelector('.review-mapping').style.display = '';
        document.getElementById('import-review').classList.add('hidden');
        input.value = '';
        pendingFile = null;
      });

      document.getElementById('btn-close-pdf').addEventListener('click', () => {
        document.getElementById('pdf-review').classList.add('hidden');
        input.value = '';
      });

      renderAssets();
      renderImportsHistory();
    }

    /* ── HISTORIAL DE IMPORTACIONES ── */
    async function renderImportsHistory() {
      const wrap = document.getElementById('imports-history');
      if (!wrap) return;

      const { data: imports, error } = await sb
        .from('imports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !imports || imports.length === 0) {
        wrap.innerHTML = '<div class="assets-empty">Todavía no has importado ningún archivo.</div>';
        return;
      }

      wrap.innerHTML = '';
      imports.forEach(imp => {
        const date = new Date(imp.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const row = document.createElement('div');
        row.className = 'import-row';
        row.innerHTML =
          '<div class="import-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3d7eff" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 2v3h3" stroke="#3d7eff" stroke-width="1.3" stroke-linejoin="round"/></svg></div>' +
          '<div class="import-info">' +
            '<div class="import-filename">' + imp.filename + '</div>' +
            '<div class="import-meta">' + date + ' · ' + imp.row_count + ' filas</div>' +
          '</div>' +
          '<span class="import-broker-tag">' + imp.broker + '</span>';
        wrap.appendChild(row);
      });
    }

    /* ── DESCARGAR RESUMEN PDF ── */
    document.getElementById('btn-download-pdf').addEventListener('click', generatePortfolioPDF);

    async function generatePortfolioPDF() {
      const btn = document.getElementById('btn-download-pdf');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Generando PDF...';

      try {
        const assets = await loadAssets();
        if (assets.length === 0) {
          alert('Todavía no tienes activos añadidos. Añade alguno antes de generar el resumen.');
          return;
        }

        // Agrupar por ticker (misma lógica que la pantalla)
        const grouped = {};
        assets.forEach(a => {
          const ticker = (a.ticker || 'SIN TICKER').toUpperCase();
          if (!grouped[ticker]) grouped[ticker] = [];
          grouped[ticker].push(a);
        });

        const tickerStats = Object.keys(grouped).sort().map(ticker => {
          const items = grouped[ticker];
          const buys  = items.filter(a => (a.type || 'compra') !== 'venta');
          const sells = items.filter(a => a.type === 'venta');
          const totalBuy  = buys.reduce((s, a) => s + (parseFloat(a.value) || 0), 0);
          const totalSell = sells.reduce((s, a) => s + (parseFloat(a.value) || 0), 0);
          return {
            ticker, buys: buys.length, sells: sells.length,
            totalBuy, totalSell, net: totalBuy - totalSell,
            avg: buys.length ? totalBuy / buys.length : 0,
          };
        });

        const grandTotalBuy  = tickerStats.reduce((s, t) => s + t.totalBuy, 0);
        const grandTotalSell = tickerStats.reduce((s, t) => s + t.totalSell, 0);
        const grandNet       = grandTotalBuy - grandTotalSell;

        // ── Gráfica donut (posición neta por ticker) ──
        const donutData = tickerStats.filter(t => t.net > 0);
        const donutColors = ['#3d7eff','#22c55e','#fac850','#06b6d4','#8b5cf6','#ec4899','#f97316','#14b8a6','#84cc16','#f43f5e'];
        const donutCanvas = document.getElementById('pdf-canvas-donut');
        if (window._pdfDonutChart) window._pdfDonutChart.destroy();
        window._pdfDonutChart = new Chart(donutCanvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: donutData.map(t => t.ticker),
            datasets: [{
              data: donutData.map(t => t.net),
              backgroundColor: donutData.map((_, i) => donutColors[i % donutColors.length]),
              borderColor: '#fff', borderWidth: 2,
            }]
          },
          options: {
            responsive: false, animation: false,
            plugins: { legend: { position: 'right', labels: { font: { size: 11 }, color: '#1a2235' } } }
          }
        });
        await new Promise(r => setTimeout(r, 250));
        const donutImg = donutCanvas.toDataURL('image/png');

        // ── Gráfica de evolución (si hay snapshots) ──
        const { data: snapshots } = await sb.from('portfolio_snapshots').select('total_value, created_at').order('created_at', { ascending: true });
        let evolutionImg = null;
        if (snapshots && snapshots.length > 1) {
          const evoCanvas = document.getElementById('pdf-canvas-evolution');
          if (window._pdfEvoChart) window._pdfEvoChart.destroy();
          window._pdfEvoChart = new Chart(evoCanvas.getContext('2d'), {
            type: 'line',
            data: {
              labels: snapshots.map(s => new Date(s.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })),
              datasets: [{
                label: 'Valor total', data: snapshots.map(s => s.total_value),
                borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.12)',
                borderWidth: 2, fill: true, tension: 0.3, pointRadius: 2,
              }]
            },
            options: {
              responsive: false, animation: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#1a2235', font: { size: 10 } }, grid: { color: '#e5e7eb' } },
                y: { ticks: { color: '#1a2235', font: { size: 10 } }, grid: { color: '#e5e7eb' } }
              }
            }
          });
          await new Promise(r => setTimeout(r, 250));
          evolutionImg = evoCanvas.toDataURL('image/png');
        }

        // ── Construcción del PDF ──
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 40;
        let y = 0;

        // Cabecera con marca
        doc.setFillColor(6, 8, 14);
        doc.rect(0, 0, pageW, 90, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('BREAK', margin, 45);
        doc.setTextColor(61, 126, 255);
        doc.text('EVEN', margin + 62, 45);
        doc.setTextColor(160, 170, 190);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Resumen de cartera · Generado el ' + new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }), margin, 65);

        y = 125;
        doc.setTextColor(20, 20, 20);

        // Tarjetas resumen
        const cardW = (pageW - margin * 2 - 24) / 3;
        const cards = [
          { label: 'TOTAL COMPRADO', value: fmtEur(grandTotalBuy), color: [61,126,255] },
          { label: 'TOTAL VENDIDO',  value: fmtEur(grandTotalSell), color: [239,68,68] },
          { label: 'POSICIÓN NETA',  value: fmtEur(grandNet), color: [34,197,94] },
        ];
        cards.forEach((c, i) => {
          const x = margin + i * (cardW + 12);
          doc.setDrawColor(225, 228, 235);
          doc.setLineWidth(1);
          doc.roundedRect(x, y, cardW, 60, 6, 6, 'S');
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 130);
          doc.text(c.label, x + 12, y + 20);
          doc.setFontSize(15);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...c.color);
          doc.text(c.value, x + 12, y + 42);
          doc.setFont('helvetica', 'normal');
        });

        y += 90;

        // Tabla de posiciones
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
        doc.setFont('helvetica', 'bold');
        doc.text('Posiciones por activo', margin, y);
        y += 18;

        const colX = [margin, margin + 80, margin + 160, margin + 240, margin + 350, margin + 440];
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 140);
        ['TICKER','COMPRAS','VENTAS','COMPRA MEDIA','POSICIÓN NETA'].forEach((h, i) => doc.text(h, colX[i], y));
        y += 8;
        doc.setDrawColor(225, 228, 235);
        doc.line(margin, y, pageW - margin, y);
        y += 14;

        doc.setFontSize(9);
        tickerStats.forEach((t, idx) => {
          if (y > 760) { doc.addPage(); y = 50; }
          if (idx % 2 === 0) {
            doc.setFillColor(248, 249, 251);
            doc.rect(margin, y - 11, pageW - margin * 2, 18, 'F');
          }
          doc.setTextColor(20, 20, 20);
          doc.setFont('helvetica', 'bold');
          doc.text(t.ticker, colX[0], y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 90);
          doc.text(String(t.buys), colX[1], y);
          doc.text(String(t.sells), colX[2], y);
          doc.setTextColor(217, 150, 30);
          doc.text(t.buys ? fmtEur(t.avg) : '—', colX[3], y);
          doc.setTextColor(t.net < 0 ? 220 : 60, t.net < 0 ? 38 : 140, t.net < 0 ? 38 : 90);
          doc.setFont('helvetica', 'bold');
          doc.text(fmtEur(t.net), colX[4], y);
          y += 18;
        });

        y += 20;

        // Gráfica donut
        if (donutData.length > 0) {
          if (y > 560) { doc.addPage(); y = 50; }
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(20, 20, 20);
          doc.text('Distribución de la cartera', margin, y);
          y += 14;
          const imgW = pageW - margin * 2;
          const imgH = imgW * (320 / 500);
          doc.addImage(donutImg, 'PNG', margin, y, imgW, imgH);
          y += imgH + 28;
        }

        // Gráfica evolución
        if (evolutionImg) {
          if (y > 560) { doc.addPage(); y = 50; }
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(20, 20, 20);
          doc.text('Evolución del patrimonio', margin, y);
          y += 14;
          const imgW = pageW - margin * 2;
          const imgH = imgW * (280 / 600);
          doc.addImage(evolutionImg, 'PNG', margin, y, imgW, imgH);
        }

        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let p = 1; p <= pageCount; p++) {
          doc.setPage(p);
          doc.setFontSize(8);
          doc.setTextColor(160, 160, 170);
          doc.text('BREAK EVEN · Documento generado automáticamente, no constituye asesoramiento financiero', margin, 810);
        }

        doc.save('break-even-resumen-' + new Date().toISOString().slice(0,10) + '.pdf');
      } catch (err) {
        alert('Error generando el PDF: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }


    /* ── TABS (portfolio positions) ── */
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + target).classList.remove('active');
        document.querySelectorAll('[id^="panel-"]').forEach(p => p.classList.remove('active'));
        document.getElementById('panel-' + target).classList.add('active');
      });
    });

    /* ── SLIDE TABS (sobre mí) ── */
    document.querySelectorAll('.slide-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.section-card').querySelectorAll('.slide-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        btn.closest('.section-card').querySelectorAll('.slide-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById('slide-' + btn.dataset.slide).classList.remove('hidden');
      });
    });
    document.querySelectorAll('.tab-btn[data-btab]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('[id^="bpanel-"]').forEach(p => p.classList.remove('active'));
        document.getElementById('bpanel-' + btn.dataset.btab).classList.add('active');
      });
    });

    /* ── COMPOUND INTEREST ── */
    function fmt(n) {
      return '€' + Math.round(n).toLocaleString('es-ES');
    }

    let ciChart = null;

    function calcCI() {
      const capital = +document.getElementById('sl-capital').value;
      const monthly = +document.getElementById('sl-monthly').value;
      const rateAnn = +document.getElementById('sl-rate').value;
      const years   = +document.getElementById('sl-years').value;
      const r = rateAnn / 100 / 12;

      // Update display values
      document.getElementById('disp-capital').textContent = fmt(capital);
      document.getElementById('disp-monthly').textContent = '€' + monthly;
      document.getElementById('disp-rate').textContent    = rateAnn + '%';
      document.getElementById('disp-years').textContent   = years + ' año' + (years === 1 ? '' : 's');

      const labels = [];
      const dataInvested = [];
      const dataTotal = [];

      for (let y = 0; y <= years; y++) {
        const n = y * 12;
        const invested = capital + monthly * n;
        const total = r > 0
          ? capital * Math.pow(1 + r, n) + monthly * (Math.pow(1 + r, n) - 1) / r
          : capital + monthly * n;

        labels.push(y === 0 ? 'Hoy' : 'Año ' + y);
        dataInvested.push(Math.round(invested));
        dataTotal.push(Math.round(total));
      }

      const finalTotal    = dataTotal[dataTotal.length - 1];
      const finalInvested = dataInvested[dataInvested.length - 1];
      const profit        = finalTotal - finalInvested;
      const mult          = (finalTotal / finalInvested).toFixed(1);

      document.getElementById('r-invested').textContent = fmt(finalInvested);
      document.getElementById('r-final').textContent    = fmt(finalTotal);
      document.getElementById('r-profit').textContent   = fmt(profit);
      document.getElementById('r-mult').textContent     = mult + 'x';

      if (ciChart) {
        ciChart.data.labels = labels;
        ciChart.data.datasets[0].data = dataInvested;
        ciChart.data.datasets[1].data = dataTotal;
        ciChart.update('none');
      }
    }

    function initChart() {
      const ctx = document.getElementById('ci-chart').getContext('2d');
      ciChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Total invertido',
              data: [],
              borderColor: '#2a3a55',
              backgroundColor: 'rgba(26,34,53,0.5)',
              borderWidth: 1.5,
              fill: true,
              tension: 0.35,
              pointRadius: 0,
            },
            {
              label: 'Con interés compuesto',
              data: [],
              borderColor: '#3d7eff',
              backgroundColor: 'rgba(61,127,255,0.08)',
              borderWidth: 2,
              fill: true,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: '#3d7eff',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: true, position: 'top', align: 'end',
              labels: {
                color: '#3a4d6a', font: { size: 11, family: 'Inter' },
                usePointStyle: true, pointStyleWidth: 8, boxHeight: 6, padding: 16,
              }
            },
            tooltip: {
              backgroundColor: '#0c1018', borderColor: '#1a2235', borderWidth: 1,
              titleColor: '#dde8ff', bodyColor: '#3a4d6a', padding: 12,
              callbacks: {
                label: ctx => '  ' + ctx.dataset.label + ':  ' + fmt(ctx.raw)
              }
            }
          },
          scales: {
            x: {
              grid: { color: '#111827' },
              ticks: { color: '#3a4d6a', font: { size: 11, family: 'Inter' }, maxTicksLimit: 9 }
            },
            y: {
              grid: { color: '#111827' },
              ticks: {
                color: '#3a4d6a', font: { size: 11, family: 'Inter' },
                callback: v => v >= 1000000 ? '€' + (v/1000000).toFixed(1) + 'M'
                              : v >= 1000    ? '€' + (v/1000).toFixed(0) + 'k'
                              : '€' + v
              }
            }
          }
        }
      });

      ['sl-capital','sl-monthly','sl-rate','sl-years'].forEach(id => {
        document.getElementById(id).addEventListener('input', calcCI);
      });

      calcCI();
    }

    function dismissTip() {
      const banner = document.getElementById('tip-dividendos');
      if (!banner) return;
      banner.classList.add('hiding');
      setTimeout(() => banner.remove(), 350);
      localStorage.setItem('be_tip_div_dismissed', '1');
    }

    /* ══════════════════════════════════════════════
       FOTO DE PERFIL
    ══════════════════════════════════════════════ */
    function initProfilePhoto() {
      const saved = localStorage.getItem('be_profile_photo');
      if (saved) showPhoto(saved);
      const input = document.getElementById('photo-input');
      if (!input) return;
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          const b64 = e.target.result;
          localStorage.setItem('be_profile_photo', b64);
          showPhoto(b64);
        };
        reader.readAsDataURL(file);
      });
    }
    function showPhoto(src) {
      const img = document.getElementById('profile-photo');
      const def = document.getElementById('photo-default');
      if (!img) return;
      img.src = src; img.style.display = 'block';
      if (def) def.style.display = 'none';
    }

    /* ══════════════════════════════════════════════
       DIARIO DE INVERSIÓN — Blog
    ══════════════════════════════════════════════ */

    async function loadBlog() {
      // Mostrar formulario solo si es Miguel
      const { data: { user } } = await sb.auth.getUser();
      const isAdmin = user && user.email === ADMIN_EMAIL;
      const writeWrap = document.getElementById('blog-write-wrap');
      if (writeWrap) writeWrap.style.display = isAdmin ? 'block' : 'none';

      // Cargar posts
      const { data: posts, error } = await sb.from('posts')
        .select('*').order('created_at', { ascending: false });

      const list = document.getElementById('blog-posts-list');
      if (!list) return;

      if (error) {
        list.innerHTML = '<div class="assets-empty">Error cargando entradas. Asegúrate de que la tabla "posts" existe en Supabase.</div>';
        return;
      }
      if (!posts || posts.length === 0) {
        list.innerHTML = '<div class="assets-empty" style="padding:32px;text-align:center">Todavía no hay entradas. ¡Sé el primero en publicar tu análisis!</div>';
        return;
      }

      list.innerHTML = '';
      posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'section-card';
        card.style.marginBottom = '12px';
        const date = new Date(post.created_at).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' });
        card.innerHTML =
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
            '<div style="font-family:Space Grotesk,sans-serif;font-size:17px;font-weight:700;color:var(--txt);flex:1">' + (post.title || 'Sin título') + '</div>' +
            (post.ticker ? '<span style="font-size:11px;padding:3px 10px;background:rgba(61,127,255,0.12);border:1px solid rgba(61,127,255,0.25);border-radius:20px;color:#3d7eff;font-weight:600">' + post.ticker + '</span>' : '') +
            (isAdmin ? '<button onclick="deletePost(\'' + post.id + '\')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:18px;line-height:1;padding:0 4px;transition:color 0.15s" onmouseover="this.style.color=\'#ef4444\'" onmouseout="this.style.color=\'var(--muted)\'">×</button>' : '') +
          '</div>' +
          '<div style="font-size:11px;color:var(--muted);margin-bottom:12px;letter-spacing:0.04em">' + date + ' · Miguel</div>' +
          '<div style="font-size:13px;color:var(--txt);line-height:1.75;white-space:pre-wrap">' + (post.content || '') + '</div>';
        list.appendChild(card);
      });
    }

    async function deletePost(id) {
      if (!confirm('¿Borrar esta entrada?')) return;
      await sb.from('posts').delete().eq('id', id);
      loadBlog();
    }

    // ── PORT TAB BAR ──
    // ── FORMSPREE — Feedback ──
    const form = document.getElementById('form-feedback');
    if (form) {
      const msgEl = document.getElementById('feedback-msg');
      const btn   = document.getElementById('btn-feedback-submit');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        try {
          const res = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok) {
            form.reset();
            msgEl.style.color = '#22c55e';
            msgEl.textContent = '✓ Enviado. ¡Gracias!';
            setTimeout(() => { msgEl.textContent = ''; }, 4000);
          } else {
            msgEl.style.color = '#ef4444';
            msgEl.textContent = 'Error al enviar. Inténtalo de nuevo.';
          }
        } catch {
          msgEl.style.color = '#ef4444';
          msgEl.textContent = 'Error de conexión.';
        }
        btn.disabled = false;
        btn.textContent = 'Enviar feedback →';
      });
    }

    window.addEventListener('load', () => {
      initProfilePhoto();

      // ── PORT TAB BAR — inicializar aquí para garantizar que el DOM está listo ──
      document.querySelectorAll('.port-tab[data-screen]').forEach(tab => {
        tab.addEventListener('click', () => {
          const screen = tab.dataset.screen;
          document.querySelectorAll('.port-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          if (screen === 'none') return;
          if (screen === 'assets') { assetsFrom = 'portfolio'; goTo('assets'); return; }
          if (screen === 'blog')   { goTo('blog'); loadBlog(); return; }
          goTo(screen);
        });
      });

      const publishBtn = document.getElementById('btn-publish-post');
      if (publishBtn) {
        publishBtn.addEventListener('click', async () => {
          const title   = document.getElementById('blog-title').value.trim();
          const ticker  = document.getElementById('blog-ticker').value.trim().toUpperCase() || null;
          const content = document.getElementById('blog-content').value.trim();
          const msg     = document.getElementById('blog-msg');
          if (!title || !content) { msg.style.color='#ef4444'; msg.textContent='Añade título y contenido.'; return; }
          const userId = await getUserId();
          if (!userId) { msg.style.color='#ef4444'; msg.textContent='Inicia sesión primero.'; return; }
          const { error } = await sb.from('posts').insert({ user_id:userId, title, ticker, content });
          if (error) { msg.style.color='#ef4444'; msg.textContent='Error: ' + error.message; return; }
          document.getElementById('blog-title').value   = '';
          document.getElementById('blog-ticker').value  = '';
          document.getElementById('blog-content').value = '';
          msg.style.color='#22c55e'; msg.textContent='✓ Publicado';
          setTimeout(()=>{ msg.textContent=''; }, 3000);
          loadBlog();
        });
      }
      if (localStorage.getItem('be_tip_div_dismissed')) {
        const b = document.getElementById('tip-dividendos');
        if (b) b.remove();
      }
      initAllocChart();
      initChart();
      initRentBadges();
      initAssetsScreen();
    });

    /* ── RENTABILIDAD BADGES ── */
    function applyRent(badge, val) {
      badge.textContent = val || '—';
      const n = parseFloat((val || '').replace('%','').replace(',','.'));
      badge.className = 'rent-badge ' + (!isNaN(n) ? (n > 0 ? 'pos' : n < 0 ? 'neg' : 'neutral') : 'neutral');
    }

    function initRentBadges() {
      document.querySelectorAll('.rent-badge[data-rkey]').forEach(badge => {
        const key = badge.dataset.rkey;
        const saved = localStorage.getItem(key);
        if (saved !== null) applyRent(badge, saved);

        badge.addEventListener('click', () => {
          if (badge.querySelector('input')) return;
          const current = localStorage.getItem(key) || '';
          const input = document.createElement('input');
          input.type = 'text'; input.className = 'rent-input';
          input.placeholder = '+5.2%'; input.value = current;
          badge.textContent = ''; badge.appendChild(input);
          input.focus(); input.select();

          function save() {
            const v = input.value.trim();
            if (v) localStorage.setItem(key, v); else localStorage.removeItem(key);
            applyRent(badge, v || '—');
          }
          input.addEventListener('blur', save);
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter')  input.blur();
            if (e.key === 'Escape') { localStorage.removeItem(key); applyRent(badge, '—'); }
          });
          input.addEventListener('click', e => e.stopPropagation());
        });
      });
    }

    async function refreshPortfolio() {
      const assets = isAdmin ? await loadAssets() : await loadMiguelAssets();

      // ── Calcular métricas ──
      const grouped = {};
      assets.forEach(a => {
        const t = (a.ticker || '?').toUpperCase();
        if (!grouped[t]) grouped[t] = { ticker:t, broker:a.broker||'', buys:[], sells:[], dividends:[] };
        if (a.type === 'venta')     grouped[t].sells.push(a);
        else if (a.type === 'dividendo') grouped[t].dividends.push(a);
        else                             grouped[t].buys.push(a);
      });

      let totalInvested = 0, totalSells = 0, openValue = 0, openCount = 0;
      Object.values(grouped).forEach(g => {
        const buyVal  = g.buys.reduce((s,a)  => s+(parseFloat(a.value)||0), 0);
        const sellVal = g.sells.reduce((s,a) => s+(parseFloat(a.value)||0), 0);
        const net = buyVal - sellVal;
        totalInvested += buyVal;
        totalSells    += sellVal;
        if (net > 0.50) { openValue += net; openCount++; }
      });

      const pnl = totalSells - (totalInvested - openValue); // ganancia realizada

      const elT = document.getElementById('mv-total');
      const elI = document.getElementById('mv-invested');
      const elP = document.getElementById('mv-pnl');
      const elN = document.getElementById('mv-positions');
      if (elT) elT.textContent = fmtEur(openValue);
      if (elI) elI.textContent = fmtEur(totalInvested);
      if (elP) {
        elP.textContent = (pnl >= 0 ? '+' : '') + fmtEur(pnl);
        elP.className = 'metric-value ' + (pnl >= 0 ? 'positive' : 'negative');
      }
      if (elN) elN.textContent = openCount;

      // ── Rentabilidad total y anualizada ──
      const elA = document.getElementById('mv-annualized');
      const elS = document.getElementById('mv-since');
      const elB = document.getElementById('mv-annualized-bar');

      if (totalInvested > 0 && elA) {
        const totalReturnPct = ((openValue + totalSells - totalInvested) / totalInvested) * 100;

        const allBuys = assets.filter(a => a.type !== 'dividendo' && a.created_at);
        let annualizedText = '';
        let sinceText = '';

        if (allBuys.length > 0) {
          const oldest = allBuys.reduce((min, a) => a.created_at < min ? a.created_at : min, allBuys[0].created_at);
          const startDate = new Date(oldest);
          const yearsElapsed = (new Date() - startDate) / (1000 * 60 * 60 * 24 * 365.25);

          if (yearsElapsed >= (1/12)) {
            const annualized = (Math.pow((openValue + totalSells) / totalInvested, 1 / yearsElapsed) - 1) * 100;
            annualizedText = ' · ' + (annualized >= 0 ? '+' : '') + annualized.toFixed(1) + '%/año';
            sinceText = 'desde ' + startDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
          } else {
            sinceText = '⚠️ Añade más historial para ver la rentabilidad anualizada';
          }
        }

        elA.textContent = (totalReturnPct >= 0 ? '+' : '') + totalReturnPct.toFixed(1) + '% total' + annualizedText;
        elA.className = 'metric-value ' + (totalReturnPct >= 0 ? 'positive' : 'negative');
        if (elS) elS.textContent = sinceText;
        if (elB) elB.style.width = Math.min(Math.abs(totalReturnPct) * 2, 100) + '%';
      }

      // ── Posiciones actuales ──
      const panelTrad   = document.getElementById('panel-trad');
      const panelCrypto = document.getElementById('panel-crypto');
      if (!panelTrad || !panelCrypto) return;

      const openPositions = Object.values(grouped).filter(g => {
        const buyVal  = g.buys.reduce((s,a)  => s+(parseFloat(a.value)||0), 0);
        const sellVal = g.sells.reduce((s,a) => s+(parseFloat(a.value)||0), 0);
        return (buyVal - sellVal) > 0.50;
      }).map(g => {
        const buyVal  = g.buys.reduce((s,a)  => s+(parseFloat(a.value)||0), 0);
        const sellVal = g.sells.reduce((s,a) => s+(parseFloat(a.value)||0), 0);
        const buyQty  = g.buys.reduce((s,a)  => s+(parseFloat(a.quantity)||0), 0);
        const sellQty = g.sells.reduce((s,a) => s+(parseFloat(a.quantity)||0), 0);
        const netQty  = buyQty - sellQty;
        const totalCost = g.buys.reduce((s,a) => s+((parseFloat(a.quantity)||0)*(parseFloat(a.price_local)||0)), 0);
        const avgPrice  = buyQty > 0 ? totalCost / buyQty : 0;
        const ccy       = g.buys[0]?.currency || 'USD';
        return { ticker:g.ticker, broker:g.broker, net:buyVal-sellVal, netQty, avgPrice, ccy, isCrypto:isCrypto(g.ticker, g.broker) };
      }).sort((a,b) => b.net - a.net);

      function buildPositionRow(p) {
        const row = document.createElement('div');
        row.className = 'position-row';
        row.innerHTML =
          '<span class="pos-ticker">' + p.ticker + '</span>' +
          '<span class="pos-broker">' +
            (p.netQty > 0 ? p.netQty.toLocaleString('es-ES',{maximumFractionDigits:4}) + ' acc.' : '') +
            (p.avgPrice > 0 ? ' · @ ' + p.avgPrice.toFixed(4) + ' ' + p.ccy : '') +
            ' · ' + p.broker +
          '</span>' +
          '<span class="pos-value">~' + fmtEur(p.net) + '</span>';
        return row;
      }

      const trad   = openPositions.filter(p => !p.isCrypto);
      const crypto = openPositions.filter(p =>  p.isCrypto);

      panelTrad.innerHTML   = trad.length   ? '' : '<div class="assets-empty">Sin posiciones tradicionales abiertas.</div>';
      panelCrypto.innerHTML = crypto.length ? '' : '<div class="assets-empty">Sin posiciones cripto abiertas.</div>';
      trad.forEach(p   => panelTrad.appendChild(buildPositionRow(p)));
      crypto.forEach(p => panelCrypto.appendChild(buildPositionRow(p)));

      // ── Resumen por estrategia ──
      const stratSection = document.querySelector('.section-card .section-title');
      const stratCard = [...document.querySelectorAll('.section-card')].find(el => el.querySelector('.section-title')?.textContent === 'Resumen por estrategia');
      if (stratCard) {
        stratCard.innerHTML = '<div class="section-title">Resumen por estrategia</div>';
        const totalDivs = assets.filter(a=>a.type==='dividendo').reduce((s,a)=>s+(parseFloat(a.value)||0),0);

        const groups = [
          { label:'📈 Posiciones abiertas', items: openPositions, total: openValue },
          { label:'💰 Dividendos cobrados', items: [], total: totalDivs, extra: true },
          { label:'✅ Beneficio realizado',  items: [], total: pnl,       extra: true },
        ];

        groups.forEach(g => {
          const div = document.createElement('div');
          div.className = 'strategy-group';
          div.innerHTML = '<div class="strategy-header"><span class="strategy-label">'+g.label+'</span><span class="strategy-total" style="color:'+(g.total>=0?'var(--accent)':'#ef4444')+'">'+fmtEur(g.total)+'</span></div>';
          if (!g.extra && g.items.length > 0) {
            g.items.forEach(p => {
              const r = document.createElement('div');
              r.className = 'strategy-row';
              r.innerHTML = '<span class="str-ticker">'+p.ticker+'</span><span class="str-name">'+p.broker+'</span><span class="str-val">'+fmtEur(p.net)+'</span>';
              div.appendChild(r);
            });
          }
          stratCard.appendChild(div);
        });
      }
    }

    const CRYPTO_TICKERS = new Set(['BTC','ETH','XRP','XLM','SOL','BNB','ADA','DOT','AVAX','MATIC','FLR','DOGE','LTC','LINK','UNI','ATOM','NEAR','ALGO','VET','ICP','FIL','HBAR','XTZ','EOS','ZEC','DASH','TRX','USDT','USDC','BUSD','DAI']);
    const CRYPTO_BROKERS = new Set(['bybit','binance','coindepo','kraken','coinbase','kucoin','crypto.com']);

    function isCrypto(ticker, broker) {
      return CRYPTO_TICKERS.has((ticker||'').toUpperCase()) ||
             CRYPTO_BROKERS.has((broker||'').toLowerCase());
    }

    let allocChart = null;

    async function initAllocChart() {
      const allocWrap = document.querySelector('.alloc-wrap');
      if (!allocWrap) return;

      const assets = isAdmin ? await loadAssets() : await loadMiguelAssets();
      const buysOnly = assets.filter(a => (a.type || 'compra') === 'compra');

      // Agrupar por ticker → valor neto
      const grouped = {};
      assets.forEach(a => {
        const t = (a.ticker || '?').toUpperCase();
        if (!grouped[t]) grouped[t] = { ticker: t, broker: a.broker, net: 0 };
        const v = parseFloat(a.value) || 0;
        grouped[t].net += (a.type === 'venta' ? -v : a.type === 'dividendo' ? 0 : v);
      });

      const allPos = Object.values(grouped).filter(p => p.net > 0.50).sort((a,b) => b.net - a.net);
      const tradPos   = allPos.filter(p => !isCrypto(p.ticker, p.broker));
      const cryptoPos = allPos.filter(p =>  isCrypto(p.ticker, p.broker));

      if (allPos.length === 0) {
        allocWrap.innerHTML = '<div class="assets-empty" style="grid-column:1/-1">Sin posiciones todavía. Importa tus activos para ver la distribución.</div>';
        return;
      }

      const COLORS = ['#3d7eff','#22c55e','#fac850','#06b6d4','#8b5cf6','#ec4899','#f97316','#14b8a6','#84cc16','#f43f5e','#a78bfa','#fb923c'];

      // Añadir color
      allPos.forEach((p,i) => p.color = COLORS[i % COLORS.length]);

      // Reconstruir HTML de la sección
      allocWrap.innerHTML = `
        <div class="alloc-chart-wrap" style="max-width:240px">
          <canvas id="alloc-chart"></canvas>
        </div>
        <div style="flex:1;min-width:0">
          <div class="tab-bar" style="margin-bottom:14px">
            <button class="tab-btn active" data-atab="trad" style="flex:1">
              <span class="tab-dot" style="background:#3d7eff"></span>Tradicional
            </button>
            <button class="tab-btn" data-atab="crypto" style="flex:1">
              <span class="tab-dot" style="background:#f7931a"></span>Cripto
            </button>
          </div>
          <div id="alloc-legend-trad"   class="alloc-legend"></div>
          <div id="alloc-legend-crypto" class="alloc-legend" style="display:none"></div>
        </div>`;

      function buildLegend(containerId, positions, total) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (positions.length === 0) {
          container.innerHTML = '<div class="assets-empty" style="padding:12px 0;font-size:12px">Sin posiciones en esta categoría.</div>';
          return;
        }
        positions.forEach(p => {
          const pct = total > 0 ? ((p.net / total) * 100).toFixed(1) : '0.0';
          const row = document.createElement('div');
          row.className = 'legend-row';
          row.innerHTML =
            '<span class="legend-dot" style="background:' + p.color + '"></span>' +
            '<span class="legend-ticker">' + p.ticker + '</span>' +
            '<span class="legend-name">' + (p.broker || '') + '</span>' +
            '<span class="legend-val">~€' + Math.round(p.net).toLocaleString('es-ES') + '</span>' +
            '<span class="legend-pct" style="color:' + p.color + '">' + pct + '%</span>';
          container.appendChild(row);
        });
      }

      const grandTotal = allPos.reduce((s,p) => s + p.net, 0);
      buildLegend('alloc-legend-trad',   tradPos,   grandTotal);
      buildLegend('alloc-legend-crypto', cryptoPos, grandTotal);

      // Tabs de la leyenda
      allocWrap.querySelectorAll('.tab-btn[data-atab]').forEach(btn => {
        btn.addEventListener('click', () => {
          allocWrap.querySelectorAll('.tab-btn[data-atab]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('alloc-legend-trad').style.display   = btn.dataset.atab === 'trad'   ? '' : 'none';
          document.getElementById('alloc-legend-crypto').style.display = btn.dataset.atab === 'crypto' ? '' : 'none';
        });
      });

      // Donut
      const totalFmt = '€' + Math.round(grandTotal).toLocaleString('es-ES');
      const centerPlugin = {
        id: 'centerText',
        afterDraw(chart) {
          const { ctx, chartArea: { left, right, top, bottom } } = chart;
          const cx = (left + right) / 2, cy = (top + bottom) / 2;
          ctx.save();
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = '#3d7eff'; ctx.shadowBlur = 16;
          ctx.font = 'bold 18px "Space Grotesk",sans-serif';
          ctx.fillStyle = '#dde8ff';
          ctx.fillText(totalFmt, cx, cy - 10);
          ctx.shadowBlur = 0;
          ctx.font = '500 9px "Inter",sans-serif';
          ctx.fillStyle = '#3a4d6a';
          ctx.fillText('TOTAL', cx, cy + 10);
          ctx.restore();
        }
      };

      if (allocChart) { allocChart.destroy(); allocChart = null; }
      const canvas = document.getElementById('alloc-chart');
      if (!canvas) return;
      allocChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        plugins: [centerPlugin],
        data: {
          labels: allPos.map(p => p.ticker),
          datasets: [{
            data:            allPos.map(p => p.net),
            backgroundColor: allPos.map(p => p.color),
            borderColor:     '#06080e',
            borderWidth:     3,
            hoverOffset:     7,
          }]
        },
        options: {
          cutout: '65%', responsive: true, maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0c1018', borderColor: '#1a2235', borderWidth: 1,
              titleColor: '#dde8ff', bodyColor: '#3a4d6a', padding: 12,
              callbacks: { label: c => '  ' + c.label + ':  ~€' + Math.round(c.raw).toLocaleString('es-ES') + '  (' + ((c.raw / grandTotal) * 100).toFixed(1) + '%)' }
            }
          }
        }
      });
    }
