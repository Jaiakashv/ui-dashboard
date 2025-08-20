import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CompareTable = ({ data, columns, rows, selectedFroms = [], selectedTos = [], selectedTransportTypes = [] }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/stats/routes`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setStats(result);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedFroms, selectedTos, selectedTransportTypes]);

  if (loading) {
    return (
      <div className="p-4">
        <Skeleton width="100%" height="2rem" className="mb-2" />
        <Skeleton width="100%" height="2rem" className="mb-2" />
        <Skeleton width="100%" height="2rem" className="mb-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (!data || !data.length || !columns?.length || !rows?.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        No data available for the selected filters.
      </div>
    );
  }

  // Get unique providers from the data
  const providers = [...new Set(data.map(item => item.source || 'Unknown'))];
  
  // Map of all possible metrics with their display names and calculation keys
  const allMetrics = {
    'Total Routes': { key: 'totalRoutes' },
    'Mean Price Average': { key: 'meanPrice' },
    'Price': { key: 'price' },
    'Lowest Price': { key: 'lowestPrice' },
    'Highest Price': { key: 'highestPrice' },
    'Median Price': { key: 'medianPrice' },
    'No of Unique Providers': { key: 'uniqueProviders' },
    'Standard Deviation': { key: 'standardDeviation' },
    'Cheapest Carriers': { key: 'cheapestCarriers' },
    'Routes (bus, train, etc.)': { key: 'routeTypes' }
  };
  
  // Filter metrics based on selected rows and map to consistent format
  const metrics = rows
    .filter(row => allMetrics[row.name])
    .map(row => ({
      name: row.name,
      key: allMetrics[row.name].key
    }));

  // Process data using API stats
  const processData = () => {
    const providerMetrics = {};
    const providers = [...new Set(data.map(item => item.source || 'Unknown'))];
    
    providers.forEach(provider => {
      providerMetrics[provider] = {
        provider,
        totalRoutes: stats.TotalRoutes || 0,
        meanPrice: stats.MeanPrice || 0,
        price: stats.MeanPrice || 0, // Alias for compatibility
        lowestPrice: stats.MinPrice || 0,
        highestPrice: stats.MaxPrice || 0,
        medianPrice: stats.MedianPrice || 0,
        uniqueProviders: stats.UniqueProviders || 0,
        standardDeviation: stats.PriceStdDev || 0,
        cheapestCarriers: Array.isArray(stats.CheapestCarriers) ? 
          stats.CheapestCarriers.join(', ') : 'N/A',
        routeTypes: stats.RouteTypes || 'N/A',
        uniqueOperators: stats.UniqueProviders || 0
      };
    });
    
    return providerMetrics;
  };

  const providerMetrics = processData();
  
  // Format a price value with currency symbol
  const formatPrice = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `₹${value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="compare-table-container">
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider bg-[#3a4b61]">
                providers
                </th>
                {providers.map(provider => (
                  <th key={provider} className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-[#3a4b61]">
                    {provider}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((metric, idx) => (
                <tr key={metric.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.name}
                  </td>
                  {providers.map(provider => (
                    <td key={`${metric.key}-${provider}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {typeof providerMetrics[provider]?.[metric.key] === 'number' 
                        ? metric.key.toLowerCase().includes('price')
                          ? formatPrice(providerMetrics[provider][metric.key])
                          : providerMetrics[provider][metric.key].toLocaleString()
                        : providerMetrics[provider]?.[metric.key] || 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CompareTable;
