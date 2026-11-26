/**
 * Google Apps Script Web App APIクライアント
 */

export class GasApiClient {
  constructor(store) {
    this.store = store;
    // 同じ月の取得が重複した場合（起動時同期＋引っ張って更新 等）に通信を1本に共有する
    this._inflightMonthFetch = new Map();
  }

  getUrl() {
    return this.store.settings.gasApiUrl;
  }

  isConfigured() {
    const url = this.getUrl();
    return !!url && url.startsWith('https://script.google.com/');
  }

  // スプレッドシートから最新データを取得（POST通信でCORSエラーを回避）
  fetchMonthData(monthStr) {
    if (!this.isConfigured()) {
      return Promise.reject(new Error('GAS Web App URLが設定されていません'));
    }
    const key = String(monthStr || '');
    const inflight = this._inflightMonthFetch.get(key);
    if (inflight) return inflight;

    const p = this._fetchMonthDataOnce(monthStr).finally(() => {
      this._inflightMonthFetch.delete(key);
    });
    this._inflightMonthFetch.set(key, p);
    return p;
  }

  async _fetchMonthDataOnce(monthStr) {
    let result;
    try {
      result = await this.postRequest('getMonthData', { month: monthStr }, { timeoutMs: READ_TIMEOUT_MS });
    } catch (postErr) {
      // POST自体が通信・CORSレベルで失敗した場合のみGETで再試行
      // （サーバーが error を返した場合は同じ結果になるため再送しない＝待ち時間が倍になるのを防ぐ）
      try {
        const url = `${this.getUrl()}?action=getMonthData&month=${encodeURIComponent(monthStr)}`;
        const res = await fetchWithTimeout(url, { method: 'GET' }, READ_TIMEOUT_MS);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        result = await res.json();
      } catch (getErr) {
        throw new Error(postErr.message || getErr.message);
      }
    }

    if (result && result.status === 'success') {
      return result.data;
    }
    if (result && result.status === 'error') {
      throw new Error(result.message || 'データ取得エラー');
    }
    return undefined;
  }

  // 新規明細の追加
  async addTransaction(tx) {
    if (!this.isConfigured()) return;
    return this.postRequest('addTransaction', tx);
  }

  // 銀行出入金（引出・入金）の追加
  async addTransfer(tf) {
    if (!this.isConfigured()) return;
    return this.postRequest('addTransfer', tf);
  }

  // 銀行出入金の更新
  async updateTransfer(tf) {
    if (!this.isConfigured()) return;
    return this.postRequest('updateTransfer', tf);
  }

  // 銀行出入金の削除
  async deleteTransfer(tf) {
    if (!this.isConfigured()) return;
    return this.postRequest('deleteTransfer', tf);
  }

  // 口座残高の更新
  async updateBalance(accountId, amount) {
    if (!this.isConfigured()) return;
    return this.postRequest('updateBalance', { accountId, amount });
  }

  // 固定費の引落ステータス更新
  async toggleSettled(fixedId, settled) {
    if (!this.isConfigured()) return;
    return this.postRequest('toggleSettled', { fixedId, settled });
  }

  // クレジットカード今月引落額（D20）の更新
  async updateCardBill(amount, monthStr) {
    if (!this.isConfigured()) return { status: 'local_only', amount: -Math.abs(Number(amount)) };
    const month = monthStr || this.store.data.currentMonth;
    return this.postRequest('updateCardBill', { amount: Number(amount), month });
  }

  // 給料見込み額（D22: 今月、D26: 来月）の更新
  async updateSalaries(currentSalary, nextSalary, monthStr) {
    if (!this.isConfigured()) return { status: 'local_only' };
    const month = monthStr || this.store.data.currentMonth;
    return this.postRequest('updateSalaries', {
      currentSalary: Number(currentSalary),
      nextSalary: Number(nextSalary),
      month
    });
  }

  // クレカ明細のカテゴリ（ジャンル）更新
  async updateTransactionCategory(txId, category, monthStr) {
    if (!this.isConfigured()) return;
    const month = monthStr || this.store.data.currentMonth;
    return this.postRequest('updateTransactionCategory', { txId, category, month });
  }

  // クレカ明細の更新（金額・店名・ジャンル）
  async updateTransaction(txId, updates, monthStr) {
    if (!this.isConfigured()) return;
    const month = monthStr || this.store.data.currentMonth;
    return this.postRequest('updateTransaction', { txId, ...updates, month });
  }

  // B/43 目標額・内訳ログ ＆ Suica自販機ログのスプレッドシート保存（Z1セル）
  async saveSubLogs(monthStr) {
    if (!this.isConfigured()) return { status: 'local_only' };
    const month = monthStr || this.store.data.currentMonth;
    const payload = this.store.getSubLogsPayload(month);
    return this.postRequest('saveSubLogs', payload);
  }

  // スプレッドシートC列のデータ入力規則（プルダウン）を新19カテゴリに一括更新
  async updateSpreadsheetCategories(categories, monthStr) {
    if (!this.isConfigured()) throw new Error('GAS Web App URLが設定されていません');
    const month = monthStr || this.store.data.currentMonth;
    return this.postRequest('updateCategoryRules', { categories, month });
  }

  // クレカ利用通知メールの同期実行（スプレッドシート反映）
  async syncCardEmails(monthStr, syncMode = 'standard', functionName = '') {
    if (!this.isConfigured()) {
      throw new Error('GAS Web App URLが設定されていません');
    }
    const month = monthStr || this.store.data.currentMonth;
    // includeMonthData: 取込後の最新月データを同じレスポンスで受け取る（対応GASなら再取得の往復が不要）
    return this.postRequest('syncCardEmails', { month, syncMode, functionName, includeMonthData: true });
  }

  async postRequest(action, payload, { timeoutMs = WRITE_TIMEOUT_MS } = {}) {
    const url = this.getUrl();
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // GASのCORS対策（プリフライト不要の単純リクエストにする）
      },
      body: JSON.stringify({ action, ...payload })
    }, timeoutMs);
    return res.json();
  }
}

// 読み取りはGASのコールドスタートを考慮しても十分な30秒、書き込み・メール取込は処理完了を待つため長めに設定
const READ_TIMEOUT_MS = 30000;
const WRITE_TIMEOUT_MS = 180000;

// 応答が返らない通信で画面が待ち続けないようタイムアウト付きで fetch する
async function fetchWithTimeout(url, options, timeoutMs) {
  if (!timeoutMs || typeof AbortController === 'undefined') {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error(`通信がタイムアウトしました（${Math.round(timeoutMs / 1000)}秒）`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
