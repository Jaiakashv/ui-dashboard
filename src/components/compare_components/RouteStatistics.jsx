import React from 'react';

const RouteStatistics = ({ stats = {}, loading = false, error = null, selectedMetric = null, source = '12go' }) => {
  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format value based on its type
  const formatValue = (value, isCurrency) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (Array.isArray(value)) return value.join(', ');
    return isCurrency ? formatCurrency(value) : value;
  };

  // Map of all possible metrics to their display values
  const allMetrics = {
    'totalRoutes': { label: 'Unique Routes', value: stats?.totalRoutes, isCurrency: false },
    'meanPrice': { label: 'Mean Price', value: stats?.meanPrice, isCurrency: true },
    'lowestPrice': { label: 'Lowest Price', value: stats?.lowestPrice, isCurrency: true },
    'highestPrice': { label: 'Highest Price', value: stats?.highestPrice, isCurrency: true },
    'medianPrice': { label: 'Median Price', value: stats?.medianPrice, isCurrency: true },
    'standardDeviation': { label: 'Price Standard Deviation', value: stats?.standardDeviation, isCurrency: true },
    'uniqueProviders': { label: 'Number of Unique Providers', value: stats?.uniqueProviders, isCurrency: false },
    'cheapestCarriers': { label: 'Cheapest Carriers', value: stats?.cheapestCarriers, isCurrency: false },
    'routes': { label: 'Available Transport Types', value: stats?.routes, isCurrency: false }
  };

  // Get the metrics to display based on selectedMetric
  const tableData = selectedMetric 
    ? [allMetrics[selectedMetric]].filter(Boolean)
    : Object.values(allMetrics);


  // Loading state
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // If a specific metric is selected
  if (selectedMetric) {
    // Map of metric names to their corresponding values in the stats object
    const metricMap = {
      'totalRoutes': { label: 'Total Routes', value: stats?.totalRoutes, isCurrency: false },
      'meanPrice': { label: 'Mean Price', value: stats?.meanPrice, isCurrency: true },
      'lowestPrice': { label: 'Lowest Price', value: stats?.lowestPrice, isCurrency: true },
      'highestPrice': { label: 'Highest Price', value: stats?.highestPrice, isCurrency: true },
      'medianPrice': { label: 'Median Price', value: stats?.medianPrice, isCurrency: true },
      'standardDeviation': { label: 'Price Standard Deviation', value: stats?.standardDeviation, isCurrency: true },
      'uniqueProviders': { label: 'Number of Unique Providers', value: stats?.uniqueProviders, isCurrency: false },
      'cheapestCarriers': { label: 'Cheapest Carriers', value: stats?.cheapestCarriers, isCurrency: false },
      'routes': { label: 'Available Transport Types', value: stats?.routes, isCurrency: false }
    };

    const selectedData = metricMap[selectedMetric];
    
    if (!selectedData || selectedData.value === undefined || selectedData.value === null) {
      return (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            {selectedMetric.split(/(?=[A-Z])/).join(' ')}
          </h2>
          <p className="text-gray-600">No data available for this metric.</p>
        </div>
      );
    }
    
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {selectedData.label}
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          <div className="px-6 py-4">
            {selectedMetric === 'routes' ? (
              <div className="flex flex-wrap gap-2">
                {selectedData.value.split(',').map((type, i) => (
                  <span 
                    key={i}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {type.trim()}
                  </span>
                ))}
              </div>
            ) : selectedData.isCurrency ? (
              <div className="text-2xl font-semibold">
                {formatCurrency(selectedData.value)}
              </div>
            ) : (
              <div className="text-2xl font-semibold">
                {selectedData.value.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If no data
  if (!stats || Object.keys(stats).length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
        No data available
      </div>
    );
  }

  // Main table view
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header with source */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-500">Source:</span>
          <span className="ml-2 text-sm font-medium text-gray-900">{source}</span>
        </div>
        <div className="text-xs text-gray-500">
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metric
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.label}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  {formatValue(item.value, item.isCurrency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RouteStatistics;
