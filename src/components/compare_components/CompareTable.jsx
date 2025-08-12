import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';

const CompareTable = ({ data, columns, rows, selectedFroms = [], selectedTos = [], selectedTransportTypes = [] }) => {
  console.log('CompareTable props:', {
    dataLength: data?.length,
    columns,
    rows,
    selectedFroms,
    selectedTos,
    selectedTransportTypes
  });
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

  // Process data to create comparison data structure
  const processData = () => {
    console.log('Processing data with filters:', { selectedFroms, selectedTos, selectedTransportTypes });
    // First, filter the data based on selected 'from', 'to', and transport type filters
    console.log('Total data items before filtering:', data.length);
    const filteredData = data.filter(item => {
      const matchesFrom = !selectedFroms.length || selectedFroms.includes(item['From']);
      const matchesTo = !selectedTos.length || selectedTos.includes(item['To']);
      const matchesTransportType = !selectedTransportTypes.length || 
                                 selectedTransportTypes.some(type => 
                                   item['Transport Type']?.toLowerCase().includes(type.toLowerCase())
                                 );
      const matches = matchesFrom && matchesTo && matchesTransportType;
      if (matches) {
        console.log('Matching item:', { 
          from: item['From'], 
          to: item['To'], 
          type: item['Transport Type'],
          provider: item['source']
        });
      }
      return matches;
    });

    // Group data by provider
    const groupedData = filteredData.reduce((acc, item) => {
      const provider = item['source'] || 'Unknown';
      if (!acc[provider]) {
        acc[provider] = {
          provider,
          routes: [],
          prices: [],
          operators: new Set(),
          transportTypes: new Set()
        };
      }
      
      // Collect all routes and prices for calculations
      acc[provider].routes.push(item);
      
      // Track unique operators and transport types
      if (item['Operator']) {
        acc[provider].operators.add(item['Operator']);
      }
      if (item['Transport Type']) {
        acc[provider].transportTypes.add(item['Transport Type']);
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
      const providerData = groupedData[provider] || { 
        routes: [], 
        prices: [], 
        operators: new Set(),
        transportTypes: new Set()
      };
      
      const { routes, prices } = providerData;
      const priceSum = prices.reduce((a, b) => a + b, 0);
      const priceCount = prices.length;
      const meanPrice = priceCount > 0 ? priceSum / priceCount : null;
      
      // Calculate standard deviation if needed
      const stdDev = priceCount > 0 ? 
        Math.sqrt(prices.reduce((a, b) => a + Math.pow(b - meanPrice, 2), 0) / priceCount) : 
        null;
      
      // Calculate all metrics for this provider
      providerMetrics[provider] = {
        totalRoutes: routes.length,
        price: meanPrice,  // Alias for Mean Price Average
        meanPrice: meanPrice,
        lowestPrice: priceCount > 0 ? Math.min(...prices) : null,
        highestPrice: priceCount > 0 ? Math.max(...prices) : null,
        medianPrice: (() => {
          if (priceCount === 0) return null;
          const sorted = [...prices].sort((a, b) => a - b);
          const mid = Math.floor(priceCount / 2);
          return priceCount % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        })(),
        standardDeviation: stdDev,
        uniqueProviders: providerData.operators.size,
        uniqueOperators: providerData.operators.size,
        cheapestCarriers: (() => {
          if (priceCount === 0) return 'N/A';
          const minPrice = Math.min(...prices);
          const cheapestRoutes = routes.filter(route => {
            const routePrice = parseFloat((route.Price || '').replace(/[^0-9.-]+/g, '') || '0');
            return !isNaN(routePrice) && routePrice === minPrice;
          });
          const carriers = [...new Set(cheapestRoutes.map(r => r.Operator || 'Unknown'))];
          return carriers.join(', ') || 'N/A';
        })(),
        routeTypes: Array.from(providerData.transportTypes).join(', ') || 'N/A'
      };
    });
    
    return providerMetrics;
  };

  const providerMetrics = processData();
  console.log('Provider metrics:', providerMetrics);
  
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
