import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import Sidebar from '../components/compare_components/cmp-sidebar';
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
  
  // Query builder states
  const [selectedTimeline, setSelectedTimeline] = useState('Last 14 Days');
  const [selectedFroms, setSelectedFroms] = useState([]);
  const [selectedTos, setSelectedTos] = useState([]);
  const [selectedTransportTypes, setSelectedTransportTypes] = useState([]);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [customRange, setCustomRange] = useState(null);
  const [selectedDateField, setSelectedDateField] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(1); // Default to first column
  const [selectedColumns, setSelectedColumns] = useState([sectionItems.columns[0]]); // Default to first column
  const [selectedRows, setSelectedRows] = useState([
    sectionItems.rows[0], // Total Routes
    sectionItems.rows[1]  // Mean Price Average
  ]);
  const [isComparing, setIsComparing] = useState(false);

  // Extract unique values for dropdown suggestions
  const getFieldSuggestions = (field) => {
    if (!data || !Array.isArray(data)) return [];
    const values = new Set();
    data.forEach(item => {
      if (item[field]) values.add(item[field]);
    });
    return Array.from(values).sort();
  };

  // Parse date from string or Date object
  const parseDate = (v) => {
    if (!v) return null;
    // Already a Date
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    
    // ISO string or timestamp
    if (typeof v === 'string' || typeof v === 'number') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    
    return null;
  };
  
  // Get date range based on selected timeline
  const getDateRange = () => {
    const now = new Date();
    
    const ranges = {
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
      }
    };

    // Handle custom range
    if (selectedTimeline === 'Custom') {
      if (Array.isArray(customRange) && customRange.length === 2) {
        const [start, end] = customRange;
        return { 
          start: parseDate(start),
          end: parseDate(end) 
        };
      } else if (customRange) {
        // Single date selected
        const start = parseDate(customRange);
        if (start) {
          const end = new Date(start);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
      }
      return { start: null, end: null };
    }

    // Handle preset ranges
    const rangeFn = ranges[selectedTimeline];
    return rangeFn ? rangeFn() : { start: null, end: null };
  };

  // Filter data based on selected date range
  const filterDataByDateRange = (data) => {
    if (!data || !Array.isArray(data)) return [];
    
    const { start, end } = getDateRange();
    if (!start || !end) return data;
    
    return data.filter(item => {
      const itemDate = parseDate(item['Date']);
      if (!itemDate) return false;
      
      return itemDate >= start && itemDate <= end;
    });
  };
  
  // Get filtered data based on all filters
  const getFilteredData = useCallback(() => {
    if (!data || !Array.isArray(data)) return [];
    
    // Apply date filter
    let filtered = filterDataByDateRange(data);
    
    // Apply transport type filter
    if (selectedTransportTypes.length > 0) {
      filtered = filtered.filter(item => 
        selectedTransportTypes.some(type => 
          item['Transport Type']?.toLowerCase().includes(type.toLowerCase())
        )
      );
    }
    
    // Apply from/to filters
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

  // Use the same API configuration as in App.jsx
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // Fetch data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/trips/all`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const apiData = await response.json();
        const transformedData = apiData.map(item => {
          const formatDuration = (minutes) => {
            if (!minutes) return null;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
          };

          return {
            'Route URL': item.route_url || '',
            'Title': item.title || `${item.origin} → ${item.destination}`,
            'From-To': `${item.origin} → ${item.destination}`,
            'From': item.origin || 'Unknown',
            'To': item.destination || 'Unknown',
            'Duration': formatDuration(item.duration_min) || 'N/A',
            'Price': `₹${parseFloat(item.price_thb).toFixed(2)}` || '₹0.00',
            'Transport Type': item.transport_type || 'N/A',
            'Operator': item.operator_name || item.provider || 'N/A',
            'Departure Time': item.departure_time ? 
              new Date(item.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--',
            'Arrival Time': item.arrival_time ? 
              new Date(item.arrival_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--',
            'Date': item.travel_date ? 
              new Date(item.travel_date).toISOString().split('T')[0] : 
              new Date().toISOString().split('T')[0],
            'source': item.provider || '12go'
          };
        });

        setData(transformedData);
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please ensure the backend server is running.');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  // Memoize the section items to prevent unnecessary re-renders
  const memoizedSectionItems = useMemo(() => sectionItems, []);

  // Update selected columns when selectedColumn changes
  useEffect(() => {
    const column = memoizedSectionItems.columns.find(col => col.id === selectedColumn);
    if (column) {
      setSelectedColumns([column]);
    }
  }, [selectedColumn, memoizedSectionItems.columns]);

  // Handle row selection changes from sidebar
  const handleRowSelectionChange = useCallback((rowIds) => {
    const selected = memoizedSectionItems.rows.filter(row => rowIds.includes(row.id));
    setSelectedRows(selected);
  }, [memoizedSectionItems.rows]);

  // Handle column selection changes from sidebar
  const handleColumnChange = useCallback((columnId) => {
    setSelectedColumn(columnId);
  }, []);
  
  // Handle date field selection
  const handleDateFieldChange = (e) => {
    setSelectedDateField(e.value);
  };
  
  // Memoize the filtered data to prevent unnecessary recalculations
  const filteredData = useMemo(() => {
    return getFilteredData();
  }, [getFilteredData]);

  return (
    <div className="flex flex-col h-screen">
      {/* Main Content with Sidebar and Query Builder */}
      <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            onRowSelectionChange={handleRowSelectionChange}
            onColumnChange={handleColumnChange}
            selectedColumn={selectedColumn}
            sectionItems={memoizedSectionItems}
          />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Query Builder Section */}
          <div className="bg-white p-3 shadow-md">
            <div className="dropdownoption flex flex-row gap-2 flex-wrap items-center">
              {/* Timeline */}
              <div className="timeline min-w-[180px]">
                <Dropdown
                  value={selectedTimeline}
                  onChange={(e) => setSelectedTimeline(e.value)}
                  options={[
                    'Today', 'Yesterday', 'Next 7 Days', 'Next 14 Days','This Month', 'This Year', 'Custom'
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

              {/* Date Field */}
              <div className="date-field min-w-[160px]">
                <Dropdown
                  value={selectedDateField}
                  onChange={(e) => setSelectedDateField(e.value)}
                  options={dateFieldOptions}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Date Field"
                  className="w-full text-sm"
                  showClear
                />
              </div>

              {/* From */}
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

              {/* To */}
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

              {/* Transport Type */}
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

              {/* Operator */}
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

              {/* Submit */}
              <div className="submit" style={{marginTop:'0'}}>
                <Button 
                  label="Apply" 
                  icon="pi pi-check" 
                  onClick={runQuery} 
                  style={{
                    backgroundColor:'#007bff',
                    color:'white',
                    borderRadius:'5px',
                    padding:'8px 12px',
                    fontSize:'0.85rem'
                  }} 
                />
              </div>
            </div>
          </div>
          
          {/* Main Content Area */}
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
                  <div className="mb-4">
                    <Button 
                      icon="pi pi-arrow-left" 
                      label="Back to Filters" 
                      className="p-button-text p-button-sm" 
                      onClick={() => setIsComparing(false)} 
                    />
                  </div>
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
  );
};

export default ComparePage;
