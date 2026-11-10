/**
 * 家計簿データストア（計算ロジック・ローカルストレージ・初期データ管理）
 */

// スプレッドシートのプルダウン（データ入力規則）に定義されている全19カテゴリ
export const SPREADSHEET_CATEGORIES = [
  '交際費',
  'Suica',
  '定期代',
  'デート',
  '夜食代',
  'B/43',
  '通信費',
  '美容費',
  '医療費',
  '勉強・資格',
  '課金',
  'ジム',
  '被服費',
  '雑費',
  '外食',
  '食費',
  '昼ごはん',
  '日用品費',
  '水道光熱費'
];

// 旧カテゴリ名から新19カテゴリへの自動正規化ヘルパー
export function normalizeCategoryName(rawCat, txName = '') {
  const cat = String(rawCat || '').trim();
  const name = String(txName || '').trim();

  if (name.includes('AnyTime') || name.includes('エニタイム') || name.includes('ジム')) {
    if (!cat || cat === '月額課金' || cat === '課金' || cat === '引落系、課金系') return 'ジム';
  }
  if (name.includes('定期')) {
    if (!cat || cat === '交通費' || cat === '引落系、課金系') return '定期代';
  }

  if (!cat) return '';
  if (cat === '昼ご飯') return '昼ごはん';
  if (cat === '月額課金') return '課金';
  if (cat === '交通費') {
    if (name.includes('定期')) return '定期代';
    if (name.includes('Suica') || name.includes('Ｓｕｉｃａ')) return 'Suica';
    return '雑費';
  }
  if (cat === '飲み物代' || cat === 'お菓子代' || cat === 'おやつ') return '食費';
  if (cat === '娯楽費') return '雑費';
  return cat;
}

// 現在のJSTカレンダー年月（YYYYMM形式、例: "202610"）を取得するヘルパー
export function getCurrentCalendarYM() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

// 未確定光熱費・通信費のデフォルト目安確保額
export const DEFAULT_PENDING_ESTIMATES = {
  gas: 8500,       // 東京ガス（最近高めのため高めに設定）
  povo: 350,       // povo（通常月基本料金・トッピング除外）
  waterOdd: 4400   // 水道（奇数月の平均値・直近平均約4,430円、偶数月は0円）
};

// 基準となる初期データ
const DEFAULT_DATA_202609 = {
  currentMonth: getCurrentCalendarYM(),
  cardLimit: 1000000,
  cardWarningThreshold: 200000,
  availableMonths: [getCurrentCalendarYM(), '202609'],
  
  // 未確定固定費の目安設定
  pendingEstimates: { ...DEFAULT_PENDING_ESTIMATES },
  
  // 今月引落のクレカ代（手動入力セル D20）
  currentMonthCardBill: -318889,

  // 固定費（Row 15-16）
  fixedExpenses: [
    { id: 'rent', name: '家賃', amount: -82150, settled: false },
    { id: 'medical_loan', name: '医療ローン', amount: -29800, settled: false },
    { id: 'credit_card', name: 'クレカ引落', amount: -318889, settled: false }
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

  // 給料見込み（Row 22, 26）- 三井住友銀行振り込み
  salaries: {
    currentMonth: 250000, // 三井住友銀行
    nextMonth: 250000     // 三井住友銀行
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
        "id":  "tx-101",
        "date":  null,
        "name":  "水道",
        "category":  "水道光熱費",
        "amount":  0,
        "amountPending": true,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-102",
        "date":  "2026/06/30",
        "name":  "Times",
        "category":  "月額課金",
        "amount":  880,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-103",
        "date":  "2026/07/04",
        "name":  "東京ガス",
        "category":  "水道光熱費",
        "amount":  0,
        "amountPending": true,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-104",
        "date":  "2026/07/08",
        "name":  "レンタルサーバー",
        "category":  "月額課金",
        "amount":  2637,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-105",
        "date":  "2026/07/08",
        "name":  "Applecare（安心代）",
        "category":  "月額課金",
        "amount":  1280,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-106",
        "date":  "2026/07/11",
        "name":  "povo",
        "category":  "通信費",
        "amount":  0,
        "amountPending": true,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-107",
        "date":  "2026/09/13",
        "name":  "AnyTime",
        "category":  "月額課金",
        "amount":  7900,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  "1a09a69aa7dd7dce"
    },
    {
        "id":  "tx-108",
        "date":  "2026/07/19",
        "name":  "Apple One",
        "category":  "月額課金",
        "amount":  1200,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-109",
        "date":  "2026/07/21",
        "name":  "iCloud",
        "category":  "月額課金",
        "amount":  150,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-110",
        "date":  "2026/07/25",
        "name":  "薬",
        "category":  "医療費",
        "amount":  8797,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-111",
        "date":  "2026/07/28",
        "name":  "WiFi",
        "category":  "通信費",
        "amount":  3960,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-112",
        "date":  "2026/07/29",
        "name":  "Amazonprime",
        "category":  "月額課金",
        "amount":  600,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-113",
        "date":  "2026/07/16",
        "name":  "定期",
        "category":  "交通費",
        "amount":  13120,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  "1a05a2fed65d1969"
    },
    {
        "id":  "tx-114",
        "date":  null,
        "name":  "Gemini",
        "category":  "月額課金",
        "amount":  2900,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    },
    {
        "id":  "tx-115",
        "date":  null,
        "name":  "YouTube Premium",
        "category":  "月額課金",
        "amount":  1100,
        "group": "recurring",
        "status":  "unsettled",
        "emailId":  ""
    }
  ]
};

const STORAGE_KEY = 'kakeibo_app_data_v3';
const SETTINGS_KEY = 'kakeibo_settings_v1';

class KakeiboStore {
  constructor() {
    this.settings = this.loadSettings();
    this.data = this.loadData();
    this.listeners = [];
  }

  loadData() {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      // v2 からのマイグレーション
      if (!saved) {
        const oldV2 = localStorage.getItem('kakeibo_app_data_v2');
        if (oldV2) saved = oldV2;
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        let needsSave = false;

        if (Array.isArray(parsed.transactions)) {
          const beforeLen = parsed.transactions.length;
          // 不正なゴミデータ（tx-117等）や誤った店名（サブスク）をクリーンアップ
          parsed.transactions = parsed.transactions.filter(t => t.id !== 'tx-117' && t.name !== 'サブスク');

          // 202609以外の月に、旧バージョンのバグで混入した2026年9月の初期デモ明細があれば除去
          if (parsed.currentMonth && parsed.currentMonth !== '202609') {
            const demoEmailIds = new Set(
              DEFAULT_DATA_202609.transactions
                .filter(t => t.group !== 'recurring' && t.emailId)
                .map(t => t.emailId)
            );
            parsed.transactions = parsed.transactions.filter(t => {
              if (t.group !== 'recurring' && t.emailId && demoEmailIds.has(t.emailId) && String(t.date || '').startsWith('2026/09/')) {
                return false;
              }
              return true;
            });
          }

          // GAS同期時のI列(emailId)誤上書きバグ（例: 「温泉代」→「1a1afc8bec90c22a」）を自動修復
          const repaired = this.sanitizeTransactions(
            parsed.transactions,
            [],
            parsed.currentMonth || getCurrentCalendarYM(),
            parsed.customTxNames
          );
          if (repaired.changed) {
            parsed.transactions = repaired.transactions;
            parsed.customTxNames = repaired.customTxNames;
            needsSave = true;
          }

          if (parsed.transactions.length !== beforeLen) {
            needsSave = true;
          }
        }

        // 未確定固定費の目安設定を初期化・マージ
        if (!parsed.pendingEstimates) {
          parsed.pendingEstimates = { ...DEFAULT_PENDING_ESTIMATES };
        } else {
          parsed.pendingEstimates = { ...DEFAULT_PENDING_ESTIMATES, ...parsed.pendingEstimates };
        }

        // 給料設定の復元（ユーザー設定値があれば確実に維持）
        if (!parsed.salaries) {
          parsed.salaries = { currentMonth: 250000, nextMonth: 250000 };
        }
        if (!parsed.customSalariesByMonth) {
          parsed.customSalariesByMonth = {};
        }
        const monthKey = parsed.currentMonth || getCurrentCalendarYM();
        const savedMonthSal = parsed.customSalariesByMonth[monthKey];
        const savedGlobalSal = this.settings?.customSalaries;
        if (savedMonthSal) {
          if (savedMonthSal.currentMonth !== undefined) parsed.salaries.currentMonth = Number(savedMonthSal.currentMonth);
          if (savedMonthSal.nextMonth !== undefined) parsed.salaries.nextMonth = Number(savedMonthSal.nextMonth);
        } else if (savedGlobalSal) {
          if (savedGlobalSal.currentMonth !== undefined) parsed.salaries.currentMonth = Number(savedGlobalSal.currentMonth);
          if (savedGlobalSal.nextMonth !== undefined) parsed.salaries.nextMonth = Number(savedGlobalSal.nextMonth);
        }

        // 新月自動ロールオーバー検知（例: 202609 から 202610 への月替わり）
        const calYM = getCurrentCalendarYM();
        if (parsed.currentMonth && parsed.currentMonth < calYM) {
          console.log(`新月を検知しました: 表示月を ${parsed.currentMonth} から当月 ${calYM} へ自動更新します`);
          parsed.previousMonth = parsed.currentMonth;
          parsed.currentMonth = calYM;

          // 前月の「来月の給料」設定を新月の給料見込みへ引き継ぐ
          const carryOverSalary = Number(parsed.salaries?.nextMonth ?? savedGlobalSal?.nextMonth ?? 250000);
          parsed.salaries = {
            currentMonth: carryOverSalary,
            nextMonth: carryOverSalary
          };

          // 新月になったので引落チェック欄を未引落状態にリセット
          if (Array.isArray(parsed.fixedExpenses)) {
            parsed.fixedExpenses.forEach((f) => { f.settled = false; });
          }
          parsed.cardSettled = false;
          parsed.rentSettled = false;
          parsed.loanSettled = false;

          // 利用可能な月リストに新月を追加
          if (!Array.isArray(parsed.availableMonths)) {
            parsed.availableMonths = [calYM, parsed.previousMonth];
          } else if (!parsed.availableMonths.includes(calYM)) {
            parsed.availableMonths.unshift(calYM);
          }
          needsSave = true;
        }

        if (needsSave) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } catch (e) {}
        }

        return parsed;
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

  // --- 未確定固定費の目安金額取得 ---
  getRecurringPendingEstimate(tx, ym) {
    if (!tx) return 0;
    const targetYM = String(ym || this.data.currentMonth || getCurrentCalendarYM());
    const m = parseInt(targetYM.length >= 6 ? targetYM.substring(4, 6) : String(new Date().getMonth() + 1), 10);
    const isOddMonth = (m % 2 !== 0);

    const estimates = this.data.pendingEstimates || DEFAULT_PENDING_ESTIMATES;
    const name = String(tx.name || '');

    if (name.includes('ガス')) {
      return Number(estimates.gas ?? DEFAULT_PENDING_ESTIMATES.gas);
    }
    if (name.includes('povo')) {
      return Number(estimates.povo ?? DEFAULT_PENDING_ESTIMATES.povo);
    }
    if (name.includes('水道')) {
      // 偶数月は0円、奇数月は平均目安額
      return isOddMonth ? Number(estimates.waterOdd ?? DEFAULT_PENDING_ESTIMATES.waterOdd) : 0;
    }
    return 0;
  }

  // 目安金額の設定更新
  updatePendingEstimates(updates) {
    if (!this.data.pendingEstimates) {
      this.data.pendingEstimates = { ...DEFAULT_PENDING_ESTIMATES };
    }
    Object.assign(this.data.pendingEstimates, updates);
    this.saveData();
  }

  // --- 計算ロジック（スプレッドシートの数式を完全に再現） ---
  getSummary() {
    const d = this.data;

    // 1. 今月のクレジットカード利用合計
    // (1) 確定済み利用額（未確定フラグなし ＆ 金額 > 0）
    const actualSpent = d.transactions
      .filter((tx) => !tx.amountPending && Number(tx.amount || 0) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    // (2) 未確定固定費の目安仮確保額（ガス、povo、水道など）
    const pendingRecurringItems = d.transactions.filter(
      (tx) => tx.group === 'recurring' && (tx.amountPending || !tx.amount || Number(tx.amount) === 0)
    );
    const estimatedPendingTotal = pendingRecurringItems.reduce(
      (sum, tx) => sum + this.getRecurringPendingEstimate(tx, d.currentMonth),
      0
    );

    // 引落見込み総額（確定利用分 ＋ 未確定の仮確保分）
    const totalSpent = actualSpent + estimatedPendingTotal;

    // 2. クレカ引落確定済みか？ (Row 4 の 引落有無「〇」)
    const cardSettled = d.fixedExpenses.find((f) => f.id === 'credit_card')?.settled || false;

    // 3. クレジット利用可能額 (Row 32 J32 = 1000000 - totalSpent + IF(B4="〇", 0, D20))
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

    // 8. 今月引落後の所持金（推定） (スプレッドシート Row 19-23)
    // ※給料設定（salaries）は口座の実残高や入出金記録には一切書き込まれません。
    // ※将来シミュレーション（今月引落後・来月引落後の使えるお金）の「計算上のみ」で使用されます。
    // ※スプレッドシート数式（Row 22: IF(SUMIF(入出金,"給料")=0, 残高+給料見込, 残高)）に完全準拠：
    //   実際に入出金記録に「給料」が登録されていれば通帳残高に含まれているため見込みは加算せず、未登録の場合のみ見込みを加算。
    const smbcCurrent = currentAccounts.find((a) => a.id === 'smbc')?.currentBalance || 0;
    const mufgCurrent = currentAccounts.find((a) => a.id === 'mufg')?.currentBalance || 0;
    const mizuhoCurrent = currentAccounts.find((a) => a.id === 'mizuho')?.currentBalance || 0;

    // 給与・給料の入金記録を判定（三井住友銀行または各口座の入金で「給料」「給与」「キユウヨ」「ｷﾕｳﾖ」「給与振込」等）
    const salaryTransfers = (d.bankTransfers || []).filter((tf) => {
      if (tf.type !== 'income') return false;
      const n = String(tf.name || '').trim().toLowerCase();
      return n.includes('給料') || 
             n.includes('給与') || 
             n.includes('キユウヨ') || 
             n.includes('ｷﾕｳﾖ') || 
             n.includes('賞与') || 
             n.includes('ボーナス') || 
             n.includes('salary');
    });

    const actualSalary = salaryTransfers.reduce((sum, tf) => sum + Number(tf.amount || 0), 0);
    const isSalarySettled = salaryTransfers.length > 0;
    // 実際に給料振込があれば通帳残高（smbcCurrent）にすでに給料が含まれているため見込み額は二重加算せず0、未振込の場合のみ見込みを加算。
    const effectiveCurrentSalary = isSalarySettled ? 0 : Number(d.salaries?.currentMonth ?? 250000);

    const smbcAfterCurrent = smbcCurrent + d.currentMonthCardBill + pureFixedTotal - settledDeduction + effectiveCurrentSalary;
    const mizuhoAfterCurrent = mizuhoCurrent;
    const mufgAfterCurrent = mufgCurrent;
    const totalAfterCurrent = smbcAfterCurrent + mizuhoAfterCurrent + mufgAfterCurrent;

    // 9. 来月引落後の所持金（推定） (スプレッドシート Row 25-29)
    // 来月の給料（nextSalary）も将来予測シミュレーションの計算上でのみ加算
    const smbcAfterNext = smbcAfterCurrent - totalSpent + pureFixedTotal + Number(d.salaries?.nextMonth ?? 250000);
    const mizuhoAfterNext = mizuhoAfterCurrent;
    const mufgAfterNext = mufgAfterCurrent;
    const totalAfterNext = smbcAfterNext + mizuhoAfterNext + mufgAfterNext;

    // 10. カテゴリ別集計（旧カテゴリ名は新19カテゴリへ自動正規化して合算）
    const categoryTotals = {};
    d.transactions.forEach((tx) => {
      const normalizedCat = normalizeCategoryName(tx.category, tx.name) || '未分類';
      if (tx.category && tx.category !== normalizedCat && tx.category !== '未分類') {
        tx.category = normalizedCat;
      }
      const amt = (tx.group === 'recurring' && (tx.amountPending || !tx.amount || Number(tx.amount) === 0))
        ? this.getRecurringPendingEstimate(tx, d.currentMonth)
        : Number(tx.amount || 0);
      if (amt > 0) {
        categoryTotals[normalizedCat] = (categoryTotals[normalizedCat] || 0) + amt;
      }
    });

    // 11. B/43（彼女の2人食費管理：実額は2人分を入力し、棒グラフには1人分＝半額を反映）の集計
    const currentYM = String(d.currentMonth || getCurrentCalendarYM());
    const b43ActualTarget = this.getB43Target(currentYM); // 2人合計のB/43目標設定額（実額）
    const b43Logs = this.getB43Logs(currentYM);
    const b43Actuals = this.getB43Actuals(currentYM);     // 2人合計の食費・外食の実額

    const b43ActualGroceries = b43Actuals.groceries;
    const b43ActualDining = b43Actuals.dining;
    const b43ActualSpentTotal = b43ActualGroceries + b43ActualDining;
    const b43ActualRemaining = Math.max(0, b43ActualTarget - b43ActualSpentTotal);
    const b43ActualOverAmount = Math.max(0, b43ActualSpentTotal - b43ActualTarget);

    // 棒グラフ反映用の1人分（実額の半額：2人で同額を入れ毎度割り勘という計算）
    const b43HalfTarget = Math.round(b43ActualTarget / 2);
    const b43HalfGroceries = Math.round(b43ActualGroceries / 2);
    const b43HalfDining = Math.round(b43ActualDining / 2);
    const b43HalfSpentTotal = b43HalfGroceries + b43HalfDining;
    const b43ChargedTotal = categoryTotals['B/43'] || 0;
    const b43HalfRemaining = Math.max(0, b43HalfTarget - b43HalfSpentTotal);
    const b43HalfOverAmount = Math.max(0, b43HalfSpentTotal - b43HalfTarget);

    // 棒グラフ上のB/43カテゴリの基準値（実額が入力されていればその半額＝1人分、未入力時はクレカチャージ額）
    if (b43HalfSpentTotal > 0) {
      categoryTotals['B/43'] = b43HalfSpentTotal;
    } else if (b43ChargedTotal > 0) {
      categoryTotals['B/43'] = b43ChargedTotal;
    }

    const b43Summary = {
      // 棒グラフ表示用（1人分＝実額の半額）
      target: b43HalfTarget,
      chargedTotal: b43ChargedTotal,
      groceriesTotal: b43HalfGroceries,
      diningTotal: b43HalfDining,
      spentTotal: b43HalfSpentTotal,
      remaining: b43HalfRemaining,
      overAmount: b43HalfOverAmount,
      isOver: b43ActualSpentTotal > b43ActualTarget,
      // B/43での実額（2人分合計：入力欄で管理する値）
      actualTarget: b43ActualTarget,
      actualGroceries: b43ActualGroceries,
      actualDining: b43ActualDining,
      actualSpentTotal: b43ActualSpentTotal,
      actualRemaining: b43ActualRemaining,
      actualOverAmount: b43ActualOverAmount,
      logs: b43Logs
    };

    // 12. Suica（交通費＋自販機代：自販機代は手打ち、残りのチャージ分はすべて自動で交通費）の集計
    const suicaLogs = this.getSuicaLogs(currentYM);
    const suicaVendingTotal = suicaLogs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const suicaChargedTotal = categoryTotals['Suica'] || 0;
    const suicaTransitTotal = Math.max(0, suicaChargedTotal - suicaVendingTotal);
    const suicaTotal = Math.max(suicaChargedTotal, suicaVendingTotal);

    if (suicaTotal > 0) {
      categoryTotals['Suica'] = suicaTotal;
    }

    const suicaSummary = {
      chargedTotal: suicaChargedTotal,
      vendingTotal: suicaVendingTotal,
      transitTotal: suicaTransitTotal,
      total: suicaTotal,
      logs: suicaLogs
    };

    return {
      currentMonth: d.currentMonth,
      cardLimit: d.cardLimit,
      cardWarningThreshold: d.cardWarningThreshold,
      totalSpent,
      actualSpent,
      estimatedPendingTotal,
      pendingRecurringCount: pendingRecurringItems.length,
      pendingEstimates: d.pendingEstimates || DEFAULT_PENDING_ESTIMATES,
      cardAvailable,
      isWarning,
      cardSettled,
      fixedExpenses: d.fixedExpenses,
      pureFixedTotal,
      accounts: currentAccounts,
      totalCurrentBalance,
      salaries: {
        ...d.salaries,
        isCurrentSettled: isSalarySettled,
        actualSalary: actualSalary,
        salaryTransfers: salaryTransfers
      },
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
      categoryTotals,
      b43Summary,
      suicaSummary
    };
  }

  // --- B/43 & Suica 内訳ログ・目標額の管理メソッド ---

  getB43Target(ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    const byMonth = this.data?.b43TargetByMonth?.[monthKey];
    if (byMonth !== undefined && byMonth !== null && !isNaN(Number(byMonth))) {
      return Number(byMonth);
    }
    const globalTarget = this.settings?.b43TargetBudget ?? this.data?.b43TargetBudget;
    if (globalTarget !== undefined && globalTarget !== null && !isNaN(Number(globalTarget))) {
      return Number(globalTarget);
    }
    return 30000; // デフォルト目標額 30,000円
  }

  updateB43Target(amount, ym) {
    const val = Math.max(0, Number(amount) || 0);
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    if (!this.data.b43TargetByMonth) this.data.b43TargetByMonth = {};
    this.data.b43TargetByMonth[monthKey] = val;
    this.data.b43TargetBudget = val;
    this.settings = {
      ...this.settings,
      b43TargetBudget: val
    };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {}
    this.saveData();
    return val;
  }

  // B/43 での2人分の食費（自炊代）・外食代の実額を取得
  getB43Actuals(ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    const direct = this.data?.b43ActualsByMonth?.[monthKey];
    const logs = this.getB43Logs(monthKey);
    const logGroceries = logs
      .filter((item) => item.subType !== 'dining')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const logDining = logs
      .filter((item) => item.subType === 'dining')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const groceries = (direct && direct.groceries !== undefined && !isNaN(Number(direct.groceries)))
      ? Math.max(0, Number(direct.groceries))
      : logGroceries;
    const dining = (direct && direct.dining !== undefined && !isNaN(Number(direct.dining)))
      ? Math.max(0, Number(direct.dining))
      : logDining;

    return { groceries, dining };
  }

  // B/43 の目標設定額・食費実額・外食実額（2人分）を直接一括更新
  updateB43Actuals({ target, groceries, dining }, ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    if (target !== undefined && !isNaN(Number(target))) {
      const targetVal = Math.max(0, Number(target) || 0);
      if (!this.data.b43TargetByMonth) this.data.b43TargetByMonth = {};
      this.data.b43TargetByMonth[monthKey] = targetVal;
      this.data.b43TargetBudget = targetVal;
      this.settings = {
        ...this.settings,
        b43TargetBudget: targetVal
      };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (e) {}
    }

    if (!this.data.b43ActualsByMonth) this.data.b43ActualsByMonth = {};
    const current = this.getB43Actuals(monthKey);
    this.data.b43ActualsByMonth[monthKey] = {
      groceries: groceries !== undefined && !isNaN(Number(groceries)) ? Math.max(0, Number(groceries)) : current.groceries,
      dining: dining !== undefined && !isNaN(Number(dining)) ? Math.max(0, Number(dining)) : current.dining
    };
    this.saveData();
    return this.data.b43ActualsByMonth[monthKey];
  }

  getB43Logs(ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    const list = this.data?.b43LogsByMonth?.[monthKey];
    return Array.isArray(list) ? list : [];
  }

  addB43Log(entry, ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    if (!this.data.b43LogsByMonth) this.data.b43LogsByMonth = {};
    if (!Array.isArray(this.data.b43LogsByMonth[monthKey])) {
      this.data.b43LogsByMonth[monthKey] = [];
    }
    const currentActuals = this.getB43Actuals(monthKey);
    const subType = entry.subType === 'dining' ? 'dining' : 'groceries';
    const defaultName = subType === 'dining' ? '2人で外食' : '自炊・買い出し';
    const amt = Math.max(0, Number(entry.amount) || 0);
    const newItem = {
      id: entry.id || `b43-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: entry.date || new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
      subType,
      name: String(entry.name || defaultName).trim(),
      amount: amt
    };
    this.data.b43LogsByMonth[monthKey].unshift(newItem);

    // 直接実額欄にも加算して同期
    if (!this.data.b43ActualsByMonth) this.data.b43ActualsByMonth = {};
    this.data.b43ActualsByMonth[monthKey] = {
      groceries: subType === 'groceries' ? currentActuals.groceries + amt : currentActuals.groceries,
      dining: subType === 'dining' ? currentActuals.dining + amt : currentActuals.dining
    };

    this.saveData();
    return newItem;
  }

  updateB43Log(id, updates, ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    const list = this.data?.b43LogsByMonth?.[monthKey];
    if (!Array.isArray(list)) return null;
    const item = list.find((x) => x.id === id);
    if (item) {
      if (updates.date !== undefined) item.date = updates.date;
      if (updates.subType !== undefined) item.subType = updates.subType === 'dining' ? 'dining' : 'groceries';
      if (updates.name !== undefined) item.name = String(updates.name).trim();
      if (updates.amount !== undefined) item.amount = Math.max(0, Number(updates.amount) || 0);
      this.saveData();
      return item;
    }
    return null;
  }

  deleteB43Log(id, ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    if (!this.data?.b43LogsByMonth?.[monthKey]) return;
    const targetItem = this.data.b43LogsByMonth[monthKey].find((x) => x.id === id);
    const currentActuals = this.getB43Actuals(monthKey);
    this.data.b43LogsByMonth[monthKey] = this.data.b43LogsByMonth[monthKey].filter((x) => x.id !== id);
    if (targetItem) {
      if (!this.data.b43ActualsByMonth) this.data.b43ActualsByMonth = {};
      const amt = Math.max(0, Number(targetItem.amount) || 0);
      this.data.b43ActualsByMonth[monthKey] = {
        groceries: targetItem.subType === 'dining' ? currentActuals.groceries : Math.max(0, currentActuals.groceries - amt),
        dining: targetItem.subType === 'dining' ? Math.max(0, currentActuals.dining - amt) : currentActuals.dining
      };
    }
    this.saveData();
  }

  getSuicaLogs(ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    const list = this.data?.suicaLogsByMonth?.[monthKey];
    return Array.isArray(list) ? list : [];
  }

  addSuicaLog(entry, ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    if (!this.data.suicaLogsByMonth) this.data.suicaLogsByMonth = {};
    if (!Array.isArray(this.data.suicaLogsByMonth[monthKey])) {
      this.data.suicaLogsByMonth[monthKey] = [];
    }
    const newItem = {
      id: entry.id || `suica-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: entry.date || new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
      subType: 'vending',
      name: String(entry.name || '自販機（飲み物）').trim(),
      amount: Math.max(0, Number(entry.amount) || 0)
    };
    this.data.suicaLogsByMonth[monthKey].unshift(newItem);
    this.saveData();
    return newItem;
  }

  updateSuicaLog(id, updates, ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    const list = this.data?.suicaLogsByMonth?.[monthKey];
    if (!Array.isArray(list)) return null;
    const item = list.find((x) => x.id === id);
    if (item) {
      if (updates.date !== undefined) item.date = updates.date;
      if (updates.name !== undefined) item.name = String(updates.name).trim();
      if (updates.amount !== undefined) item.amount = Math.max(0, Number(updates.amount) || 0);
      this.saveData();
      return item;
    }
    return null;
  }

  deleteSuicaLog(id, ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    if (!this.data?.suicaLogsByMonth?.[monthKey]) return;
    this.data.suicaLogsByMonth[monthKey] = this.data.suicaLogsByMonth[monthKey].filter((x) => x.id !== id);
    this.saveData();
  }

  // スプレッドシート同期用の内訳ペイロードを取得
  getSubLogsPayload(ym) {
    const monthKey = String(ym || this.data?.currentMonth || getCurrentCalendarYM());
    return {
      month: monthKey,
      b43Target: this.getB43Target(monthKey),
      b43Actuals: this.getB43Actuals(monthKey),
      b43Logs: this.getB43Logs(monthKey),
      suicaLogs: this.getSuicaLogs(monthKey)
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

  // 今月引落のクレカ代（手動更新 / D20連動）
  updateCardBill(amount) {
    const val = -Math.abs(Number(amount));
    this.data.currentMonthCardBill = val;
    const cc = this.data.fixedExpenses.find((f) => f.id === 'credit_card');
    if (cc) {
      cc.amount = val;
    }
    this.saveData();
    return val;
  }

  // 固定費の引落ステータス切替（〇を付ける・外す）
  toggleFixedExpenseSettled(id) {
    const f = this.data.fixedExpenses.find((x) => x.id === id);
    if (f) {
      f.settled = !f.settled;
      // 内部フラグの同期
      if (id === 'credit_card' || id === 'card') {
        this.data.cardSettled = f.settled;
      } else if (id === 'rent') {
        this.data.rentSettled = f.settled;
      } else if (id === 'medical_loan' || id === 'loan') {
        this.data.loanSettled = f.settled;
      }
      this.saveData();
      return f.settled;
    }
    return false;
  }

  // 16進数のGmailメッセージID（ハッシュ値のような文字列）かどうかを判定
  isHexHashName(val) {
    if (!val) return false;
    const s = String(val).trim();
    return /^[0-9a-f]{12,32}$/i.test(s);
  }

  // ユーザーが入力・更新した項目名（例:「温泉代」）を記憶し、同期時のハッシュ化を防止
  rememberCustomTxName(tx, month) {
    if (!tx || !tx.name || this.isHexHashName(tx.name)) return;
    const cleanName = String(tx.name).trim();
    const ym = String(month || this.data?.currentMonth || getCurrentCalendarYM());
    if (!this.data.customTxNames) this.data.customTxNames = {};
    if (!this.settings.customTxNames) this.settings.customTxNames = {};

    const keys = [];
    if (tx.emailId) keys.push(`email:${String(tx.emailId).trim()}`);
    if (tx.id) keys.push(`id:${ym}:${tx.id}`);
    if (tx.date && tx.amount !== undefined) keys.push(`da:${ym}:${tx.date}:${Number(tx.amount)}`);

    keys.forEach((k) => {
      this.data.customTxNames[k] = cleanName;
      this.settings.customTxNames[k] = cleanName;
    });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {}
  }

  // 同期データや保存データの明細名に16進数ID（例: 1a1afc8bec90c22a）が混入していた場合に本来の項目名へ復元する
  sanitizeTransactions(transactions, prevTransactions = [], month = '', existingMap = null) {
    if (!Array.isArray(transactions)) {
      return { transactions: [], changed: false, customTxNames: existingMap || {} };
    }
    const ym = String(month || this.data?.currentMonth || getCurrentCalendarYM());
    const customMap = {
      ...(this.settings?.customTxNames || {}),
      ...(this.data?.customTxNames || {}),
      ...(existingMap || {})
    };
    // 既知の誤変換ID「1a1afc8bec90c22a」→「温泉代」を確実に登録
    if (!customMap['email:1a1afc8bec90c22a']) {
      customMap['email:1a1afc8bec90c22a'] = '温泉代';
    }

    // 同期前のローカル明細から非16進数の正常な名前をインデックス化
    if (Array.isArray(prevTransactions)) {
      prevTransactions.forEach((ptx) => {
        if (ptx && ptx.name && !this.isHexHashName(ptx.name)) {
          const pname = String(ptx.name).trim();
          if (ptx.emailId) customMap[`email:${String(ptx.emailId).trim()}`] = pname;
          if (ptx.id) customMap[`id:${ym}:${ptx.id}`] = pname;
          if (ptx.date && ptx.amount !== undefined) {
            customMap[`da:${ym}:${ptx.date}:${Number(ptx.amount)}`] = pname;
          }
        }
      });
    }

    let changed = false;
    const sanitized = transactions.map((tx) => {
      if (!tx) return tx;
      const rawName = String(tx.name || '').trim();
      const rawCat = String(tx.category || '').trim();
      const rawEmail = String(tx.emailId || '').trim();
      const nameIsHex = this.isHexHashName(rawName) || (rawEmail && rawName === rawEmail && this.isHexHashName(rawEmail));
      const catIsHex = this.isHexHashName(rawCat);

      let nextName = rawName;
      let nextCat = catIsHex ? '未分類' : rawCat;
      if (catIsHex) changed = true;

      if (nameIsHex) {
        let restored = '';
        // 1. 旧Code.gsがB列の「温泉代」などをC列(category)へ退避させていた場合はそこから復元
        if (rawCat && !catIsHex && !SPREADSHEET_CATEGORIES.includes(rawCat) && rawCat !== '未分類') {
          restored = rawCat;
        }
        // 2. 記憶済みマップ（emailId / 行ID / 日付+金額）から復元
        if (!restored && rawEmail && customMap[`email:${rawEmail}`]) {
          restored = customMap[`email:${rawEmail}`];
        }
        if (!restored && customMap[`email:${rawName}`]) {
          restored = customMap[`email:${rawName}`];
        }
        if (!restored && tx.id && customMap[`id:${ym}:${tx.id}`]) {
          restored = customMap[`id:${ym}:${tx.id}`];
        }
        if (!restored && tx.date && tx.amount !== undefined && customMap[`da:${ym}:${tx.date}:${Number(tx.amount)}`]) {
          restored = customMap[`da:${ym}:${tx.date}:${Number(tx.amount)}`];
        }
        // 3. 1a1afc8bec90c22a または emailId一致時のフォールバック
        if (!restored && (rawName.toLowerCase() === '1a1afc8bec90c22a' || rawEmail.toLowerCase() === '1a1afc8bec90c22a')) {
          restored = '温泉代';
        }
        // 4. それでも特定できない16進数ハッシュで「代」「費」を含むカテゴリがある場合
        if (!restored && rawCat && (rawCat.includes('代') || rawCat.includes('費'))) {
          restored = rawCat;
        }

        if (restored) {
          nextName = restored;
          changed = true;
          if (rawEmail) customMap[`email:${rawEmail}`] = restored;
          if (tx.id) customMap[`id:${ym}:${tx.id}`] = restored;
        }
      } else if (rawName && (rawName.includes('代') || rawName.includes('費'))) {
        // 「温泉代」など「代」「費」を含む明細名は次回同期で消えないよう自動記憶
        if (rawEmail) customMap[`email:${rawEmail}`] = rawName;
        if (tx.id) customMap[`id:${ym}:${tx.id}`] = rawName;
        if (tx.date && tx.amount !== undefined) {
          customMap[`da:${ym}:${tx.date}:${Number(tx.amount)}`] = rawName;
        }
      }

      // 旧カテゴリ表記を新19カテゴリに正規化
      if (nextCat && nextCat !== '未分類' && nextCat !== '引落系、課金系') {
        const normalized = normalizeCategoryName(nextCat, nextName);
        if (normalized && normalized !== nextCat) {
          nextCat = normalized;
          changed = true;
        }
      } else if ((!nextCat || nextCat === '引落系、課金系') && tx.group === 'recurring') {
        const normalized = normalizeCategoryName(nextCat, nextName);
        if (normalized && normalized !== nextCat) {
          nextCat = normalized;
          changed = true;
        }
      }

      if (nextName !== tx.name || nextCat !== tx.category) {
        return {
          ...tx,
          name: nextName,
          category: nextCat
        };
      }
      return tx;
    });

    return { transactions: sanitized, changed, customTxNames: customMap };
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
      emailId: tx.emailId || '',
      group: tx.group || 'card'
    };
    this.rememberCustomTxName(newTx, this.data.currentMonth);
    this.data.transactions.unshift(newTx);
    this.saveData();
    return newTx;
  }

  // 明細のカテゴリ（ジャンル）を更新
  updateTransactionCategory(id, newCategory) {
    const tx = this.data.transactions.find((t) => t.id === id);
    if (tx) {
      tx.category = newCategory;
      this.saveData();
      return tx;
    }
    return null;
  }

  // 明細の編集
  updateTransaction(id, updates) {
    const tx = this.data.transactions.find((t) => t.id === id);
    if (tx) {
      Object.assign(tx, updates);
      if (updates.amountPending !== undefined) {
        tx.amountPending = updates.amountPending;
      } else if (updates.amount !== undefined) {
        if (Number(updates.amount) > 0) {
          tx.amountPending = false;
        } else if (tx.group === 'recurring') {
          tx.amountPending = true;
        }
      }
      this.rememberCustomTxName(tx, this.data.currentMonth);
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
      id: transfer.id || 'bt-' + Date.now(),
      row: transfer.row,
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

  // 銀行の出入金更新
  updateBankTransfer(transfer) {
    const idx = this.data.bankTransfers.findIndex((t) => t.id === transfer.id);
    if (idx !== -1) {
      this.data.bankTransfers[idx] = {
        ...this.data.bankTransfers[idx],
        ...transfer,
        amount: Number(transfer.amount || 0)
      };
      this.saveData();
      return this.data.bankTransfers[idx];
    }
    return null;
  }

  // 銀行の出入金削除
  deleteBankTransfer(id) {
    const target = this.data.bankTransfers.find((t) => t.id === id);
    this.data.bankTransfers = this.data.bankTransfers.filter((t) => t.id !== id);
    this.saveData();
    return target;
  }

  // 給料や固定費の金額更新
  updateSalary(type, amount) {
    if (!this.data.salaries) {
      this.data.salaries = { currentMonth: 250000, nextMonth: 250000 };
    }
    if (this.data.salaries[type] !== undefined) {
      this.data.salaries[type] = Number(amount);
      const monthKey = this.data.currentMonth || getCurrentCalendarYM();
      if (!this.data.customSalariesByMonth) {
        this.data.customSalariesByMonth = {};
      }
      this.data.customSalariesByMonth[monthKey] = {
        currentMonth: this.data.salaries.currentMonth,
        nextMonth: this.data.salaries.nextMonth,
        updatedAt: Date.now()
      };
      this.settings = {
        ...this.settings,
        customSalaries: {
          currentMonth: this.data.salaries.currentMonth,
          nextMonth: this.data.salaries.nextMonth
        }
      };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (e) {}
      this.saveData();
    }
  }

  // 今月・来月の給料設定を一括更新
  updateSalaries(currentMonthAmount, nextMonthAmount) {
    if (!this.data.salaries) {
      this.data.salaries = { currentMonth: 250000, nextMonth: 250000 };
    }
    this.data.salaries.currentMonth = Number(currentMonthAmount);
    this.data.salaries.nextMonth = Number(nextMonthAmount);

    const monthKey = this.data.currentMonth || getCurrentCalendarYM();
    if (!this.data.customSalariesByMonth) {
      this.data.customSalariesByMonth = {};
    }
    this.data.customSalariesByMonth[monthKey] = {
      currentMonth: this.data.salaries.currentMonth,
      nextMonth: this.data.salaries.nextMonth,
      updatedAt: Date.now()
    };
    this.settings = {
      ...this.settings,
      customSalaries: {
        currentMonth: this.data.salaries.currentMonth,
        nextMonth: this.data.salaries.nextMonth
      }
    };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {}
    this.saveData();
  }

  // スプレッドシートから取得した最新データを適用・保存
  applyMonthData(apiData) {
    if (!apiData) return;

    const prevMonth = this.data.currentMonth;
    const prevTransactions = Array.isArray(this.data.transactions) ? this.data.transactions : [];

    if (apiData.currentMonth) {
      this.data.currentMonth = apiData.currentMonth;
    }
    if (Array.isArray(apiData.availableMonths)) {
      this.data.availableMonths = apiData.availableMonths;
    }
    if (apiData.currentCalendarMonth) {
      this.data.currentCalendarMonth = apiData.currentCalendarMonth;
    }
    if (Array.isArray(apiData.transactions)) {
      const targetMonth = this.data.currentMonth || getCurrentCalendarYM();
      const sameMonthPrev = (!apiData.currentMonth || apiData.currentMonth === prevMonth) ? prevTransactions : [];
      const sanitized = this.sanitizeTransactions(
        apiData.transactions,
        sameMonthPrev,
        targetMonth,
        this.data.customTxNames
      );
      this.data.transactions = sanitized.transactions;
      this.data.customTxNames = sanitized.customTxNames;
      this.settings = {
        ...this.settings,
        customTxNames: sanitized.customTxNames
      };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (e) {}
    }
    if (Array.isArray(apiData.accounts) && apiData.accounts.length > 0) {
      // 銀行残高と出入金履歴の反映
      apiData.accounts.forEach((apiAcc) => {
        const acc = this.data.accounts.find((a) => a.id === apiAcc.id);
        if (acc) {
          if (apiAcc.initial !== undefined) acc.initialBalance = Number(apiAcc.initial);
          if (apiAcc.current !== undefined) acc.currentBalance = Number(apiAcc.current);
        }
      });

      // bankTransfers を抽出・統合
      const allTransfers = [];
      apiData.accounts.forEach((apiAcc) => {
        if (Array.isArray(apiAcc.transfers)) {
          apiAcc.transfers.forEach((tf) => {
            allTransfers.push({
              id: tf.id || `bt-${apiAcc.id}-${Date.now()}-${Math.random()}`,
              accountId: apiAcc.id,
              type: tf.type,
              name: tf.name,
              amount: Number(tf.amount),
              date: tf.date || '',
              row: tf.row
            });
          });
        }
      });
      this.data.bankTransfers = allTransfers;
    }

    // 1. 今月引落のクレカ代（手入力 D20 / C4）
    if (apiData.currentMonthCardBill !== undefined) {
      this.data.currentMonthCardBill = Number(apiData.currentMonthCardBill);
      const cc = this.data.fixedExpenses.find((f) => f.id === 'credit_card');
      if (cc) cc.amount = this.data.currentMonthCardBill;
    }
    if (apiData.cardSettled !== undefined) {
      this.data.cardSettled = !!apiData.cardSettled;
      const cc = this.data.fixedExpenses.find((f) => f.id === 'credit_card');
      if (cc) cc.settled = this.data.cardSettled;
    }

    // 2. 家賃（手入力 B15 / C5）
    if (apiData.rentAmount !== undefined) {
      this.data.rentAmount = Number(apiData.rentAmount);
      const r = this.data.fixedExpenses.find((f) => f.id === 'rent');
      if (r) r.amount = this.data.rentAmount;
    }
    if (apiData.rentSettled !== undefined) {
      this.data.rentSettled = !!apiData.rentSettled;
      const r = this.data.fixedExpenses.find((f) => f.id === 'rent');
      if (r) r.settled = this.data.rentSettled;
    }

    // 3. 医療ローン（手入力 B16 / C6）※id: medical_loan
    if (apiData.loanAmount !== undefined) {
      this.data.loanAmount = Number(apiData.loanAmount);
      const l = this.data.fixedExpenses.find((f) => f.id === 'medical_loan' || f.id === 'loan');
      if (l) l.amount = this.data.loanAmount;
    }
    if (apiData.loanSettled !== undefined) {
      this.data.loanSettled = !!apiData.loanSettled;
      const l = this.data.fixedExpenses.find((f) => f.id === 'medical_loan' || f.id === 'loan');
      if (l) l.settled = this.data.loanSettled;
    }

    // 4. 給与見込み（手入力 D22 / D26）
    // アプリの設定画面でユーザーが変更した給料設定がある場合、スプシ側の初期値(250000)でリセットされないよう保護する
    if (!this.data.salaries) {
      this.data.salaries = { currentMonth: 250000, nextMonth: 250000 };
    }
    const monthKey = this.data.currentMonth || getCurrentCalendarYM();
    const customMonthSal = this.data.customSalariesByMonth?.[monthKey];
    const customGlobalSal = this.settings?.customSalaries;

    if (customMonthSal) {
      if (customMonthSal.currentMonth !== undefined) {
        this.data.salaries.currentMonth = Number(customMonthSal.currentMonth);
      }
      if (customMonthSal.nextMonth !== undefined) {
        this.data.salaries.nextMonth = Number(customMonthSal.nextMonth);
      }
    } else if (customGlobalSal) {
      if (apiData.currentSalary !== undefined && Number(apiData.currentSalary) !== 250000) {
        this.data.salaries.currentMonth = Number(apiData.currentSalary);
      } else if (customGlobalSal.currentMonth !== undefined) {
        this.data.salaries.currentMonth = Number(customGlobalSal.currentMonth);
      }
      if (apiData.nextSalary !== undefined && Number(apiData.nextSalary) !== 250000) {
        this.data.salaries.nextMonth = Number(apiData.nextSalary);
      } else if (customGlobalSal.nextMonth !== undefined) {
        this.data.salaries.nextMonth = Number(customGlobalSal.nextMonth);
      }
    } else {
      if (apiData.currentSalary !== undefined) {
        this.data.salaries.currentMonth = Number(apiData.currentSalary);
      }
      if (apiData.nextSalary !== undefined) {
        this.data.salaries.nextMonth = Number(apiData.nextSalary);
      }
    }

    // 5. B/43 目標額・実額・内訳ログ ＆ Suica自販機ログの同期反映（スプレッドシートZ1セル保存分）
    if (apiData.subLogs && typeof apiData.subLogs === 'object') {
      const mKey = this.data.currentMonth || getCurrentCalendarYM();
      if (apiData.subLogs.b43Target !== undefined && !isNaN(Number(apiData.subLogs.b43Target))) {
        if (!this.data.b43TargetByMonth) this.data.b43TargetByMonth = {};
        this.data.b43TargetByMonth[mKey] = Number(apiData.subLogs.b43Target);
      }
      if (apiData.subLogs.b43Actuals && typeof apiData.subLogs.b43Actuals === 'object') {
        if (!this.data.b43ActualsByMonth) this.data.b43ActualsByMonth = {};
        this.data.b43ActualsByMonth[mKey] = {
          groceries: Math.max(0, Number(apiData.subLogs.b43Actuals.groceries) || 0),
          dining: Math.max(0, Number(apiData.subLogs.b43Actuals.dining) || 0)
        };
      }
      if (Array.isArray(apiData.subLogs.b43Logs)) {
        if (!this.data.b43LogsByMonth) this.data.b43LogsByMonth = {};
        this.data.b43LogsByMonth[mKey] = apiData.subLogs.b43Logs;
      }
      if (Array.isArray(apiData.subLogs.suicaLogs)) {
        if (!this.data.suicaLogsByMonth) this.data.suicaLogsByMonth = {};
        this.data.suicaLogsByMonth[mKey] = apiData.subLogs.suicaLogs;
      }
    }

    this.saveData();
  }

  // 表示月を手動で切り替える
  switchMonth(targetMonth) {
    if (!targetMonth || targetMonth === this.data.currentMonth) return;
    this.data.currentMonth = targetMonth;
    const customMonthSal = this.data.customSalariesByMonth?.[targetMonth];
    if (customMonthSal && this.data.salaries) {
      if (customMonthSal.currentMonth !== undefined) this.data.salaries.currentMonth = Number(customMonthSal.currentMonth);
      if (customMonthSal.nextMonth !== undefined) this.data.salaries.nextMonth = Number(customMonthSal.nextMonth);
    }
    this.saveData();
  }

  // 初期データへのリセット（デモ用）
  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA_202609));
    this.saveData();
  }
}

export const store = new KakeiboStore();
if (typeof window !== 'undefined') {
  window.store = store;
}
