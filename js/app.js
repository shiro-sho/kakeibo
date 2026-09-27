/**
 * アプリメインコントローラー（UIレンダリング・インタラクション）
 */

import { store, SPREADSHEET_CATEGORIES } from './store.js';
import { ChartRenderer } from './charts.js';
import { GasApiClient } from './api.js';

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast-msg ${type}`;
  const icon = type === 'success' ? '✓' : '⚠';
  t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// クレジットカード明細を日付の降順（最新日付が一番上）でソートする関数
function sortTransactionsDesc(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    const timeA = new Date(String(a.date).replace(/-/g, '/')).getTime();
    const timeB = new Date(String(b.date).replace(/-/g, '/')).getTime();
    if (isNaN(timeA) && isNaN(timeB)) return String(b.date).localeCompare(String(a.date));
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    if (timeB !== timeA) return timeB - timeA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

// カテゴリ別カラーパレット定義（デザインタブと連動した洗練されたチタンカラー）
const CATEGORY_COLORS = {
  '食費': '#f59e0b',
  '飲み物代': '#d97706',
  '昼ご飯': '#10b981',
  '外食': '#f97316',
  '交際費': '#ec4899',
  'お菓子代': '#f43f5e',
  'おやつ': '#fb7185',
  '夜食代': '#8b5cf6',
  '日用品費': '#06b6d4',
  'デート': '#a855f7',
  '交通費': '#3b82f6',
  'Suica': '#0284c7',
  'B/43': '#6366f1',
  '美容費': '#ec4899',
  '医療費': '#14b8a6',
  '被服費': '#8b5cf6',
  '娯楽費': '#e11d48',
  '通信費': '#0ea5e9',
  '水道光熱費': '#eab308',
  '月額課金': '#64748b',
  '勉強・資格': '#10b981',
  '雑費': '#94a3b8',
  '引落系、課金系': '#8b5cf6',
  '未分類': '#94a3b8'
};

class AppController {
  constructor() {
    this.api = new GasApiClient(store);
    this.chartRenderer = null;
    this.currentView = 'home';
    this.currentTxGroupFilter = 'all';
    window.store = store;
    window.app = this;
    this.init();
  }

  init() {
    // 保存済みテーマの適用
    this.initTheme();

    // グラフレンダラー初期化 (横棒グラフ)
    this.chartRenderer = new ChartRenderer('category-bar-chart');

    // ストアの変更購読
    store.subscribe((summary) => this.render(summary));

    // イベントリスナーのセットアップ
    this.setupNavigation();
    this.setupTransactionsSegment();
    this.setupTxBreakdown();
    this.setupModals();
    this.setupCategoryPicker();
    this.setupForms();
    this.setupSettings();
    this.setupThemeSwitcher();
    this.setupCalcInsight();
    this.initIcon();

    // 初回レンダリング
    this.render(store.getSummary());

    // GAS URL設定済みの場合はバックグラウンドで最新データを同期
    if (this.api.isConfigured()) {
      this.api.fetchMonthData(store.data.currentMonth || '202609')
        .then((data) => {
          if (data) store.applyMonthData(data);
        })
        .catch((err) => {
          console.warn('自動データ同期スキップ:', err);
        });
    }
  }

  // --- 計算根拠アコーディオン制御 ---
  setupCalcInsight() {
    const btn = document.getElementById('btn-toggle-calc-insight');
    const drawer = document.getElementById('calc-insight-drawer');
    const chevron = document.getElementById('insight-chevron-icon');

    btn?.addEventListener('click', () => {
      const isOpen = drawer?.classList.toggle('open');
      chevron?.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // --- クレカ明細カテゴリ内訳アコーディオン制御 ---
  setupTxBreakdown() {
    const btn = document.getElementById('btn-toggle-tx-breakdown');
    const drawer = document.getElementById('tx-breakdown-drawer');
    const chevron = document.getElementById('tx-breakdown-chevron');

    btn?.addEventListener('click', () => {
      const isOpen = drawer?.classList.toggle('open');
      chevron?.classList.toggle('open', isOpen);
    });
  }

  // --- アイコン管理システム ---
  initIcon() {
    const savedIcon = localStorage.getItem('kakeibo_icon') || './icons/cow-cute.png';
    this.applyAppIcon(savedIcon);

    document.querySelectorAll('.icon-choice-card').forEach((card) => {
      card.addEventListener('click', () => {
        const src = card.dataset.iconSrc;
        if (src) this.applyAppIcon(src);
      });
    });
  }

  applyAppIcon(src) {
    if (!src) return;
    const logoImg = document.getElementById('app-logo');
    const touchIcon = document.getElementById('dynamic-touch-icon');
    const favicon = document.getElementById('dynamic-favicon');

    if (logoImg) logoImg.src = src;
    if (touchIcon) touchIcon.href = src;
    if (favicon) favicon.href = src;

    // ページ内のすべての apple-touch-icon および favicon link タグを更新
    document.querySelectorAll('link[rel="apple-touch-icon"], link[rel="icon"]').forEach((el) => {
      el.href = src;
    });

    localStorage.setItem('kakeibo_icon', src);

    // URL に ?icon=... を同期（Safariホーム画面追加対策）
    try {
      const u = new URL(window.location.href);
      const filename = src.split('/').pop().replace('.png', '');
      u.searchParams.set('icon', filename);
      window.history.replaceState({}, '', u.toString());
    } catch (e) { }

    // グリッド内のアクティブ枠ハイライト
    document.querySelectorAll('.icon-choice-card').forEach((card) => {
      const isMatch = card.dataset.iconSrc === src;
      const img = card.querySelector('img');
      if (isMatch) {
        card.classList.add('active');
        if (img) img.style.borderColor = 'var(--accent-primary)';
      } else {
        card.classList.remove('active');
        if (img) img.style.borderColor = 'var(--border-glass)';
      }
    });
  }

  // --- テーマ管理システム ---
  initTheme() {
    const savedTheme = localStorage.getItem('kakeibo_theme') || 'cyber';
    this.applyTheme(savedTheme);
  }

  applyTheme(themeName) {
    if (themeName === 'cyber') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeName);
    }
    localStorage.setItem('kakeibo_theme', themeName);

    // モーダル内のカードアクティブ表示
    document.querySelectorAll('.theme-card').forEach((c) => {
      if (c.dataset.setTheme === themeName) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    // グラフの再描画（テーマの背景や色に合わせる）
    if (this.currentView === 'analytics' && this.chartRenderer) {
      this.chartRenderer.renderCategoryBarChart(store.getSummary().categoryTotals);
    }
  }

  setupThemeSwitcher() {
    const btnTheme = document.getElementById('btn-theme-switcher');
    const modalTheme = document.getElementById('modal-theme-switcher');
    const btnCloseTheme = document.getElementById('btn-close-theme');

    btnTheme?.addEventListener('click', () => modalTheme?.classList.add('active'));
    btnCloseTheme?.addEventListener('click', () => modalTheme?.classList.remove('active'));

    document.querySelectorAll('.theme-card').forEach((card) => {
      card.addEventListener('click', () => {
        const theme = card.dataset.setTheme;
        this.applyTheme(theme);
        modalTheme?.classList.remove('active');
      });
    });
  }

  // --- ナビゲーション制御 ---
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // クイックリンク
    document.getElementById('link-to-accounts')?.addEventListener('click', () => this.switchView('accounts'));
    document.getElementById('link-to-transactions')?.addEventListener('click', () => this.switchView('transactions'));
  }

  // クレカ明細のグループ切り替えタブ制御 (すべて / 💳 クレカ明細 / 🔄 引落系・課金系)
  setupTransactionsSegment() {
    document.querySelectorAll('#tx-segment-control .tx-segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#tx-segment-control .tx-segment-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTxGroupFilter = btn.dataset.group || 'all';
        this.renderFullTransactions(store.getSummary());
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;

    // パネル切り替え
    document.querySelectorAll('.view-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById(`view-${viewName}`)?.classList.add('active');

    // ナビボタン切り替え
    document.querySelectorAll('.nav-item').forEach((b) => {
      if (b.dataset.view === viewName) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // 棒グラフ再描画（分析画面の場合）
    if (viewName === 'analytics') {
      setTimeout(() => {
        this.chartRenderer.renderCategoryBarChart(store.getSummary().categoryTotals);
      }, 100);
    }

    // 画面トップへスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- 全体レンダリング ---
  render(summary) {
    this.renderCreditHero(summary);
    this.renderHomeAccounts(summary);
    this.renderForecast(summary);
    this.renderFixedExpenses(summary);
    this.renderRecentTransactions(summary);
    this.renderFullTransactions(summary);
    this.renderAccountsDetail(summary);
    this.renderAnalytics(summary);
    this.renderSettings(summary);
  }

  // 1. メインヒーローカード（来月引落後の使えるお金・自由資金）
  renderCreditHero(s) {
    const heroCard = document.getElementById('credit-hero-card');
    const elForecastAvailable = document.getElementById('val-forecast-available');
    const elCurrentBalance = document.getElementById('val-hero-current-balance');
    const elDeductions = document.getElementById('val-hero-deductions');
    const elNextSalary = document.getElementById('val-hero-next-salary');
    const elCardAvailable = document.getElementById('val-hero-card-available');
    const elCardSpent = document.getElementById('val-hero-card-spent');
    const elWarningBanner = document.getElementById('card-warning-banner');
    const elWarningText = document.getElementById('warning-banner-text');
    const elDailyBudget = document.getElementById('val-daily-budget');
    const elDailyPaceText = document.getElementById('daily-pace-text');

    // 来月引落後の所持金（推定自由資金）
    const forecastVal = s.afterNextMonth ? s.afterNextMonth.total : 0;
    if (elForecastAvailable) {
      elForecastAvailable.textContent = forecastVal.toLocaleString();
      if (forecastVal < 0) {
        elForecastAvailable.style.color = 'var(--accent-rose)';
      } else {
        elForecastAvailable.style.color = 'var(--text-primary)';
      }
    }

    // 計算内訳 (6項目)
    const elCalcCurrent = document.getElementById('val-calc-current');
    const elCalcCurDeduct = document.getElementById('val-calc-current-deductions');
    const elCalcCurSalary = document.getElementById('val-calc-current-salary');
    const elCalcCardSpent = document.getElementById('val-calc-card-spent');
    const elCalcNextFixed = document.getElementById('val-calc-next-fixed');
    const elCalcNextSalary = document.getElementById('val-calc-next-salary');

    // 今月未引落額（クレカ未引落＋未引落固定費）
    const curUnsettledFixed = s.fixedExpenses
      .filter((f) => f.id !== 'credit_card' && !f.settled)
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const curUnsettledCard = s.cardSettled ? 0 : s.currentMonthCardBill;
    const curUnsettledTotal = Math.abs(curUnsettledCard + curUnsettledFixed);

    if (elCalcCurrent) elCalcCurrent.textContent = `¥${s.totalCurrentBalance.toLocaleString()}`;
    if (elCalcCurDeduct) elCalcCurDeduct.textContent = `-¥${curUnsettledTotal.toLocaleString()}`;

    // 給料確定時は「今月給料見込み」のステップを非表示にして5項目に更新（二重加算防止・見やすさ向上）
    const stepCurSalary = document.getElementById('step-calc-cur-salary');
    const elItemCount = document.getElementById('val-calc-item-count');
    if (s.salaries && s.salaries.isCurrentSettled) {
      if (stepCurSalary) stepCurSalary.style.display = 'none';
      if (elItemCount) elItemCount.textContent = '5項目';
    } else {
      if (stepCurSalary) stepCurSalary.style.display = 'flex';
      if (elItemCount) elItemCount.textContent = '6項目';
      if (elCalcCurSalary) elCalcCurSalary.textContent = `+¥${(s.salaries.currentMonth || 250000).toLocaleString()}`;
    }

    if (elCalcCardSpent) elCalcCardSpent.textContent = `-¥${s.totalSpent.toLocaleString()}`;
    if (elCalcNextFixed) elCalcNextFixed.textContent = `-¥${Math.abs(s.pureFixedTotal).toLocaleString()}`;
    if (elCalcNextSalary) elCalcNextSalary.textContent = `+¥${(s.salaries.nextMonth || 250000).toLocaleString()}`;

    // ゴール行ハイライト
    const elCalcResult = document.getElementById('val-calc-result');
    if (elCalcResult) elCalcResult.textContent = `¥${forecastVal.toLocaleString()}`;

    // 旧内訳互換
    if (elCurrentBalance) elCurrentBalance.textContent = `¥${s.totalCurrentBalance.toLocaleString()}`;
    if (elDeductions) {
      const totalDeductions = Math.abs(curUnsettledTotal + s.totalSpent + Math.abs(s.pureFixedTotal));
      elDeductions.textContent = `-¥${totalDeductions.toLocaleString()}`;
    }
    if (elNextSalary) elNextSalary.textContent = `+¥${(s.salaries.nextMonth || 250000).toLocaleString()}`;

    // クレカ枠ステータス
    if (elCardAvailable) elCardAvailable.textContent = `¥${s.cardAvailable.toLocaleString()}`;
    if (elCardSpent) elCardSpent.textContent = `¥${s.totalSpent.toLocaleString()}`;


    // 警告判定（赤字またはカード残枠20万未満）
    if (forecastVal < 0 || s.isWarning) {
      heroCard?.classList.add('warning');
      if (elWarningBanner) {
        elWarningBanner.style.display = 'flex';
        if (forecastVal < 0) {
          if (elWarningText) elWarningText.textContent = `来月引落後に赤字（-¥${Math.abs(forecastVal).toLocaleString()}）の予測です！`;
        } else {
          const shortage = s.cardWarningThreshold - s.cardAvailable;
          if (elWarningText) elWarningText.textContent = `カード利用枠が警告ライン（20万円）を ¥${shortage.toLocaleString()} 下回っています！`;
        }
      }
    } else {
      heroCard?.classList.remove('warning');
      if (elWarningBanner) elWarningBanner.style.display = 'none';
    }
  }

  // 2. 銀行口座サマリー (現在の口座残高を強調、月初残高は専用タップチップに分離)
  renderHomeAccounts(s) {
    const container = document.getElementById('home-accounts-container');
    if (!container) return;

    container.innerHTML = s.accounts
      .map(
        (acc) => `
      <div class="account-card" data-account-id="${acc.id}">
        <div class="account-left">
          <span class="account-badge ${acc.id}"></span>
          <div class="account-info-main">
            <span class="account-name">${acc.name}</span>
            <div class="initial-balance-chip" data-account-id="${acc.id}" title="月初残高を編集（月初に設定）">
              <span class="chip-tag">月初残高</span>
              <span class="chip-amount">¥${acc.initialBalance.toLocaleString()}</span>
              <span class="chip-action">✎ 編集</span>
            </div>
          </div>
        </div>
        <div class="account-right">
          <span class="account-current-label">現在残高</span>
          <span class="account-val ${acc.id}">¥${acc.currentBalance.toLocaleString()}</span>
        </div>
      </div>
    `
      )
      .join('');

    // クリックで残高編集モーダルを開く（カード全体および月初残高チップ）
    container.querySelectorAll('.account-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.accountId;
        const acc = s.accounts.find((a) => a.id === id);
        if (acc) this.openEditAccountModal(acc);
      });
    });

    const elTotal = document.getElementById('val-total-balance');
    if (elTotal) elTotal.textContent = `¥${s.totalCurrentBalance.toLocaleString()}`;
  }

  // 3. 将来予測（引落後金額）
  renderForecast(s) {
    const elAfterCurrent = document.getElementById('val-after-current');
    const elAfterNext = document.getElementById('val-after-next');

    if (elAfterCurrent) {
      elAfterCurrent.textContent = `¥${s.afterCurrentMonth.total.toLocaleString()}`;
      elAfterCurrent.className = `forecast-val ${s.afterCurrentMonth.total >= 0 ? 'positive' : 'negative'}`;
    }
    if (elAfterNext) {
      elAfterNext.textContent = `¥${s.afterNextMonth.total.toLocaleString()}`;
      elAfterNext.className = `forecast-val ${s.afterNextMonth.total >= 0 ? 'positive' : 'negative'}`;
    }
  }

  // 4. 固定費・変動費の2ブロック表示 (Apple Wallet Style)
  renderFixedExpenses(s) {
    const varContainer = document.getElementById('home-variable-container');
    const fixContainer = document.getElementById('home-fixed-container');

    const variableExpenses = s.fixedExpenses.filter((f) => f.id === 'credit_card');
    const fixedExpenses = s.fixedExpenses.filter((f) => f.id !== 'credit_card');

    const getFixedIconSvg = (id) => {
      if (id === 'credit_card') {
        return `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`;
      } else if (id === 'rent') {
        return `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
      } else {
        return `<svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
      }
    };

    const createItemHtml = (f) => `
      <div class="fixed-expense-item ${f.settled ? 'settled' : ''}" data-fixed-id="${f.id}">
        <div class="fixed-left">
          <div class="check-circle">${f.settled ? '✓' : ''}</div>
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; background: rgba(255,255,255,0.06); color: var(--text-secondary); margin-right: 2px;">
            ${getFixedIconSvg(f.id)}
          </span>
          <span class="fixed-name">${f.name}</span>
        </div>
        <span class="fixed-amount">¥${Math.abs(f.amount).toLocaleString()}</span>
      </div>
    `;

    if (varContainer) {
      varContainer.innerHTML = variableExpenses.map(createItemHtml).join('');
      varContainer.querySelectorAll('.fixed-expense-item').forEach((item) => {
        item.addEventListener('click', () => {
          store.toggleFixedExpenseSettled(item.dataset.fixedId);
        });
      });
    }

    if (fixContainer) {
      fixContainer.innerHTML = fixedExpenses.map(createItemHtml).join('');
      fixContainer.querySelectorAll('.fixed-expense-item').forEach((item) => {
        item.addEventListener('click', () => {
          store.toggleFixedExpenseSettled(item.dataset.fixedId);
        });
      });
    }
  }

  // --- ジャンル選択ピッカー（テーマ連動・高視認性モーダル） ---
  setupCategoryPicker() {
    const modal = document.getElementById('modal-select-category');
    const btnClose = document.getElementById('btn-close-category-picker');
    btnClose?.addEventListener('click', () => modal?.classList.remove('active'));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  openCategoryPicker(txId, currentCat) {
    const modal = document.getElementById('modal-select-category');
    const grid = document.getElementById('category-picker-grid');
    const targetInfo = document.getElementById('picker-tx-target-info');
    if (!modal || !grid) return;

    const tx = store.data.transactions?.find((t) => t.id === txId);
    const txName = tx ? tx.name : '';

    if (targetInfo) {
      targetInfo.textContent = txName ? `「${txName}」のジャンルを選択` : '利用明細のジャンルを選択';
    }

    grid.innerHTML = SPREADSHEET_CATEGORIES.map((cat) => {
      const color = CATEGORY_COLORS[cat] || '#94a3b8';
      const isActive = cat === currentCat;
      return `
        <button type="button" class="category-picker-card category-picker-tab ${isActive ? 'active' : ''}" data-category="${cat}">
          <span class="cat-tab-dot" style="background: ${color};"></span>
          <span class="cat-picker-name cat-tab-name">${cat}</span>
          ${isActive ? '<span class="cat-tab-check">✓</span>' : ''}
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.category-picker-card').forEach((card) => {
      card.addEventListener('click', async () => {
        const newCat = card.dataset.category;
        modal.classList.remove('active');

        // 1. バッジの表示テキストとドット色を即座に更新（体感ラグゼロ）
        const badgeName = document.querySelector(`.timeline-item[data-tx-id="${txId}"] .badge-cat-name`);
        if (badgeName) badgeName.textContent = newCat;
        const badgeDot = document.querySelector(`.timeline-item[data-tx-id="${txId}"] .badge-cat-dot`);
        if (badgeDot) badgeDot.style.background = CATEGORY_COLORS[newCat] || '#94a3b8';

        // 2. ストア更新 & LocalStorage保存（自動で全コンポーネントが再描画されます）
        store.updateTransactionCategory(txId, newCat);
        showToast(`ジャンルを「${newCat}」に変更しました`);

        // 3. GAS（スプレッドシートC列）へ非同期永続化
        try {
          if (this.api.isConfigured()) {
            const res = await this.api.updateTransactionCategory(txId, newCat, store.data.currentMonth);
            if (res && res.status === 'success') {
              console.log('スプレッドシート更新成功:', res);
            }
          }
        } catch (err) {
          console.warn('スプレッドシートへのカテゴリ反映警告:', err);
          showToast('スプレッドシートへの反映に失敗しました', 'warning');
        }
      });
    });

    modal.classList.add('active');
  }

  // 明細アイテムのHTML生成（テーマ連動ジャンルバッジ & 金額未確定バッジ対応）
  createTransactionHtml(tx) {
    const isRec = tx.group === 'recurring';
    const currentCat = tx.category || (isRec ? '引落系、課金系' : '未分類');
    const catColor = CATEGORY_COLORS[currentCat] || '#94a3b8';
    const isPending = tx.amountPending || (isRec && (!tx.amount || Number(tx.amount) === 0));

    return `
      <div class="timeline-item ${isPending ? 'item-pending' : ''}" data-tx-id="${tx.id}">
        <div class="tx-main">
          <div class="tx-category-wrapper">
            <button type="button" class="tx-category-badge ${isRec ? 'tx-badge-recurring' : ''}" 
                    data-tx-id="${tx.id}" 
                    data-current-cat="${currentCat}"
                    title="ジャンルを変更する">
              <span class="badge-cat-dot" style="background: ${catColor};"></span>
              <span class="badge-cat-name">${currentCat}</span>
              <svg class="svg-icon cat-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>
          <div class="tx-info">
            <span class="tx-name">${tx.name}</span>
            <span class="tx-date">${tx.date || (isRec ? '月末頃引落' : '日付未定')}</span>
          </div>
        </div>
        ${isPending
          ? `<button type="button" class="tx-amount-pending-badge" title="タップして金額を記入">
               <span class="pending-dot"></span>
               <span>未確定 (記入する)</span>
             </button>`
          : `<span class="tx-amount">¥${(Number(tx.amount) || 0).toLocaleString()}</span>`
        }
      </div>
    `;
  }

  attachTransactionClickEvents(container) {
    if (!container) return;

    // カテゴリバッジクリックで美しいチタンテーマ連動のジャンル選択シートを開く
    container.querySelectorAll('.tx-category-badge').forEach((badgeBtn) => {
      badgeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 親の明細クリックイベントへの伝播を防ぐ
        const txId = badgeBtn.dataset.txId;
        const currentCat = badgeBtn.dataset.currentCat || badgeBtn.querySelector('.badge-cat-name')?.textContent?.trim() || '';
        this.openCategoryPicker(txId, currentCat);
      });
    });

    // 明細行クリック（または未確定バッジクリック）で編集モーダルを開く
    container.querySelectorAll('.timeline-item').forEach((item) => {
      item.addEventListener('click', () => {
        const txId = item.dataset.txId;
        const tx = store.data.transactions.find((t) => t.id === txId);
        if (tx) {
          this.openEditTxModal(tx);
        }
      });
    });
  }

  // 明細編集モーダルを開く（未確定項目の金額記入に対応）
  openEditTxModal(tx) {
    const m = document.getElementById('modal-edit-tx');
    if (!m) return;
    const isRec = tx.group === 'recurring';
    const isPending = tx.amountPending || (isRec && (!tx.amount || Number(tx.amount) === 0));

    document.getElementById('edit-tx-id').value = tx.id;
    document.getElementById('edit-tx-name').value = tx.name || '';

    const amountInput = document.getElementById('edit-tx-amount');
    if (amountInput) {
      amountInput.value = isPending ? '' : (tx.amount || 0);
      amountInput.placeholder = isPending ? '金額を入力 (例: 3500)' : '金額';
    }

    const catSelect = document.getElementById('edit-tx-category');
    if (catSelect) catSelect.value = tx.category || (isRec ? '引落系、課金系' : '未分類');

    const modalTitle = m.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.textContent = isPending ? `「${tx.name}」の金額を入力` : '明細の編集';
    }

    m.classList.add('active');

    // 未確定項目の場合は自動的に金額入力フィールドにフォーカス
    if (isPending && amountInput) {
      setTimeout(() => {
        amountInput.focus();
        amountInput.select?.();
      }, 150);
    }
  }

  // 5. 直近の明細（ホーム用 - 日付降順の最新5件）
  renderRecentTransactions(s) {
    const container = document.getElementById('home-recent-tx-container');
    const badge = document.getElementById('home-tx-total-badge');
    if (badge) badge.textContent = `当月計: ¥${s.totalSpent.toLocaleString()}`;
    if (!container) return;

    const sortedAll = sortTransactionsDesc(s.transactions);
    const recent = sortedAll.slice(0, 5);
    container.innerHTML = recent.map((tx) => this.createTransactionHtml(tx)).join('');
    this.attachTransactionClickEvents(container);
  }

  // 6. 全明細（明細タブ用・日付降順ソート & 「クレカの明細」「引落系、課金系」グループ分割）
  renderFullTransactions(s) {
    const container = document.getElementById('full-tx-container');
    const badge = document.getElementById('tx-total-count');
    const elTotal = document.getElementById('tx-summary-total-amount');
    const multiBar = document.getElementById('category-multi-bar');
    const chipsContainer = document.getElementById('tx-category-chips-container');

    const catColors = {
      '食費': '#f59e0b',
      '日用品': '#06b6d4',
      '固定費': '#8b5cf6',
      '娯楽': '#ec4899',
      '交際費': '#f43f5e',
      '交通費': '#3b82f6',
      '衣服・美容': '#a855f7',
      '健康・医療': '#10b981',
      'その他': '#94a3b8'
    };

    if (badge) badge.textContent = `${s.transactions.length}件`;
    if (elTotal) elTotal.textContent = s.totalSpent.toLocaleString();

    // Apple Card風 マルチカラープログレスバー & リッチチップ
    const categories = Object.keys(s.categoryTotals || {});
    const totalSpent = s.totalSpent || 1;

    if (multiBar) {
      if (categories.length === 0 || s.totalSpent === 0) {
        multiBar.innerHTML = `<div class="category-bar-segment" style="width: 100%; background: rgba(255,255,255,0.1);"></div>`;
      } else {
        multiBar.innerHTML = categories
          .map((cat) => {
            const amount = s.categoryTotals[cat];
            const pct = Math.max(2, Math.round((amount / totalSpent) * 100));
            const color = catColors[cat] || '#94a3b8';
            return `<div class="category-bar-segment" style="width: ${pct}%; background: ${color};" title="${cat}: ¥${amount.toLocaleString()} (${pct}%)"></div>`;
          })
          .join('');
      }
    }

    if (chipsContainer) {
      if (categories.length === 0) {
        chipsContainer.innerHTML = `<span style="font-size: 0.72rem; color: var(--text-muted); padding: 6px;">まだ利用明細がありません</span>`;
      } else {
        chipsContainer.innerHTML = categories
          .map((cat) => {
            const amount = s.categoryTotals[cat];
            const color = catColors[cat] || '#94a3b8';
            return `
              <div class="tx-cat-chip-card">
                <span class="chip-color-dot" style="background: ${color}; color: ${color};"></span>
                <div class="chip-content">
                  <span class="chip-name">${cat}</span>
                  <span class="chip-amount">¥${amount.toLocaleString()}</span>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    if (!container) return;

    // group 未設定データのフォールバック（行100以降のみrecurring、それ以外は通常クレカ）
    s.transactions.forEach(tx => {
      if (!tx.group) {
        const rowNum = String(tx.id).match(/tx-(\d+)/) ? Number(RegExp.$1) : 0;
        tx.group = (rowNum >= 100) ? 'recurring' : 'card';
      }
    });

    const cardTxList = sortTransactionsDesc(s.transactions.filter(t => t.group !== 'recurring'));
    const recurringTxList = sortTransactionsDesc(s.transactions.filter(t => t.group === 'recurring'));

    const cardTotal = cardTxList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const recurringTotal = recurringTxList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // セグメントバッジの件数更新
    const badgeAll = document.getElementById('badge-count-all');
    const badgeCard = document.getElementById('badge-count-card');
    const badgeRecurring = document.getElementById('badge-count-recurring');
    if (badgeAll) badgeAll.textContent = s.transactions.length;
    if (badgeCard) badgeCard.textContent = cardTxList.length;
    if (badgeRecurring) badgeRecurring.textContent = recurringTxList.length;

    const renderListHtml = (list) => {
      if (!list || list.length === 0) {
        return `<div style="text-align: center; color: var(--text-muted); padding: 18px; font-size: 0.85rem;">該当の明細はありません</div>`;
      }
      return list.map((tx) => this.createTransactionHtml(tx)).join('');
    };

    const cardHeaderHtml = `
      <div class="tx-group-header">
        <div class="tx-group-title-wrap">
          <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span class="tx-group-title">カード決済（通常利用）</span>
          <span class="tx-group-count">${cardTxList.length}件</span>
        </div>
        <span class="tx-group-total">¥${cardTotal.toLocaleString()}</span>
      </div>
    `;

    const pendingCount = recurringTxList.filter(t => t.amountPending || (Number(t.amount) === 0)).length;
    const pendingBadgeHtml = pendingCount > 0 
      ? `<span class="tx-pending-count-badge" title="${pendingCount}件の金額が未確定です">未確定 ${pendingCount}件</span>` 
      : '';

    const recurringHeaderHtml = `
      <div class="tx-group-header recurring">
        <div class="tx-group-title-wrap">
          <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          <span class="tx-group-title">固定費・生活引落（光熱費・サブスク等）</span>
          <span class="tx-group-count">${recurringTxList.length}件</span>
          ${pendingBadgeHtml}
        </div>
        <span class="tx-group-total">¥${recurringTotal.toLocaleString()}</span>
      </div>
    `;

    if (this.currentTxGroupFilter === 'all') {
      container.innerHTML = `
        <div class="tx-group-section">
          ${cardHeaderHtml}
          <div class="timeline-list">
            ${renderListHtml(cardTxList)}
          </div>
        </div>

        <div class="tx-group-section">
          ${recurringHeaderHtml}
          <div class="timeline-list">
            ${renderListHtml(recurringTxList)}
          </div>
        </div>
      `;
    } else if (this.currentTxGroupFilter === 'card') {
      container.innerHTML = `
        <div class="tx-group-section">
          ${cardHeaderHtml}
          <div class="timeline-list">
            ${renderListHtml(cardTxList)}
          </div>
        </div>
      `;
    } else if (this.currentTxGroupFilter === 'recurring') {
      container.innerHTML = `
        <div class="tx-group-section">
          ${recurringHeaderHtml}
          <div class="timeline-list">
            ${renderListHtml(recurringTxList)}
          </div>
        </div>
      `;
    }

    this.attachTransactionClickEvents(container);
  }

  // 7. 口座詳細（各口座カード & 入出金履歴）
  renderAccountsDetail(s) {
    const container = document.getElementById('accounts-detail-container');
    if (!container) return;

    container.innerHTML = s.accounts
      .map((acc) => {
        const transfers = [...(s.bankTransfers || [])]
          .filter((tf) => tf.accountId === acc.id)
          .sort((a, b) => {
            const da = new Date(a.date ? a.date.replace(/-/g, '/') : '1970/01/01').getTime();
            const db = new Date(b.date ? b.date.replace(/-/g, '/') : '1970/01/01').getTime();
            return da - db;
          });

        return `
        <div class="glass-card" style="border-top: 3px solid ${acc.color}; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 3px;">${acc.name}</h3>
              <!-- 月初残高を小さく控えめに表示（タップで設定モーダル） -->
              <div class="initial-balance-mini edit-acc-btn" data-acc-id="${acc.id}" title="月初残高を設定・変更">
                <span class="mini-tag">月初:</span>
                <span class="mini-amount">¥${acc.initialBalance.toLocaleString()}</span>
                <span class="mini-edit">✎ 変更</span>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">現在残高</span>
              <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">¥${acc.currentBalance.toLocaleString()}</span>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.2); border-radius: var(--radius-sm); padding: 12px 14px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary);">
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                <span>入出金履歴 (${transfers.length}件)</span>
              </div>
              <button class="section-link btn-card-add-tf" data-account-id="${acc.id}" style="font-size: 0.76rem; padding: 4px 10px; border-radius: 6px; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.35); cursor: pointer; color: #4ade80; font-weight: 700;">＋ 入出金</button>
            </div>
            ${transfers.length === 0
            ? '<div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 14px 0;">入出金の記録はありません</div>'
            : transfers
              .map(
                (tf) => `
                <div class="transfer-item-row" data-tf-id="${tf.id}" title="タップでこの入出金を編集">
                  <div class="transfer-item-left">
                    <span class="transfer-item-date">${tf.date}</span>
                    <span class="transfer-item-name">${tf.name}</span>
                  </div>
                  <div class="transfer-item-right">
                    <span class="transfer-item-amount ${tf.type}">
                      ${tf.type === 'income' ? '+' : '-'}¥${tf.amount.toLocaleString()}
                    </span>
                    <div class="transfer-actions">
                      <button class="transfer-btn edit btn-edit-tf" data-tf-id="${tf.id}" title="編集">
                        <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      </button>
                      <button class="transfer-btn delete btn-delete-tf" data-tf-id="${tf.id}" title="削除">
                        <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              `
              )
              .join('')
          }
          </div>
        </div>
      `;
      })
      .join('');

    container.querySelectorAll('.edit-acc-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.accId;
        const acc = s.accounts.find((a) => a.id === id);
        if (acc) this.openEditAccountModal(acc);
      });
    });

    container.querySelectorAll('.btn-card-add-tf').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const accId = btn.dataset.accountId;
        const sel = document.getElementById('input-tf-account');
        if (sel) sel.value = accId;
        document.getElementById('modal-add-transfer')?.classList.add('active');
      });
    });

    // 入出金行全体のタップで編集モーダルを開く
    container.querySelectorAll('.transfer-item-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-tf')) return; // 削除時は開かない
        const tfId = row.dataset.tfId;
        const tf = s.bankTransfers.find((t) => t.id === tfId);
        if (tf) this.openEditTransferModal(tf);
      });
    });

    container.querySelectorAll('.btn-edit-tf').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = s.bankTransfers.find((t) => t.id === tfId);
        if (tf) this.openEditTransferModal(tf);
      });
    });

    container.querySelectorAll('.btn-delete-tf').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tfId = btn.dataset.tfId;
        const tf = s.bankTransfers.find((t) => t.id === tfId);
        if (tf) this.deleteTransferItem(tf);
      });
    });
  }

  // 8. 分析（リッチ横棒グラフ＆プログレスカード）
  renderAnalytics(s) {
    const rankingContainer = document.getElementById('category-ranking-container');
    if (!rankingContainer) return;

    const sortedCats = Object.entries(s.categoryTotals).sort((a, b) => b[1] - a[1]);

    if (sortedCats.length === 0) {
      rankingContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">データがありません</div>';
      return;
    }

    const maxAmount = Math.max(...sortedCats.map(([, v]) => v), 1);

    // カテゴリごとのグラデーション色定義
    const catColors = [
      { gradient: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', glow: 'rgba(16, 185, 129, 0.4)' },
      { gradient: 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)', glow: 'rgba(139, 92, 246, 0.4)' },
      { gradient: 'linear-gradient(90deg, #3b82f6 0%, #0ea5e9 100%)', glow: 'rgba(59, 130, 246, 0.4)' },
      { gradient: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245, 158, 11, 0.4)' },
      { gradient: 'linear-gradient(90deg, #ec4899 0%, #f43f5e 100%)', glow: 'rgba(236, 72, 153, 0.4)' },
      { gradient: 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)', glow: 'rgba(6, 182, 212, 0.4)' }
    ];

    rankingContainer.innerHTML = sortedCats
      .map(([cat, amount], idx) => {
        const pct = s.totalSpent > 0 ? Math.round((amount / s.totalSpent) * 100) : 0;
        const barWidth = Math.min(100, Math.round((amount / maxAmount) * 100));
        const colorSet = catColors[idx % catColors.length];
        const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';

        return `
        <div class="rich-bar-item">
          <div class="bar-meta-header">
            <div class="bar-cat-left">
              <span class="bar-rank-badge ${rankClass}">${idx + 1}</span>
              <span class="bar-cat-name">${cat}</span>
            </div>
            <div class="bar-amount-wrap">
              <span class="bar-amount-val">¥${amount.toLocaleString()}</span>
              <span class="bar-percentage">(${pct}%)</span>
            </div>
          </div>
          <!-- Animated Gradient Bar -->
          <div class="bar-track">
            <div class="bar-fill" style="width: ${barWidth}%; --bar-gradient: ${colorSet.gradient}; --bar-glow: ${colorSet.glow};"></div>
          </div>
        </div>
      `;
      })
      .join('');

    // Chart.js 横棒グラフの描画
    if (this.currentView === 'analytics' && this.chartRenderer) {
      this.chartRenderer.renderCategoryBarChart(s.categoryTotals);
    }
  }

  // 9. 設定
  renderSettings(s) {
    const gasInput = document.getElementById('setting-gas-url');
    const salaryCurrent = document.getElementById('setting-salary-current');
    const salaryNext = document.getElementById('setting-salary-next');

    if (gasInput && !gasInput.value) {
      gasInput.value = store.settings.gasApiUrl || '';
    }
    if (salaryCurrent && !salaryCurrent.value) {
      salaryCurrent.value = s.salaries.currentMonth;
    }
    if (salaryNext && !salaryNext.value) {
      salaryNext.value = s.salaries.nextMonth;
    }

    // 給料推定 / 確定バッジの更新
    const badgeCur = document.getElementById('badge-salary-current');
    const badgeNext = document.getElementById('badge-salary-next');
    if (badgeCur) {
      if (s.salaries && s.salaries.isCurrentSettled) {
        badgeCur.textContent = '確定';
        badgeCur.className = 'salary-status-badge badge-settled';
      } else {
        badgeCur.textContent = '推定';
        badgeCur.className = 'salary-status-badge badge-estimate';
      }
    }
    if (badgeNext) {
      badgeNext.textContent = '推定';
      badgeNext.className = 'salary-status-badge badge-estimate';
    }
  }

  // --- モーダル制御 ---
  setupModals() {
    // 支出追加モーダル
    const fab = document.getElementById('fab-add-btn');
    const modalAddTx = document.getElementById('modal-add-tx');
    const btnCloseAddTx = document.getElementById('btn-close-add-tx');

    const openAddModal = () => {
      const dateInput = document.getElementById('input-tx-date');
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
      modalAddTx?.classList.add('active');
    };

    fab?.addEventListener('click', openAddModal);
    document.getElementById('btn-add-quick')?.addEventListener('click', openAddModal);
    document.getElementById('btn-hero-add-tx')?.addEventListener('click', openAddModal);
    btnCloseAddTx?.addEventListener('click', () => modalAddTx?.classList.remove('active'));

    // 明細編集モーダル閉じる
    document.getElementById('btn-close-edit-tx')?.addEventListener('click', () => {
      document.getElementById('modal-edit-tx')?.classList.remove('active');
    });

    // 口座残高更新モーダル閉じる
    document.getElementById('btn-close-edit-account')?.addEventListener('click', () => {
      document.getElementById('modal-edit-account')?.classList.remove('active');
    });

    // 出入金モーダル
    const openTransferModal = () => document.getElementById('modal-add-transfer')?.classList.add('active');
    document.getElementById('btn-add-transfer')?.addEventListener('click', openTransferModal);
    document.getElementById('btn-add-transfer-home')?.addEventListener('click', openTransferModal);
    document.getElementById('btn-close-add-transfer')?.addEventListener('click', () => {
      document.getElementById('modal-add-transfer')?.classList.remove('active');
    });

    // 出入金モーダル閉じる
    document.getElementById('btn-close-edit-transfer')?.addEventListener('click', () => {
      document.getElementById('modal-edit-transfer')?.classList.remove('active');
    });

    // 背景タップで閉じる
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });
  }

  openEditTxModal(tx) {
    document.getElementById('edit-tx-id').value = tx.id;
    document.getElementById('edit-tx-name').value = tx.name;
    document.getElementById('edit-tx-amount').value = tx.amount;
    document.getElementById('edit-tx-category').value = tx.category;
    document.getElementById('modal-edit-tx')?.classList.add('active');
  }

  openEditAccountModal(acc) {
    document.getElementById('edit-account-id').value = acc.id;
    document.getElementById('edit-account-title').textContent = `${acc.name}の月初金額`;
    document.getElementById('edit-account-amount').value = acc.initialBalance;
    document.getElementById('modal-edit-account')?.classList.add('active');
  }

  openEditTransferModal(tf) {
    const m = document.getElementById('modal-edit-transfer');
    if (!m) return;
    document.getElementById('edit-tf-id').value = tf.id || '';
    document.getElementById('edit-tf-row').value = tf.row || '';
    document.getElementById('edit-tf-old-name').value = tf.name || '';
    document.getElementById('edit-tf-old-amount').value = tf.amount || 0;
    document.getElementById('edit-tf-account').value = tf.accountId;
    document.getElementById('edit-tf-type').value = tf.type;

    let dateInputVal = "";
    if (tf.date) {
      dateInputVal = tf.date.replace(/\//g, '-');
    } else {
      dateInputVal = new Date().toISOString().slice(0, 10);
    }
    document.getElementById('edit-tf-date').value = dateInputVal;
    document.getElementById('edit-tf-name').value = tf.name || '';
    document.getElementById('edit-tf-amount').value = tf.amount || 0;

    m.classList.add('active');
  }

  // --- フォーム送信制御 ---
  setupForms() {
    // 支出追加
    document.getElementById('form-add-tx')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('input-tx-name').value.trim();
      const amount = Number(document.getElementById('input-tx-amount').value);
      const category = document.getElementById('input-tx-category').value;
      const rawDate = document.getElementById('input-tx-date').value;
      const date = rawDate ? rawDate.replace(/-/g, '/') : new Date().toISOString().slice(0, 10).replace(/-/g, '/');

      store.addTransaction({ name, amount, category, date, group: 'card' });
      document.getElementById('modal-add-tx')?.classList.remove('active');
      document.getElementById('form-add-tx')?.reset();
    });

    // 明細編集（金額の入力・更新）
    document.getElementById('form-edit-tx')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-tx-id').value;
      const name = document.getElementById('edit-tx-name').value.trim();
      const amountVal = document.getElementById('edit-tx-amount').value;
      const amount = amountVal === '' ? 0 : Number(amountVal);
      const category = document.getElementById('edit-tx-category').value;

      store.updateTransaction(id, { 
        name, 
        amount, 
        category, 
        amountPending: (amount === 0) 
      });
      document.getElementById('modal-edit-tx')?.classList.remove('active');
      showToast(amount > 0 ? `「${name}」の金額（¥${amount.toLocaleString()}）を保存しました` : '明細を更新しました');

      // GAS（スプレッドシートD列・B列・C列）へ非同期保存
      try {
        if (this.api.isConfigured()) {
          const res = await this.api.updateTransaction(id, { name, amount, category }, store.data.currentMonth);
          if (res && res.status === 'success') {
            console.log('スプレッドシートへの明細更新成功:', res);
          }
        }
      } catch (err) {
        console.warn('スプレッドシートへの明細更新警告:', err);
        showToast('スプレッドシートへの反映に失敗しました', 'warning');
      }
    });

    // 明細削除
    document.getElementById('btn-delete-tx')?.addEventListener('click', () => {
      const id = document.getElementById('edit-tx-id').value;
      if (confirm('この明細を削除しますか？')) {
        store.deleteTransaction(id);
        document.getElementById('modal-edit-tx')?.classList.remove('active');
      }
    });

    // 口座残高更新
    document.getElementById('form-edit-account')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-account-id').value;
      const amount = Number(document.getElementById('edit-account-amount').value);

      store.updateInitialBalance(id, amount);
      document.getElementById('modal-edit-account')?.classList.remove('active');
    });

    // 出入金登録
    document.getElementById('form-add-transfer')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = document.getElementById('btn-submit-add-transfer');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = '保存中...';
      }

      const accountId = document.getElementById('input-tf-account').value;
      const type = document.getElementById('input-tf-type').value;
      const name = document.getElementById('input-tf-name').value.trim();
      const amount = Number(document.getElementById('input-tf-amount').value);
      const rawDate = document.getElementById('input-tf-date')?.value;
      const date = rawDate ? rawDate.replace(/-/g, '/') : new Date().toISOString().slice(0, 10).replace(/-/g, '/');

      const newBt = store.addBankTransfer({ accountId, type, name, amount, date });
      document.getElementById('modal-add-transfer')?.classList.remove('active');
      document.getElementById('form-add-transfer')?.reset();

      // スプレッドシートAPIへ送信
      try {
        const res = await this.api.addTransfer(newBt);
        if (res && res.status === 'success') {
          if (res.row) {
            newBt.row = res.row;
            newBt.id = res.id || `bt-${accountId}-${res.row}`;
            store.saveData();
          }
          showToast(`出入金をスプレッドシートに保存しました（¥${amount.toLocaleString()}）`, 'success');
        } else {
          showToast(`出入金を登録しました（API警告: ${res?.message || '不明'}）`, 'error');
        }
      } catch (err) {
        console.warn('スプレッドシートへの出入金保存エラー:', err);
        showToast(`出入金を登録しました（API未設定またはエラー）`, 'success');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = '登録する';
        }
      }
    });

    // 出入金編集フォーム
    document.getElementById('form-edit-transfer')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSave = document.getElementById('btn-submit-edit-transfer');
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = '保存中...';
      }

      const id = document.getElementById('edit-tf-id').value;
      const row = document.getElementById('edit-tf-row').value;
      const oldName = document.getElementById('edit-tf-old-name').value;
      const oldAmount = Number(document.getElementById('edit-tf-old-amount').value);
      const accountId = document.getElementById('edit-tf-account').value;
      const type = document.getElementById('edit-tf-type').value;
      const rawDate = document.getElementById('edit-tf-date').value;
      const date = rawDate ? rawDate.replace(/-/g, '/') : new Date().toISOString().slice(0, 10).replace(/-/g, '/');
      const name = document.getElementById('edit-tf-name').value.trim();
      const amount = Number(document.getElementById('edit-tf-amount').value);

      const updated = store.updateBankTransfer({ id, row, accountId, type, date, name, amount });
      document.getElementById('modal-edit-transfer')?.classList.remove('active');
      showToast('出入金を更新しました', 'success');

      try {
        await this.api.updateTransfer({ id, row, oldName, oldAmount, accountId, type, date, name, amount });
        showToast('スプレッドシートを更新しました', 'success');
      } catch (err) {
        console.warn('スプレッドシートへの出入金更新エラー:', err);
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = '変更を保存する';
        }
      }
    });

    // モーダル内の出入金削除ボタン
    document.getElementById('btn-delete-transfer')?.addEventListener('click', () => {
      const id = document.getElementById('edit-tf-id').value;
      const tf = store.data.bankTransfers.find((t) => t.id === id);
      if (tf) {
        this.deleteTransferItem(tf);
        document.getElementById('modal-edit-transfer')?.classList.remove('active');
      }
    });
  }

  // 出入金レコードの削除
  async deleteTransferItem(tf) {
    if (!confirm(`「${tf.name}」(¥${(tf.amount || 0).toLocaleString()}) の出入金記録を削除しますか？`)) {
      return;
    }
    store.deleteBankTransfer(tf.id);
    showToast('出入金記録を削除しました', 'success');

    try {
      await this.api.deleteTransfer(tf);
      showToast('スプレッドシートからも削除しました', 'success');
    } catch (err) {
      console.warn('スプレッドシートへの出入金削除エラー:', err);
    }
  }

  // --- 設定画面の制御 ---
  setupSettings() {

    // GAS設定保存
    document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
      const url = document.getElementById('setting-gas-url').value.trim();
      store.saveSettings({ gasApiUrl: url });

      if (url) {
        alert('設定を保存しました！スプレッドシートへの通信テストを行います。');
        try {
          // 通信テスト＆データ取得反映
          const data = await this.api.fetchMonthData(store.data.currentMonth || '202609');
          if (data) {
            store.applyMonthData(data);
          }
          alert('スプレッドシートとの接続・データ同期に成功しました！🎉');
        } catch (err) {
          alert('接続テスト結果: ' + err.message + '\n（GASのデプロイ設定をご確認ください）');
        }
      } else {
        alert('設定を保存しました（ローカルモードで動作します）');
      }
    });

    // 給与保存
    document.getElementById('btn-save-salaries')?.addEventListener('click', () => {
      const cur = document.getElementById('setting-salary-current').value;
      const nxt = document.getElementById('setting-salary-next').value;
      store.updateSalary('currentMonth', cur);
      store.updateSalary('nextMonth', nxt);
      alert('給料設定を保存しました！');
    });

    // 初期化リセット
    document.getElementById('btn-reset-data')?.addEventListener('click', () => {
      if (confirm('スプレッドシートから読み取った初期状態にデータを戻しますか？')) {
        store.resetToDefault();
        alert('初期データを復元しました。');
      }
    });

    // ヘッダーの同期ボタン（回転アニメーション対応）
    document.getElementById('btn-sync-quick')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-sync-quick');
      if (!btn) return;

      if (!this.api.isConfigured()) {
        btn.classList.add('spinning');
        setTimeout(() => {
          btn.classList.remove('spinning');
          alert('設定画面でGAS Web AppのURLを設定してください。\n現在はローカルデータが最新です。');
        }, 600);
        return;
      }

      btn.classList.add('spinning');
      try {
        const data = await this.api.fetchMonthData(store.data.currentMonth || '202609');
        if (data) {
          store.applyMonthData(data);
        }
        setTimeout(() => {
          btn.classList.remove('spinning');
          alert('スプレッドシートから最新データを同期しました！');
        }, 400);
      } catch (e) {
        btn.classList.remove('spinning');
        alert('同期エラー: ' + e.message);
      }
    });

    // クレカ利用通知メールの同期ボタン（明細タブ & 設定タブ）
    const btnSyncEmails = document.getElementById('btn-sync-emails');
    const btnRunEmailSync = document.getElementById('btn-run-email-sync');

    btnSyncEmails?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleSyncCardEmails(btnSyncEmails);
    });

    btnRunEmailSync?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleSyncCardEmails(btnRunEmailSync);
    });
  }

  // クレカ利用通知メール取得処理の実行
  async handleSyncCardEmails(triggerBtn) {
    if (!this.api.isConfigured()) {
      alert('設定画面でGAS Web AppのURLを設定してください。\nスプレッドシート連携後に利用通知メールを取得できます。');
      return;
    }

    const allButtons = [
      document.getElementById('btn-sync-emails'),
      document.getElementById('btn-run-email-sync')
    ].filter(Boolean);

    allButtons.forEach((b) => b.classList.add('loading'));
    showToast('Gmailから利用通知メールを検索・同期中...', 'info');

    try {
      const customFnName = document.getElementById('setting-email-func-name')?.value?.trim() || '';
      const result = await this.api.syncCardEmails(store.data.currentMonth, customFnName);

      if (result && result.status === 'success') {
        const addedCount = result.addedCount || 0;

        // 最新のスプレッドシートデータを即座に取得して反映
        try {
          const freshData = await this.api.fetchMonthData(store.data.currentMonth);
          if (freshData) {
            store.applyMonthData(freshData);
          }
        } catch (fetchErr) {
          console.warn('メール同期後のデータ再取得警告:', fetchErr);
        }

        if (addedCount > 0) {
          showToast(`✉ メールから${addedCount}件の利用明細を取り込みました！`, 'success');
        } else {
          showToast('新しい利用通知メールはありませんでした（最新状態です）', 'success');
        }
      } else {
        throw new Error(result?.message || 'メール同期処理に失敗しました');
      }
    } catch (err) {
      console.error('メール同期エラー:', err);
      showToast(`メール取込エラー: ${err.message}`, 'error');
    } finally {
      allButtons.forEach((b) => b.classList.remove('loading'));
    }
  }
}

// アプリ起動
window.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
