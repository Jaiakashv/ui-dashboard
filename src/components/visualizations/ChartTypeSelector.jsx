import React from 'react';
import { Dropdown } from 'primereact/dropdown';

// Chart type constants
export const CHART_TYPES = {
  BAR: 'bar',
  PIE: 'pie',
  DOUGHNUT: 'doughnut',
  LINE: 'line',
  RADAR: 'radar',
  BUBBLE: 'bubble'
};

// Chart type options with labels and icons
export const CHART_TYPE_OPTIONS = [
  { label: 'Bar Chart', value: CHART_TYPES.BAR, icon: 'pi pi-chart-bar' },
  { label: 'Pie Chart', value: CHART_TYPES.PIE, icon: 'pi pi-chart-pie' },
  { label: 'Doughnut Chart', value: CHART_TYPES.DOUGHNUT, icon: 'pi pi-circle' },
  { label: 'Line Chart', value: CHART_TYPES.LINE, icon: 'pi pi-chart-line' },
  { label: 'Radar Chart', value: CHART_TYPES.RADAR, icon: 'pi pi-chart-radar' },
  { label: 'Bubble Chart', value: CHART_TYPES.BUBBLE, icon: 'pi pi-circle-fill' }
];

const ChartTypeSelector = ({ chartType = CHART_TYPES.DOUGHNUT, onChange, className = '' }) => {
  // Make sure chartType is always a valid value
  const validChartType = Object.values(CHART_TYPES).includes(chartType) ? chartType : CHART_TYPES.DOUGHNUT;
  
  // Find the selected option
  const selectedOption = CHART_TYPE_OPTIONS.find(opt => opt.value === validChartType) || CHART_TYPE_OPTIONS[2];

  const handleChange = (e) => {
    // Make sure we have a valid selection
    if (onChange && e.value) {
      onChange(e.value);
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <span className="text-sm text-gray-500 mr-2">Chart Type:</span>
      <Dropdown
        value={selectedOption}
        options={CHART_TYPE_OPTIONS}
        onChange={handleChange}
        optionLabel="label"
        className="w-48 text-sm text-black"
        placeholder="Select Chart Type"
        showClear={false}
        valueTemplate={(option) => {
          // Make sure we have a valid option
          const displayOption = option || selectedOption || CHART_TYPE_OPTIONS[2];
          return (
            <div className="flex items-center">
              <i className={`${displayOption.icon} mr-2`}></i>
              <span>{displayOption.label}</span>
            </div>
          );
        }}
        itemTemplate={(option) => (
          <div className="flex items-center">
            <i className={`${option.icon} mr-2`}></i>
            <span>{option.label}</span>
          </div>
        )}
      />
    </div>
  );
};

export default ChartTypeSelector;
