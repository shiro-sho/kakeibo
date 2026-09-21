/**
 * アプリメインコントローラー（UIレンダリング・インタラクション）
 */

import { store } from './store.js';
import { ChartRenderer } from './charts.js';
import { GasApiClient } from './api.js';

class AppController {
  constructor() {
    this.api = new GasApiClient(store);
    this.chartRenderer = null;
    this.currentView = 'home';
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
    this.setupModals();
    this.setupForms();
    this.setupSettings();
    this.setupThemeSwitcher();

    // 初回レンダリング
    this.render(store.getSummary());
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

    // 内訳
    if (elCurrentBalance) elCurrentBalance.textContent = `¥${s.totalCurrentBalance.toLocaleString()}`;
    
    // 来月までの引落予定額（今月未引落カード・固定費＋来月引落の今月利用分＋来月固定費）
    const totalDeductions = Math.abs((s.cardSettled ? 0 : s.currentMonthCardBill) + s.pureFixedTotal - s.totalSpent + s.pureFixedTotal);
    if (elDeductions) elDeductions.textContent = `-¥${totalDeductions.toLocaleString()}`;
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

  // 2. 銀行口座サマリー (絵文字廃止・SVGアイコン化)
  renderHomeAccounts(s) {
    const container = document.getElementById('home-accounts-container');
    if (!container) return;

    container.innerHTML = s.accounts
      .map(
        (acc) => `
      <div class="account-card" style="--card-color: ${acc.color};" data-account-id="${acc.id}">
        <div class="account-info">
          <div class="account-icon-wrap" style="color: ${acc.color};">
            <svg class="svg-icon" viewBox="0 0 24 24"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="3" y1="10" x2="21" y2="10"></line><polyline points="5 6 12 3 19 6"></polyline><line x1="4" y1="10" x2="4" y2="21"></line><line x1="20" y1="10" x2="20" y2="21"></line><line x1="8" y1="14" x2="8" y2="17"></line><line x1="12" y1="14" x2="12" y2="17"></line><line x1="16" y1="14" x2="16" y2="17"></line></svg>
          </div>
          <div class="account-names">
            <span class="account-name">${acc.name}</span>
            <span class="account-sub">月初: ¥${acc.initialBalance.toLocaleString()}</span>
          </div>
        </div>
        <div class="account-balance-wrap">
          <span class="account-balance">¥${acc.currentBalance.toLocaleString()}</span>
          <span class="edit-hint">タップで更新 ✎</span>
        </div>
      </div>
    `
      )
      .join('');

    // クリックで残高編集モーダルを開く
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

  // 3. 将来予測
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

  // 4. 固定費
  renderFixedExpenses(s) {
    const container = document.getElementById('home-fixed-container');
    if (!container) return;

    container.innerHTML = s.fixedExpenses
      .map(
        (f) => `
      <div class="fixed-expense-item ${f.settled ? 'settled' : ''}" data-fixed-id="${f.id}">
        <div class="fixed-left">
          <div class="check-circle">${f.settled ? '✓' : ''}</div>
          <span class="fixed-name">${f.name}</span>
        </div>
        <span class="fixed-amount">¥${Math.abs(f.amount).toLocaleString()}</span>
      </div>
    `
      )
      .join('');

    container.querySelectorAll('.fixed-expense-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.fixedId;
        store.toggleFixedExpenseSettled(id);
      });
    });
  }

  // 5. 直近の明細（ホーム用）
  renderRecentTransactions(s) {
    const container = document.getElementById('home-recent-tx-container');
    if (!container) return;

    const recent = s.transactions.slice(0, 5);
    container.innerHTML = recent.map((tx) => this.createTransactionHtml(tx)).join('');
    this.attachTransactionClickEvents(container);
  }

  // 6. 全明細（明細タブ用）
  renderFullTransactions(s) {
    const container = document.getElementById('full-tx-container');
    const badge = document.getElementById('tx-total-count');
    if (badge) badge.textContent = `${s.transactions.length}件`;
    if (!container) return;

    container.innerHTML = s.transactions.map((tx) => this.createTransactionHtml(tx)).join('');
    this.attachTransactionClickEvents(container);
  }

  createTransactionHtml(tx) {
    return `
      <div class="timeline-item" data-tx-id="${tx.id}">
        <div class="tx-main">
          <span class="tx-category-badge">${tx.category}</span>
          <div class="tx-info">
            <span class="tx-name">${tx.name}</span>
            <span class="tx-date">${tx.date}</span>
          </div>
        </div>
        <span class="tx-amount">¥${tx.amount.toLocaleString()}</span>
      </div>
    `;
  }

  attachTransactionClickEvents(container) {
    container.querySelectorAll('.timeline-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.dataset.txId;
        const tx = store.data.transactions.find((t) => t.id === id);
        if (tx) this.openEditTxModal(tx);
      });
    });
  }

  // 7. 口座詳細ビュー
  renderAccountsDetail(s) {
    const container = document.getElementById('accounts-detail-container');
    if (!container) return;

    container.innerHTML = s.accounts
      .map((acc) => {
        const transfers = s.bankTransfers.filter((t) => t.accountId === acc.id);
        return `
        <div class="glass-card" style="border-top: 3px solid ${acc.color};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="account-icon-wrap" style="color: ${acc.color};">
                <svg class="svg-icon" viewBox="0 0 24 24"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="3" y1="10" x2="21" y2="10"></line><polyline points="5 6 12 3 19 6"></polyline><line x1="4" y1="10" x2="4" y2="21"></line><line x1="20" y1="10" x2="20" y2="21"></line><line x1="8" y1="14" x2="8" y2="17"></line><line x1="12" y1="14" x2="12" y2="17"></line><line x1="16" y1="14" x2="16" y2="17"></line></svg>
              </div>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 700;">${acc.name}</h3>
                <span style="font-size: 0.75rem; color: var(--text-muted);">現在残高: ¥${acc.currentBalance.toLocaleString()}</span>
              </div>
            </div>
            <button class="icon-btn edit-acc-btn" data-acc-id="${acc.id}" title="残高変更">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
          </div>

          <div style="background: rgba(0,0,0,0.15); border-radius: var(--radius-sm); padding: 12px; margin-top: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              <svg class="svg-icon svg-icon-sm" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
              <span>出納記録 (${transfers.length}件)</span>
            </div>
            ${
              transfers.length === 0
                ? '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 6px 0;">出納記録はありません</div>'
                : transfers
                    .map(
                      (tf) => `
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.06);">
                  <span>${tf.date} ${tf.name}</span>
                  <span style="font-weight: 700; color: ${tf.type === 'income' ? 'var(--accent-primary)' : 'var(--accent-rose)'};">
                    ${tf.type === 'income' ? '+' : '-'}¥${tf.amount.toLocaleString()}
                  </span>
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

      store.addTransaction({ name, amount, category, date });
      document.getElementById('modal-add-tx')?.classList.remove('active');
      document.getElementById('form-add-tx')?.reset();
    });

    // 明細編集
    document.getElementById('form-edit-tx')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-tx-id').value;
      const name = document.getElementById('edit-tx-name').value.trim();
      const amount = Number(document.getElementById('edit-tx-amount').value);
      const category = document.getElementById('edit-tx-category').value;

      store.updateTransaction(id, { name, amount, category });
      document.getElementById('modal-edit-tx')?.classList.remove('active');
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
      const accountId = document.getElementById('input-tf-account').value;
      const type = document.getElementById('input-tf-type').value;
      const name = document.getElementById('input-tf-name').value.trim();
      const amount = Number(document.getElementById('input-tf-amount').value);

      const newBt = store.addBankTransfer({ accountId, type, name, amount });
      document.getElementById('modal-add-transfer')?.classList.remove('active');
      document.getElementById('form-add-transfer')?.reset();

      // スプレッドシートAPIへ送信
      try {
        await this.api.addTransfer(newBt);
      } catch (err) {
        console.warn('スプレッドシートへの出入金保存エラー:', err);
      }
    });
  }

  // --- 設定画面の制御 ---
  setupSettings() {
    // アイコン着せ替え
    const savedIcon = localStorage.getItem('kakeibo_icon') || './icons/cow-cute.png';
    const logoImg = document.getElementById('app-logo');
    if (logoImg) logoImg.src = savedIcon;

    document.querySelectorAll('.icon-choice-card').forEach((card) => {
      const src = card.dataset.iconSrc;
      const img = card.querySelector('img');
      if (src === savedIcon) {
        card.classList.add('active');
        if (img) img.style.borderColor = 'var(--accent-primary)';
      } else {
        card.classList.remove('active');
        if (img) img.style.borderColor = 'var(--border-glass)';
      }

      card.addEventListener('click', () => {
        const newSrc = card.dataset.iconSrc;
        if (logoImg) logoImg.src = newSrc;
        localStorage.setItem('kakeibo_icon', newSrc);

        document.querySelectorAll('.icon-choice-card').forEach((c) => {
          c.classList.remove('active');
          const cImg = c.querySelector('img');
          if (cImg) cImg.style.borderColor = 'var(--border-glass)';
        });
        card.classList.add('active');
        if (img) img.style.borderColor = 'var(--accent-primary)';
      });
    });

    // GAS設定保存
    document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
      const url = document.getElementById('setting-gas-url').value.trim();
      store.saveSettings({ gasApiUrl: url });

      if (url) {
        alert('設定を保存しました！スプレッドシートへの通信テストを行います。');
        try {
          // 通信テスト
          const data = await this.api.fetchMonthData(store.data.currentMonth);
          alert('スプレッドシートとの接続に成功しました！🎉');
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

    // ヘッダーの同期ボタン
    document.getElementById('btn-sync-quick')?.addEventListener('click', async () => {
      if (!this.api.isConfigured()) {
        alert('設定画面でGAS Web AppのURLを設定してください。\n現在はローカルデータが最新です。');
        return;
      }
      try {
        const btn = document.getElementById('btn-sync-quick');
        btn.style.transform = 'rotate(360deg)';
        btn.style.transition = 'transform 0.6s ease';
        const data = await this.api.fetchMonthData(store.data.currentMonth);
        alert('最新データを同期しました！');
      } catch (e) {
        alert('同期エラー: ' + e.message);
      }
    });
  }
}

// アプリ起動
window.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
