import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
} from 'chart.js';
import { Bar, Pie, Doughnut, Line, Radar, Bubble } from 'react-chartjs-2';
import ChartTypeSelector, { CHART_TYPES } from './ChartTypeSelector';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
);

const PriceGraph = ({ combinedData }) => {
  const [chartType, setChartType] = useState(CHART_TYPES.BAR);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [selectedArrival, setSelectedArrival] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const uniqueDepartures = useMemo(
    () => [...new Set(combinedData?.map(item => item?.['From']).filter(Boolean) || [])].sort().map(item => ({
      label: item,
      value: item
    })) || [],
    [combinedData]
  );
  
  const uniqueArrivals = useMemo(
    () => [...new Set(combinedData?.map(item => item?.['To']).filter(Boolean) || [])].sort().map(item => ({
      label: item,
      value: item
    })) || [],
    [combinedData]
  );
  
  const uniqueProviders = useMemo(
    () => [...new Set(combinedData?.map(item => item?.source).filter(Boolean) || [])].sort().map(item => ({
      label: item,
      value: item
    })) || [],
    [combinedData]
  );

  const handleChartTypeChange = (e) => {
    setChartType(e.value);
  };

  const clearFilters = () => {
    setSelectedDate(null);
    setSelectedDeparture(null);
    setSelectedArrival(null);
    setSelectedProvider(null);
    console.log('All filters cleared - showing all data');
  };

  const getPriceData = () => {
    // Log detailed information about the incoming data
    console.group('=== Data Debug Info ===');
    console.log('Total items in data array:', combinedData.length);
    
    if (combinedData.length === 0) {
      console.warn('No data received. Check if data is being passed correctly to the component.');
      console.groupEnd();
      return { labels: [], datasets: [] };
    }
    
    // Log first 5 items with all their properties
    console.log('First 5 items with all properties:');
    combinedData.slice(0, Math.min(5, combinedData.length)).forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        ...item,
        // Add type information for debugging
        _types: Object.entries(item).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: typeof value
        }), {})
      });
    });
    
    // Check for common price field names in the data
    const sampleItem = combinedData[0];
    const possiblePriceFields = ['Price', 'price', 'amount', 'fare'];
    const foundPriceFields = possiblePriceFields.filter(field => field in sampleItem);
    console.log('Possible price fields found in data:', foundPriceFields);
    
    if (foundPriceFields.length === 0) {
      console.warn('No price-related fields found in the data. Available fields:', Object.keys(sampleItem));
    }
    
    // Define fixed price ranges as requested
    const priceRanges = [
      { min: 0, max: 300, label: '0 - 300' },
      { min: 300, max: 1000, label: '300 - 1,000' },
      { min: 1000, max: 2000, label: '1,000 - 2,000' },
      { min: 2000, max: 3000, label: '2,000 - 3,000' },
      { min: 3000, max: 5000, label: '3,000 - 5,000' },
      { min: 5000, max: 10000, label: '5,000 - 10,000' },
      { min: 10000, max: 20000, label: '10,000 - 20,000' },
      { min: 20000, max: 50000, label: '20,000 - 50,000' },
      { min: 50000, max: 100000, label: '50,000+' }
    ];
    
    console.log('Using fixed price ranges:', priceRanges);

    const filteredData = combinedData.filter(route => {
      // Only apply filters if they are explicitly set
      if (selectedDate) {
        const routeDate = route.Date ? new Date(route.Date).toDateString() : null;
        const filterDate = new Date(selectedDate).toDateString();
        if (routeDate !== filterDate) return false;
      }
      if (selectedDeparture && route['From'] !== selectedDeparture.value) return false;
      if (selectedArrival && route['To'] !== selectedArrival.value) return false;
      if (selectedProvider && route.source !== selectedProvider.value) return false;

      // Try different possible price field names and formats
      const possiblePriceFields = ['Price', 'price', 'amount', 'fare'];
      let priceValue = null;
      
      // Find the first existing price field
      for (const field of possiblePriceFields) {
        if (route[field] !== undefined && route[field] !== null && route[field] !== '') {
          priceValue = route[field];
          break;
        }
      }
      
      // If no price field found, log and skip
      if (priceValue === null) {
        console.log('Route has no price field or empty value:', {
          availableFields: Object.keys(route),
          from: route.From,
          to: route.To,
          source: route.source,
          date: route.Date
        });
        return false;
      }
      
      // Convert price to number, handling different formats
      let priceStr = String(priceValue).trim();
      
      // Remove any non-numeric characters except decimal point
      priceStr = priceStr.replace(/[^0-9.]/g, '');
      
      // Parse the price
      const price = parseFloat(priceStr) || 0; // Default to 0 if parsing fails
      const isValid = !isNaN(price) && isFinite(price);
      
      if (!isValid) {
        console.log('Could not parse price:', {
          originalValue: priceValue,
          valueType: typeof priceValue,
          cleanedString: priceStr,
          parsedPrice: price,
          route: {
            from: route.From,
            to: route.To,
            source: route.source,
            date: route.Date
          }
        });
        return false;
      }
      
      console.log('Valid price found:', {
        original: priceValue,
        parsed: price,
        from: route.From,
        to: route.To,
        source: route.source
      });
      return isValid;
    });

    if (filteredData.length === 0) {
      console.log('No data after filtering. Possible reasons:');
      console.log('- Selected date filter:', selectedDate);
      console.log('- Selected departure:', selectedDeparture);
      console.log('- Selected arrival:', selectedArrival);
      console.log('- Selected provider:', selectedProvider);
      console.log('- Total routes before filtering:', data.length);
      return { labels: [], datasets: [] };
    }

    const providers = selectedProvider ? [selectedProvider] : uniqueProviders;

    const datasets = providers.map((provider, index) => {
      const providerData = selectedProvider
        ? filteredData
        : filteredData.filter(route => route.source === provider);

      const ranges = priceRanges.map(range => ({
        ...range,
        label: `${range.min} - ${range.max}`,
        count: 0
      }));

      providerData.forEach(route => {
        const priceStr = String(route.Price).replace(/[^0-9.]/g, '');
        const price = parseFloat(priceStr);
        const rangeIndex = ranges.findIndex(range => price >= range.min && price < range.max);
        if (rangeIndex >= 0) {
          ranges[rangeIndex].count++;
        }
      });

      const hue = (index * 137.508) % 360;
      const color = `hsla(${hue}, 70%, 60%, 0.7)`;

      return {
        label: provider || 'Unknown',
        data: ranges.map(range => range.count),
        backgroundColor: color,
        borderColor: color.replace('0.7', '1'),
        borderWidth: 1,
      };
    });

    return {
      labels: priceRanges.map(range => range.label),
      datasets: datasets.filter(dataset => dataset.data.some(count => count > 0))
    };
  };

  const chartData = useMemo(() => {
    console.log('Chart data dependencies changed:', {
      dataLength: combinedData.length,
      selectedDate,
      selectedDeparture,
      selectedArrival,
      selectedProvider
    });
    const result = getPriceData();
    console.log('Generated chart data:', result);
    return result;
  }, [combinedData, selectedDate, selectedDeparture, selectedArrival, selectedProvider]);

  const renderChart = () => {
    const isMobile = window.innerWidth < 640;
    const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'right',
          labels: {
            boxWidth: 12,
            padding: isMobile ? 10 : 20,
            font: {
              size: isMobile ? 10 : (isTablet ? 12 : 14)
            }
          },
          onHover: function (e) {
            if (isMobile) e.native.target.style.cursor = 'pointer';
          },
          onClick: function () {
            if (isMobile) return true;
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
              return isMobile
                ? `${value} ${value === 1 ? 'route' : 'routes'} (${percentage}%)`
                : `${label}: ${value} ${value === 1 ? 'route' : 'routes'} (${percentage}%)`;
            },
          },
          titleFont: { size: isMobile ? 10 : 12 },
          bodyFont: { size: isMobile ? 10 : 12 },
          padding: isMobile ? 8 : 12,
          displayColors: false
        },
      },
      layout: { padding: isMobile ? 5 : 10 },
      elements: {
        arc: { borderWidth: isMobile ? 1 : 2 },
        bar: { borderWidth: 1 }
      },
      scales: chartType === CHART_TYPES.BAR || chartType === CHART_TYPES.LINE ? {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: {
              size: isMobile ? 10 : (isTablet ? 11 : 12)
            }
          },
          grid: { display: !isMobile }
        },
        x: {
          ticks: {
            font: {
              size: isMobile ? 10 : (isTablet ? 11 : 12)
            },
            maxRotation: isMobile ? 45 : 0,
            autoSkip: !isMobile,
            maxTicksLimit: isMobile ? 5 : 10
          },
          grid: { display: !isMobile }
        }
      } : {}
    };

    switch (chartType) {
      case CHART_TYPES.BAR:
        return <Bar data={chartData} options={commonOptions} />;
      case CHART_TYPES.PIE:
        return <Pie data={chartData} options={commonOptions} />;
      case CHART_TYPES.DOUGHNUT:
        return <Doughnut data={chartData} options={commonOptions} />;
      case CHART_TYPES.LINE:
        return <Line data={chartData} options={commonOptions} />;
      case CHART_TYPES.RADAR:
        return <Radar data={chartData} options={commonOptions} />;
      case CHART_TYPES.BUBBLE:
        if (!chartData.datasets.length) {
          return <div className="text-sm text-gray-500 text-center">No data for bubble chart</div>;
        }
        const bubbleData = {
          labels: chartData.labels,
          datasets: [{
            ...chartData.datasets[0],
            data: chartData.labels.map((_, i) => ({
              x: i,
              y: chartData.datasets[0].data[i],
              r: Math.min(30, chartData.datasets[0].data[i] * 2)
            }))
          }]
        };
        return <Bubble data={bubbleData} options={commonOptions} />;
      default:
        return <Bar data={chartData} options={commonOptions} />;
    }
  };

  const getChartHeight = () => {
    if (window.innerWidth < 640) return '300px';
    if (window.innerWidth < 1024) return '350px';
    return '400px';
  };

  console.groupEnd(); // Close the debug group
  
  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div className="mb-2 sm:mb-0">
            <h3 className="text-base sm:text-lg font-semibold">Price Distribution</h3>
            <div className="text-xs sm:text-sm text-gray-500">
              {chartData.datasets.reduce((total, dataset) =>
                total + dataset.data.reduce((a, b) => a + b, 0), 0)} total routes
              {selectedDate && ` • ${new Date(selectedDate).toLocaleDateString()}`}
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <ChartTypeSelector
              chartType={chartType}
              onChange={handleChartTypeChange}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Date</label>
            <Calendar
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.value)}
              dateFormat="dd/mm/yy"
              showIcon
              showButtonBar
              placeholder="Select Date"
              className="w-full"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">From</label>
            <Dropdown
              value={selectedDeparture}
              options={uniqueDepartures}
              onChange={(e) => setSelectedDeparture(e.value)}
              placeholder="All Departures"
              className="w-full"
              showClear
              optionLabel="label"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">To</label>
            <Dropdown
              value={selectedArrival}
              options={uniqueArrivals}
              onChange={(e) => setSelectedArrival(e.value)}
              placeholder="All Arrivals"
              className="w-full"
              showClear
              optionLabel="label"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Provider</label>
            <Dropdown
              value={selectedProvider}
              options={uniqueProviders}
              onChange={(e) => setSelectedProvider(e.value)}
              placeholder="All Providers"
              className="w-full"
              showClear
              optionLabel="label"
            />
          </div>

          <div className="flex items-end">
            <Button
              label="Clear Filters"
              icon="pi pi-filter-slash"
              onClick={clearFilters}
              className="p-button-text p-button-sm w-full"
              disabled={!selectedDate && !selectedDeparture && !selectedArrival && !selectedProvider}
            />
          </div>
        </div>

        <div
          className="w-full flex items-center justify-center"
          style={{
            height: getChartHeight(),
            minHeight: '300px',
            position: 'relative'
          }}
        >
          {chartData.labels.length > 0 ? (
            <div className="w-full h-full">
              {renderChart()}
            </div>
          ) : (
            <div className="text-center text-sm sm:text-base text-gray-500">
              No price data available
            </div>
          )}
        </div>

        {chartData.labels.length > 0 && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            {window.innerWidth < 1024 ? 'Tap' : 'Click'} on legend items to filter
          </p>
        )}
      </div>
    </div>
  );
};

export default PriceGraph;
