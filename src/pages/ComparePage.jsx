import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import Sidebar from '../components/Sidebar';
import CmpSidebar from '../components/compare_components/cmp-sidebar';
import CompareTable from '../components/compare_components/CompareTable';

// Define section items outside the component to avoid recreation
const sectionItems = {
  columns: [
    { id: 1, name: 'Websites' },
    { id: 2, name: 'Carriers' },
    { id: 3, name: 'Transport Type' }
  ],
  rows: [
    { id: 1, name: 'Total Routes' },
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

const ComparePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const view = searchParams.get('view') || '';
  const provider = searchParams.get('provider') || '';

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

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTimeline, setSelectedTimeline] = useState('Last 14 Days');
  const [selectedFroms, setSelectedFroms] = useState([]);
  const [selectedTos, setSelectedTos] = useState([]);
  const [selectedTransportTypes, setSelectedTransportTypes] = useState([]);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [customRange, setCustomRange] = useState(null);
  const [selectedDateField, setSelectedDateField] = useState('');

  const [selectedColumn, setSelectedColumn] = useState(1); 
  const [selectedColumns, setSelectedColumns] = useState([sectionItems.columns[0]]);
  // Initialize with all rows selected by default
  const [selectedRows, setSelectedRows] = useState(() => [...sectionItems.rows]);
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
      params.set('rows', selectedRows.map(row => row.id).join(','));
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
      if (rows.length > 0) setSelectedRows(rows);
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

  // -------------------------
  // Date utilities used in filtering
  // -------------------------
  // Get date range based on selected timeline
  const getDateRange = () => {
    const now = new Date();

    const presets = {
      'Today': () => {
        const start = new Date();
        start.setHours(0,0,0,0);
        const end = new Date();
        end.setHours(23,59,59,999);
        return { start, end };
      },
      'Yesterday': () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const start = new Date(yesterday);
        start.setHours(0,0,0,0);
        const end = new Date(yesterday);
        end.setHours(23,59,59,999);
        return { start, end };
      },
      'Last 7 Days': () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return { start, end };
      },
      'Last 14 Days': () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 13);
        start.setHours(0,0,0,0);
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
  };
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

  // -------------------------
  // Fetch data and normalize travel_date to local YYYY-MM-DD
  // -------------------------
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/trips/all`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const apiData = await response.json();
        const transformedData = apiData.map(item => {
          const formatDuration = (minutes) => {
            if (minutes === undefined || minutes === null) return null;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
          };

          // Normalize travel_date into local YYYY-MM-DD
          let travelDateLocal = '';
          if (item.travel_date) {
            // Try to parse travel_date as Date; if that fails, leave as today's date string
            const parsed = new Date(item.travel_date);
            if (!isNaN(parsed.getTime())) {
              travelDateLocal = formatDateLocal(parsed);
            } else {
              travelDateLocal = formatDateLocal(new Date());
            }
          } else {
            travelDateLocal = formatDateLocal(new Date());
          }

          return {
            'Route URL': item.route_url || '',
            'Title': item.title || `${item.origin} → ${item.destination}`,
            'From-To': `${item.origin} → ${item.destination}`,
            'From': item.origin || 'Unknown',
            'To': item.destination || 'Unknown',
            'Duration': formatDuration(item.duration_min) || 'N/A',
            'Price': item.price_thb ? `₹${parseFloat(item.price_thb).toFixed(2)}` : '₹0.00',
            'Transport Type': item.transport_type || 'N/A',
            'Operator': item.operator_name || item.provider || 'N/A',
            'Departure Time': item.departure_time ?
              new Date(item.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            'Arrival Time': item.arrival_time ?
              new Date(item.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            // store Date as YYYY-MM-DD local string (safe for our parsing later)
            'Date': travelDateLocal,
            'source': item.provider || '12go'
          };
        });

        setData(transformedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please ensure the backend server is running.');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_BASE_URL]);
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

  const handleRowSelectionChange = useCallback((rowIds) => {
    const selected = memoizedSectionItems.rows.filter(row => rowIds.includes(row.id));
    setSelectedRows(selected);
  }, [memoizedSectionItems.rows]);

  // Ensure all rows are selected when component mounts
  useEffect(() => {
    setSelectedRows([...memoizedSectionItems.rows]);
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
          activeProvider={provider}
          activeView={view}
          virtualizeView={view === 'virtualize' ? searchParams.get('tab') || 'popular-routes' : ''}
        />
      </div>
      
      {/* Main Content Area */}
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
                    'Today', 'Yesterday', 'Next 7 Days', 'Next 14 Days', 'This Month', 'This Year', 'Custom'
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
              </div>

              <div className="from min-w-[150px]">
                <MultiSelect
                  value={selectedFroms}
                  onChange={(e) => setSelectedFroms(e.value)}
                  options={useMemo(() => getFieldSuggestions('From').map(v => ({ label: v, value: v })), [data])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder="Departure Country"
                  className="w-full text-sm"
                  filter
                  showSelectAll
                />
              </div>

              <div className="to min-w-[150px]">
                <MultiSelect
                  value={selectedTos}
                  onChange={(e) => setSelectedTos(e.value)}
                  options={useMemo(() => getFieldSuggestions('To').map(v => ({ label: v, value: v })), [data])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder="Arrival Country"
                  className="w-full text-sm"
                  filter
                  showSelectAll
                />
              </div>

              <div className="transport-type min-w-[140px]">
                <MultiSelect
                  value={selectedTransportTypes}
                  onChange={(e) => setSelectedTransportTypes(e.value)}
                  options={useMemo(() => getFieldSuggestions('Transport Type').map(v => ({ label: v, value: v })), [data])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder="Travel Mode"
                  className="w-full text-sm"
                  filter
                  showSelectAll
                />
              </div>

              <div className="operator min-w-[140px]">
                <MultiSelect
                  value={selectedOperators}
                  onChange={(e) => setSelectedOperators(e.value)}
                  options={useMemo(() => getFieldSuggestions('Operator').map(v => ({ label: v, value: v })), [data])}
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder="Operator"
                  className="w-full text-sm"
                  filter
                  showSelectAll
                />
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
                    data={filteredData}
                    columns={selectedColumns}
                    rows={selectedRows}
                    selectedFroms={selectedFroms}
                    selectedTos={selectedTos}
                    selectedTransportTypes={selectedTransportTypes}
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
