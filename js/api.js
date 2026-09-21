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

  // スプレッドシートから最新データを取得
  async fetchMonthData(monthStr) {
    if (!this.isConfigured()) {
      throw new Error('GAS Web App URLが設定されていません');
    }

    const url = `${this.getUrl()}?action=getMonthData&month=${encodeURIComponent(monthStr)}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`データ取得エラー: ${res.statusText}`);
    }
    const result = await res.json();
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    return result.data;
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
