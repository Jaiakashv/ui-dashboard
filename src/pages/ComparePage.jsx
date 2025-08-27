import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// Utility function to sort options with selected items first
const getSortedOptions = (allOptions, selectedValues) => {
  if (!selectedValues || selectedValues.length === 0) return allOptions;
  
  const selectedSet = new Set(selectedValues);
  const selected = allOptions.filter(option => selectedSet.has(option.value));
  const unselected = allOptions.filter(option => !selectedSet.has(option.value));
  
  return [...selected, ...unselected];
};
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import Sidebar from '../components/Sidebar';
import CmpSidebar from '../components/compare_components/cmp-sidebar';
import CompareTable from '../components/compare_components/CompareTable';
import RouteStatistics from '../components/compare_components/RouteStatistics';

// Define section items outside the component to avoid recreation
const sectionItems = {
  columns: [
    { id: 1, name: 'Websites' },
    { id: 2, name: 'Carriers', disabled: true },
    { id: 3, name: 'Transport Type', disabled: true }
  ],
  rows: [
    { id: 1, name: 'Unique Routes' },
    { id: 4, name: 'Lowest Price' },
    { id: 5, name: 'Highest Price' },
    { id: 8, name: 'No of Unique Providers' },
    { id: 9, name: 'Cheapest Carriers' },
    { id: 11, name: 'Available Transport Types' }
  ]
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const ComparePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const view = searchParams.get('view') || '';
  
  const provider = searchParams.get('provider') || '';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFroms, setSelectedFroms] = useState([]);
  const [selectedTos, setSelectedTos] = useState([]);
  const [selectedTransportTypes, setSelectedTransportTypes] = useState([]);
  const [data, setData] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState({});

  // Fetch provider stats
  const fetchProviderStats = async () => {
    try {
      console.log('Fetching unique routes from:', `${API_BASE_URL}/api/metrics/unique-routes`);
      const response = await axios.get(`${API_BASE_URL}/api/metrics/unique-routes`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Received response from unique-routes endpoint:', response.data);
      
      if (!response.data) {
        console.error('Empty response from unique-routes endpoint');
        return null;
      }
      
      const data = response.data;
      const result = {
        '12go': {
          unique_routes: data['12go']?.unique_routes || 0,
          table_exists: data['12go']?.table_exists || false,
          sample_data: data['12go']?.sample_data || []
        },
        'bookaway': {
          unique_routes: data.bookaway?.unique_routes || 0,
          table_exists: data.bookaway?.table_exists || false,
          sample_data: data.bookaway?.sample_data || []
        },
        timestamp: data.timestamp || new Date().toISOString()
      };
      
      console.log('Processed provider stats:', result);
      return result;
      
    } catch (err) {
      console.error('Error fetching provider stats:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          timeout: err.config?.timeout
        }
      });
      return null;
    }
  };

  // Fetch individual stat (kept for backward compatibility)
  const fetchStat = async (endpoint) => {
    try {
      const cleanEndpoint = endpoint.endsWith('?') ? endpoint.slice(0, -1) : endpoint;
      const hasParams = cleanEndpoint.includes('?');
      
      // Handle unique routes specially
      if (cleanEndpoint.startsWith('unique-routes')) {
        const provider = cleanEndpoint.includes('provider=') 
          ? cleanEndpoint.split('provider=')[1] 
          : '12go';
        const response = await axios.get(`${API_BASE_URL}/api/metrics/unique-routes?provider=${provider}`);
        return { count: response.data.unique_routes || 0 };
      }
      
      // Fall back to old endpoint for other stats
      const url = `${API_BASE_URL}/api/stats/routes/${cleanEndpoint}${hasParams ? '&' : '?'}provider=12go`;
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      // Return default values based on the endpoint
      if (endpoint.includes('unique-routes')) {
        return { count: 0 };
      }
      return null;
    }
  };

  // Fetch route statistics
  const fetchRouteStats = useCallback(async (metric = null) => {
    try {
      console.log('Starting to fetch route stats...');
      setLoading(true);
      
      // Fetch stats from the new endpoints
      console.log('Fetching provider stats...');
      const providerStats = await fetchProviderStats();
      
      if (providerStats) {
        // Get the current provider from URL or default to '12go'
        const currentProvider = provider || '12go';
        const currentProviderData = providerStats[currentProvider] || {};
        
        const combinedStats = {
          ...providerStats,
          totalRoutes: currentProviderData.unique_routes || 0,
          meanPrice: '0.00',
          lowestPrice: '0.00',
          highestPrice: '0.00',
          medianPrice: '0.00',
          standardDeviation: '0.00',
          uniqueProviders: currentProviderData.sample_data?.length || 0,
          cheapestCarriers: [],
          routes: selectedTransportTypes.join(', ') || 'All',
          sample_data: currentProviderData.sample_data || []
        };
        
        console.log('Combined stats to be set:', combinedStats);
        setStats(combinedStats);
        setError(null);
        return combinedStats;
      }
      
      // Fallback to the old implementation if new endpoint fails
      const params = new URLSearchParams();
      if (selectedFroms.length > 0) params.append('from', selectedFroms[0]);
      if (selectedTos.length > 0) params.append('to', selectedTos[0]);
      if (selectedTransportTypes.length > 0) params.append('transportType', selectedTransportTypes[0]);
      
      const queryString = params.toString();
      
      if (metric) {
        const metricEndpoint = metric.toLowerCase().replace(/\s+/g, '');
        const result = await fetchStat(`${metricEndpoint}?${queryString}`);
        
        const metricMap = {
          'unique routes': { totalRoutes: result?.count || 0 },
          'mean price average': { meanPrice: result?.mean || '0.00' },
          'lowest price': { lowestPrice: result?.min || '0.00' },
          'highest price': { highestPrice: result?.max || '0.00' },
          'median price': { medianPrice: result?.median || '0.00' },
          'standard deviation': { standardDeviation: result?.stddev || '0.00' },
          'no of unique providers': { uniqueProviders: result?.count || 0 },
          'cheapest carriers': { cheapestCarriers: result?.carriers || [] },
          'routes': { routes: selectedTransportTypes.join(', ') || 'All' }
        };
        
        const updatedStats = { ...stats, ...metricMap[metric.toLowerCase()] };
        setStats(updatedStats);
        setError(null);
        return updatedStats;
      }
      
      const [
        total, 
        mean, 
        min, 
        max, 
        median, 
        stddev, 
        unique, 
        cheapest
      ] = await Promise.all([
        fetchStat(`total?${queryString}`),
        fetchStat(`meanprice?${queryString}`),
        fetchStat(`lowestprice?${queryString}`),
        fetchStat(`highestprice?${queryString}`),
        fetchStat(`medianprice?${queryString}`),
        fetchStat(`standarddeviation?${queryString}`),
        fetchStat(`uniqueproviders?${queryString}`),
        fetchStat(`cheapestcarriers?${queryString}`)
      ]);

      const combinedStats = {
        totalRoutes: total?.count || 0,
        meanPrice: mean?.mean || '0.00',
        lowestPrice: min?.min || '0.00',
        highestPrice: max?.max || '0.00',
        medianPrice: median?.median || '0.00',
        standardDeviation: stddev?.stddev || '0.00',
        uniqueProviders: unique?.count || 0,
        cheapestCarriers: cheapest?.carriers || [],
        routes: selectedTransportTypes.join(', ') || 'All'
      };
    } catch (err) {
      console.error('Error fetching route statistics:', err);
      setError('Failed to load route statistics. Please try again later.');
      throw err; // Re-throw to allow error handling in the caller
    } finally {
      setLoading(false);
    }
  }, [selectedFroms, selectedTos, selectedTransportTypes]);

  // Get transformed data from stats
  const getTransformedData = useCallback((stats) => {
    if (!stats) {
      console.log('No stats provided to transform');
      return [];
    }
    
    // Get the current provider from URL or default to '12go'
    const currentProvider = provider || '12go';
    const providerData = stats[currentProvider] || {};
    
    console.log('Transforming data for provider:', currentProvider, 'Provider data:', providerData);
    console.log('All stats:', stats);
    
    return [{
      id: 1,
      name: 'Unique Routes',
      value: providerData.unique_routes || 0
    }, {
      id: 2,
      name: 'Mean Price Average',
      value: stats.meanPrice || '0.00'
    }, {
      id: 3,
      name: 'Lowest Price',
      value: stats.lowestPrice || '0.00'
    }, {
      id: 4,
      name: 'Highest Price',
      value: stats.highestPrice || '0.00'
    }, {
      id: 5,
      name: 'Median Price',
      value: stats.medianPrice || '0.00'
    }, {
      id: 6,
      name: 'Standard Deviation',
      value: stats.standardDeviation || '0.00'
    }, {
      id: 7,
      name: 'No of Unique Providers',
      value: stats.uniqueProviders || 0
    }, {
      id: 8,
      name: 'Cheapest Carriers',
      value: stats.cheapestCarriers ? stats.cheapestCarriers.join(', ') : 'N/A'
    }, {
      id: 9,
      name: 'Routes',
      value: stats.routes || 'All'
    }];
  }, [provider]);

  // Update data when stats or provider changes
  useEffect(() => {
    if (stats) {
      console.log('Stats updated, transforming data...');
      const currentProvider = provider || '12go';
      const providerData = stats[currentProvider] || {};
      console.log(`Processing data for ${currentProvider}:`, providerData);
      
      const transformedData = getTransformedData(stats);
      console.log('Transformed data:', transformedData);
      
      setData(transformedData);
    } else {
      // Initialize with default values if no stats yet
      setData(sectionItems.rows.map(row => ({
        id: row.id,
        name: row.name,
        value: 'Loading...'
      })));
    }
  }, [stats]);

  // Handle metric click - fetch only the clicked metric
  const handleMetricClick = useCallback((metricName) => {
    // Don't fetch data for these static metrics
    if (['Routes'].includes(metricName)) return;
    
    // Check if we already have this metric's data
    const metricData = data.find(item => item.name.toLowerCase() === metricName.toLowerCase());
    if (!metricData || metricData.value === '0.00' || metricData.value === 0 || metricData.value === 'Click to load') {
      // Set loading state for this metric
      setLoadingMetrics(prev => ({
        ...prev,
        [metricName]: true
      }));
      
      // Fetch the metric data
      fetchRouteStats(metricName).finally(() => {
        setLoadingMetrics(prev => ({
          ...prev,
          [metricName]: false
        }));
      });
    }
  }, [data, fetchRouteStats]);


  const handleViewSelect = (viewType) => {
    if (viewType === 'data' && provider) {
      navigate(`/?view=data&provider=${provider}`);
    } else if (viewType === 'virtualize') {
      navigate(`/?view=virtualize`);
    }
  };

  const handleVirtualizeViewSelect = (viewId) => {
    if (viewId === 'compare') {
      navigate('/compare');
    } else {
      navigate(`/?view=virtualize&tab=${viewId}`);
    }
  };

  const handleProviderSelect = (provider) => {
    navigate(`/?view=data&provider=${provider}`);
  };

  const formatDateLocal = useCallback((date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []); 

  const safeParseDate = useCallback((dateString) => {
    if (!dateString) return null;
    if (typeof dateString !== 'string') return null;
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }, []);

  const [selectedTimeline, setSelectedTimeline] = useState('Last 14 Days');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [transportTypeSuggestions, setTransportTypeSuggestions] = useState([
    { transport_type: 'bus', label: 'Bus' },
    { transport_type: 'ferry', label: 'Ferry' },
    { transport_type: 'train', label: 'Train' },
    { transport_type: 'flight', label: 'Flight' },
    {transport_type: 'avia', label: 'Avia'}
  ]);
  const [operatorSuggestions, setOperatorSuggestions] = useState([]);
  const [allFilters, setAllFilters] = useState({
    origin: [],
    destination: [],
    transport_type: [],
    operator_name: []
  });
  const [isLoadingFrom, setIsLoadingFrom] = useState(false);
  const [isLoadingTo, setIsLoadingTo] = useState(false);
  const [isLoadingTransportType, setIsLoadingTransportType] = useState(false);
  const [isLoadingOperator, setIsLoadingOperator] = useState(false);

  // Helper function to combine API results
  const combineApiResults = (goResponse, awayResponse) => {
    const results = [
      ...(goResponse?.data?.results || []).map(item => ({ ...item, provider: '12go' })),
      ...(awayResponse?.data?.results || []).map(item => ({ ...item, provider: 'bookaway' }))
    ];
    console.log('Combined results:', results);
    return results;
  };

  // Group results by a specific key and count unique routes
  const groupResults = (results, key) => {
    return results.reduce((acc, item) => {
      const value = item[key];
      if (!value) return acc; // Skip if no value for the key
      
      if (!acc[value]) {
        acc[value] = {
          [key]: value,
          routes: new Set(),
          providers: new Set(),
          destinations: new Set()
        };
      }
      
      // Add unique route
      if (item.destination && item.transport_type) {
        acc[value].routes.add(`${item.origin}-${item.destination}-${item.transport_type}`);
      }
      
      // Add provider
      if (item.provider) {
        acc[value].providers.add(item.provider);
      }
      
      // Add unique destinations
      if (item.destination) {
        acc[value].destinations.add(item.destination);
      }
      
      return acc;
    }, {});
  };

  // Format grouped results into suggestion format
  const formatGroupedResults = (groupedResults, key) => {
    return Object.values(groupedResults)
      .sort((a, b) => b.routes.size - a.routes.size)
      .map(item => ({
        [key]: item[key],
        routes_count: item.routes.size,
        destinations_count: item.destinations.size,
        providers: Array.from(item.providers).join(', '),
        label: `${item[key]} (${item.routes.size} routes, ${item.destinations.size} destinations)`,
        value: item[key]
      }));
  };

  // Fetch destination suggestions with routes count
  const fetchToSuggestions = async (query) => {
    // Return all destinations if no query
    if (!query) return allFilters.destination || [];
    
    // Don't search for very short queries, return all matching from local filters
    if (query.length < 2) {
      return allFilters.destination?.filter(item => 
        (item.destination || '').toLowerCase().includes(query.toLowerCase()) ||
        (item.label || '').toLowerCase().includes(query.toLowerCase())
      ) || [];
    }
    
    setIsLoadingTo(true);
    
    try {
      // Search in both providers
      const [goResponse, awayResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/12go/search?field=destination&q=${encodeURIComponent(query)}`),
        axios.get(`${API_BASE_URL}/api/bookaway/search?field=destination&q=${encodeURIComponent(query)}`)
      ]);

      // Combine results from both providers
      const results = [
        ...(goResponse.data?.results || []).map(item => ({ ...item, provider: '12go' })),
        ...(awayResponse.data?.results || []).map(item => ({ ...item, provider: 'bookaway' }))
      ];

      if (results.length === 0) {
        console.log('No destination results found for query:', query);
        return [];
      }

      // Group by destination and count unique routes
      const groupedResults = results.reduce((acc, item) => {
        const destination = item.destination;
        if (!destination) return acc; // Skip if no destination
        
        if (!acc[destination]) {
          acc[destination] = {
            destination,
            routes: new Set(),
            providers: new Set(),
            origins: new Set()
          };
        }
        
        // Add unique route
        if (item.origin && item.transport_type) {
          acc[destination].routes.add(`${item.origin}-${item.destination}-${item.transport_type}`);
        }
        
        // Add provider
        if (item.provider) {
          acc[destination].providers.add(item.provider);
        }
        
        // Add unique origins
        if (item.origin) {
          acc[destination].origins.add(item.origin);
        }
        
        return acc;
      }, {});

      // Format the results with counts
      const formattedResults = Object.values(groupedResults)
        .sort((a, b) => b.routes.size - a.routes.size) // Sort by number of routes descending
        .map(item => ({
          destination: item.destination,
          routes_count: item.routes.size,
          origins_count: item.origins.size,
          providers: Array.from(item.providers).join(', '),
          label: `${item.destination} (${item.routes.size} routes, ${item.origins.size} origins)`,
          value: item.destination
        }));

      console.log('Destination suggestions:', formattedResults);
      return formattedResults;
      
    } catch (error) {
      console.error('Error fetching destination suggestions:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return [];
    } finally {
      setIsLoadingTo(false);
    }
  };

  // Fetch origin suggestions with routes count
  const fetchFromSuggestions = async (query) => {
    // Return all origins if no query
    if (!query) return allFilters.origin || [];
    
    // For short queries, filter local suggestions
    if (query.length < 2) {
      return allFilters.origin?.filter(item => 
        (item.origin || '').toLowerCase().includes(query.toLowerCase()) ||
        (item.label || '').toLowerCase().includes(query.toLowerCase())
      ) || [];
    }
    
    setIsLoadingFrom(true);
    
    try {
      // Search in both providers
      const [goResponse, awayResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/12go/search?field=origin&q=${encodeURIComponent(query)}`),
        axios.get(`${API_BASE_URL}/api/bookaway/search?field=origin&q=${encodeURIComponent(query)}`)
      ]);
      
      // Process 12go response
      const goResults = goResponse.data?.results || goResponse.data || [];
      const goOrigins = Array.isArray(goResults) ? goResults : [];
      
      // Process Bookaway response
      const awayResults = awayResponse.data?.results || awayResponse.data || [];
      const awayOrigins = Array.isArray(awayResults) ? awayResults : [];
      
      // Combine and deduplicate origins
      const originMap = new Map();
      
      // Add all origins to the map
      [...goOrigins, ...awayOrigins].forEach(item => {
        const origin = item.origin || item.value || item;
        const label = item.label || origin;
        
        if (!originMap.has(origin)) {
          originMap.set(origin, {
            origin,
            label,
            routes: new Set(),
            destinations: new Set(),
            providers: new Set()
          });
        }
        
        const originData = originMap.get(origin);
        if (item.routes_count) originData.routes.add(item.routes_count);
        if (item.destination) originData.destinations.add(item.destination);
        if (item.provider) originData.providers.add(item.provider);
      });
      
      // Convert map to array and format results
      const formattedResults = Array.from(originMap.values()).map(item => ({
        ...item,
        routes_count: item.routes.size,
        destinations_count: item.destinations.size,
        destinations: Array.from(item.destinations).join(', '),
        providers: Array.from(item.providers).join(', '),
        label: `${item.origin} (${item.routes.size} routes, ${item.destinations.size} destinations)`,
        value: item.origin
      }));
      
      console.log('Origin suggestions:', formattedResults);
      return formattedResults;
      
    } catch (error) {
      console.error('Error fetching origin suggestions:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return [];
    } finally {
      setIsLoadingFrom(false);
    }
  };

  // Fetch transport type suggestions
  const fetchTransportTypeSuggestions = async (query) => {
    // Return all transport types for empty or short queries
    if (!query || query.length < 2) {
      return allFilters.transport_type || [];
    }
    
    setIsLoadingTransportType(true);
    console.log('Fetching transport types for query:', query);
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/12go/search?field=transport_type&q=${encodeURIComponent(query)}`,
        { timeout: 5000 }
      );
      
      console.log('Transport type API response:', response.data);
      
      // Handle different response formats
      const apiResults = response.data?.results || response.data || [];
      if (!Array.isArray(apiResults)) {
        console.error('Unexpected transport type response format:', apiResults);
        return defaultTransportTypes;
      }
      
      // Format API results and combine with default types
      const formattedApiResults = apiResults.map(item => ({
        transport_type: item.transport_type || item.value || item,
        label: item.label || item.transport_type || item.value || item
      }));
      
      // Combine default and API results, removing duplicates
      const allResults = [
        ...defaultTransportTypes,
        ...formattedApiResults.filter(
          apiItem => !defaultTransportTypes.some(
            defaultItem => defaultItem.transport_type === apiItem.transport_type
          )
        )
      ];
      
      return allResults;
      
    } catch (error) {
      console.error('Error fetching transport type suggestions:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return [];
    } finally {
      setIsLoadingTransportType(false);
    }
  };

  // Handle transport type filter with debouncing
  const onTransportTypeFilter = useCallback(async (event) => {
    const query = event.filter?.trim();
    
    // For empty or short queries, show all transport types
    if (!query || query.length < 2) {
      setTransportTypeSuggestions(allFilters.transport_type || []);
      return;
    }
    
    // First try local filter
    const localResults = allFilters.transport_type.filter(item => 
      item.transport_type?.toLowerCase().includes(query.toLowerCase()) ||
      item.label?.toLowerCase().includes(query.toLowerCase())
    );
    
    if (localResults.length > 0) {
      setTransportTypeSuggestions(localResults);
      return;
    }
    
    // If no local results, try API
    try {
      const results = await fetchTransportTypeSuggestions(query);
      setTransportTypeSuggestions(Array.isArray(results) ? results : (allFilters.transport_type || []));
    } catch (error) {
      console.error('Error in onTransportTypeFilter:', error);
      setTransportTypeSuggestions(allFilters.transport_type || []);
    }
  }, [fetchTransportTypeSuggestions, allFilters.transport_type]);

  // Fetch operator suggestions
  const fetchOperatorSuggestions = async (query) => {
    if (!query || query.length < 2) return [];
    setIsLoadingOperator(true);
    
    try {
      // First try local filter
      const localResults = filterLocalSuggestions(allFilters.operator_name, query, 'operator_name');
      if (localResults.length > 0) return localResults;
      
      // Fallback to API if no local matches
      const response = await axios.get(
        `${API_BASE_URL}/api/12go/search?field=operator_name&q=${encodeURIComponent(query)}`,
        { timeout: 5000 }
      );
      
      const results = response.data?.results || response.data || [];
      if (!Array.isArray(results)) return [];
      
      return results.map(item => ({
        operator_name: item.operator_name || item.value || item,
        label: item.label || item.operator_name || item.value || item
      }));
      
    } catch (error) {
      console.error('Error in fetchOperatorSuggestions:', error);
      return [];
    } finally {
      setIsLoadingOperator(false);
    }
  };

  // Handle origin filter with debouncing
  const onFromFilter = useCallback(async (event) => {
    const query = event.filter?.trim();
    // Always show suggestions, even without query
    if (!query) {
      setFromSuggestions(allFilters.origin);
      return;
    }
    
    try {
      const results = await fetchFromSuggestions(query);
      setFromSuggestions(Array.isArray(results) ? results : allFilters.origin);
    } catch (error) {
      console.error('Error in fetchFromSuggestions:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setFromSuggestions(allFilters.origin || []);
    }
  }, [fetchFromSuggestions]);
  
  // Handle destination filter with debouncing
  const onToFilter = useCallback(async (event) => {
    const query = event.filter?.trim();
    // Always show suggestions, even without query
    if (!query) {
      setToSuggestions(allFilters.destination);
      return;
    }
    
    try {
      const results = await fetchToSuggestions(query);
      setToSuggestions(Array.isArray(results) ? results : allFilters.destination);
    } catch (error) {
      console.error('Error in fetchToSuggestions:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setToSuggestions(allFilters.destination || []);
    }
  }, [fetchToSuggestions, allFilters.destination]);
  
  // Initialize filters on component mount
  useEffect(() => {
    const initializeFilters = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/filters`,
          { timeout: 10000 }
        );
        
        const { origin, destination, transport_type, operator_name } = response.data;
        
        // Update all filters state
        setAllFilters({
          origin: origin.split(',').filter(Boolean).map(item => ({
            origin: item.trim(),
            label: item.trim()
          })),
          destination: destination.split(',').filter(Boolean).map(item => ({
            destination: item.trim(),
            label: item.trim()
          })),
          transport_type: transport_type.split(',').filter(Boolean).map(item => ({
            transport_type: item.trim(),
            label: item.trim().charAt(0).toUpperCase() + item.trim().slice(1)
          })),
          operator_name: operator_name.split(',').filter(Boolean).map(item => ({
            operator_name: item.trim(),
            label: item.trim()
          }))
        });
        
        // Set initial suggestions
        setFromSuggestions(origin.split(',').filter(Boolean).map(item => ({
          origin: item.trim(),
          label: item.trim()
        })));
        
        // Set initial transport type suggestions
        setTransportTypeSuggestions(transport_type.split(',').filter(Boolean).map(item => ({
          transport_type: item.trim(),
          label: item.trim().charAt(0).toUpperCase() + item.trim().slice(1)
        })));
        
        setToSuggestions(destination.split(',').filter(Boolean).map(item => ({
          destination: item.trim(),
          label: item.trim()
        })));
        
        setOperatorSuggestions(operator_name.split(',').filter(Boolean).map(item => ({
          operator_name: item.trim(),
          label: item.trim()
        })));
        
      } catch (error) {
        console.error('Error initializing filters:', error);
      }
    };
    
    initializeFilters();
  }, []);

  // Handle operator filter with debouncing
  const onOperatorFilter = useCallback(async (event) => {
    const query = event.filter?.trim();
    if (!query || query.length < 2) {
      setOperatorSuggestions([]);
      return;
    }
    
    try {
      const results = await fetchOperatorSuggestions(query);
      setOperatorSuggestions(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error('Error in onOperatorFilter:', error);
      setOperatorSuggestions([]);
    }
  }, [fetchOperatorSuggestions]);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [customRange, setCustomRange] = useState(null);
  const [selectedDateField, setSelectedDateField] = useState('');

  const [selectedColumn, setSelectedColumn] = useState(1); 
  const [selectedColumns, setSelectedColumns] = useState([sectionItems.columns[0]]);
  // Initialize with only 'totalRoutes' selected by default (row ID 1)
  const [selectedRows, setSelectedRows] = useState([1]);
  const [selectedMetric, setSelectedMetric] = useState('totalRoutes'); // Default to 'Total Route'
  const [isComparing, setIsComparing] = useState(false);

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();

    if (selectedFroms.length > 0) params.set('from', selectedFroms.join(','));
    if (selectedTos.length > 0) params.set('to', selectedTos.join(','));
    if (selectedTransportTypes.length > 0) params.set('transport', selectedTransportTypes.join(','));
    if (selectedOperators.length > 0) params.set('operator', selectedOperators.join(','));

    // Handle date parameters
    if (selectedTimeline === 'Custom' && customRange) {
      if (Array.isArray(customRange)) {
        if (customRange[0] && !customRange[1]) {
          // Single date selection
          const selectedDate = formatDate(customRange[0]);
          params.set('startDate', selectedDate);
          params.set('endDate', selectedDate);
        } else if (customRange[0] && customRange[1]) {
          // Date range selection
          params.set('startDate', formatDate(customRange[0]));
          params.set('endDate', formatDate(new Date(customRange[1].getTime() + 24 * 60 * 60 * 1000 - 1)));
        }
      }
    }
    if (selectedColumn) params.set('column', selectedColumn);
    if (selectedColumns.length > 0) {
      params.set('columns', selectedColumns.map(col => col.id).join(','));
    }
    if (selectedRows.length > 0) {
      params.set('rows', selectedRows.map(row => row).join(','));
    }

    navigate(`?${params.toString()}`, { replace: true });
  }, [
    selectedTimeline,
    selectedFroms,
    selectedTos,
    selectedTransportTypes,
    selectedOperators,
    customRange,
    selectedDateField,
    selectedColumn,
    selectedColumns,
    selectedRows,
    navigate,
    formatDateLocal 
  ]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let hasFilters = false;

    if (params.has('timeline')) {
      setSelectedTimeline(params.get('timeline'));
      hasFilters = true;
    }
    if (params.has('from') && params.get('from')) {
      setSelectedFroms(params.get('from').split(','));
      hasFilters = true;
    }
    if (params.has('to') && params.get('to')) {
      setSelectedTos(params.get('to').split(','));
      hasFilters = true;
    }
    if (params.has('transport') && params.get('transport')) {
      setSelectedTransportTypes(params.get('transport').split(','));
      hasFilters = true;
    }
    if (params.has('operator') && params.get('operator')) {
      setSelectedOperators(params.get('operator').split(','));
      hasFilters = true;
    }
    if (params.has('startDate') && params.has('endDate')) {
      const s = safeParseDate(params.get('startDate'));
      const e = safeParseDate(params.get('endDate'));
      if (s && e) {
        setCustomRange([s, e]);
        hasFilters = true;
      }
    }
    if (params.has('dateField')) {
      setSelectedDateField(params.get('dateField'));
      hasFilters = true;
    }

    // Sidebar selections from URL
    if (params.has('column')) {
      const columnId = parseInt(params.get('column'), 10);
      const column = sectionItems.columns.find(item => item.id === columnId);
      if (column) setSelectedColumn(columnId);
    }

    if (params.has('columns')) {
      const columnIds = params.get('columns').split(',').map(id => parseInt(id, 10));
      const columns = columnIds
        .map(id => sectionItems.columns.find(col => col.id === id))
        .filter(Boolean);
      if (columns.length > 0) setSelectedColumns(columns);
    }

    if (params.has('rows')) {
      const rowIds = params.get('rows').split(',').map(id => parseInt(id, 10));
      const rows = rowIds
        .map(id => sectionItems.rows.find(row => row.id === id))
        .filter(Boolean);
      if (rows.length > 0) {
        setSelectedRows(rows.map(row => row.id));
      } else {
        // If no valid rows in URL, default to showing only 'totalRoutes' (ID: 1)
        setSelectedRows([1]);
      }
    } else {
      // If no rows parameter in URL, default to showing only 'totalRoutes' (ID: 1)
      setSelectedRows([1]);
    }

    if (hasFilters) {
      const timer = setTimeout(() => {
        setIsComparing(true);
      }, 100);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Update URL whenever relevant state changes
  useEffect(() => {
    // Only update URL if we're not in the middle of initializing from URL params
    if (location.search) {
      const params = new URLSearchParams(location.search);
      const currentParams = new URLSearchParams();
      
      // Rebuild the current URL state to compare
      if (selectedTimeline) currentParams.set('timeline', selectedTimeline);
      if (selectedFroms.length) currentParams.set('from', selectedFroms.join(','));
      if (selectedTos.length) currentParams.set('to', selectedTos.join(','));
      if (selectedTransportTypes.length) currentParams.set('transport', selectedTransportTypes.join(','));
      if (selectedOperators.length) currentParams.set('operator', selectedOperators.join(','));
      if (selectedDateField) currentParams.set('dateField', selectedDateField);
      
      // Only update if the URL would actually change to prevent loops
      if (params.toString() !== currentParams.toString()) {
        updateURL();
      }
    } else {
      updateURL();
    }
  }, [
    selectedTimeline,
    selectedFroms,
    selectedTos,
    selectedTransportTypes,
    selectedOperators,
    customRange,
    selectedDateField,
    selectedColumn,
    selectedColumns,
    selectedRows,
    updateURL,
    location.search
  ]);

  // Format date to YYYY-MM-DD in local timezone
  const formatDate = (date) => {
    const d = new Date(date);
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    return localDate.toISOString().split('T')[0];
  };

  const getDateRange = useCallback(() => {
    const presets = {
      'Today': () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start, end };
      },
      'Tomorrow': () => {
        const start = new Date();
        start.setDate(start.getDate() + 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      },
      'Next 7 Days': () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      },
      'Next 14 Days': () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() + 14);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      },
      'This Month': () => {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      },
      'This Year': () => {
        const start = new Date();
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
    };

    if (selectedTimeline === 'Custom' && customRange) {
      // Handle both single date and date range
      if (Array.isArray(customRange)) {
        if (customRange[0] && !customRange[1]) {
          // Single date selection
          const selectedDate = new Date(customRange[0]);
          const formattedDate = formatDate(selectedDate);
          const start = new Date(formattedDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(formattedDate);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        } else if (customRange[0] && customRange[1]) {
          // Date range selection
          const startDate = formatDate(customRange[0]);
          const endDate = formatDate(new Date(customRange[1].getTime() + 24 * 60 * 60 * 1000 - 1));
          
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
      }
      return { start: null, end: null };
    }

    const rangeFn = presets[selectedTimeline];
    return rangeFn ? rangeFn() : { start: null, end: null };
  }, [selectedTimeline, customRange]);
  const filterDataByDateRange = (dataList) => {
    if (!dataList || !Array.isArray(dataList)) return [];

    const { start, end } = getDateRange();
    if (!start || !end) return dataList;

    return dataList.filter(item => {
      if (!item || !item['Date']) return false;
      const itemDate = safeParseDate(item['Date']);
      if (!itemDate) return false;

      const itemTime = itemDate.getTime();
      const startTime = start.getTime();
      const endTime = end.getTime();

      return itemTime >= startTime && itemTime <= endTime;
    });
  };


  const getFilteredData = useCallback(() => {
    if (!data || !Array.isArray(data)) return [];

    let filtered = filterDataByDateRange(data);

    // Transport type filter
    if (selectedTransportTypes.length > 0) {
      filtered = filtered.filter(item =>
        selectedTransportTypes.some(type =>
          item['Transport Type']?.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    // From/To filters
    if (selectedFroms.length > 0) {
      filtered = filtered.filter(item =>
        selectedFroms.includes(item['From'])
      );
    }
    if (selectedTos.length > 0) {
      filtered = filtered.filter(item =>
        selectedTos.includes(item['To'])
      );
    }

    return filtered;
  }, [data, selectedTransportTypes, selectedFroms, selectedTos, selectedTimeline, customRange]);

  // Fetch route statistics
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await fetchRouteStats();
      if (stats) {
        const transformedData = getTransformedData(stats);
        setData(transformedData);
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [fetchRouteStats, getTransformedData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear all filters function
  const clearAllFilters = useCallback(() => {
    // Reset all filter states to default
    setSelectedTimeline('Last 14 Days');
    setSelectedFroms([]);
    setSelectedTos([]);
    setSelectedTransportTypes([]);
    setSelectedOperators([]);
    setCustomRange(null);
    setSelectedDateField('');
    
    // Update URL parameters
    const params = new URLSearchParams();
    params.set('timeline', 'Last 14 Days');
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, []);
  const dateFieldOptions = [
    { label: 'Departure Time', value: 'Departure Time' },
    { label: 'Arrival Time', value: 'Arrival Time' },
    { label: 'Booking Date', value: 'Booking Date' }
  ];

  const runQuery = useCallback(() => {
    if (selectedRows.length === 0) {
      setError('Please select at least one row to compare');
      return;
    }
    setIsComparing(true);
  }, [selectedRows]);

  const memoizedSectionItems = useMemo(() => sectionItems, []);

  useEffect(() => {
    const column = memoizedSectionItems.columns.find(col => col.id === selectedColumn);
    if (column) {
      setSelectedColumns([column]);
    }
  }, [selectedColumn, memoizedSectionItems.columns]);

  // Map of row IDs to metric keys
  const rowIdToMetric = {
    1: 'totalRoutes',
    2: 'meanPrice',
    4: 'lowestPrice',
    5: 'highestPrice',
    6: 'medianPrice',
    7: 'standardDeviation',
    8: 'uniqueProviders',
    9: 'cheapestCarriers',
    10: 'routes'
  };

  const selectedRowsData = useMemo(() => {
    return sectionItems.rows.filter(row => selectedRows.includes(row.id));
  }, [selectedRows, sectionItems.rows]);

  const handleRowSelectionChange = useCallback((rowIds) => {
    setSelectedRows(rowIds);
    // If a single row is selected, update the selected metric
    if (rowIds.length === 1) {
      const metric = rowIdToMetric[rowIds[0]];
      if (metric) {
        setSelectedMetric(metric);
      }
    } else {
      setSelectedMetric(null);
    }
  }, [memoizedSectionItems.rows]);

  // Ensure all rows are selected when component mounts
  useEffect(() => {
    setSelectedRows([...memoizedSectionItems.rows.map(row => row.id)]);
  }, [memoizedSectionItems.rows]);

  const handleColumnChange = useCallback((columnId) => {
    setSelectedColumn(columnId);
  }, []);

  const handleDateFieldChange = (e) => {
    setSelectedDateField(e.value);
  };

  const getFieldSuggestions = (field) => {
    if (!data || !Array.isArray(data)) return [];
    const values = new Set();
    data.forEach(item => {
      if (item[field]) values.add(item[field]);
    });
    return Array.from(values).sort();
  };

  const filteredData = useMemo(() => {
    return getFilteredData();
  }, [getFilteredData]);

  return (
    <div className="compare-page bg-gray-50 min-h-screen flex">
      {/* Main Navigation Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar 
          onProviderSelect={handleProviderSelect}
          onViewSelect={handleViewSelect}
          onVirtualizeViewSelect={handleVirtualizeViewSelect}
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top padding to account for fixed header */}
        <div className="pt-16">
          <div className="flex h-full">
            {/* Comparison Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
              <CmpSidebar
                onRowSelectionChange={handleRowSelectionChange}
                onColumnChange={handleColumnChange}
                selectedColumn={selectedColumn}
                sectionItems={memoizedSectionItems}
                selectedRows={selectedRows}
                onRowSelect={(rows) => {
                  setSelectedRows(rows);
                  // Set the selected metric if only one row is selected
                  setSelectedMetric(rows.length === 1 ? rowIdToMetric[rows[0]] : null);
                }}
              />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white p-3 shadow-md">
            <div className="dropdownoption flex flex-row gap-2 flex-wrap items-center">
              <div className="timeline min-w-[180px]">
                <Dropdown
                  value={selectedTimeline}
                  onChange={(e) => setSelectedTimeline(e.value)}
                  options={[
                    'Today', 'Tomorrow', 'Next 7 Days', 'Next 14 Days', 'This Month', 'This Year', 'Custom'
                  ].map(v => ({ label: v, value: v }))}
                  placeholder="Timeframe"
                  className="w-full text-sm"
                />
                {selectedTimeline === 'Custom' && (
                  <Calendar
                    value={customRange}
                    onChange={(e) => setCustomRange(e.value)}
                    selectionMode="range"
                    readOnlyInput
                    showIcon
                    placeholder="Select date range"
                    className="w-full mt-1 text-sm"
                  />
                )}
              </div>
              <div className="from min-w-[150px]">
                <MultiSelect
                  value={selectedFroms}
                  onChange={(e) => setSelectedFroms(e.value)}
                  options={useMemo(() => {
                    // Create options from suggestions
                    const suggestionOptions = fromSuggestions.map(s => ({
                      label: s.label || s.origin || 'Unknown',
                      value: s.origin || s.value || s
                    }));
                    
                    // Add any selected items that aren't in suggestions
                    const existingOptions = selectedFroms
                      .filter(val => !suggestionOptions.some(opt => opt.value === val))
                      .map(val => ({ label: val, value: val }));
                    
                    return [...suggestionOptions, ...existingOptions];
                  }, [selectedFroms, fromSuggestions])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder={selectedFroms.length > 0 
                    ? `${selectedFroms.length} origins selected` 
                    : 'Search departure...'}
                  selectedItemsLabel="{0} origins selected"
                  className="w-full text-sm"
                  filter
                  onFilter={onFromFilter}
                  filterBy="label"
                  showSelectAll
                  maxSelectedLabels={3}
                  loading={isLoadingFrom}
                  emptyFilterMessage="No origins found"
                />
              </div>

              <div className="to min-w-[150px]">
                <MultiSelect
                  value={selectedTos}
                  onChange={(e) => setSelectedTos(e.value)}
                  options={useMemo(() => {
                    // Create options from suggestions
                    const suggestionOptions = toSuggestions.map(s => ({
                      label: s.label || s.destination || 'Unknown',
                      value: s.destination || s.value || s
                    }));
                    
                    // Add any selected items that aren't in suggestions
                    const existingOptions = selectedTos
                      .filter(val => !suggestionOptions.some(opt => opt.value === val))
                      .map(val => ({ label: val, value: val }));
                    
                    return [...suggestionOptions, ...existingOptions];
                  }, [selectedTos, toSuggestions])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder={selectedTos.length > 0 
                    ? `${selectedTos.length} destinations selected` 
                    : 'Search destination...'}
                  selectedItemsLabel="{0} destinations selected"
                  className="w-full text-sm"
                  filter
                  onFilter={onToFilter}
                  filterBy="label"
                  showSelectAll
                  maxSelectedLabels={3}
                  loading={isLoadingTo}
                  emptyFilterMessage="No destinations found"
                />
              </div>

              <div className="transport-type min-w-[150px]">
                <MultiSelect
                  value={selectedTransportTypes}
                  onChange={(e) => setSelectedTransportTypes(e.value)}
                  options={useMemo(() => {
                    // Create options from suggestions
                    const suggestionOptions = transportTypeSuggestions.map(s => ({
                      label: s.label || s.transport_type || s,
                      value: s.transport_type || s.value || s
                    }));
                    
                    // Add any selected items that aren't in suggestions
                    const existingOptions = selectedTransportTypes
                      .filter(val => !suggestionOptions.some(opt => opt.value === val))
                      .map(val => ({ label: val, value: val }));
                    
                    return [...suggestionOptions, ...existingOptions];
                  }, [selectedTransportTypes, transportTypeSuggestions])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder={selectedTransportTypes.length > 0 
                    ? `${selectedTransportTypes.length} transport types selected` 
                    : 'Search transport type...'}
                  selectedItemsLabel="{0} transport types selected"
                  className="w-full text-sm"
                  filter
                  onFilter={onTransportTypeFilter}
                  filterBy="label"
                  showSelectAll
                  maxSelectedLabels={3}
                  loading={isLoadingTransportType}
                  emptyFilterMessage="No transport types found"
                />
              </div>

              <div className="operator min-w-[140px]">
                <MultiSelect
                  value={selectedOperators}
                  onChange={(e) => setSelectedOperators(e.value)}
                  options={useMemo(() => {
                    // Create options from suggestions
                    const suggestionOptions = operatorSuggestions.map(s => ({
                      label: s.label || s.operator_name || s,
                      value: s.operator_name || s.value || s
                    }));
                    
                    // Add any selected items that aren't in suggestions
                    const existingOptions = selectedOperators
                      .filter(val => !suggestionOptions.some(opt => opt.value === val))
                      .map(val => ({ label: val, value: val }));
                    
                    return [...suggestionOptions, ...existingOptions];
                  }, [selectedOperators, operatorSuggestions])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder={selectedOperators.length > 0 
                    ? `${selectedOperators.length} operators selected` 
                    : 'Search operators...'}
                  selectedItemsLabel="{0} operators selected"
                  className="w-full text-sm"
                  filter
                  onFilter={onOperatorFilter}
                  filterBy="label"
                  showSelectAll
                  maxSelectedLabels={3}
                  loading={isLoadingOperator}
                  emptyFilterMessage="No operators found"
                />
              </div>
              <div className="clear-all">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                >
                  Clear All Filters
                </button>
              </div>

              <div className="submit" style={{ marginTop: '0' }}>
                {/* <Button
                  label="Apply"
                  icon="pi pi-check"
                  onClick={runQuery}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    borderRadius: '5px',
                    padding: '8px 12px',
                    fontSize: '0.85rem'
                  }}
                /> */}
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <i className="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
                <span className="ml-2">Loading data</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-md text-red-700">
                <div className="flex items-center">
                  <i className="pi pi-exclamation-triangle mr-2"></i>
                  <span>{error}</span>
                </div>
                <div className="mt-2 text-sm">
                  Make sure your backend server is running
                </div>
              </div>
            ) : isComparing ? (
              <div className="h-full flex flex-col">
                {/* <div className="mb-4">
                  <Button
                    icon="pi pi-arrow-left"
                    label="Back to Filters"
                    className="p-button-text p-button-sm"
                    onClick={() => setIsComparing(false)}
                  />
                </div> */}
                <div className="flex-1">
                  <CompareTable
                    selectedFroms={selectedFroms}
                    selectedTos={selectedTos}
                    selectedTransportTypes={selectedTransportTypes}
                    onMetricClick={handleMetricClick}
                    selectedMetrics={selectedRows.map(rowId => rowIdToMetric[rowId])}
                    loadingMetrics={loadingMetrics}
                  />
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Select filters and click "Apply" to view comparison results
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparePage;
