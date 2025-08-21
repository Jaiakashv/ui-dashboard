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
    { id: 2, name: 'Mean Price Average' },
    { id: 4, name: 'Lowest Price' },
    { id: 5, name: 'Highest Price' },
    { id: 6, name: 'Median Price' },
    { id: 7, name: 'Standard Deviation' },
    { id: 8, name: 'No of Unique Providers' },
    { id: 9, name: 'Cheapest Carriers' },
    { id: 10, name: 'Routes (bus, train, etc.)' }
  ]
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  // Fetch individual stat
  const fetchStat = async (endpoint) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stats/routes/${endpoint}`);
      return response.data;
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
      return null;
    }
  };

  // Fetch route statistics
  const fetchRouteStats = useCallback(async (metric = null) => {
    try {
      setLoading(true);
      
      // Create query params
      const params = new URLSearchParams();
      if (selectedFroms.length > 0) params.append('from', selectedFroms[0]);
      if (selectedTos.length > 0) params.append('to', selectedTos[0]);
      if (selectedTransportTypes.length > 0) params.append('transportType', selectedTransportTypes[0]);
      
      const queryString = params.toString();
      
      // If a specific metric is requested, only fetch that one
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
      
      // Otherwise fetch all stats in parallel
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

      // Combine all stats into one object
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

      setStats(combinedStats);
      setError(null);
      return combinedStats;
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
    if (!stats) return [];
    
    return [{
      id: 1,
      name: 'Unique Routes',
      value: stats.totalRoutes || 0
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
  }, []);

  // Update data when stats change
  useEffect(() => {
    if (stats) {
      setData(prevData => {
        // If we have no data yet, initialize with default values
        if (!prevData || prevData.length === 0) {
          return sectionItems.rows.map(row => ({
            id: row.id,
            name: row.name,
            value: 'Click to load'
          }));
        }

        // Only update the specific metric that was fetched
        const updatedData = prevData.map(item => {
          const statKey = item.name.toLowerCase();
          switch (statKey) {
            case 'unique routes':
              return { ...item, value: stats.totalRoutes || 0 };
            case 'mean price average':
              return { ...item, value: stats.meanPrice || '0.00' };
            case 'lowest price':
              return { ...item, value: stats.lowestPrice || '0.00' };
            case 'highest price':
              return { ...item, value: stats.highestPrice || '0.00' };
            case 'median price':
              return { ...item, value: stats.medianPrice || '0.00' };
            case 'standard deviation':
              return { ...item, value: stats.standardDeviation || '0.00' };
            case 'no of unique providers':
              return { ...item, value: stats.uniqueProviders || 0 };
            case 'cheapest carriers':
              return { ...item, value: stats.cheapestCarriers?.join(', ') || 'N/A' };
            case 'routes':
              return { ...item, value: stats.routes || 'All' };
            default:
              return item;
          }
        });
        return updatedData;
      });
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

  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    if (typeof dateString !== 'string') return null;
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  };

  const [selectedTimeline, setSelectedTimeline] = useState('Last 14 Days');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [transportTypeSuggestions, setTransportTypeSuggestions] = useState([]);
  const [operatorSuggestions, setOperatorSuggestions] = useState([]);
  const [isLoadingFrom, setIsLoadingFrom] = useState(false);
  const [isLoadingTo, setIsLoadingTo] = useState(false);
  const [isLoadingTransportType, setIsLoadingTransportType] = useState(false);
  const [isLoadingOperator, setIsLoadingOperator] = useState(false);

  // Fetch origin suggestions
  const fetchFromSuggestions = async (query) => {
    if (!query) return [];
    setIsLoadingFrom(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/trips/search?field=origin&q=${encodeURIComponent(query)}`);
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching origin suggestions:', error);
      return [];
    } finally {
      setIsLoadingFrom(false);
    }
  };

  // Fetch destination suggestions
  const fetchToSuggestions = async (query) => {
    if (!query) return [];
    setIsLoadingTo(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/trips/search?field=destination&q=${encodeURIComponent(query)}`);
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching destination suggestions:', error);
      return [];
    } finally {
      setIsLoadingTo(false);
    }
  };

  // Fetch transport type suggestions
  const fetchTransportTypeSuggestions = async (query) => {
    if (!query) return [];
    setIsLoadingTransportType(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/trips/search?field=transport_type&q=${encodeURIComponent(query)}`
      );
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching transport type suggestions:', error);
      return [];
    } finally {
      setIsLoadingTransportType(false);
    }
  };

  // Fetch operator suggestions
  const fetchOperatorSuggestions = async (query) => {
    if (!query) return [];
    setIsLoadingOperator(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/trips/search?field=operator_name&q=${encodeURIComponent(query)}`
      );
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching operator suggestions:', error);
      return [];
    } finally {
      setIsLoadingOperator(false);
    }
  };

  // Handle origin filter
  const onFromFilter = async (event) => {
    const results = await fetchFromSuggestions(event.filter);
    setFromSuggestions(results);
  };

  // Handle destination filter
  const onToFilter = async (event) => {
    const results = await fetchToSuggestions(event.filter);
    setToSuggestions(results);
  };

  // Handle transport type filter
  const onTransportTypeFilter = async (event) => {
    const results = await fetchTransportTypeSuggestions(event.filter);
    setTransportTypeSuggestions(results);
  };

  // Handle operator filter
  const onOperatorFilter = async (event) => {
    const results = await fetchOperatorSuggestions(event.filter);
    setOperatorSuggestions(results);
  };
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

    if (selectedTimeline) params.set('timeline', selectedTimeline);
    if (selectedFroms.length > 0) params.set('from', selectedFroms.join(','));
    if (selectedTos.length > 0) params.set('to', selectedTos.join(','));
    if (selectedTransportTypes.length > 0) params.set('transport', selectedTransportTypes.join(','));
    if (selectedOperators.length > 0) params.set('operator', selectedOperators.join(','));

    // Use local date formatting (YYYY-MM-DD) instead of toISOString()
    if (Array.isArray(customRange) && customRange.length === 2) {
      const [startDate, endDate] = customRange;
      if (startDate instanceof Date && !isNaN(startDate.getTime())) {
        params.set('startDate', formatDateLocal(startDate));
      }
      if (endDate instanceof Date && !isNaN(endDate.getTime())) {
        params.set('endDate', formatDateLocal(endDate));
      }
    }

    if (selectedDateField) params.set('dateField', selectedDateField);

    // Sidebar selections
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

  const getDateRange = useCallback(() => {
    const presets = {
      'Today': () => {
        const start = new Date();
        start.setHours(0,0,0,0);
        const end = new Date();
        end.setHours(23,59,59,999);
        return { start, end };
      },
      'Tomorrow': () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const start = new Date(tomorrow);
        start.setHours(0,0,0,0);
        const end = new Date(tomorrow);
        end.setHours(23,59,59,999);
        return { start, end };
      },
      'This Month': () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      },
      'This Year': () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end };
      },
      'Next 7 Days': () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      },
      'Next 14 Days': () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() + 13);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
    };

    if (selectedTimeline === 'Custom') {
      if (Array.isArray(customRange)) {
        if (customRange[0] && customRange[1]) {
          const start = new Date(customRange[0]);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customRange[1]);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        } else if (customRange[0]) {
          const start = new Date(customRange[0]);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customRange[0]);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
      } else if (customRange instanceof Date) {
        const start = new Date(customRange);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customRange);
        end.setHours(23, 59, 59, 999);
        return { start, end };
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
{/* 
              <div className="date-field min-w-[160px]">
                <Dropdown
                  value={selectedDateField}
                  onChange={handleDateFieldChange}
                  options={dateFieldOptions}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Date Field"
                  className="w-full text-sm"
                  showClear
                />
              </div> */}

              <div className="from min-w-[150px]">
                <MultiSelect
                  value={selectedFroms}
                  onChange={(e) => setSelectedFroms(e.value)}
                  options={useMemo(() => {
                    // Combine existing selections with search results
                    const existingOptions = selectedFroms.map(v => ({ label: v, value: v }));
                    const suggestionOptions = fromSuggestions
                      .filter(s => !selectedFroms.includes(s.origin))
                      .map(s => ({ label: s.origin, value: s.origin }));
                    return [...existingOptions, ...suggestionOptions];
                  }, [selectedFroms, fromSuggestions])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder={selectedFroms.length > 3 
                    ? `${selectedFroms.slice(0, 3).join(' ')} ...` 
                    : selectedFroms.join(' ') || 'Departure Country'}
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
                    // Combine existing selections with search results
                    const existingOptions = selectedTos.map(v => ({ label: v, value: v }));
                    const suggestionOptions = toSuggestions
                      .filter(s => !selectedTos.includes(s.destination))
                      .map(s => ({ label: s.destination, value: s.destination }));
                    return [...existingOptions, ...suggestionOptions];
                  }, [selectedTos, toSuggestions])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder={selectedTos.length > 3 
                    ? `${selectedTos.slice(0, 3).join(' ')} ...` 
                    : selectedTos.join(' ') || 'Arrival Country'}
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

              <div className="transport-type min-w-[160px]">
                <MultiSelect
                  value={selectedTransportTypes}
                  onChange={(e) => setSelectedTransportTypes(e.value)}
                  options={useMemo(() => {
                    // Combine existing selections with search results
                    const existingOptions = selectedTransportTypes.map(v => ({ label: v, value: v }));
                    const suggestionOptions = transportTypeSuggestions
                      .filter(s => !selectedTransportTypes.includes(s.transport_type))
                      .map(s => ({ label: s.transport_type, value: s.transport_type }));
                    return [...existingOptions, ...suggestionOptions];
                  }, [selectedTransportTypes, transportTypeSuggestions])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder={selectedTransportTypes.length > 3 
                    ? `${selectedTransportTypes.slice(0, 3).join(' ')} ...` 
                    : selectedTransportTypes.join(' ') || 'Travel Mode'}
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
                    // Combine existing selections with search results
                    const existingOptions = selectedOperators.map(v => ({ label: v, value: v }));
                    const suggestionOptions = operatorSuggestions
                      .filter(s => !selectedOperators.includes(s.operator_name))
                      .map(s => ({ label: s.operator_name, value: s.operator_name }));
                    return [...existingOptions, ...suggestionOptions];
                  }, [selectedOperators, operatorSuggestions])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder={selectedOperators.length > 3 
                    ? `${selectedOperators.slice(0, 3).join(' ')} ...` 
                    : selectedOperators.join(' ') || 'Operator'}
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
