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

const PopularRoutes = ({ data = [] }) => {
  console.log('PopularRoutes received data:', data);
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
    console.log('Processing data in useMemo');
    const routeCounts = {};
    const details = {};

    console.log('Raw data items:', data.length);
    const validRoutes = data.filter((route) => {
      const hasRequiredFields = route && route.From && route.To;
      if (!hasRequiredFields) {
        console.log('Skipping invalid route:', route);
      }
      return hasRequiredFields;
    });
    console.log('Valid routes:', validRoutes.length);

    validRoutes.forEach((route, index) => {
      if (index < 5) { // Log first few routes for debugging
        console.log(`Processing route ${index + 1}:`, { 
          from: route.From, 
          to: route.To,
          source: route.source,
          operator: route.Operator
        });
      }
      // Normalize route names by trimming and converting to lowercase for consistent grouping
      const from = route.From.trim().toLowerCase();
      const to = route.To.trim().toLowerCase();
      const key = `${from}|${to}`;
      const provider = route.source
        ? route.source.replace('.json', '').charAt(0).toUpperCase() + route.source.replace('.json', '').slice(1)
        : 'Unknown';

      if (!details[key]) {
        details[key] = {
          from: from, // Use normalized from
          to: to,     // Use normalized to
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
    console.log('Filtering routes. Total routes:', routes.length);
    const searchLower = searchTerm.trim().toLowerCase();
    const filtered = routes
      .filter((route) => {
        if (!searchLower) return true;
        const fromMatch = route.from?.toLowerCase().includes(searchLower);
        const toMatch = route.to?.toLowerCase().includes(searchLower);
        return fromMatch || toMatch;
      })
      .slice(0, routeCount);
    
    console.log('Routes after filtering:', filtered.length);
    
    const result = filtered.map((route) => {
      const routeKey = `${route.from}|${route.to}`;
      const details = routeDetails[routeKey] || {};
      if (!routeDetails[routeKey]) {
        console.log('No details found for route:', routeKey);
      }
      return {
        ...route,
        ...details
      };
    });
    
    console.log('Final routes to display:', result);
    return result;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Popular Routes</h3>
          <p className="text-sm text-gray-500 mt-1">Showing top {routeCount} most frequent routes</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-40">
            <i className="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search routes..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
      </div>


      {!selectedRoute ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trips</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Providers</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoutes.map((route, index) => (
                <tr 
                  key={route.id} 
                  className="hover:bg-blue-50 cursor-pointer transition-colors" 
                  onClick={() => handleRouteSelect(route)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-full mr-3">
                        <span className="text-blue-600 font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {route.from} → {route.to}
                        </div>
                        <div className="text-xs text-gray-500">
                          {route.totalTrips} {route.totalTrips === 1 ? 'trip' : 'trips'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{route.totalTrips}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (route.totalTrips / (filteredRoutes[0]?.totalTrips || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {route.providerList.slice(0, 3).map((provider, idx) => (
                        <span 
                          key={provider.name} 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {provider.name} ({provider.count})
                        </span>
                      ))}
                      {route.providerList.length > 3 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          +{route.providerList.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRoutes.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    No routes found matching your search criteria
                  </td>
                </tr>
              )}
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
