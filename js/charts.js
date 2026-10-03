/**
 * グラフ描画（Chart.jsによるリッチなグラデーション棒グラフ・HTMLリッチバー）
 */

export class ChartRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.chartInstance = null;
  }

  // カテゴリ別支出リッチ棒グラフ (Chart.js Horizontal Bar Chart)
  renderCategoryBarChart(categoryTotals) {
    if (!this.canvas) return;

    // 金額降順でソート
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([k]) => k);
    const data = sorted.map(([, v]) => v);

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
      const textColor = isLight ? '#475569' : '#94a3b8';
      const valueLabelColor = isLight ? '#0f172a' : '#f8fafc';
      const gridColor = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.06)';

      // グラデーションバーの作成（チタンスタイル）
      const gradient = this.ctx.createLinearGradient(0, 0, 320, 0);
      if (isLight) {
        // プラチナ・ホワイト：白銀から深く上質なスレートチタンへのグラデーション
        gradient.addColorStop(0, '#94a3b8');
        gradient.addColorStop(1, '#0f172a');
      } else {
        // オニキス・ブラック：スレートチタンから鮮やかなクールシルバーへのグラデーション
        gradient.addColorStop(0, '#64748b');
        gradient.addColorStop(1, '#f8fafc');
      }

      // 最大値に応じてX軸に余裕を持たせる（各棒の横の金額ラベルが切れないようにする）
      const maxVal = Math.max(...data, 0);
      const suggestedMax = Math.ceil(maxVal * 1.35);

      // カテゴリ件数に応じて高さを動的に拡張し、棒どうしの間隔をゆったり確保（1項目あたり48px）
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

      // 各棒の横に金額を表示するカスタムChart.jsプラグイン
      const barValueLabelsPlugin = {
        id: 'barValueLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data) return;

          ctx.save();
          ctx.font = 'bold 12px "Outfit", -apple-system, sans-serif';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = valueLabelColor;

          meta.data.forEach((bar, index) => {
            const val = data[index];
            if (val === undefined || val === null) return;
            const text = '¥' + Number(val).toLocaleString();

            // 横棒の右端のX座標 + ゆとりのある余白 (10px)
            const x = bar.x + 10;
            const y = bar.y;
            ctx.fillText(text, x, y);
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
              data,
              backgroundColor: gradient,
              borderRadius: 8,
              borderSkipped: false,
              barThickness: 16,
              maxBarThickness: 20
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
              right: 65, // 金額ラベル表示用の右側ゆとりマージン
              left: 4,
              top: 10,
              bottom: 10
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: isLight ? '#ffffff' : '#1e293b',
              titleColor: isLight ? '#0f172a' : '#f8fafc',
              bodyColor: isLight ? '#2563eb' : '#10b981',
              borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: function (context) {
                  return ` ¥${Number(context.raw).toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: {
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
              type: 'category',
              offset: true,
              grid: {
                display: false,
                drawBorder: false
              },
              ticks: {
                autoSkip: false, // 1つ飛ばしを絶対に防ぎ、すべてのカテゴリを確実に100%表示
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
                padding: 10,
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

      // レンダリング直後にサイズを同期
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
