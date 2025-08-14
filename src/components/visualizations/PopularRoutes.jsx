import React, { useState, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
} from 'chart.js';
import { Doughnut, Bar, Pie, Line, Radar, Bubble } from 'react-chartjs-2';
import { Dropdown } from 'primereact/dropdown';
import { Card } from 'primereact/card';
import ChartTypeSelector, { CHART_TYPES } from './ChartTypeSelector';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale
);

const ROUTE_COUNT_OPTIONS = [
  { label: 'Top 5', value: 5 },
  { label: 'Top 10', value: 10 },
  { label: 'Top 20', value: 20 },
  { label: 'Top 50', value: 50 },
];

const PopularRoutes = ({ data }) => {
  const [chartType, setChartType] = useState(CHART_TYPES.BAR);
  const [routeCount, setRouteCount] = useState(10);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleChartTypeChange = (selectedType) => {
    setChartType(selectedType);
  };
  const handleRouteCountChange = (e) => setRouteCount(e.value);
  const handleRouteSelect = (route) => setSelectedRoute(route);
  const handleBackToList = () => setSelectedRoute(null);

  const { routes, routeDetails } = useMemo(() => {
    const routeCounts = {};
    const details = {};

    const validRoutes = data.filter((route) => route.From && route.To);

    validRoutes.forEach((route) => {
      const key = `${route.From} to ${route.To}`;
      const provider = route.source
        ? route.source.replace('.json', '').charAt(0).toUpperCase() + route.source.replace('.json', '').slice(1)
        : 'Unknown';

      if (!details[key]) {
        details[key] = {
          from: route.From,
          to: route.To,
          totalTrips: 0,
          providers: {},
          providerList: [],
        };
      }

      if (!details[key].providers[provider]) {
        details[key].providers[provider] = new Set();
      }

      details[key].providers[provider].add(route.Operator || 'Unknown');
      details[key].totalTrips++;
      routeCounts[key] = (routeCounts[key] || 0) + 1;
    });

    Object.values(details).forEach((detail) => {
      detail.providerList = Object.entries(detail.providers).map(([name, operators]) => ({
        name,
        count: operators.size,
        percentage: Math.round((operators.size / detail.totalTrips) * 100),
      }));

      detail.providerList.sort((a, b) => b.count - a.count);
    });

    const sortedRoutes = Object.entries(routeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([route]) => ({
        id: route,
        ...details[route],
      }));

    return { routes: sortedRoutes, routeDetails: details };
  }, [data]);

  const filteredRoutes = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return routes
      .filter((route) => {
        const fromMatch = route.from?.toLowerCase().includes(searchLower);
        const toMatch = route.to?.toLowerCase().includes(searchLower);
        return fromMatch || toMatch;
      })
      .slice(0, routeCount)
      .map((route) => ({
        ...route,
        ...routeDetails[`${route.from} to ${route.to}`],
      }));
  }, [routes, routeDetails, routeCount, searchTerm]);

  const generateColors = (count) => {
    const baseColors = [
      'rgba(59, 130, 246, 0.7)',
      'rgba(16, 185, 129, 0.7)',
      'rgba(245, 158, 11, 0.7)',
      'rgba(239, 68, 68, 0.7)',
      'rgba(139, 92, 246, 0.7)',
      'rgba(20, 184, 166, 0.7)',
      'rgba(249, 115, 22, 0.7)',
      'rgba(236, 72, 153, 0.7)',
      'rgba(6, 182, 212, 0.7)',
      'rgba(234, 88, 12, 0.7)',
    ];
    if (count > baseColors.length) {
      const additionalNeeded = count - baseColors.length;
      for (let i = 0; i < additionalNeeded; i++) {
        const hue = Math.floor(Math.random() * 360);
        baseColors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
      }
    }
    return baseColors.slice(0, count);
  };

  const getProviderChartData = useCallback((routeDetail) => {
    if (!routeDetail) return { labels: [], datasets: [] };
    const labels = routeDetail.providerList.map((p) => p.name);
    const counts = routeDetail.providerList.map((p) => p.count);
    return {
      labels,
      datasets: [
        {
          label: 'Number of Operators',
          data: counts,
          backgroundColor: generateColors(labels.length),
          borderColor: generateColors(labels.length).map((c) => c.replace('0.7', '1')),
          borderWidth: 1,
        },
      ],
    };
  }, []);

  const chartData = useMemo(() => {
    if (!selectedRoute) return { labels: [], datasets: [] };
    return getProviderChartData(routeDetails[selectedRoute.id]);
  }, [selectedRoute, routeDetails, getProviderChartData]);

  const renderChart = () => {
    const isMobile = window.innerWidth < 640;
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'right',
          labels: {
            boxWidth: 12,
            padding: 10,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} trips (${percentage}%)`;
            },
          },
          bodyFont: {
            size: isMobile ? 10 : 12,
          },
          padding: isMobile ? 8 : 12,
          displayColors: false,
        },
      },
      layout: {
        padding: isMobile ? 5 : 10,
      },
      elements: {
        arc: {
          borderWidth: isMobile ? 1 : 2,
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
        const bubbleData = {
          datasets: [
            {
              ...chartData.datasets[0],
              data: chartData.labels.map((_, i) => ({
                x: i,
                y: chartData.datasets[0].data[i],
                r: Math.min(30, chartData.datasets[0].data[i] * 2),
              })),
            },
          ],
        };
        return <Bubble data={bubbleData} options={commonOptions} />;
      default:
        return <Doughnut data={chartData} options={commonOptions} />;
    }
  };

  const getChartHeight = () => {
    if (window.innerWidth < 640) return '300px';
    if (window.innerWidth < 1024) return '350px';
    return '400px';
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow mt-9">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <h3 className="text-base sm:text-lg font-semibold">Popular Routes</h3>
        <div className="flex gap-2">
          <Dropdown
            value={routeCount}
            options={ROUTE_COUNT_OPTIONS}
            onChange={handleRouteCountChange}
            optionLabel="label"
            className="w-32"
            placeholder="Show"
          />
          <ChartTypeSelector chartType={chartType} onChange={handleChartTypeChange} />
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search routes..."
          className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <i className="pi pi-search absolute left-3 top-3 text-gray-400"></i>
      </div>

      {!selectedRoute ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trips</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operators by Provider</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoutes.map((route) => (
                <tr key={route.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRouteSelect(route)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{route.from} → {route.to}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {route.totalTrips} trips
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      {route.providerList.map(provider => (
                        <div key={provider.name} className="flex items-center">
                          <span className="font-medium">{provider.name}:</span>
                          <span className="ml-1">{provider.count} {provider.count === 1 ? 'operator' : 'operators'}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <button onClick={handleBackToList} className="text-sm text-blue-500 mb-3 hover:underline">
            ← Back to route list
          </button>
          <h4 className="text-md font-semibold mb-2">{selectedRoute.from} → {selectedRoute.to}</h4>
          <div className="w-full flex items-center justify-center" style={{ height: getChartHeight(), minHeight: '300px', position: 'relative' }}>
            {chartData.labels.length > 0 ? (
              <div className="w-full h-full">{renderChart()}</div>
            ) : (
              <p className="text-sm sm:text-base text-gray-500 text-center">
                No data available for selected route
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PopularRoutes;
