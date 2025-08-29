import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RouteStatistics from './RouteStatistics';
import { useStatsCache } from '../../contexts/StatsCacheContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const DEBOUNCE_DELAY = 500; // ms

const CompareTable = ({ 
  selectedFroms = [], 
  selectedTos = [], 
  selectedTransportTypes = [], 
  selectedMetrics = [],
  onMetricClick,
  loadingMetrics = {},
  selectedTimeline = 'Today'
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    '12go': {},
    'bookaway': {}
  });
  const [error, setError] = useState(null);
  const { getCachedData, setCachedData } = useStatsCache();
  const abortControllerRef = useRef(null);

  const generateCacheKey = useCallback((provider) => {
    const params = new URLSearchParams();
    if (selectedFroms?.length === 1) params.set('origin', selectedFroms[0]);
    if (selectedTos?.length === 1) params.set('destination', selectedTos[0]);
    if (selectedTransportTypes?.length === 1) params.set('transportType', selectedTransportTypes[0]);
    return `stats_${provider}_${params.toString()}`;
  }, [selectedFroms, selectedTos, selectedTransportTypes]);

  const fetchProviderStats = async (provider) => {
    const cacheKey = generateCacheKey(provider);
    const cachedData = getCachedData(cacheKey);
    
    try {
      if (cachedData) {
        return { [provider]: cachedData };
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (selectedFroms?.length === 1) params.set('origin', selectedFroms[0]);
      if (selectedTos?.length === 1) params.set('destination', selectedTos[0]);
      if (selectedTransportTypes?.length === 1) params.set('transportType', selectedTransportTypes[0]);

      // Fetch transport types
      const transportTypesResponse = await fetch(`${API_BASE_URL}/api/transport-types`, { 
        signal: abortControllerRef.current?.signal 
      });

      if (!transportTypesResponse.ok) {
        throw new Error(`HTTP error! status: ${transportTypesResponse.status}`);
      }

      const transportTypesData = await transportTypesResponse.json();
      const transportTypes = transportTypesData[provider.toLowerCase()]?.routes || '';

      // Fetch unique routes
      const uniqueRoutesResponse = await fetch(`${API_BASE_URL}/api/metrics/unique-routes?${params}`, { 
        signal: abortControllerRef.current?.signal 
      });

      if (!uniqueRoutesResponse.ok) {
        throw new Error(`HTTP error! status: ${uniqueRoutesResponse.status}`);
      }

      const uniqueRoutesData = await uniqueRoutesResponse.json();
      const uniqueRoutesProviderData = uniqueRoutesData[provider] || {};

      // Fetch lowest price
      const lowestPriceResponse = await fetch(`${API_BASE_URL}/api/metrics/lowest-price?${params}`, { 
        signal: abortControllerRef.current?.signal 
      });

      if (!lowestPriceResponse.ok) {
        throw new Error(`HTTP error! status: ${lowestPriceResponse.status}`);
      }

      const lowestPriceData = await lowestPriceResponse.json();
      const lowestPriceProviderData = lowestPriceData[provider] || {};
      
      console.log('Lowest price API response:', lowestPriceData);
      console.log(`Lowest price for ${provider}:`, lowestPriceProviderData);
      
      // Ensure we have a valid price, convert to string with 2 decimal places if it's a number
      let lowestPrice = '0.00';
      if (lowestPriceProviderData.lowest_price !== undefined && lowestPriceProviderData.lowest_price !== null) {
        const price = parseFloat(lowestPriceProviderData.lowest_price);
        lowestPrice = isNaN(price) ? '0.00' : price.toFixed(2);
      }
      
      console.log(`Formatted lowest price for ${provider}:`, lowestPrice);
      
      // Map the responses to match the expected stats structure
      const result = {
        totalRoutes: uniqueRoutesProviderData.unique_routes || 0,
        lowestPrice: lowestPrice,
        highestPrice: '0.00', // Will be updated when we implement highest price endpoint
        uniqueProviders: uniqueRoutesProviderData.sample_data?.length || 0,
        cheapestCarriers: [],
        transportTypes: transportTypes,
        sample_data: uniqueRoutesProviderData.sample_data || []
      };
      
      console.log(`Fetched stats for ${provider}:`, result);
      setCachedData(cacheKey, result);
      return { [provider]: result };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(`Error fetching ${provider} stats:`, err);
        return { [provider]: null, error: err.message };
      }
      return { [provider]: null };
    }
  };

  const fetchStats = useCallback(async () => {
    // Don't fetch if no metrics are selected
    if (selectedMetrics.length === 0) return;
    
    // Abort any in-progress fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedFroms?.length === 1) params.set('origin', selectedFroms[0]);
      if (selectedTos?.length === 1) params.set('destination', selectedTos[0]);
      if (selectedTransportTypes?.length === 1) params.set('transportType', selectedTransportTypes[0]);
      
      console.log('Fetching stats with params:', params.toString());
      
      // Only fetch what's needed based on selected metrics
      const fetchPromises = [];
      
      // Always fetch routes data as it's used for multiple metrics
      const routesPromise = fetch(`${API_BASE_URL}/api/metrics/unique-routes?${params}`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      fetchPromises.push(routesPromise);
      
      // Only fetch lowest price if the metric is selected
      let lowestPricePromise = Promise.resolve({ ok: true, json: () => ({}) });
      if (selectedMetrics.includes('lowestPrice')) {
        lowestPricePromise = fetch(`${API_BASE_URL}/api/metrics/lowest-price?${params}`, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
      }
      fetchPromises.push(lowestPricePromise);
      
      // Only fetch highest price if the metric is selected
      let highestPricePromise = Promise.resolve({ ok: true, json: () => ({}) });
      if (selectedMetrics.includes('highestPrice')) {
        highestPricePromise = fetch(`${API_BASE_URL}/api/metrics/highest-price?${params}`, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
      }
      fetchPromises.push(highestPricePromise);
      
      // Only fetch unique providers if the metric is selected
      let uniqueProvidersPromise = Promise.resolve({ ok: true, json: () => ({}) });
      if (selectedMetrics.includes('uniqueProviders')) {
        uniqueProvidersPromise = fetch(`${API_BASE_URL}/api/metrics/unique-providers?${params}`, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
      }
      fetchPromises.push(uniqueProvidersPromise);
      
      // Only fetch cheapest carriers if the metric is selected
      let cheapestCarriersPromise = Promise.resolve({ ok: true, json: () => ({}) });
      if (selectedMetrics.includes('cheapestCarriers')) {
        cheapestCarriersPromise = fetch(`${API_BASE_URL}/api/metrics/cheapest-carriers?${params}`, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
      }
      fetchPromises.push(cheapestCarriersPromise);
      
      // Only fetch transport types if the metric is selected
      let transportTypesPromise = Promise.resolve({ ok: true, json: () => ({}) });
      if (selectedMetrics.includes('transportTypes')) {
        transportTypesPromise = fetch(`${API_BASE_URL}/api/transport-types`, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
      }
      fetchPromises.push(transportTypesPromise);
      
      // Execute only the necessary API calls
      const [
        routesResponse, 
        lowestPriceResponse, 
        highestPriceResponse, 
        uniqueProvidersResponse,
        cheapestCarriersResponse,
        transportTypesResponse
      ] = await Promise.all(fetchPromises);

      // Check responses and parse JSON
      const routesData = await routesResponse.json();
      let lowestPriceData = {};
      let highestPriceData = {};
      let uniqueProvidersData = {};
      let cheapestCarriersData = {};
      let transportTypesData = {};
      
      // Process transport types response
      if (selectedMetrics.includes('transportTypes') && !transportTypesResponse.ok) {
        console.error('Error fetching transport types:', await transportTypesResponse.text());
        // Don't throw error, we'll just show N/A for this metric
      } else if (selectedMetrics.includes('transportTypes')) {
        transportTypesData = await transportTypesResponse.json();
        console.log('Transport types data:', transportTypesData);
      }
      
      if (selectedMetrics.includes('lowestPrice') && !lowestPriceResponse.ok) {
        throw new Error(`Error fetching lowest price: ${lowestPriceResponse.status}`);
      } else if (selectedMetrics.includes('lowestPrice')) {
        lowestPriceData = await lowestPriceResponse.json();
      }
      
      if (selectedMetrics.includes('highestPrice') && !highestPriceResponse.ok) {
        throw new Error(`Error fetching highest price: ${highestPriceResponse.status}`);
      } else if (selectedMetrics.includes('highestPrice')) {
        highestPriceData = await highestPriceResponse.json();
      }
      
      if (selectedMetrics.includes('uniqueProviders') && !uniqueProvidersResponse.ok) {
        console.error('Error fetching unique providers:', await uniqueProvidersResponse.text());
        // Don't throw error, we'll just show N/A for this metric
      } else if (selectedMetrics.includes('uniqueProviders')) {
        uniqueProvidersData = await uniqueProvidersResponse.json();
        console.log('Unique providers data:', uniqueProvidersData);
      }
      
      if (selectedMetrics.includes('cheapestCarriers') && !cheapestCarriersResponse.ok) {
        console.error('Error fetching cheapest carriers:', await cheapestCarriersResponse.text());
        // Don't throw error, we'll just show N/A for this metric
      } else if (selectedMetrics.includes('cheapestCarriers')) {
        cheapestCarriersData = await cheapestCarriersResponse.json();
        console.log('Cheapest carriers data:', cheapestCarriersData);
      }
      
      console.log('Routes data:', routesData);
      console.log('Lowest price data:', lowestPriceData);
      console.log('Highest price data:', highestPriceData);
      
      // Only update state if the request wasn't aborted
      if (!controller.signal.aborted) {
        // Process the data for both providers
        const combinedStats = {
          '12go': {
            totalRoutes: routesData['12go']?.unique_routes || 0,
            meanPrice: '0.00',
            lowestPrice: selectedMetrics.includes('lowestPrice') ? (lowestPriceData['12go']?.lowest_price?.toString() || 'N/A') : 'N/A',
            highestPrice: selectedMetrics.includes('highestPrice') ? (highestPriceData['12go']?.highest_price?.toString() || 'N/A') : 'N/A',
            medianPrice: '0.00',
            standardDeviation: '0.00',
            uniqueProviders: selectedMetrics.includes('uniqueProviders') ? (uniqueProvidersData['12go']?.unique_providers || 'N/A') : 'N/A',
            cheapestCarriers: selectedMetrics.includes('cheapestCarriers') ? (cheapestCarriersData['12go']?.carriers || []) : [],
            transportTypes: selectedMetrics.includes('transportTypes') ? (transportTypesData['12go']?.routes || 'N/A') : 'N/A',
            sample_data: routesData['12go']?.sample_data || []
          },
          'bookaway': {
            totalRoutes: routesData.bookaway?.unique_routes || 0,
            meanPrice: '0.00',
            lowestPrice: selectedMetrics.includes('lowestPrice') ? (lowestPriceData.bookaway?.lowest_price?.toString() || 'N/A') : 'N/A',
            highestPrice: selectedMetrics.includes('highestPrice') ? (highestPriceData.bookaway?.highest_price?.toString() || 'N/A') : 'N/A',
            medianPrice: '0.00',
            standardDeviation: '0.00',
            uniqueProviders: selectedMetrics.includes('uniqueProviders') ? (uniqueProvidersData.bookaway?.unique_providers || 'N/A') : 'N/A',
            cheapestCarriers: selectedMetrics.includes('cheapestCarriers') ? (cheapestCarriersData.bookaway?.carriers || []) : [],
            transportTypes: selectedMetrics.includes('transportTypes') ? (transportTypesData['bookaway']?.routes || 'N/A') : 'N/A',
            sample_data: routesData.bookaway?.sample_data || []
          }
        };
        
        console.log('Processed combined stats:', combinedStats);
        setStats(combinedStats);
        
        // Update cache for each provider
        if (routesData['12go']) setCachedData(generateCacheKey('12go'), combinedStats['12go']);
        if (routesData.bookaway) setCachedData(generateCacheKey('bookaway'), combinedStats['bookaway']);
      }
      
    } catch (err) {
      if (err.name !== 'AbortError' && !controller.signal.aborted) {
        console.error('Error fetching stats:', err);
        setError(`Failed to load statistics: ${err.message}. Please try again later.`);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [selectedMetrics.length, selectedFroms, selectedTos, selectedTransportTypes, generateCacheKey, setCachedData]);

  // Debounce and fetch data
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Triggering fetchStats with params:', {
        selectedMetrics,
        selectedFroms,
        selectedTos,
        selectedTransportTypes
      });
      fetchStats();
    }, DEBOUNCE_DELAY);
    
    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        console.log('Cleaning up previous fetch');
        abortControllerRef.current.abort();
      }
    };
    // We're explicitly listing all dependencies here to prevent unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMetrics, selectedFroms, selectedTos, selectedTransportTypes]);

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
    
    console.log('Rendering metrics table with stats:', stats);

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

    // Map of all possible metrics to their display values and click handlers
    const allMetrics = {
      'totalRoutes': { 
        label: 'Unique Routes', 
        isCurrency: false,
        isLoading: loadingMetrics['totalRoutes'],
        getValue: (provider) => stats[provider]?.totalRoutes || 0 
      },
      'meanPrice': { 
        label: 'Mean Price', 
        isCurrency: true,
        isLoading: loadingMetrics['meanPrice'],
        getValue: (provider) => stats[provider]?.meanPrice || '0.00'
      },
      'lowestPrice': { 
        label: 'Lowest Price', 
        isCurrency: true,
        isLoading: loadingMetrics['lowestPrice'],
        getValue: (provider) => stats[provider]?.lowestPrice || '0.00'
      },
      'highestPrice': { 
        label: 'Highest Price', 
        isCurrency: true,
        isLoading: loadingMetrics['highestPrice'],
        getValue: (provider) => stats[provider]?.highestPrice || '0.00'
      },
      'medianPrice': { 
        label: 'Median Price', 
        isCurrency: true,
        isLoading: loadingMetrics['medianPrice'],
        getValue: (provider) => stats[provider]?.medianPrice || '0.00'
      },
      'standardDeviation': { 
        label: 'Price Standard Deviation', 
        isCurrency: true,
        isLoading: loadingMetrics['standardDeviation'],
        getValue: (provider) => stats[provider]?.standardDeviation || '0.00'
      },
      'uniqueProviders': { 
        label: 'Number of Unique Providers', 
        isCurrency: false,
        isLoading: loadingMetrics['uniqueProviders'],
        getValue: (provider) => stats[provider]?.uniqueProviders || 0
      },
      'cheapestCarriers': { 
        label: 'Cheapest Carrier', 
        isCurrency: false,
        isLoading: loadingMetrics['cheapestCarriers'],
        getValue: (provider) => {
          const carriers = stats[provider]?.cheapestCarriers || [];
          return carriers.length > 0 ? carriers[0] : 'N/A';
        }
      },
      'transportTypes': {
        label: 'Available Transport Types',
        isCurrency: false,
        isLoading: loadingMetrics['transportTypes'] || false,
        getValue: (provider) => stats[provider]?.transportTypes || 'N/A'
      }
    };
    
    // Handle metric click
    const handleMetricClick = (metricName) => {
      if (onMetricClick) {
        onMetricClick(metricName);
      }
    };

    const handleViewRoutesClick = (provider) => {
      const params = new URLSearchParams();
      
      // Add current filters to the URL - using 'origin' and 'destination' instead of 'from' and 'to'
      if (selectedFroms?.length === 1) params.set('origin', selectedFroms[0]);
      if (selectedTos?.length === 1) params.set('destination', selectedTos[0]);
      if (selectedTransportTypes?.length === 1) params.set('transport_type', selectedTransportTypes[0]);
      
      // Set the provider, column and rows
      params.set('provider', provider);
      params.set('column', '1');
      params.set('columns', '1');
      params.set('rows', '1');
      
      // Use the selectedTimeline prop from the parent component
      params.set('timeline', selectedTimeline);
      
      console.log('Navigating with params:', params.toString());
      
      // Add view and tab parameters to the search params
      params.set('view', 'virtualize');
      params.set('tab', 'custom-dashboard');
      
      // Navigate to the root with all parameters
      navigate({
        pathname: '/',
        search: params.toString()
      }, { replace: true });
    };

    // Filter the metrics based on what's selected and ensure all required properties exist
    const tableData = selectedMetrics.map(metric => ({
      ...allMetrics[metric],
      key: metric,
      label: allMetrics[metric]?.label || metric,
      isLoading: allMetrics[metric]?.isLoading || false,
      isCurrency: allMetrics[metric]?.isCurrency || false,
      getValue: allMetrics[metric]?.getValue || ((provider) => stats[provider]?.[metric] || 'N/A')
    }));
    
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {/* Header */}
        <div className="grid grid-cols-3 bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Metric
          </div>
          <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            12Go
            {stats['12go']?.sample_data?.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {stats['12go'].sample_data.length} routes
              </span>
            )}
          </div>
          <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Bookaway
            {stats.bookaway?.sample_data?.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                {stats.bookaway.sample_data.length} routes
              </span>
            )}
          </div>
        </div>
        
        {/* Rows */}
        <div className="divide-y divide-gray-200">
          {tableData.map((metric, index) => {
            const isClickable = onMetricClick && !metric.isLoading;
            const value12go = metric.getValue ? metric.getValue('12go') : (stats['12go']?.[metric.key] ?? 'N/A');
            const valueBookaway = metric.getValue ? metric.getValue('bookaway') : (stats.bookaway?.[metric.key] ?? 'N/A');
            
            return (
              <div 
                key={index}
                className={`grid grid-cols-3 px-6 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isClickable ? 'cursor-pointer' : ''}`}
                onClick={() => isClickable && handleMetricClick(metric.label)}
              >
                <div className="text-sm font-medium text-gray-900">
                  {metric.label}
                  {metric.isLoading && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Loading...
                    </span>
                  )}
                </div>
                {metric.key === 'totalRoutes' ? (
                  <div className="flex items-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewRoutesClick('12go');
                      }}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors underline decoration-green-600"
                    >
                      {formatValue(value12go, metric.isCurrency)}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    {formatValue(value12go, metric.isCurrency)}
                  </div>
                )}
                {metric.key === 'totalRoutes' ? (
                  <div className="flex items-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewRoutesClick('bookaway');
                      }}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors underline decoration-green-600"
                    >
                      {formatValue(valueBookaway, metric.isCurrency)}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    {formatValue(valueBookaway, metric.isCurrency)}
                  </div>
                )}
              </div>
            );
          })}
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