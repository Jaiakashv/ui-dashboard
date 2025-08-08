import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Doughnut, Bar, Pie, Line, Radar, Bubble } from 'react-chartjs-2';
import ChartTypeSelector, { CHART_TYPES } from './ChartTypeSelector';

// Register all chart components
Chart.register(...registerables);

const CheapestCarrier = ({ data }) => {
  const [chartType, setChartType] = useState(CHART_TYPES.BAR);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const handleChartTypeChange = (e) => {
    setChartType(e.value);
  };

  // Process data to find cheapest operator per route
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], datasets: [] };

    const routeMap = new Map();

    data.forEach(item => {
      if (!item || !item['Price'] || item['Price'] === 'Not Available' || !item['From'] || !item['To']) {
        return;
      }

      const price = typeof item['Price'] === 'string' 
        ? parseFloat(item['Price'].replace(/[^0-9.]/g, '')) 
        : Number(item['Price']);
      if (isNaN(price) || price <= 0) return;

      const routeKey = `${item['From']} - ${item['To']}`;
      const operator = item['Operator'] || 'Unknown';

      if (!routeMap.has(routeKey) || routeMap.get(routeKey).price > price) {
        routeMap.set(routeKey, {
          route: routeKey,
          operator: operator,
          price: price,
          formattedPrice: item['Price']
        });
      }
    });

    const sortedData = Array.from(routeMap.values())
      .filter(item => typeof item.price === 'number' && !isNaN(item.price))
      .sort((a, b) => a.price - b.price)
      .slice(0, 10);

    if (sortedData.length === 0) return { labels: [], datasets: [] };

    const backgroundColors = [
      'rgba(99, 102, 241, 0.7)', 'rgba(79, 70, 229, 0.7)', 'rgba(67, 56, 202, 0.7)',
      'rgba(55, 48, 163, 0.7)', 'rgba(49, 46, 129, 0.7)', 'rgba(76, 29, 149, 0.7)',
      'rgba(67, 56, 202, 0.7)', 'rgba(99, 102, 241, 0.7)', 'rgba(129, 140, 248, 0.7)',
      'rgba(199, 210, 254, 0.7)'
    ];

    return {
      labels: sortedData.map(item => `${item.route} (${item.operator})`),
      datasets: [{
        label: 'Price',
        data: sortedData.map(item => item.price),
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
        borderWidth: 1,
        hoverOffset: 4
      }]
    };
  }, [data]);

  const renderChart = () => {
    if (!chartData.labels.length) return null;

    const isMobile = window.innerWidth < 640;

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'right',
          labels: {
            boxWidth: 12,
            padding: isMobile ? 10 : 20,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const price = context.raw.toFixed(2);
              return `Cheapest Price: $${price}`;
            },
            afterLabel: function (context) {
              const routeInfo = chartData.labels[context.dataIndex];
              const operator = routeInfo.match(/\(([^)]+)\)/)[1];
              return `Operator: ${operator}`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Price',
          },
        },
        y: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45,
          },
        },
      },
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
        return <Bubble data={chartData} options={commonOptions} />;
      default:
        return <Bar data={chartData} options={commonOptions} />;
    }
  };

  useEffect(() => {
    if (!chartRef.current || !chartData.labels.length) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const price = context.raw.toFixed(2);
                return `Cheapest Price: $${price}`;
              },
              afterLabel: function (context) {
                const routeInfo = chartData.labels[context.dataIndex];
                const operator = routeInfo.match(/\(([^)]+)\)/)[1];
                return `Operator: ${operator}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: 'Price ($)' },
            ticks: {
              callback: function (value) {
                return '$' + value;
              }
            }
          },
          y: { ticks: { autoSkip: false } }
        }
      }
    });
  }, [chartData]);

  return (
    <div className="w-full h-full p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Cheapest Carriers</h2>
        <ChartTypeSelector
          chartType={chartType}
          onChange={handleChartTypeChange}
          className="ml-auto"
        />
      </div>
      <div className="relative h-80">
        {renderChart()}
      </div>
    </div>
  );
};

export default CheapestCarrier;
