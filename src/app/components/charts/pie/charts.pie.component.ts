import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnChanges,
  OnDestroy,
} from '@angular/core';

import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import {DynamicDataLoader} from '@sports-alliance/sports-lib/lib/data/data.store';
import * as Sentry from '@sentry/browser';
import {
  ChartDataCategoryTypes,
  ChartDataValueTypes
} from '@sports-alliance/sports-lib/lib/tiles/tile.settings.interface';
import * as am4plugins_sliceGrouper from '@amcharts/amcharts4/plugins/sliceGrouper';
import {DashboardChartAbstractDirective} from '../dashboard-chart-abstract-component.directive';
import {AppEventColorService} from '../../../services/color/app.event.color.service';
import { ActivityTypes } from '@sports-alliance/sports-lib/lib/activities/activity.types';


@Component({
  selector: 'app-pie-chart',
  templateUrl: './charts.pie.component.html',
  styleUrls: ['./charts.pie.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsPieComponent extends DashboardChartAbstractDirective implements OnChanges, OnDestroy {



  constructor(protected zone: NgZone, changeDetector: ChangeDetectorRef, private eventColorService: AppEventColorService) {
    super(zone, changeDetector);
  }

  protected createChart(): am4charts.PieChart {
    const chart = <am4charts.PieChart>super.createChart(am4charts.PieChart);
    chart.fontSize = '0.8em'
    // chart.hiddenState.properties.opacity = 0;
    chart.padding(0, 5, 0, 5);
    chart.radius = am4core.percent(55);
    chart.innerRadius = am4core.percent(45);

    const pieSeries = chart.series.push(new am4charts.PieSeries());
    pieSeries.dataFields.value = this.chartDataValueType;
    pieSeries.dataFields.category =  this.chartDataCategoryType === ChartDataCategoryTypes.ActivityType ? 'type' : 'time';
    // pieSeries.interpolationDuration = 500;f
    // pieSeries.rangeChangeDuration = 500;
    // pieSeries.sequencedInterpolation = true;

    // pieSeries.slices.template.propertyFields.isActive = 'pulled';
    pieSeries.slices.template.strokeWidth = 0.4;
    pieSeries.slices.template.strokeOpacity = 1;
    pieSeries.slices.template.stroke = am4core.color('#175e84');
    // pieSeries.slices.template.filters.push(ChartHelper.getShadowFilter());

    pieSeries.slices.template.adapter.add('tooltipText', (text, target, key) => {
      if (!target.dataItem || !target.dataItem.values || ! target.dataItem.dataContext) {
        return '';
      }
      const data = DynamicDataLoader.getDataInstanceFromDataType(this.chartDataType, target.dataItem.dataContext[this.chartDataValueType]);
      return `{category${this.chartDataCategoryType === ChartDataCategoryTypes.ActivityType ? `` : `.formatDate("${this.getChartDateFormat(this.chartDataTimeInterval)}")`}}\n${target.dataItem.values.value.percent.toFixed(1)}%\n[bold]${data.getDisplayValue()}${data.getDisplayUnit()}[/b]\n${target.dataItem.dataContext['count'] ? `${target.dataItem.dataContext['count']} Activities` : ``}`
    });

    pieSeries.slices.template.adapter.add('fill', (fill, target, key) => {
      if (this.chartDataCategoryType === ChartDataCategoryTypes.ActivityType) {
        return am4core.color(this.eventColorService.getColorForActivityTypeByActivityTypeGroup(ActivityTypes[target.dataItem.dataContext['type']]))
      }
      return this.getFillColor(chart, target.dataItem.index);
    });

    pieSeries.labels.template.adapter.add('text', (text, target, key) => {
      if (!target.dataItem || !target.dataItem.values || !target.dataItem.dataContext) {
        return '';
      }
      try {
        const data = DynamicDataLoader.getDataInstanceFromDataType(this.chartDataType, target.dataItem.dataContext[this.chartDataValueType]);
        return `[font-size: 1.1em]${this.chartDataCategoryType === ChartDataCategoryTypes.ActivityType ? target.dataItem.dataContext.type.slice(0, 40) : `{category.formatDate("${this.getChartDateFormat(this.chartDataTimeInterval)}")}` || 'other'}[/]\n[bold]${data.getDisplayValue()}${data.getDisplayUnit()}[/b]`
        // return `[bold font-size: 1.2em]{value.percent.formatNumber('#.')}%[/] [font-size: 1.1em]${this.chartDataCategoryType === ChartDataCategoryTypes.ActivityType ? target.dataItem.dataContext.type.slice(0, 40) : `{category.formatDate('${this.getChartDateFormat(this.chartDataDateRange)}')}` || 'other'}[/]\n[bold]${data.getDisplayValue()}${data.getDisplayUnit()}[/b]`
      } catch (e) {
        Sentry.captureException(e);
      }
    });

    pieSeries.labels.template.wrap = true
    pieSeries.labels.template.maxWidth = 70

    const label = pieSeries.createChild(am4core.Label);
    label.horizontalCenter = 'middle';
    label.verticalCenter = 'middle';
    // label.fontSize = 12;
    if (this.chartDataValueType === ChartDataValueTypes.Total) {
      label.text = `{values.value.sum.formatNumber('#')}`;
    }
    if (this.chartDataValueType === ChartDataValueTypes.Maximum) {
      label.text = `{values.value.high.formatNumber('#')}`;
    }
    if (this.chartDataValueType === ChartDataValueTypes.Minimum) {
      label.text = `{values.value.low.formatNumber('#')}`;
    }
    if (this.chartDataValueType === ChartDataValueTypes.Average) {
      label.text = `{values.value.average.formatNumber('#')}`;
    }
    label.adapter.add('textOutput', (text, target, key) => {
      const data = DynamicDataLoader.getDataInstanceFromDataType(this.chartDataType, Number(text));
      return `[font-size: 1.2em]${data.getDisplayType()}[/]
              [font-size: 1.3em]${data.getDisplayValue()}${data.getDisplayUnit()}[/]
              [font-size: 0.9em]${this.chartDataValueType}[/]`
    });

    // chart.exporting.menu = this.getExportingMenu();

    if (this.chartDataCategoryType === ChartDataCategoryTypes.ActivityType) {
      const grouper = pieSeries.plugins.push(new am4plugins_sliceGrouper.SliceGrouper());
      grouper.threshold = 7;
      grouper.groupName = 'Other';
      grouper.clickBehavior = 'zoom';
      grouper.zoomOutButton.align = 'left';
      grouper.zoomOutButton.width = 35;
      grouper.zoomOutButton.valign = 'top';
    }

    return chart;
  }
}
