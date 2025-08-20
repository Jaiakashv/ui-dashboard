import React from 'react';

const RouteStatistics = ({ stats, loading, error }) => {
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

  // Render statistics card
  const renderStatCard = (title, value, isCurrency = false) => (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-1 text-2xl font-semibold text-gray-900">
        {loading ? (
          <span className="text-gray-400">Loading...</span>
        ) : error ? (
          <span className="text-red-500">Error</span>
        ) : isCurrency ? (
          formatCurrency(value)
        ) : (
          value?.toLocaleString?.() || value || 'N/A'
        )}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderStatCard('Total Routes', stats?.TotalRoutes)}
        {renderStatCard('Mean Price', stats?.MeanPriceAverage, true)}
        {renderStatCard('Lowest Price', stats?.LowestPrice, true)}
        {renderStatCard('Highest Price', stats?.HighestPrice, true)}
        {renderStatCard('Median Price', stats?.MedianPrice, true)}
        {renderStatCard('Price Standard Deviation', stats?.StandardDeviation, true)}
        {renderStatCard('Unique Operators', stats?.NumberOfUniqueOperators)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Cheapest Carrier</h3>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : error ? (
            <p className="text-red-500">Error loading data</p>
          ) : stats?.CheapestCarrier ? (
            <div>
              <p className="text-2xl font-semibold">{stats.CheapestCarrier}</p>
              <p className="text-gray-600">{formatCurrency(stats.LowestPrice)}</p>
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Available Transport Types</h3>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : error ? (
            <p className="text-red-500">Error loading data</p>
          ) : stats?.Routes ? (
            <div className="space-y-2">
              {stats.Routes.split(', ').map((transport, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{transport || 'Unknown'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No transport type data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteStatistics;
