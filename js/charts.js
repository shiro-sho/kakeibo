/**
 * グラフ描画（Chart.jsによるリッチなグラデーション＆B/43・Suica積み上げ棒グラフ）
 */

export class ChartRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.chartInstance = null;
  }

  // カテゴリ別支出リッチ棒グラフ (B/43・Suica の積み上げ内訳＆目標ライン完全対応)
  renderCategoryBarChart(categoryTotals, b43Summary = null, suicaSummary = null) {
    if (!this.canvas) return;

    const summary = window.store ? window.store.getSummary() : null;
    const b43 = b43Summary || summary?.b43Summary || {
      target: 30000,
      chargedTotal: 0,
      groceriesTotal: 0,
      diningTotal: 0,
      spentTotal: 0,
      remaining: 30000,
      overAmount: 0,
      isOver: false
    };
    const suica = suicaSummary || summary?.suicaSummary || {
      chargedTotal: 0,
      vendingTotal: 0,
      transitTotal: 0,
      total: 0
    };

    // 表示対象カテゴリの抽出とソート基準額の計算
    const entriesMap = { ...(categoryTotals || {}) };
    if (b43.spentTotal > 0 || b43.chargedTotal > 0) {
      entriesMap['B/43'] = b43.spentTotal > 0 ? b43.spentTotal : b43.chargedTotal;
    }
    if (suica.total > 0) {
      entriesMap['Suica'] = suica.total;
    }

    // 金額降順でソート（0円のカテゴリは除外）
    const sorted = Object.entries(entriesMap)
      .filter(([, v]) => Number(v) > 0)
      .sort((a, b) => b[1] - a[1]);

    const labels = sorted.map(([k]) => k);
    const totalValues = sorted.map(([, v]) => Number(v));

    if (labels.length === 0) {
      this.renderEmpty('支出データがありません');
      return;
    }

    if (window.Chart) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      // テーマに合わせたカラー設定（オニキスブラック & プラチナホワイト）
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'onyx';
      const isLight = currentTheme === 'platinum' || currentTheme === 'light' || currentTheme === 'white';
      const textColor = isLight ? '#334155' : '#94a3b8';
      const valueLabelColor = isLight ? '#0f172a' : '#f8fafc';
      const subLabelColor = isLight ? '#475569' : '#94a3b8';
      const gridColor = isLight ? 'rgba(15, 23, 42, 0.07)' : 'rgba(255, 255, 255, 0.06)';

      // 通常カテゴリ用グラデーションバーの作成（チタンスタイル）
      const gradient = this.ctx.createLinearGradient(0, 0, 320, 0);
      if (isLight) {
        gradient.addColorStop(0, '#475569');
        gradient.addColorStop(1, '#0f172a');
      } else {
        gradient.addColorStop(0, '#64748b');
        gradient.addColorStop(1, '#f8fafc');
      }

      // 各カテゴリの積み上げデータセットを構築
      // 1. 通常カテゴリ単体バー
      const normalData = labels.map((cat, idx) => (cat === 'B/43' || cat === 'Suica') ? 0 : totalValues[idx]);

      // 2. B/43: 食費（自炊代）
      const b43GroceriesData = labels.map((cat) => {
        if (cat !== 'B/43') return 0;
        if (b43.spentTotal === 0 && b43.chargedTotal > 0) return 0;
        return b43.groceriesTotal;
      });

      // 3. B/43: 外食代
      const b43DiningData = labels.map((cat) => {
        if (cat !== 'B/43') return 0;
        if (b43.spentTotal === 0 && b43.chargedTotal > 0) return 0;
        return b43.diningTotal;
      });

      // 4. B/43: クレカチャージのみ（まだ手打ち内訳が0円の時のフォールバック）
      const b43UnallocatedData = labels.map((cat) => {
        if (cat !== 'B/43') return 0;
        return (b43.spentTotal === 0 && b43.chargedTotal > 0) ? b43.chargedTotal : 0;
      });

      // 5. B/43: 目標内の残枠（目標額 > 使用額 のときに目標額までの残り枠を半透明バーで可視化）
      const b43RemainingData = labels.map((cat) => {
        if (cat !== 'B/43') return 0;
        const used = b43.spentTotal > 0 ? b43.spentTotal : b43.chargedTotal;
        if (b43.target > used && used > 0) {
          return b43.target - used;
        }
        return 0;
      });

      // 6. Suica: 交通費（自動計算 = チャージ総額 - 自販機代）
      const suicaTransitData = labels.map((cat) => (cat === 'Suica' ? suica.transitTotal : 0));

      // 7. Suica: 自販機代（手打ち合計）
      const suicaVendingData = labels.map((cat) => (cat === 'Suica' ? suica.vendingTotal : 0));

      // X軸最大値の算出（B/43の目標枠や2段ラベルが右端で見切れないよう余裕を確保）
      const visualRowTotals = labels.map((cat, idx) => {
        if (cat === 'B/43') {
          const used = b43.spentTotal > 0 ? b43.spentTotal : b43.chargedTotal;
          return Math.max(used, b43.target || 0);
        }
        return totalValues[idx];
      });
      const maxVal = Math.max(...visualRowTotals, 1000);
      const suggestedMax = Math.ceil(maxVal * 1.22);

      // カテゴリ件数に応じて高さを動的に拡張
      const itemHeight = 48;
      const calculatedHeight = Math.max(420, labels.length * itemHeight + 70);
      const parentContainer = this.canvas.parentElement;
      if (parentContainer) {
        parentContainer.style.setProperty('height', `${calculatedHeight}px`, 'important');
        parentContainer.style.setProperty('min-height', `${calculatedHeight}px`, 'important');
        parentContainer.style.position = 'relative';
      }
      this.canvas.style.setProperty('height', `${calculatedHeight}px`, 'important');
      this.canvas.style.setProperty('min-height', `${calculatedHeight}px`, 'important');
      this.canvas.height = calculatedHeight;

      // 各棒の右端に金額を描画するカスタムプラグイン（棒が短くならないよう右余白をコンパクトに維持）
      const barValueLabelsPlugin = {
        id: 'barValueLabels',
        afterDatasetsDraw(chart) {
          const { ctx, scales } = chart;
          const xAxis = scales.x;
          const yAxis = scales.y;
          if (!xAxis || !yAxis) return;

          ctx.save();

          labels.forEach((cat, index) => {
            const y = yAxis.getPixelForValue(index);
            const actualVal = totalValues[index] || 0;

            if (cat === 'B/43') {
              const used = b43.spentTotal > 0 ? b43.spentTotal : b43.chargedTotal;
              const target = b43.target || 0;
              const barEndVal = Math.max(used, target);
              const endX = xAxis.getPixelForValue(barEndVal);

              // ① 目標額の縦ターゲットマーカー線を描画
              if (target > 0) {
                const targetX = xAxis.getPixelForValue(target);
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = b43.isOver ? '#f43f5e' : (isLight ? '#4f46e5' : '#818cf8');
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 2]);
                ctx.moveTo(targetX, y - 12);
                ctx.lineTo(targetX, y + 12);
                ctx.stroke();
                ctx.restore();

                if (b43.isOver && used > target) {
                  const usedX = xAxis.getPixelForValue(used);
                  ctx.save();
                  ctx.strokeStyle = '#f43f5e';
                  ctx.lineWidth = 1.8;
                  ctx.strokeRect(targetX, y - 9, Math.max(2, usedX - targetX), 18);
                  ctx.restore();
                }
              }

              // ② B/43 右端のコンパクト2段ラベル
              const labelX = endX + 8;
              ctx.font = 'bold 12px "Outfit", -apple-system, sans-serif';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = valueLabelColor;
              ctx.fillText(`¥${used.toLocaleString()}`, labelX, target > 0 ? y - 6 : y);

              if (target > 0) {
                ctx.font = '600 9.5px "Noto Sans JP", sans-serif';
                if (used > target) {
                  ctx.fillStyle = isLight ? '#be123c' : '#fb7185';
                  ctx.fillText(`+¥${(used - target).toLocaleString()}`, labelX, y + 7);
                } else {
                  ctx.fillStyle = isLight ? '#047857' : '#34d399';
                  ctx.fillText(`残¥${(target - used).toLocaleString()}`, labelX, y + 7);
                }
              }
            } else if (cat === 'Suica') {
              const endX = xAxis.getPixelForValue(actualVal);
              const labelX = endX + 8;

              ctx.font = 'bold 12px "Outfit", -apple-system, sans-serif';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = valueLabelColor;
              ctx.fillText(`¥${actualVal.toLocaleString()}`, labelX, suica.vendingTotal > 0 ? y - 6 : y);

              if (suica.vendingTotal > 0) {
                ctx.font = '600 9.5px "Noto Sans JP", sans-serif';
                ctx.fillStyle = subLabelColor;
                ctx.fillText(`自販¥${suica.vendingTotal.toLocaleString()}`, labelX, y + 7);
              }
            } else {
              // 通常カテゴリの金額ラベル
              const endX = xAxis.getPixelForValue(actualVal);
              ctx.font = 'bold 12px "Outfit", -apple-system, sans-serif';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = valueLabelColor;
              ctx.fillText('¥' + Number(actualVal).toLocaleString(), endX + 8, y);
            }
          });

          ctx.restore();
        }
      };

      this.chartInstance = new window.Chart(this.ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '支出金額',
              data: normalData,
              backgroundColor: gradient,
              borderRadius: 6,
              barThickness: 18,
              maxBarThickness: 22,
              stack: 'total'
            },
            {
              label: 'B/43 食費（自炊代）',
              data: b43GroceriesData,
              backgroundColor: '#10b981', // エメラルド
              borderRadius: 4,
              barThickness: 18,
              maxBarThickness: 22,
              stack: 'total'
            },
            {
              label: 'B/43 外食代',
              data: b43DiningData,
              backgroundColor: '#f97316', // オレンジ
              borderRadius: 4,
              barThickness: 18,
              maxBarThickness: 22,
              stack: 'total'
            },
            {
              label: 'B/43 チャージ分',
              data: b43UnallocatedData,
              backgroundColor: '#6366f1', // インディゴ
              borderRadius: 4,
              barThickness: 18,
              maxBarThickness: 22,
              stack: 'total'
            },
            {
              label: 'B/43 目標残枠（未消化）',
              data: b43RemainingData,
              backgroundColor: isLight ? 'rgba(99, 102, 241, 0.14)' : 'rgba(99, 102, 241, 0.22)',
              borderColor: isLight ? 'rgba(79, 70, 229, 0.45)' : 'rgba(129, 140, 248, 0.5)',
              borderWidth: 1,
              borderRadius: 4,
              barThickness: 18,
              maxBarThickness: 22,
              stack: 'total'
            },
            {
              label: 'Suica 交通費',
              data: suicaTransitData,
              backgroundColor: '#0284c7', // スカイブルー
              borderRadius: 4,
              barThickness: 18,
              maxBarThickness: 22,
              stack: 'total'
            },
            {
              label: 'Suica 自販機代',
              data: suicaVendingData,
              backgroundColor: '#eab308', // アンバーゴールド
              borderRadius: 4,
              barThickness: 18,
              maxBarThickness: 22,
              stack: 'total'
            }
          ]
        },
        plugins: [barValueLabelsPlugin],
        options: {
          indexAxis: 'y', // 横棒グラフ
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              right: 68,
              left: 4,
              top: 12,
              bottom: 12
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: isLight ? '#ffffff' : '#1e293b',
              titleColor: isLight ? '#0f172a' : '#f8fafc',
              bodyColor: isLight ? '#2563eb' : '#38bdf8',
              borderColor: isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.14)',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 10,
              filter: function (tooltipItem) {
                return Number(tooltipItem.raw) > 0;
              },
              callbacks: {
                afterTitle: function (items) {
                  if (!items || !items.length) return '';
                  const cat = items[0].label;
                  if (cat === 'B/43') {
                    const diff = b43.target - b43.spentTotal;
                    const diffStr = diff >= 0
                      ? `目標まで残り ¥${diff.toLocaleString()}`
                      : `目標を ¥${Math.abs(diff).toLocaleString()} 超過`;
                    const actualTotal = b43.actualSpentTotal !== undefined ? b43.actualSpentTotal : b43.spentTotal * 2;
                    const actualTarget = b43.actualTarget !== undefined ? b43.actualTarget : b43.target * 2;
                    return [
                      `【1人分(半額・棒グラフ値)】¥${b43.spentTotal.toLocaleString()} / 目標¥${b43.target.toLocaleString()} (${diffStr})`,
                      `【B/43実額(2人分)】¥${actualTotal.toLocaleString()} / 目標¥${actualTarget.toLocaleString()}`
                    ];
                  }
                  if (cat === 'Suica') {
                    return `Suicaチャージ合計: ¥${suica.total.toLocaleString()}`;
                  }
                  return '';
                },
                label: function (context) {
                  return ` ${context.dataset.label}: ¥${Number(context.raw).toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: {
              stacked: true,
              suggestedMax,
              grid: {
                color: gridColor,
                drawBorder: false
              },
              ticks: {
                color: textColor,
                font: {
                  family: "'Outfit', sans-serif",
                  size: 11
                },
                callback: function (value) {
                  if (value === 0) return '0';
                  return Number(value).toLocaleString();
                }
              }
            },
            y: {
              stacked: true,
              type: 'category',
              offset: true,
              grid: {
                display: false,
                drawBorder: false
              },
              ticks: {
                autoSkip: false,
                autoSkipPadding: 0,
                stepSize: 1,
                minRotation: 0,
                maxRotation: 0,
                color: isLight ? '#1e293b' : '#f1f5f9',
                font: {
                  family: "'Noto Sans JP', sans-serif",
                  weight: '600',
                  size: 12
                },
                padding: 8,
                callback: function (val, index) {
                  if (labels && labels[index] !== undefined) return labels[index];
                  if (typeof val === 'string') return val;
                  return this.getLabelForValue ? this.getLabelForValue(val) : val;
                }
              }
            }
          }
        }
      });

      if (this.chartInstance) {
        this.chartInstance.resize();
      }
    }
  }

  renderEmpty(msg) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, w / 2, h / 2);
  }
}
