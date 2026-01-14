import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  template: '<div echarts [options]="chartOptions" [loading]="loading" class="chart-container"></div>',
  styles: [`
    .chart-container {
      width: 100%;
      height: 450px;
      min-height: 450px;
    }
  `]
})
export class ChartComponent implements OnInit, OnChanges {
  @Input() config: any;
  @Input() loading: boolean = false;
  
  chartOptions: any = {};

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config']) {
      // Force update when config changes
      this.updateChart();
      this.cdr.detectChanges();
    }
  }

  private updateChart() {
    if (!this.config) {
      this.chartOptions = {
        title: {
          text: 'No data available',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#94a3b8',
            fontSize: 16
          }
        }
      };
      return;
    }

    if (this.config.type === 'pie') {
      this.chartOptions = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(50, 50, 50, 0.95)',
          borderColor: '#667eea',
          borderWidth: 1,
          textStyle: {
            color: '#fff',
            fontSize: 13
          },
          formatter: (params: any) => {
            return `<div style="padding: 6px;">
              <strong style="font-size: 14px;">${params.name}</strong><br/>
              Count: <strong style="color: #667eea;">${params.value}</strong><br/>
              Percentage: <strong style="color: #10b981;">${params.percent}%</strong>
            </div>`;
          }
        },
        legend: {
          orient: 'vertical',
          left: '5%',
          top: 'center',
          textStyle: {
            color: '#475569',
            fontSize: 12,
            fontWeight: 500
          },
          itemGap: 10,
          itemWidth: 12,
          itemHeight: 12,
          formatter: (name: string) => {
            const item = this.chartOptions.series[0].data.find((d: any) => d.name === name);
            return item ? `${name} (${item.value})` : name;
          }
        },
        series: [{
          name: this.config.options?.plugins?.title?.text || 'Data',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['65%', '50%'],
          avoidLabelOverlap: true,
          minAngle: 5, // Minimum angle to show (prevents tiny slices)
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.1)'
          },
          label: {
            show: true,
            formatter: '{b}: {d}%',
            fontSize: 11,
            fontWeight: 500,
            color: '#1e293b',
            position: 'outside',
            distanceToLabelLine: 5
          },
          labelLine: {
            show: true,
            length: 12,
            length2: 8,
            lineStyle: {
              width: 1.5,
              color: '#94a3b8'
            },
            smooth: 0.2
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 13,
              fontWeight: 600,
              color: '#1e293b'
            },
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetX: 0,
              shadowOffsetY: 4,
              shadowColor: 'rgba(102, 126, 234, 0.3)',
              borderWidth: 3
            },
            labelLine: {
              lineStyle: {
                width: 2,
                color: '#667eea'
              }
            }
          },
          animationType: 'scale',
          animationEasing: 'cubicOut',
          animationDuration: 600,
          animationDelay: (idx: number) => idx * 50,
          data: this.config.data.labels.map((label: string, index: number) => {
            const bgColors = this.config.data.datasets[0].backgroundColor;
            const color = Array.isArray(bgColors) 
              ? (bgColors[index] || this.getColor(index))
              : (bgColors || this.getColor(index));
            return {
              value: this.config.data.datasets[0].data[index],
              name: label,
              itemStyle: { 
                color,
                shadowBlur: 6,
                shadowColor: 'rgba(0, 0, 0, 0.1)'
              }
            };
          })
        }]
      };
    } else if (this.config.type === 'bar') {
      // Check if this is a count chart (distribution) or salary chart
      const isCountChart = this.config.options?.isCountChart === true;
      
      const yAxisConfig: any = {
        type: 'value',
        name: isCountChart ? 'Number of Jobs' : 'Salary (EUR/year)',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: '#64748b',
          fontSize: 12,
          fontWeight: 600
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: (value: any) => {
            if (isCountChart) {
              // Count chart: no € symbol, just numbers
              return value.toLocaleString();
            } else {
              // Salary chart: show €
              if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'k €';
              }
              return value.toLocaleString() + ' €';
            }
          }
        },
        axisLine: {
          lineStyle: {
            color: '#e2e8f0'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f1f5f9',
            type: 'dashed'
          }
        }
      };
      
      this.chartOptions = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
            shadowStyle: {
              color: 'rgba(102, 126, 234, 0.1)'
            }
          },
          backgroundColor: 'rgba(50, 50, 50, 0.95)',
          borderColor: '#667eea',
          borderWidth: 1,
          textStyle: {
            color: '#fff',
            fontSize: 13
          },
          formatter: (params: any) => {
            const isCountChart = this.config.options?.isCountChart === true;
            const suffix = isCountChart ? '' : ' €';
            
            if (Array.isArray(params)) {
              return params.map((p: any) => 
                `<div style="padding: 2px 0;">
                  <strong>${p.name}</strong><br/>
                  ${p.seriesName}: <strong style="color: #667eea;">${p.value.toLocaleString()}${suffix}</strong>
                </div>`
              ).join('');
            }
            return `<div style="padding: 4px;">
              <strong>${params.name}</strong><br/>
              ${params.seriesName}: <strong style="color: #667eea;">${params.value.toLocaleString()}${suffix}</strong>
            </div>`;
          }
        },
        grid: {
          left: '12%',
          right: '5%',
          bottom: '12%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: this.config.data.labels,
          axisLabel: {
            color: '#64748b',
            fontSize: 11,
            fontWeight: 500,
            rotate: 0,
            interval: 0
          },
          axisLine: {
            lineStyle: {
              color: '#e2e8f0'
            }
          },
          axisTick: {
            alignWithLabel: true,
            lineStyle: {
              color: '#e2e8f0'
            }
          }
        },
        yAxis: yAxisConfig,
        series: [{
          name: this.config.data.datasets[0].label || 'Value',
          type: 'bar',
          barWidth: '50%',
          barGap: '15%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            shadowBlur: 6,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowOffsetY: 2
          },
          data: this.config.data.datasets[0].data.map((value: number, index: number) => {
            const bgColor = this.config.data.datasets[0].backgroundColor;
            const color = Array.isArray(bgColor) 
              ? (bgColor[index] || '#667eea')
              : (typeof bgColor === 'string' ? bgColor : '#667eea');
            return {
              value: value,
              itemStyle: { 
                color,
                borderColor: '#fff',
                borderWidth: 1.5
              }
            };
          }),
          label: {
            show: true,
            position: 'top',
            fontSize: 11,
            fontWeight: 600,
            color: '#475569',
            formatter: (params: any) => {
              const isCountChart = this.config.options?.isCountChart === true;
              if (isCountChart) {
                // Count chart: no € symbol
                return params.value.toLocaleString();
              } else {
                // Salary chart: show €
                if (params.value >= 1000) {
                  return (params.value / 1000).toFixed(1) + 'k €';
                }
                return params.value.toLocaleString() + ' €';
              }
            }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowOffsetY: 4,
              shadowColor: 'rgba(102, 126, 234, 0.3)',
              borderWidth: 2
            },
            focus: 'series'
          },
          animationDelay: (idx: number) => idx * 40,
          animationEasing: 'cubicOut',
          animationDuration: 500
        }]
      };
    } else if (this.config.type === 'line') {
      this.chartOptions = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(50, 50, 50, 0.95)',
          borderColor: '#667eea',
          borderWidth: 1
        },
        grid: {
          left: '10%',
          right: '5%',
          bottom: '10%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: this.config.data.labels,
          axisLabel: {
            color: '#64748b',
            fontSize: 12
          }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            color: '#64748b',
            fontSize: 12
          }
        },
        series: this.config.data.datasets.map((dataset: any) => ({
          name: dataset.label,
          type: 'line',
          data: dataset.data,
          smooth: true,
          lineStyle: {
            width: 3
          },
          itemStyle: {
            borderWidth: 2
          }
        }))
      };
    }
  }

  private getColor(index: number): string {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#330867'
    ];
    return colors[index % colors.length];
  }
}
