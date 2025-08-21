import React, { useState, useEffect, useCallback, useRef } from 'react';
import RouteStatistics from './RouteStatistics';
import { useStatsCache } from '../../contexts/StatsCacheContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEBOUNCE_DELAY = 500; // ms

const CompareTable = ({ selectedFroms = [], selectedTos = [], selectedTransportTypes = [], selectedMetrics = [] }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);
  const { getCachedData, setCachedData } = useStatsCache();
  const abortControllerRef = useRef(null);

  const generateCacheKey = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedFroms?.length === 1) params.set('from', selectedFroms[0]);
    if (selectedTos?.length === 1) params.set('to', selectedTos[0]);
    if (selectedTransportTypes?.length === 1) params.set('transportType', selectedTransportTypes[0]);
    return `stats_${params.toString()}`;
  }, [selectedFroms, selectedTos, selectedTransportTypes]);

  const fetchStats = useCallback(async () => {
    const cacheKey = generateCacheKey();
    const cachedData = getCachedData(cacheKey);
    
    // Abort any in-progress fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Use cached data if available and not stale
    if (cachedData) {
      setStats(cachedData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedFroms?.length === 1) params.append('from', selectedFroms[0]);
      if (selectedTos?.length === 1) params.append('to', selectedTos[0]);
      if (selectedTransportTypes?.length === 1) params.append('transportType', selectedTransportTypes[0]);
      
      const url = `${API_BASE_URL}/api/stats/routes?${params.toString()}`;
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Only update state if component is still mounted
      setCachedData(cacheKey, result);
      setStats(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching stats:', err);
        setError('Failed to load statistics. Please try again later.');
      }
    } finally {
      if (abortControllerRef.current?.signal?.aborted === false) {
        setLoading(false);
      }
    }
  }, [generateCacheKey, getCachedData, setCachedData, selectedFroms, selectedTos, selectedTransportTypes]);

  // Debounce and fetch data
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStats();
    }, DEBOUNCE_DELAY);
    
    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStats]);

  // Render a single table with all selected metrics
  const renderMetricsTable = () => {
    if (loading) {
      return (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      );
    }

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

    if (selectedMetrics.length === 0) {
      return (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
          No metrics selected. Please select metrics to compare.
        </div>
      );
    }

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

    // Filter the metrics based on what's selected
    const tableData = selectedMetrics
      .map(metric => allMetrics[metric])
      .filter(Boolean);

    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Header with source */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-500">Source:</span>
            <span className="ml-2 text-sm font-medium text-gray-900">12go</span>
          </div>
          {/* <div className="text-xs text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div> */}
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

  return (
    <div className="space-y-4">
      {renderMetricsTable()}
    </div>
  );
};

export default CompareTable;
