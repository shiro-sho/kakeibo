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
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const textColor = isLight ? '#475569' : '#94a3b8';
      const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';

      // グラデーションバーの作成
      const gradient = this.ctx.createLinearGradient(0, 0, 300, 0);
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, '#3b82f6');

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
        options: {
          indexAxis: 'y', // 横棒グラフ（スマホで見やすい！）
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#f8fafc',
              bodyColor: '#10b981',
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
