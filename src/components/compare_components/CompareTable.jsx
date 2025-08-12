import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';

const CompareTable = ({ data, columns, rows, selectedFroms, selectedTos, selectedTransportTypes = [] }) => {
  if (!data || !data.length || !columns?.length || !rows?.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        No data available for the selected filters.
      </div>
    );
  }

  // Get unique providers from the data
  const providers = [...new Set(data.map(item => item.source || 'Unknown'))];
  
  // Define the metrics to display as rows
  const metrics = [
    { name: 'Total Routes', key: 'totalRoutes' },
    { name: 'Mean Price', key: 'meanPrice' },
    { name: 'Lowest Price', key: 'lowestPrice' },
    { name: 'Highest Price', key: 'highestPrice' },
    { name: 'Median Price', key: 'medianPrice' },
    { name: 'No of Unique Providers', key: 'uniqueProviders' }
  ];

  // Process data to create comparison data structure
  const processData = () => {
    // First, filter the data based on selected 'from', 'to', and transport type filters
    const filteredData = data.filter(item => {
      const matchesFrom = !selectedFroms.length || selectedFroms.includes(item['From']);
      const matchesTo = !selectedTos.length || selectedTos.includes(item['To']);
      const matchesTransportType = !selectedTransportTypes.length || 
                                 selectedTransportTypes.some(type => 
                                   item['Transport Type']?.toLowerCase().includes(type.toLowerCase())
                                 );
      return matchesFrom && matchesTo && matchesTransportType;
    });

    // Group data by provider
    const groupedData = filteredData.reduce((acc, item) => {
      const provider = item['source'] || 'Unknown';
      if (!acc[provider]) {
        acc[provider] = {
          provider,
          routes: [],
          prices: [],
          operators: new Set()
        };
      }
      
      // Collect all routes and prices for calculations
      acc[provider].routes.push(item);
      
      // Track unique operators
      if (item['Operator']) {
        acc[provider].operators.add(item['Operator']);
      }
      
      // Extract numeric price for calculations
      const priceStr = item['Price']?.toString() || '';
      const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(price) && price > 0) {
        acc[provider].prices.push(price);
      }
      
      return acc;
    }, {});

    // Calculate metrics for each provider
    const providerMetrics = {};
    
    providers.forEach(provider => {
      const providerData = groupedData[provider] || { routes: [], prices: [], operators: new Set() };
      const { routes, prices } = providerData;
      
      // Calculate all metrics for this provider
      providerMetrics[provider] = {
        totalRoutes: routes.length,
        meanPrice: prices.length > 0 
          ? prices.reduce((a, b) => a + b, 0) / prices.length 
          : null,
        lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
        highestPrice: prices.length > 0 ? Math.max(...prices) : null,
        medianPrice: (() => {
          if (prices.length === 0) return null;
          const sorted = [...prices].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0 
            ? sorted[mid] 
            : (sorted[mid - 1] + sorted[mid]) / 2;
        })(),
        uniqueOperators: providerData.operators.size
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
                    <td key={`${provider}-${metric.key}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {(() => {
                        const value = providerMetrics[provider]?.[metric.key];
                        if (value === null || value === undefined) return 'N/A';
                        
                        // Format based on metric type
                        if (metric.key === 'meanPrice' || 
                            metric.key === 'lowestPrice' || 
                            metric.key === 'highestPrice' ||
                            metric.key === 'medianPrice') {
                          return formatPrice(value);
                        }
                        return value;
                      })()}
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
