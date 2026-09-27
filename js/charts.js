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

      // テーマに合わせたカラー設定
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'cyber';
      const isLight = currentTheme === 'platinum' || currentTheme === 'starlight' || currentTheme === 'light' || currentTheme === 'white';
      const textColor = isLight ? '#475569' : '#94a3b8';
      const valueLabelColor = isLight ? '#0f172a' : '#f8fafc';
      const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';

      // グラデーションバーの作成
      const gradient = this.ctx.createLinearGradient(0, 0, 320, 0);
      if (isLight) {
        if (currentTheme === 'starlight') {
          gradient.addColorStop(0, '#f59e0b');
          gradient.addColorStop(1, '#d97706');
        } else {
          gradient.addColorStop(0, '#3b82f6');
          gradient.addColorStop(1, '#0284c7');
        }
      } else {
        if (currentTheme === 'onyx' || currentTheme === 'black') {
          gradient.addColorStop(0, '#94a3b8');
          gradient.addColorStop(1, '#f8fafc');
        } else {
          gradient.addColorStop(0, '#10b981');
          gradient.addColorStop(1, '#3b82f6');
        }
      }

      // 最大値に応じてX軸に余裕を持たせる（各棒の横の金額ラベルが切れないようにする）
      const maxVal = Math.max(...data, 0);
      const suggestedMax = Math.ceil(maxVal * 1.25);

      // 各棒の横に金額を表示するカスタムChart.jsプラグイン
      const barValueLabelsPlugin = {
        id: 'barValueLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);
          if (!meta || !meta.data) return;

          ctx.save();
          ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = valueLabelColor;

          meta.data.forEach((bar, index) => {
            const val = data[index];
            if (val === undefined || val === null) return;
            const text = '¥' + Number(val).toLocaleString();

            // 横棒の右端のX座標 + 少しの余白
            const x = bar.x + 8;
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
              barThickness: 18,
              maxBarThickness: 24
            }
          ]
        },
        plugins: [barValueLabelsPlugin],
        options: {
          indexAxis: 'y', // 横棒グラフ（スマホで見やすい！）
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              right: 28, // 金額ラベル表示用の右側マージン
              left: 4,
              top: 4,
              bottom: 4
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
                color: gridColor
              },
              ticks: {
                color: textColor,
                font: {
                  family: "'Outfit', sans-serif",
                  size: 10
                },
                callback: function (value) {
                  return '¥' + (value / 1000) + 'k';
                }
              }
            },
            y: {
              grid: {
                display: false
              },
              ticks: {
                color: textColor,
                font: {
                  family: "'Noto Sans JP', sans-serif",
                  weight: '600',
                  size: 11
                }
              }
            }
          }
        }
      });
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
