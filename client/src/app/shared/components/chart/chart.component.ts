import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
      height: 400px;
      min-height: 400px;
    }
  `]
})
export class ChartComponent implements OnInit, OnChanges {
  @Input() config: any;
  @Input() loading: boolean = false;
  
  chartOptions: any = {};

  ngOnInit() {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config']) {
      this.updateChart();
    }
  }

  private updateChart() {
    if (!this.config) {
      this.chartOptions = {};
      return;
    }

    if (this.config.type === 'pie') {
      this.chartOptions = {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [{
          name: this.config.options?.plugins?.title?.text || 'Data',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}: {c} ({d}%)',
            fontSize: 12,
            fontWeight: 500
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 600
            },
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          data: this.config.data.labels.map((label: string, index: number) => {
            const bgColors = this.config.data.datasets[0].backgroundColor;
            const color = Array.isArray(bgColors) 
              ? (bgColors[index] || this.getColor(index))
              : (bgColors || this.getColor(index));
            return {
              value: this.config.data.datasets[0].data[index],
              name: label,
              itemStyle: { color }
            };
          })
        }]
      };
    } else if (this.config.type === 'bar') {
      const yAxisConfig: any = {
        type: 'value',
        axisLabel: {
          formatter: (value: any) => {
            // Format large numbers with locale string
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'k €';
            }
            return value.toLocaleString() + ' €';
          }
        }
      };
      
      this.chartOptions = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: (params: any) => {
            if (Array.isArray(params)) {
              return params.map((p: any) => `${p.seriesName}<br/>${p.name}: ${p.value.toLocaleString()} €`).join('<br/>');
            }
            return `${params.seriesName}<br/>${params.name}: ${params.value.toLocaleString()} €`;
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: this.config.data.labels,
          axisTick: {
            alignWithLabel: true
          }
        },
        yAxis: yAxisConfig,
        series: [{
          name: this.config.data.datasets[0].label || 'Value',
          type: 'bar',
          barWidth: '60%',
          data: this.config.data.datasets[0].data.map((value: number, index: number) => {
            const bgColor = this.config.data.datasets[0].backgroundColor;
            const color = Array.isArray(bgColor) 
              ? (bgColor[index] || '#1976d2')
              : (typeof bgColor === 'string' ? bgColor : '#1976d2');
            return {
              value: value,
              itemStyle: { color }
            };
          }),
          label: {
            show: true,
            position: 'top',
            fontSize: 11,
            fontWeight: 500
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetY: 5,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          }
        }]
      };
    } else if (this.config.type === 'line') {
      this.chartOptions = {
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: this.config.data.labels
        },
        yAxis: {
          type: 'value'
        },
        series: this.config.data.datasets.map((dataset: any) => ({
          name: dataset.label,
          type: 'line',
          data: dataset.data,
          smooth: true
        }))
      };
    }
  }

  private getColor(index: number): string {
    const colors = [
      '#2196f3', '#9c27b0', '#00bcd4', '#4caf50', '#ff9800',
      '#f44336', '#795548', '#607d8b', '#e91e63', '#009688'
    ];
    return colors[index % colors.length];
  }
}
