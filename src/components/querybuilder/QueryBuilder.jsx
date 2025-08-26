import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Column } from 'primereact/column';
import { Menu } from 'primereact/menu';
import { AutoComplete } from 'primereact/autocomplete';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import { saveAs } from 'file-saver';

const operators = [
  { label: 'Equals', value: '=' },
  { label: 'Not Equals', value: '!=' },
  { label: 'Contains', value: 'LIKE' },
  { label: 'Greater Than', value: '>' },
  { label: 'Less Than', value: '<' }
];

const fields = [
  { label: 'From', value: 'From' },
  { label: 'To', value: 'To' },
  { label: 'Price', value: 'Price' },
  { label: 'Operator', value: 'Operator' },
  { label: 'Transport Type', value: 'Transport Type' },
  { label: 'Departure Time', value: 'Departure Time' },
  { label: 'Arrival Time', value: 'Arrival Time' },
  { label: 'Duration', value: 'Duration' }
];

const QueryBuilder = ({ onRunQuery, data = [] }) => {
  // Format cell value for display with provider-specific formatting
  const formatCellValue = (value, column = '') => {
    if (value === null || value === undefined) return '-';
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Special handling for price to format as currency
    if ((column === 'price' || column === 'price_usd') && typeof value === 'number' && !isNaN(value)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(value);
    }
    
    // Format duration in minutes to HH:MM format
    if (column === 'duration' && typeof value === 'number' && !isNaN(value)) {
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      return `${hours}h ${minutes}m`;
    }
    
    // Format date strings
    if ((column.includes('time') || column.includes('date')) && typeof value === 'string') {
      try {
        const date = new Date(value);
        if (!isNaN(date)) {
          return date.toLocaleString();
        }
      } catch (e) {
        console.warn('Error formatting date:', e);
      }
    }
    
    return String(value);
  };

  // Handle column sorting with type awareness
  const handleSort = (column) => {
    setResults(prevResults => {
      return [...prevResults].sort((a, b) => {
        // Handle null/undefined values
        if (a[column] === null || a[column] === undefined) return 1;
        if (b[column] === null || b[column] === undefined) return -1;
        
        // Special handling for numeric values
        if (typeof a[column] === 'number' && typeof b[column] === 'number') {
          return a[column] - b[column];
        }
        
        // Handle date strings
        const dateA = new Date(a[column]);
        const dateB = new Date(b[column]);
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return dateA - dateB;
        }
        
        // Default string comparison
        return String(a[column]).localeCompare(String(b[column]));
      });
    });
  };

  // Export results to CSV
  const [conditions, setConditions] = useState([{ field: '', operator: '=', value: '' }]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination and sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortField, setSortField] = useState('departure_time');
  const [sortOrder, setSortOrder] = useState(1); // 1 for ASC, -1 for DESC
  const [error, setError] = useState('');
  
  // Process and normalize results from both 12go and Bookaway
  const processResults = (data) => {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => {
      // Handle 12go data structure
      if (item.from) {
        return {
          id: item.id,
          provider: '12go',
          from: item.from,
          to: item.to,
          departure_time: item.departure_time,
          arrival_time: item.arrival_time,
          duration: item.duration,
          price: item.price,
          currency: item.currency,
          transport_type: item.transport_type,
          operator_name: item.operator_name,
          available_seats: item.available_seats,
          // Add any other 12go specific fields
          ...item
        };
      }
      
      // Handle Bookaway data structure
      if (item.origin) {
        return {
          id: item.id,
          provider: 'bookaway',
          from: item.origin,
          to: item.destination,
          departure_time: item.departure_time,
          arrival_time: item.arrival_time,
          duration: item.duration_minutes ? item.duration_minutes / 60 : null, // Convert to hours
          price: item.price_amount,
          currency: item.price_currency,
          transport_type: item.transport_type,
          operator_name: item.operator_name || item.carrier_name,
          available_seats: item.available_seats,
          // Map any other Bookaway specific fields
          ...item
        };
      }
      
      // Default case - return as is
      return { ...item, provider: item.provider || 'unknown' };
    });
  };
  const [suggestions, setSuggestions] = useState([]);
  const menuRef = useRef(null);

  // Header filter states
  const [selectedTimeline, setSelectedTimeline] = useState('Last 14 Days');
  const [selectedFroms, setSelectedFroms] = useState([]);
  const [selectedTos, setSelectedTos] = useState([]);
  const [selectedTransportTypes, setSelectedTransportTypes] = useState([]);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    from: [],
    to: [],
    transportType: [],
    operator: []
  });
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [customRange, setCustomRange] = useState(null); // [startDate, endDate]
  const [selectedDateField, setSelectedDateField] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [transportTypeSuggestions, setTransportTypeSuggestions] = useState([]);
  const [operatorSuggestions, setOperatorSuggestions] = useState([]);
  const [isLoadingFrom, setIsLoadingFrom] = useState(false);
  const [isLoadingTo, setIsLoadingTo] = useState(false);
  const [isLoadingTransport, setIsLoadingTransport] = useState(false);
  const [isLoadingOperator, setIsLoadingOperator] = useState(false);

  // Build date field options from dataset keys that look like dates/times
  const dateFieldOptions = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const keys = Array.from(new Set(data.flatMap(obj => Object.keys(obj || {}))));
    const candidates = keys.filter(k => /date|time/i.test(k));
    return candidates.map(k => ({ label: k, value: k }));
  }, [data]);

  // Default the date field to the DataTable's convention 'Date' if present
  useEffect(() => {
    if (!selectedDateField && Array.isArray(data) && data.length) {
      const keys = Object.keys(data[0] || {});
      if (keys.includes('Date')) {
        setSelectedDateField('Date');
      } else if (dateFieldOptions.length) {
        setSelectedDateField(dateFieldOptions[0].value);
      }
    }
  }, [data, dateFieldOptions, selectedDateField]);

  // Search for suggestions based on field and query
  // Fetch filter options from API
  // const fetchFilterOptions = async () => {
  //   try {
  //     setLoadingFilters(true);
  //     const response = await fetch(`${import.meta.env.VITE_API_URL}/api/filters`);
  //     const data = await response.json();
      
  //     if (data.success) {
  //       setFilterOptions({
  //         from: data.data.departure_countries || [],
  //         to: data.data.arrival_countries || [],
  //         transportType: data.data.transport_types || [],
  //         operator: data.data.operators || []
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Error fetching filter options:', error);
  //     // Fallback to empty arrays if API fails
  //     setFilterOptions({
  //       from: [],
  //       to: [],
  //       transportType: [],
  //       operator: []
  //     });
  //   } finally {
  //     setLoadingFilters(false);
  //   }
  // };

  // Single source of truth for loading filters
  const fetchFilterOptions = useCallback(async () => {
    try {
      setLoadingFilters(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/filters`);
      const data = await response.json();
      
      console.log('Raw API response:', data);
      
      // Parse comma-separated strings into arrays of objects
      const parseCSV = (str, key) => {
        if (!str) return [];
        return str.split(',').map(item => ({
          [key]: item.trim(),
          label: item.trim(),
          value: item.trim()
        }));
      };
      
      // The API returns data directly in the response
      const responseData = data.data || data;
      
      const origins = parseCSV(responseData.origin, 'origin');
      const destinations = parseCSV(responseData.destination, 'destination');
      const transportTypes = parseCSV(responseData.transport_type, 'transport_type');
      const operators = parseCSV(responseData.operator_name, 'operator_name');
      
      console.log('Parsed data:', { 
        origins: origins.slice(0, 5), // Log first 5 items to avoid cluttering console
        destinations: destinations.slice(0, 5),
        transportTypes,
        operators: operators.slice(0, 5)
      });
      
      // Set filter options
      setFilterOptions({
        from: origins,
        to: destinations,
        transportType: transportTypes,
        operator: operators
      });
      
      // Set initial suggestions
      setFromSuggestions(origins);
      setToSuggestions(destinations);
      setTransportTypeSuggestions(transportTypes);
      setOperatorSuggestions(operators);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoadingFilters(false);
    }
  }, []);
  
  // Load filters on component mount
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Filter handlers for each field - client-side filtering
  const onFromFilter = useCallback((event) => {
    const query = (event.filterValue || '').toLowerCase();
    console.log('Filtering "From" with query:', query);
    
    if (!query) {
      // Reset to all options when query is empty
      setFromSuggestions(filterOptions.from || []);
      return;
    }
    
    const filtered = (filterOptions.from || []).filter(item => 
      item.label.toLowerCase().includes(query)
    );
    
    console.log('Filtered "From" options:', filtered);
    setFromSuggestions(filtered);
  }, [filterOptions.from]);
  
  const onToFilter = useCallback((event) => {
    const query = (event.filterValue || '').toLowerCase();
    console.log('Filtering "To" with query:', query);
    
    if (!query) {
      setToSuggestions(filterOptions.to || []);
      return;
    }
    
    const filtered = (filterOptions.to || []).filter(item => 
      item.label.toLowerCase().includes(query)
    );
    
    console.log('Filtered "To" options:', filtered);
    setToSuggestions(filtered);
  }, [filterOptions.to]);

  const onTransportTypeFilter = (event) => {
    const query = event.filterValue?.toLowerCase() || '';
    if (!query) {
      setTransportTypeSuggestions(
        filterOptions.transportType.map(item => ({
          label: item.transport_type || item,
          value: item.transport_type || item
        }))
      );
      return;
    }
    
    const filtered = (filterOptions.transportType || [])
      .filter(item => {
        const value = item.transport_type || item;
        return value.toLowerCase().includes(query);
      })
      .map(item => ({
        label: item.transport_type || item,
        value: item.transport_type || item
      }));
    
    setTransportTypeSuggestions(filtered);
  };

  const onOperatorFilter = (event) => {
    const query = event.filterValue?.toLowerCase() || '';
    if (!query) {
      setOperatorSuggestions(
        filterOptions.operator.map(item => ({
          label: item.operator_name || item,
          value: item.operator_name || item
        }))
      );
      return;
    }
    
    const filtered = (filterOptions.operator || [])
      .filter(item => {
        const value = item.operator_name || item;
        return value.toLowerCase().includes(query);
      })
      .map(item => ({
        label: item.operator_name || item,
        value: item.operator_name || item
      }));
    
    setOperatorSuggestions(filtered);
  };

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingFilters(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/filters`);
        const data = await response.json();
        
      if (data.success) {
        console.log('Loaded filter data:', data.data);
          
        // Process and combine results from both providers with consistent field names
        const processResults = (results) => {
          if (!Array.isArray(results)) return [];
          
          return results.map(item => {
            // Normalize field names between 12go and Bookaway providers
            const normalized = {
              // Common fields
              id: item.id || `${item.provider || 'unknown'}-${Math.random().toString(36).substr(2, 9)}`,
              provider: item.provider || 'unknown',
              
              // Location fields
              origin: item.origin || item.from || '',
              destination: item.destination || item.to || '',
              
              // Timing fields
              departure_time: item.departure_time || item.departure || '',
              arrival_time: item.arrival_time || item.arrival || '',
              duration: item.duration || 0,
              
              // Pricing
              price: item.price || item.price_usd || 0,
              price_currency: item.price_currency || 'USD',
              
              // Transport details
              transport_type: item.transport_type || item.transport || '',
              operator_name: item.operator_name || item.operator || '',
              
              // Keep all original fields
              ...item
            };
            
            // Calculate duration if not provided but we have both departure and arrival times
            if (!normalized.duration && normalized.departure_time && normalized.arrival_time) {
              try {
                const depTime = new Date(normalized.departure_time);
                const arrTime = new Date(normalized.arrival_time);
                if (!isNaN(depTime) && !isNaN(arrTime)) {
                  const diffMs = arrTime - depTime;
                  normalized.duration = Math.floor(diffMs / (1000 * 60)); // Convert to minutes
                }
              } catch (e) {
                console.warn('Error calculating duration:', e);
              }
            }
            
            return normalized;
          });
        };

        const origins = processResults(data.data.origins);
        const destinations = processResults(data.data.destinations);
        const transportTypes = processResults(data.data.transport_types);
        const operators = processResults(data.data.operators);
          
        setFilterOptions({
          from: origins,
          to: destinations,
          transportType: transportTypes,
          operator: operators
        });
          
        console.log('Processed filter options:', { origins, destinations, transportTypes, operators });
          
        // Set initial suggestions
        setFromSuggestions(origins);
        setToSuggestions(destinations);
        setTransportTypeSuggestions(transportTypes);
        setOperatorSuggestions(operators);
          
        setOperatorSuggestions(operators.map(item => ({
          label: item.operator_name || item,
          value: item.operator_name || item
        })));
      } else {
        console.error('Failed to load filter data:', data);
      }
    } catch (error) {
      console.error('Error loading initial filter data:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  loadInitialData();
}, []);

const searchSuggestions = (event, field) => {
  const query = event.query.toLowerCase();
  const fieldValues = getFieldSuggestions(field);
  const filtered = fieldValues.filter(value => 
    value.toLowerCase().includes(query)
  );
  setSuggestions(filtered);
};

const addCondition = () => {
  setConditions([...conditions, { field: '', operator: '=', value: '' }]);
};

const removeCondition = (index) => {
  const newConditions = conditions.filter((_, i) => i !== index);
  setConditions(newConditions);
};

const updateCondition = (index, field, value) => {
  const newConditions = [...conditions];
  newConditions[index] = { ...newConditions[index], [field]: value };
  setConditions(newConditions);
};

const handleRunQuery = async () => {
  try {
    setLoading(true);
    setError('');
    
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add filter conditions
    conditions.forEach(cond => {
      if (cond.field && cond.operator && cond.value) {
        // Special handling for different field names between providers
        let fieldName = cond.field.toLowerCase();
        if (fieldName === 'from') fieldName = 'origin';
        if (fieldName === 'to') fieldName = 'destination';
        if (fieldName === 'operator') fieldName = 'operator_name';
        if (fieldName === 'transport type') fieldName = 'transport_type';
        if (fieldName === 'departure time') fieldName = 'departure_time';
        if (fieldName === 'arrival time') fieldName = 'arrival_time';
        
        // Add the condition to the query
        params.append(fieldName, `${cond.operator}${cond.value}`);
      }
    });

    // Add pagination and sorting parameters
    params.append('page', currentPage);
    params.append('limit', pageSize);
    if (sortField) {
      params.append('sort_by', sortField);
      params.append('sort_order', sortOrder === 1 ? 'ASC' : 'DESC');
    }
    
    console.log('Fetching data with params:', params.toString());
    
    // Make the API call
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/combined-trips?${params.toString()}`);
    const result = await response.json();
    console.log('API Response:', result);

    if (response.ok) {
      // Process the results to normalize field names between providers
      const processedResults = processResults(Array.isArray(result) ? result : (result.data || []));
      
      // Update pagination info if available
      if (result.pagination) {
        setTotalRecords(result.pagination.total);
        setCurrentPage(result.pagination.page);
        setPageSize(result.pagination.limit);
      } else {
        setTotalRecords(processedResults.length);
      }
      
      setResults(processedResults);
      if (onRunQuery) onRunQuery(processedResults);
      
      // Scroll to results
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error('API Error:', errorMsg);
      setError(errorMsg);
      setResults([]);
    }
  } catch (err) {
    console.error('Error running query:', err);
    setError('An error occurred while running the query');
    setResults([]);
  } finally {
    setLoading(false);
  }
  };


  const exportToCSV = () => {
    if (results.length === 0) return;
    
    // Get headers
    const headers = Object.keys(results[0]);
    
    // Convert data to CSV
    const csvContent = [
      headers.join(','), // header row
      ...results.map(row => 
        headers.map(fieldName => 
          `"${String(row[fieldName] || '').replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\r\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `query-results-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportToJSON = () => {
    if (results.length === 0) return;
    
    const jsonContent = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    saveAs(blob, `query-results-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const exportMenuItems = [
    {
      label: 'Export as CSV',
      icon: 'pi pi-file-excel',
      command: exportToCSV
    },
    {
      label: 'Export as JSON',
      icon: 'pi pi-code',
      command: exportToJSON
    }
  ];

  return (
    <div className="query-builder">
      <Menu model={exportMenuItems} popup ref={menuRef} id="export_menu" />
      <Card className="shadow-4 border-round-2xl p-6 bg-white/80 backdrop-blur-sm w-full">
  {/* Header */}
  <div className="mb-6">
    <div className="dropdownoption flex flex-row gap-2 flex-wrap mb-8">
      {/* Timeline */}
      <div className="timeline min-w-[260px]">
        <Dropdown
          value={selectedTimeline}
          onChange={(e) => setSelectedTimeline(e.value)}
          options={[
            'Today','Yesterday','Last 7 Days','Last 14 Days','Last 28 Days','Last 30 Days','Last 90 Days','This Month','This Year','Custom'
          ].map(v => ({ label: v, value: v }))}
          placeholder="Timeframe"
          className="w-full"
        />
        {selectedTimeline === 'Custom' && (
          <Calendar
            value={customRange}
            onChange={(e) => setCustomRange(e.value)}
            selectionMode="range"
            readOnlyInput
            showIcon
            placeholder="Select date range"
            className="w-full mt-2"
          />
        )}
      </div>

      {/* Date Field */}
      <div className="date-field min-w-[220px]">
        <Dropdown
          value={selectedDateField}
          onChange={(e) => setSelectedDateField(e.value)}
          options={dateFieldOptions}
          optionLabel="label"
          optionValue="value"
          placeholder="Date Field"
          className="w-full"
          showClear
        />
      </div>

      {/* From */}
      <div className="from min-w-[150px]">
        <MultiSelect
          value={selectedFroms}
          onChange={(e) => setSelectedFroms(e.value)}
          options={fromSuggestions}
          optionLabel="label"
          optionValue="value"
          filter
          onFilter={onFromFilter}
          filterBy="label"
          display="chip"
          placeholder={selectedFroms.length > 0 
            ? `${selectedFroms.length} origins selected` 
            : 'Search departure...'}
          selectedItemsLabel="{0} origins selected"
          className="w-full text-sm"
          showSelectAll
          maxSelectedLabels={3}
          loading={isLoadingFrom}
          emptyFilterMessage="No origins found"
        />
      </div>

      {/* To */}
      <div className="to min-w-[150px]">
        <MultiSelect
          value={selectedTos}
          onChange={(e) => setSelectedTos(e.value)}
          options={toSuggestions}
          optionLabel="label"
          optionValue="value"
          filter
          onFilter={onToFilter}
          filterBy="label"
          display="chip"
          placeholder={selectedTos.length > 0 
            ? `${selectedTos.length} destinations selected` 
            : 'Search destination...'}
          selectedItemsLabel="{0} destinations selected"
          className="w-full text-sm"
          showSelectAll
          maxSelectedLabels={3}
          loading={isLoadingTo}
          emptyFilterMessage="No destinations found"
          disabled={loadingFilters}
        />
      </div>

      {/* Transport Type */}
      <div className="transport-type min-w-[150px]">
        <MultiSelect
          value={selectedTransportTypes}
          onChange={(e) => setSelectedTransportTypes(e.value)}
          options={useMemo(() => {
            const suggestionOptions = transportTypeSuggestions.map(s => ({
              label: s.label || s.transport_type || s,
              value: s.transport_type || s.value || s
            }));
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
          loading={isLoadingTransport}
          emptyFilterMessage="No transport types found"
        />
      </div>

      {/* Operator */}
      <div className="operator min-w-[150px]">
        <MultiSelect
          value={selectedOperators}
          onChange={(e) => setSelectedOperators(e.value)}
          options={useMemo(() => {
            const suggestionOptions = operatorSuggestions.map(s => ({
              label: s.label || s.operator_name || s,
              value: s.operator_name || s.value || s
            }));
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
            : 'Search operator...'}
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

      {/* Submit */}
      <div className="submit" style={{marginTop:'2px'}}>
        <Button label="Apply" icon="pi pi-check" onClick={handleRunQuery} style={{backgroundColor:'#007bff',color:'white',borderRadius:'5px',padding:'10px'}} />
      </div>
    </div>

    <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
      Enter Your Query
    </h2>
    <p className="text-sm text-gray-500">
      Set conditions to filter and analyze your data efficiently.
    </p>
  </div>

  {/* Error Message */}
  {error && (
    <div className="p-3 bg-red-100 text-red-800 border-round-md mb-4 text-sm font-medium">
      {error}
    </div>
  )}

  {/* Query Conditions */}
  <div className="flex flex-col gap-4 mb-6">
    {conditions.map((condition, index) => (
      <div
        key={index}
        className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50 p-4 rounded-lg shadow-sm"
      >
        {index > 0 && (
          <div className="md:col-span-1 text-gray-400 font-medium text-center hidden md:block">
            AND
          </div>
        )}

        {/* Field Dropdown */}
        <div className="md:col-span-3">
          <Dropdown
            value={condition.field}
            options={fields}
            onChange={(e) => updateCondition(index, 'field', e.value)}
            placeholder="Field"
            className="w-full"
          />
        </div>

        {/* Operator Dropdown */}
        <div className="md:col-span-3">
          <Dropdown
            value={condition.operator}
            options={operators}
            onChange={(e) => updateCondition(index, 'operator', e.value)}
            placeholder="Operator"
            className="w-full"
          />
        </div>

        {/* Value Input */}
        <div className="md:col-span-4">
          {['From', 'To'].includes(condition.field) ? (
            <AutoComplete
              value={condition.value}
              suggestions={suggestions}
              completeMethod={(e) => searchSuggestions(e, condition.field)}
              onChange={(e) => updateCondition(index, 'value', e.value)}
              placeholder={`Search ${condition.field}...`}
              className="w-full"
              dropdown
              forceSelection
            />
          ) : (
            <InputText
              value={condition.value}
              onChange={(e) => updateCondition(index, 'value', e.target.value)}
              placeholder="Value"
              className="w-full"
            />
          )}
        </div>

        {/* Remove Button */}
        <div className="md:col-span-1 flex justify-end">
          {conditions.length > 1 && (
            <Button
              icon="pi pi-times"
              className="p-button-rounded p-button-danger p-button-outlined"
              onClick={() => removeCondition(index)}
              tooltip="Remove"
            />
          )}
        </div>
      </div>
    ))}
  </div>

  {/* Actions */}
  <div className="flex flex-wrap gap-4 justify-end">
    <Button
      label="Add Condition"
      icon="pi pi-plus"
      className="p-button-info p-button-outlined"
      onClick={addCondition}
    />
    <Button
      label="Run Query"
      icon="pi pi-search"
      className="p-button-success"
      onClick={handleRunQuery}
      loading={loading}
    />
  </div>
</Card>

    

      {results.length > 0 && (
       <div className="max-w-screen-xl mx-auto px-4">
       <Card className="mt-6 shadow-3 border-round-lg overflow-hidden">
         {/* Header Section */}
         <div className="flex justify-between items-center p-4 border-bottom-1 surface-border">
           <div>
             <h2 className="text-xl font-semibold m-0">Query Results</h2>
             <p className="text-sm text-gray-600 mt-1">{results.length} records found</p>
           </div>
           <div className="flex gap-2">
             {/* <Button 
              
               icon="pi pi-chart-bar" 
               label="Visualize"
               className="p-button-outlined p-button-sm"
               style={{
                 backgroundColor: '#2acf7d',
                 color: 'white',
                 borderRadius: '6px',
                 padding: '8px 14px',
               }}
               onClick={handleVisualizeClick}
               disabled={results.length === 0}
             /> */}
             <Button 
               icon="pi pi-download" 
               label="Export"
               className="p-button-outlined p-button-sm"
               style={{
                 backgroundColor: '#24A0ed',
                 color: 'white',
                 borderRadius: '6px',
                 padding: '8px 14px',
               }}
               onClick={(e) => menuRef.current.toggle(e)}
               aria-controls="export_menu"
               aria-haspopup
               disabled={results.length === 0}
             />
             <Menu
               model={[
                 { label: 'Export as CSV', icon: 'pi pi-file', command: exportToCSV },
                 { label: 'Export as JSON', icon: 'pi pi-file-export', command: exportToJSON },
               ]}
               popup
               ref={menuRef}
               id="export_menu"
             />
           </div>
         </div>
     
         {/* Results Table */}
         <div className="w-full mt-8" style={{ minWidth: '100%', width: 'max-content', maxWidth: '100%' }}>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
             <div className="flex flex-col">
               <h2 className="text-xl sm:text-2xl font-semibold text-700">Query Results</h2>
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-sm font-medium">
                   {results.length} {results.length === 1 ? 'result' : 'results'} found
                 </span>
               </div>
             </div>
             {results.length > 0 && (
               <div className="flex items-center gap-2">
                 <Button
                   type="button"
                   icon="pi pi-download"
                   label="Export to CSV"
                   className="p-button-outlined p-button-sm"
                   onClick={exportToCSV}
                 />
               </div>
             )}
           </div>

           {/* Search Input */}
           <div className="relative w-full mb-4">
             <span className="p-input-icon-right w-full">
               <InputText
                 placeholder="Search results..."
                 className="p-inputtext-sm w-full"
                 style={{ paddingRight: '2rem' }}
               />
               <i className="pi pi-search" style={{ right: '1rem', color: '#6c757d', pointerEvents: 'none' }} />
             </span>
           </div>

           {loading ? (
             <div className="flex justify-center items-center p-8">
               <i className="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
               <span className="ml-2">Loading results...</span>
             </div>
           ) : error ? (
             <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
               <i className="pi pi-exclamation-triangle mr-2"></i>
               {error}
             </div>
           ) : results.length > 0 ? (
             <div className="relative rounded-lg border border-gray-200 bg-white w-full">
               <div className="overflow-x-auto" style={{ width: '100%', maxWidth: '100vw' }}>
                 <table className="text-sm text-left" style={{ minWidth: '100%', width: 'auto' }}>
                   <thead className="text-xs text-gray-700 bg-gray-50">
                     <tr>
                       {Object.keys(results[0]).map((key) => (
                         <th 
                           key={key}
                           className="px-6 py-3 font-medium text-gray-600 uppercase tracking-wider"
                           style={{ minWidth: '120px' }}
                         >
                           <div className="flex items-center justify-between">
                             <span>{key}</span>
                             <button 
                               className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                               onClick={() => handleSort(key)}
                             >
                               <i className="pi pi-sort-alt text-xs"></i>
                             </button>
                           </div>
                         </th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200">
                     {results.map((row, rowIndex) => (
                       <tr 
                         key={rowIndex}
                         className="bg-white hover:bg-gray-50 transition-colors"
                       >
                         {Object.entries(row).map(([key, value], colIndex) => (
                           <td 
                             key={`${rowIndex}-${colIndex}`}
                             className="px-6 py-4 whitespace-nowrap text-sm text-gray-800"
                             title={String(value)}
                           >
                             <div className="max-w-xs truncate" title={String(value)}>
                               {formatCellValue(value, key)}
                             </div>
                           </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               {/* Pagination */}
               {results.length > 10 && (
                 <div className="px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
                   <div className="flex-1 flex justify-between sm:hidden">
                     <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                       Previous
                     </button>
                     <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                       Next
                     </button>
                   </div>
                   <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                     <div>
                       <p className="text-sm text-gray-700">
                         Showing <span className="font-medium">1</span> to{' '}
                         <span className="font-medium">{Math.min(10, results.length)}</span> of{' '}
                         <span className="font-medium">{results.length}</span> results
                       </p>
                     </div>
                     <div>
                       <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                         <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                           <span className="sr-only">Previous</span>
                           <i className="pi pi-chevron-left"></i>
                         </button>
                         <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-blue-600 hover:bg-gray-50">
                           1
                         </button>
                         <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                           <span className="sr-only">Next</span>
                           <i className="pi pi-chevron-right"></i>
                         </button>
                       </nav>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           ) : (
             <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
               <i className="pi pi-inbox text-4xl text-gray-300 mb-2"></i>
               <p className="text-gray-600">No results found. Try adjusting your filters.</p>
             </div>
           )}
         </div>
       </Card>
     </div>
     )}
    </div>
  );
};

export default QueryBuilder;