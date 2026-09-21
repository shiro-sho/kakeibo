/**
 * 家計簿データストア（計算ロジック・ローカルストレージ・初期データ管理）
 */

// スプレッドシートから読み取った 202609 の実際の内容に基づく初期データ
const DEFAULT_DATA_202609 = {
  currentMonth: '202609',
  cardLimit: 1000000,
  cardWarningThreshold: 200000,
  
  // 今月引落のクレカ代（手動入力セル D20）
  currentMonthCardBill: -318889,

  // 固定費（Row 15-16）
  fixedExpenses: [
    { id: 'rent', name: '家賃', amount: -82150, settled: false },
    { id: 'medical_loan', name: '医療ローン', amount: -29800, settled: false },
    { id: 'credit_card', name: 'クレジットカード引落', amount: -318889, settled: false }
  ],

  // 銀行口座の月初設定値（Row 9-11 の D列）
  accounts: [
    {
      id: 'smbc',
      name: '三井住友銀行',
      initialBalance: 231805,
      color: '#10b981', // エメラルドグリーン
      icon: '🏛️'
    },
    {
      id: 'mufg',
      name: '三菱UFJ銀行',
      initialBalance: 982,
      color: '#ef4444', // レッド
      icon: '🏦'
    },
    {
      id: 'mizuho',
      name: 'みずほ銀行',
      initialBalance: 0,
      color: '#3b82f6', // ブルー
      icon: '🏢'
    }
  ],

  // 給料見込み（Row 22, 26）
  salaries: {
    currentMonth: 250000, // みずほ銀行
    nextMonth: 250000     // みずほ銀行
  },

  // 銀行個別の出入金記録（Row 117以降）
  bankTransfers: [
    { id: 'bt-1', accountId: 'smbc', type: 'income', date: '2026/09/21', name: '木寺から', amount: 10519 },
    { id: 'bt-2', accountId: 'smbc', type: 'income', date: '2026/09/24', name: 'かとゆうから', amount: 10519 },
    { id: 'bt-3', accountId: 'smbc', type: 'income', date: '2026/09/25', name: 'かとゆうから', amount: 8258 },
    { id: 'bt-4', accountId: 'smbc', type: 'income', date: '2026/09/28', name: 'paypay出金', amount: 30000 }
  ],

  // クレジットカード利用明細（Row 33以降）
  transactions: [
    {
        "id":  "tx-33",
        "date":  "2026/09/01",
        "name":  "MINISTOP KANDA MITOSHIROC",
        "category":  "飲み物代",
        "amount":  390,
        "status":  "unsettled",
        "emailId":  "1a05b01be3cb6767"
    },
    {
        "id":  "tx-34",
        "date":  "2026/09/01",
        "name":  "鳥貴族  西武新宿駅前店",
        "category":  "交際費",
        "amount":  12870,
        "status":  "unsettled",
        "emailId":  "1a05d634429350b9"
    },
    {
        "id":  "tx-35",
        "date":  "2026/09/02",
        "name":  "ＢＡＧＵＳ  西武新宿／ＮＦＣ",
        "category":  "交際費",
        "amount":  12310,
        "status":  "unsettled",
        "emailId":  "1a05dbb5a4d6219f"
    },
    {
        "id":  "tx-36",
        "date":  "2026/09/02",
        "name":  "セブン－イレブン",
        "category":  "交際費",
        "amount":  786,
        "status":  "unsettled",
        "emailId":  "1a05dc367908be3a"
    },
    {
        "id":  "tx-37",
        "date":  "2026/09/02",
        "name":  "カラオケまねきねこ歌舞伎町中央店",
        "category":  "交際費",
        "amount":  5592,
        "status":  "unsettled",
        "emailId":  "1a05e2aef550ef8c"
    },
    {
        "id":  "tx-38",
        "date":  "2026/09/02",
        "name":  "TOUTO TAXI MUSEN",
        "category":  "交通費",
        "amount":  21990,
        "status":  "unsettled",
        "emailId":  "1a05e62a85a0ed81"
    },
    {
        "id":  "tx-39",
        "date":  "2026/09/02",
        "name":  "ファミリーマート",
        "category":  "飲み物代",
        "amount":  199,
        "status":  "unsettled",
        "emailId":  "1a060322497b1492"
    },
    {
        "id":  "tx-40",
        "date":  "2026/09/02",
        "name":  "かつや  鶴見東口店／ＮＦＣ",
        "category":  "デート",
        "amount":  3264,
        "status":  "unsettled",
        "emailId":  "1a06206f7427df78"
    },
    {
        "id":  "tx-41",
        "date":  "2026/09/03",
        "name":  "セブン－イレブン",
        "category":  "飲み物代",
        "amount":  633,
        "status":  "unsettled",
        "emailId":  "1a065602f97ca09c"
    },
    {
        "id":  "tx-42",
        "date":  "2026/09/04",
        "name":  "新時代  新橋銀座口店／ＮＦＣ",
        "category":  "交際費",
        "amount":  2637,
        "status":  "unsettled",
        "emailId":  "1a0682cde9f09976"
    },
    {
        "id":  "tx-43",
        "date":  "2026/09/04",
        "name":  "セブン－イレブン",
        "category":  "日用品費",
        "amount":  484,
        "status":  "unsettled",
        "emailId":  "1a06a6ace3895036"
    },
    {
        "id":  "tx-44",
        "date":  "2026/09/04",
        "name":  "MINISTOP KANDA MITOSHIROC",
        "category":  "昼ご飯",
        "amount":  1631,
        "status":  "unsettled",
        "emailId":  "1a06a6f807012729"
    },
    {
        "id":  "tx-45",
        "date":  "2026/09/04",
        "name":  "モバイルＳｕｉｃａ（Ａｐｐｌｅ）  ●",
        "category":  "Suica",
        "amount":  2000,
        "status":  "unsettled",
        "emailId":  "1a06be8ece1c30ed"
    },
    {
        "id":  "tx-46",
        "date":  "2026/09/04",
        "name":  "はなの舞  池袋西口公園前店／ＮＦＣ",
        "category":  "交際費",
        "amount":  10921,
        "status":  "unsettled",
        "emailId":  "1a06c5ed9c875602"
    },
    {
        "id":  "tx-47",
        "date":  "2026/09/04",
        "name":  "肉汁とっつぁん池袋西口店／ＮＦＣ",
        "category":  "交際費",
        "amount":  5595,
        "status":  "unsettled",
        "emailId":  "1a06cd8a7762e405"
    },
    {
        "id":  "tx-48",
        "date":  "2026/09/05",
        "name":  "SHINJIDAISHINJUKUNISHIGUC",
        "category":  "外食",
        "amount":  3763,
        "status":  "unsettled",
        "emailId":  "1a06defd9c1d04b4"
    },
    {
        "id":  "tx-49",
        "date":  "2026/09/06",
        "name":  "Visa加盟店（Amazon）",
        "category":  "日用品費",
        "amount":  1963,
        "status":  "unsettled",
        "emailId":  "1a074cfb79f2a822"
    },
    {
        "id":  "tx-50",
        "date":  "2026/09/06",
        "name":  "SUSHIRO",
        "category":  "デート",
        "amount":  3790,
        "status":  "unsettled",
        "emailId":  "1a076f510e78f03e"
    },
    {
        "id":  "tx-51",
        "date":  "2026/09/07",
        "name":  "VALORANT SHOP",
        "category":  "月額課金",
        "amount":  2440,
        "status":  "unsettled",
        "emailId":  "1a0773d4609c7d3e"
    },
    {
        "id":  "tx-52",
        "date":  "2026/09/08",
        "name":  "ローソン",
        "category":  "昼ご飯",
        "amount":  360,
        "status":  "unsettled",
        "emailId":  "1a07e466638b7114"
    },
    {
        "id":  "tx-53",
        "date":  "2026/09/09",
        "name":  "モバイルＳｕｉｃａ（Ａｐｐｌｅ）  ●",
        "category":  "Suica",
        "amount":  2000,
        "status":  "unsettled",
        "emailId":  "1a083399441e97e0"
    },
    {
        "id":  "tx-54",
        "date":  "2026/09/09",
        "name":  "MINISTOP KANDA MITOSHIROC",
        "category":  "昼ご飯",
        "amount":  570,
        "status":  "unsettled",
        "emailId":  "1a084311ff9c656c"
    },
    {
        "id":  "tx-55",
        "date":  "2026/09/09",
        "name":  "マツモトキヨシ",
        "category":  "日用品費",
        "amount":  1534,
        "status":  "unsettled",
        "emailId":  "1a085b8024d54bd8"
    },
    {
        "id":  "tx-56",
        "date":  "2026/09/09",
        "name":  "かつや  鶴見東口店／ＮＦＣ",
        "category":  "デート",
        "amount":  2802,
        "status":  "unsettled",
        "emailId":  "1a086354c8874b1f"
    },
    {
        "id":  "tx-57",
        "date":  "2026/09/10",
        "name":  "セブン－イレブン",
        "category":  "昼ご飯",
        "amount":  443,
        "status":  "unsettled",
        "emailId":  "1a08952b6d6edb8e"
    },
    {
        "id":  "tx-58",
        "date":  "2026/09/10",
        "name":  "セブン－イレブン",
        "category":  "外食",
        "amount":  1170,
        "status":  "unsettled",
        "emailId":  "1a08af1997b69436"
    },
    {
        "id":  "tx-59",
        "date":  "2026/09/10",
        "name":  "セブン－イレブン",
        "category":  "外食",
        "amount":  100,
        "status":  "unsettled",
        "emailId":  "1a08b4ed6f6c3b99"
    },
    {
        "id":  "tx-60",
        "date":  "2026/09/11",
        "name":  "MINISTOP KANDA MITOSHIROC",
        "category":  "昼ご飯",
        "amount":  969,
        "status":  "unsettled",
        "emailId":  "1a08e7fc1eb9b016"
    },
    {
        "id":  "tx-61",
        "date":  "2026/09/11",
        "name":  "セブン－イレブン",
        "category":  "外食",
        "amount":  2289,
        "status":  "unsettled",
        "emailId":  "1a0901b7a7a5a51f"
    },
    {
        "id":  "tx-62",
        "date":  "2026/09/12",
        "name":  "つるっちゃん、／ＮＦＣ",
        "category":  "交際費",
        "amount":  3766,
        "status":  "unsettled",
        "emailId":  "1a09607cd28a3a77"
    },
    {
        "id":  "tx-63",
        "date":  "2026/09/13",
        "name":  "満洲園  餃子酒場／ＮＦＣ",
        "category":  "デート",
        "amount":  7830,
        "status":  "unsettled",
        "emailId":  "1a096e81412004d2"
    },
    {
        "id":  "tx-64",
        "date":  "2026/09/13",
        "name":  "一風堂  クロスガーデン川崎店／ＮＦＣ",
        "category":  "デート",
        "amount":  3470,
        "status":  "unsettled",
        "emailId":  "1a09a23746ef7841"
    },
    {
        "id":  "tx-65",
        "date":  "2026/09/14",
        "name":  "ファミリーマート",
        "category":  "飲み物代",
        "amount":  353,
        "status":  "unsettled",
        "emailId":  "1a09d260a8320557"
    },
    {
        "id":  "tx-66",
        "date":  "2026/09/14",
        "name":  "セブン－イレブン",
        "category":  "飲み物代",
        "amount":  151,
        "status":  "unsettled",
        "emailId":  "1a09e093a32f1f90"
    },
    {
        "id":  "tx-67",
        "date":  "2026/09/14",
        "name":  "モバイルＳｕｉｃａ（Ａｐｐｌｅ）  ●",
        "category":  "Suica",
        "amount":  2000,
        "status":  "unsettled",
        "emailId":  "1a09f4a8ca20f512"
    },
    {
        "id":  "tx-68",
        "date":  "2026/09/15",
        "name":  "ローソン",
        "category":  "昼ご飯",
        "amount":  470,
        "status":  "unsettled",
        "emailId":  "1a0a24d4dafc4fa0"
    },
    {
        "id":  "tx-69",
        "date":  "2026/09/15",
        "name":  "Visa加盟店",
        "category":  "雑費",
        "amount":  899,
        "status":  "unsettled",
        "emailId":  "1a0a29ed7feb5b27"
    },
    {
        "id":  "tx-70",
        "date":  "2026/09/15",
        "name":  "MINISTOP KANDA MITOSHIROC",
        "category":  "昼ご飯",
        "amount":  786,
        "status":  "unsettled",
        "emailId":  "1a0a315eb2101bdf"
    },
    {
        "id":  "tx-71",
        "date":  "2026/09/15",
        "name":  "MINISTOP KANDA MITOSHIROC",
        "category":  "飲み物代",
        "amount":  203,
        "status":  "unsettled",
        "emailId":  "1a0a40e09cc7248e"
    },
    {
        "id":  "tx-72",
        "date":  "2026/09/16",
        "name":  "ファミリーマート",
        "category":  "飲み物代",
        "amount":  493,
        "status":  "unsettled",
        "emailId":  "1a0a76e1abbe6566"
    },
    {
        "id":  "tx-73",
        "date":  "2026/09/16",
        "name":  "MINISTOP KANDA MITOSHIROC",
        "category":  "昼ご飯",
        "amount":  786,
        "status":  "unsettled",
        "emailId":  "1a0a8448bb3a2bc0"
    },
    {
        "id":  "tx-74",
        "date":  "2026/09/17",
        "name":  "セブン－イレブン",
        "category":  "昼ご飯",
        "amount":  616,
        "status":  "unsettled",
        "emailId":  "1a0ad64ea4ebad24"
    },
    {
        "id":  "tx-75",
        "date":  "2026/09/17",
        "name":  "MINISTOP KANDA MITOSHIROC",
        "category":  "昼ご飯",
        "amount":  686,
        "status":  "unsettled",
        "emailId":  "1a0ad678cb4c1fec"
    },
    {
        "id":  "tx-76",
        "date":  "2026/09/18",
        "name":  "MINISTOP KANDA MITOSHIROC",
        "category":  "昼ご飯",
        "amount":  986,
        "status":  "unsettled",
        "emailId":  "1a0b289ef8ec5d6a"
    },
    {
        "id":  "tx-77",
        "date":  "2026/09/19",
        "name":  "鳥貴族  池袋メトロポリタン口店",
        "category":  "交際費",
        "amount":  10530,
        "status":  "unsettled",
        "emailId":  "1a0b581d6ff2944c"
    },
    {
        "id":  "tx-78",
        "date":  "2026/09/19",
        "name":  "歌広場  池袋西口公園前店／ＮＦＣ",
        "category":  "交際費",
        "amount":  7920,
        "status":  "unsettled",
        "emailId":  "1a0b62b45ea12ae5"
    },
    {
        "id":  "tx-79",
        "date":  "2026/09/19",
        "name":  "セブン",
        "category":  "外食",
        "amount":  1140,
        "status":  "unsettled",
        "emailId":  "1a0b665f3f50e19c"
    },
    {
        "id":  "tx-80",
        "date":  "2026/09/19",
        "name":  "モバイルＳｕｉｃａ（Ａｐｐｌｅ）  ●",
        "category":  "Suica",
        "amount":  2000,
        "status":  "unsettled",
        "emailId":  "1a0b66b628785db7"
    },
    {
        "id":  "tx-81",
        "date":  "2026/09/20",
        "name":  "セブン－イレブン",
        "category":  null,
        "amount":  1151,
        "status":  "unsettled",
        "emailId":  "1a0ba67641090a7f"
    },
    {
        "id":  "tx-102",
        "date":  "2026/06/30",
        "name":  "Times",
        "category":  "月額課金",
        "amount":  880,
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-104",
        "date":  "2026/07/08",
        "name":  "レンタルサーバー",
        "category":  "月額課金",
        "amount":  2637,
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-105",
        "date":  "2026/07/08",
        "name":  "Applecare（安心代）",
        "category":  "月額課金",
        "amount":  1280,
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-107",
        "date":  "2026/09/13",
        "name":  "AnyTime",
        "category":  "月額課金",
        "amount":  7900,
        "status":  "unsettled",
        "emailId":  "1a09a69aa7dd7dce"
    },
    {
        "id":  "tx-108",
        "date":  "2026/07/19",
        "name":  "Apple One",
        "category":  "月額課金",
        "amount":  1200,
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-109",
        "date":  "2026/07/21",
        "name":  "iCloud",
        "category":  "月額課金",
        "amount":  150,
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-110",
        "date":  "2026/07/25",
        "name":  "薬",
        "category":  "医療費",
        "amount":  8797,
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-111",
        "date":  "2026/07/28",
        "name":  "WiFi",
        "category":  "通信費",
        "amount":  3960,
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-112",
        "date":  "2026/07/29",
        "name":  "Amazonprime",
        "category":  "月額課金",
        "amount":  600,
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-113",
        "date":  "2026/07/16",
        "name":  "定期",
        "category":  "交通費",
        "amount":  13120,
        "status":  "unsettled",
        "emailId":  "1a05a2fed65d1969"
    },
    {
        "id":  "tx-114",
        "date":  null,
        "name":  "Gemini",
        "category":  "月額課金",
        "amount":  2900,
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-115",
        "date":  null,
        "name":  "YouTube Premium",
        "category":  "月額課金",
        "amount":  1100,
        "status":  "unsettled",
        "emailId":  ""
    }
]
};

const STORAGE_KEY = 'kakeibo_app_data_v2';
const SETTINGS_KEY = 'kakeibo_settings_v1';

class KakeiboStore {
  constructor() {
    this.data = this.loadData();
    this.settings = this.loadSettings();
    this.listeners = [];
  }

  loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('LocalStorage読み込み失敗:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA_202609));
  }

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('LocalStorage保存失敗:', e);
    }
    this.notify();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      gasApiUrl: '',
      autoSync: false,
      lastSyncTime: null
    };
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {}
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((l) => l(this.getSummary()));
  }

  // --- 計算ロジック（スプレッドシートの数式を完全に再現） ---
  getSummary() {
    const d = this.data;

    // 1. 今月のクレジットカード利用合計 (G33 = SUM(D33:D...))
    const totalSpent = d.transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    // 2. クレカ引落確定済みか？ (Row 4 の 引落有無「〇」)
    const cardSettled = d.fixedExpenses.find((f) => f.id === 'credit_card')?.settled || false;

    // 3. クレジット利用可能額 (Row 32 J32 = 1000000 - G33 + IF(B4="〇", 0, D20))
    // ※D20はマイナス値（例: -318,889）なので、未引落の時はカード枠から引かれている
    const cardAvailable = d.cardLimit - totalSpent + (cardSettled ? 0 : d.currentMonthCardBill);
    const isWarning = cardAvailable < d.cardWarningThreshold;

    // 4. 固定費の合計 (Row 17 = SUM(B15:B16)) ※家賃と医療ローン
    const pureFixedTotal = d.fixedExpenses
      .filter((f) => f.id !== 'credit_card')
      .reduce((sum, f) => sum + Number(f.amount || 0), 0); // マイナス値

    // 5. 各銀行の出入金集計
    const transfersByAccount = {};
    d.accounts.forEach((acc) => {
      transfersByAccount[acc.id] = { income: 0, expense: 0 };
    });

    d.bankTransfers.forEach((bt) => {
      if (transfersByAccount[bt.accountId]) {
        if (bt.type === 'income') {
          transfersByAccount[bt.accountId].income += Number(bt.amount || 0);
        } else {
          transfersByAccount[bt.accountId].expense += Number(bt.amount || 0);
        }
      }
    });

    // 6. 引落確定済み金額の口座反映 (SUMIF(B4:B6, "〇", C4:C6) -> 三井住友銀行)
    const settledDeduction = d.fixedExpenses
      .filter((f) => f.settled)
      .reduce((sum, f) => sum + Number(f.amount || 0), 0); // マイナス値

    // 7. 現在の口座残高 (Row 9-11 B列)
    const currentAccounts = d.accounts.map((acc) => {
      let balance = acc.initialBalance;
      const tf = transfersByAccount[acc.id] || { income: 0, expense: 0 };
      balance = balance - tf.expense + tf.income;

      // 三井住友銀行には引落確定済み分が加算（マイナス加算）される
      if (acc.id === 'smbc') {
        balance += settledDeduction;
      }

      return {
        ...acc,
        currentBalance: balance,
        incomes: tf.income,
        expenses: tf.expense
      };
    });

    const totalCurrentBalance = currentAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

    // 8. 今月引落後の所持金（推定） (Row 19-23)
    // 三井住友: B9 + D20 + B17 - SUMIF(B4:B6, "〇", C4:C6)
    // みずほ: B11 + D22(給料25万)
    // 三菱UFJ: B10
    const smbcCurrent = currentAccounts.find((a) => a.id === 'smbc')?.currentBalance || 0;
    const mufgCurrent = currentAccounts.find((a) => a.id === 'mufg')?.currentBalance || 0;
    const mizuhoCurrent = currentAccounts.find((a) => a.id === 'mizuho')?.currentBalance || 0;

    const smbcAfterCurrent = smbcCurrent + d.currentMonthCardBill + pureFixedTotal - settledDeduction;
    const mizuhoAfterCurrent = mizuhoCurrent + d.salaries.currentMonth;
    const mufgAfterCurrent = mufgCurrent;
    const totalAfterCurrent = smbcAfterCurrent + mizuhoAfterCurrent + mufgAfterCurrent;

    // 9. 来月引落後の所持金（推定） (Row 25-29)
    // 三井住友: 今月引落後SMBC - G33(今月クレカ合計) + B17(固定費)
    // みずほ: 今月引落後みずほ + D26(来月給料25万)
    // 三菱UFJ: 三菱UFJ
    const smbcAfterNext = smbcAfterCurrent - totalSpent + pureFixedTotal;
    const mizuhoAfterNext = mizuhoAfterCurrent + d.salaries.nextMonth;
    const mufgAfterNext = mufgAfterCurrent;
    const totalAfterNext = smbcAfterNext + mizuhoAfterNext + mufgAfterNext;

    // 10. カテゴリ別集計
    const categoryTotals = {};
    d.transactions.forEach((tx) => {
      const cat = tx.category || '未分類';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount || 0);
    });

    return {
      currentMonth: d.currentMonth,
      cardLimit: d.cardLimit,
      cardWarningThreshold: d.cardWarningThreshold,
      totalSpent,
      cardAvailable,
      isWarning,
      cardSettled,
      fixedExpenses: d.fixedExpenses,
      pureFixedTotal,
      accounts: currentAccounts,
      totalCurrentBalance,
      salaries: d.salaries,
      currentMonthCardBill: d.currentMonthCardBill,
      afterCurrentMonth: {
        smbc: smbcAfterCurrent,
        mufg: mufgAfterCurrent,
        mizuho: mizuhoAfterCurrent,
        total: totalAfterCurrent
      },
      afterNextMonth: {
        smbc: smbcAfterNext,
        mufg: mufgAfterNext,
        mizuho: mizuhoAfterNext,
        total: totalAfterNext
      },
      transactions: d.transactions,
      bankTransfers: d.bankTransfers,
      categoryTotals
    };
  }

  // --- 更新用メソッド ---

  // 口座の月初残高更新
  updateInitialBalance(accountId, amount) {
    const acc = this.data.accounts.find((a) => a.id === accountId);
    if (acc) {
      acc.initialBalance = Number(amount);
      this.saveData();
    }
  }

  // 固定費の引落ステータス切替（〇を付ける・外す）
  toggleFixedExpenseSettled(id) {
    const f = this.data.fixedExpenses.find((x) => x.id === id);
    if (f) {
      f.settled = !f.settled;
      this.saveData();
    }
  }

  // 新規明細（クレカ・手動支出）の追加
  addTransaction(tx) {
    const newTx = {
      id: 'tx-' + Date.now(),
      date: tx.date || new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
      name: tx.name || '支出',
      category: tx.category || '未分類',
      amount: Number(tx.amount || 0),
      status: tx.status || 'unsettled',
      emailId: tx.emailId || ''
    };
    this.data.transactions.unshift(newTx);
    this.saveData();
    return newTx;
  }

  // 明細の編集
  updateTransaction(id, updates) {
    const tx = this.data.transactions.find((t) => t.id === id);
    if (tx) {
      Object.assign(tx, updates);
      this.saveData();
    }
  }

  // 明細の削除
  deleteTransaction(id) {
    this.data.transactions = this.data.transactions.filter((t) => t.id !== id);
    this.saveData();
  }

  // 銀行の出入金追加
  addBankTransfer(transfer) {
    const newBt = {
      id: 'bt-' + Date.now(),
      accountId: transfer.accountId,
      type: transfer.type, // 'income' or 'expense'
      date: transfer.date || new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
      name: transfer.name || '出入金',
      amount: Number(transfer.amount || 0)
    };
    this.data.bankTransfers.unshift(newBt);
    this.saveData();
    return newBt;
  }

  // 給料や固定費の金額更新
  updateSalary(type, amount) {
    if (this.data.salaries[type] !== undefined) {
      this.data.salaries[type] = Number(amount);
      this.saveData();
    }
  }

  // 初期データへのリセット（デモ用）
  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA_202609));
    this.saveData();
  }
}

export const store = new KakeiboStore();
