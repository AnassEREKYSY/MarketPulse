import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule } from 'ngx-echarts';
import * as echarts from 'echarts';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  template: '<div echarts [options]="chartOptions" [loading]="loading" class="chart-container"></div>',
  styles: ['.chart-container { width: 100%; height: 100%; min-height: 300px; }']
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
          radius: '50%',
          data: this.config.data.labels.map((label: string, index: number) => ({
            value: this.config.data.datasets[0].data[index],
            name: label
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      };
    } else if (this.config.type === 'bar') {
      this.chartOptions = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
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
        yAxis: {
          type: 'value'
        },
        series: [{
          name: this.config.data.datasets[0].label || 'Value',
          type: 'bar',
          data: this.config.data.datasets[0].data,
          itemStyle: {
            color: this.config.data.datasets[0].backgroundColor || '#1976d2'
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
}


