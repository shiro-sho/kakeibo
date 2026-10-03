/**
 * Google Apps Script Web App APIクライアント
 */

export class GasApiClient {
  constructor(store) {
    this.store = store;
  }

  getUrl() {
    return this.store.settings.gasApiUrl;
  }

  isConfigured() {
    const url = this.getUrl();
    return !!url && url.startsWith('https://script.google.com/');
  }

  // スプレッドシートから最新データを取得（POST通信でCORSエラーを回避）
  async fetchMonthData(monthStr) {
    if (!this.isConfigured()) {
      throw new Error('GAS Web App URLが設定されていません');
    }

    try {
      const result = await this.postRequest('getMonthData', { month: monthStr });
      if (result && result.status === 'success') {
        return result.data;
      } else if (result && result.status === 'error') {
        throw new Error(result.message || 'データ取得エラー');
      }
    } catch (postErr) {
      // フォールバックGET
      try {
        const url = `${this.getUrl()}?action=getMonthData&month=${encodeURIComponent(monthStr)}`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (result.status === 'error') throw new Error(result.message);
        return result.data;
      } catch (getErr) {
        throw new Error(postErr.message || getErr.message);
      }
    }
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

  // クレカ利用通知メールの同期実行（スプレッドシート反映）
  async syncCardEmails(monthStr, syncMode = 'standard', functionName = '') {
    if (!this.isConfigured()) {
      throw new Error('GAS Web App URLが設定されていません');
    }
    const month = monthStr || this.store.data.currentMonth;
    return this.postRequest('syncCardEmails', { month, syncMode, functionName });
  }

  async postRequest(action, payload) {
    const url = this.getUrl();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // GASのCORS対策
      },
      body: JSON.stringify({ action, ...payload })
    });
    return res.json();
  }
}
