import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

// Custom CSS for pagination
const customPaginationStyle = `
    .p-paginator {
        padding: 0.5rem;
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        justify-content: center;
    }
    .p-paginator .p-paginator-pages {
        display: flex;
        flex-wrap: nowrap;
        margin: 0 0.5rem;
    }
    .p-paginator .p-paginator-pages .p-paginator-page.p-highlight,
    .p-paginator .p-paginator-pages .p-paginator-page.p-highlight:hover {
        background: #3b82f6 !important;
        color: white !important;
        border-radius: 50%;
        width: 2.5rem;
        height: 2.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 0.1rem;
    }
    .p-paginator .p-paginator-pages .p-paginator-page {
        min-width: 2.5rem;
        height: 2.5rem;
        margin: 0 0.1rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
    }
    .p-paginator .p-paginator-current {
        margin: 0 1rem;
        font-weight: 600;
        white-space: nowrap;
    }
    .p-paginator .p-paginator-first,
    .p-paginator .p-paginator-prev,
    .p-paginator .p-paginator-next,
    .p-paginator .p-paginator-last {
        min-width: 2.5rem;
        height: 2.5rem;
        margin: 0 0.1rem;
    }
    .p-paginator .p-dropdown {
        margin-left: 0.5rem;
        height: 2.5rem;
    }
`;

// Define the new timeline options
const timelineOptions = [
    'Today',
    'Tomorrow',
    'Next 7 Days',
    'Next 14 Days',
    'This Month',
    'This Year',
    'Custom'
];

// Corrected fieldOptions for the custom query dropdown
const fieldOptions = [
    { label: 'Departure Time', value: 'departure_time' },
    { label: 'Arrival Time', value: 'arrival_time' },
    { label: 'Duration', value: 'duration_min' }, 
    { label: 'Price', value: 'price_inr' },
];

const operatorOptions = [
    { label: 'Equals', value: '=' },
    { label: 'Not Equals', value: '!=' },
    { label: 'Greater Than', value: '>' },
    { label: 'Less Than', value: '<' },
    { label: 'Contains', value: 'ILIKE' }
];

// Helper function to parse URL params into an array
const getParamsAsArray = (paramName) => {
    const params = new URLSearchParams(window.location.search);
    const paramValue = params.get(paramName);
    return paramValue ? paramValue.split(',') : [];
};

// Helper function to get a single URL param
const getSingleParam = (paramName, defaultValue) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(paramName) || defaultValue;
};

const QueryBuilder = () => {
    // State management for query and filters, now initialized from URL
    const [selectedTimeline, setSelectedTimeline] = useState(getSingleParam('timeline', 'Next 14 Days'));
    const [selectedFroms, setSelectedFroms] = useState(getParamsAsArray('origin'));
    const [selectedTos, setSelectedTos] = useState(getParamsAsArray('destination'));
    const [selectedTransportTypes, setSelectedTransportTypes] = useState(getParamsAsArray('transport_type'));
    const [selectedOperators, setSelectedOperators] = useState(getParamsAsArray('operator_name'));
    // Initialize selectedProviders from URL params or default to both providers if none specified
    const [selectedProviders, setSelectedProviders] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const providers = params.get('provider');
        return providers ? providers.split(',').map(p => p.trim()) : ['12go', 'bookaway'];
    });
    const [filterOptions, setFilterOptions] = useState({ from: [], to: [], transportType: [], operator: [], provider: [] });
    const [loadingFilters, setLoadingFilters] = useState(false);
    const [customRange, setCustomRange] = useState(null); 
    
    // State management for custom conditions
    const initialConditions = useMemo(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const conditionsString = params.get('query_conditions');
            return conditionsString ? JSON.parse(conditionsString) : [{ field: '', operator: '=', value: '' }];
        } catch {
            return [{ field: '', operator: '=', value: '' }];
        }
    }, []);
    const [conditions, setConditions] = useState(initialConditions);

    // State management for results
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalRecords, setTotalRecords] = useState(0);
    const [error, setError] = useState('');
    
    // State for lazy pagination and sorting 
    const [lazyParams, setLazyParams] = useState(() => {
        const first = parseInt(getSingleParam('first', 0), 10);
        const rows = parseInt(getSingleParam('rows', 50), 10);
        return {
            first: first,
            rows: rows,
            page: Math.floor(first / rows),
            sortField: getSingleParam('sort_by', 'departure_time'),
            sortOrder: getSingleParam('sort_order', 'ASC') === 'DESC' ? -1 : 1,
        };
    });
    
    const [fromSuggestions, setFromSuggestions] = useState([]);
    const [toSuggestions, setToSuggestions] = useState([]);
    const [transportTypeSuggestions, setTransportTypeSuggestions] = useState([]);
    const [operatorSuggestions, setOperatorSuggestions] = useState([]);
    const providerOptions = [
        { label: '12go', value: '12go' },
        { label: 'Bookaway', value: 'bookaway' }
    ];
    
    // This state is to control when a data fetch should happen
    const [triggerFetch, setTriggerFetch] = useState(0);

    // Add custom pagination styles
    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.textContent = customPaginationStyle;
        document.head.appendChild(styleElement);
        
        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    const fetchFilterOptions = useCallback(async () => {
        setLoadingFilters(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/filters`);
            const data = await response.json();
            
            const parseCSV = (str) => {
              if (!str) return [];
              return str.split(',').map(item => ({ label: item.trim(), value: item.trim() }));
            };
            
            const responseData = data.data || data;
            
            const origins = parseCSV(responseData.origin);
            const destinations = parseCSV(responseData.destination);
            const transportTypes = parseCSV(responseData.transport_type);
            const operators = parseCSV(responseData.operator_name);
            
            setFilterOptions({
                from: origins,
                to: destinations,
                transportType: transportTypes,
                operator: operators,
                provider: providerOptions
            });
            
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

    const fetchData = useCallback(async (params) => {
        setLoading(true);
        setError('');
        
        const urlParams = new URLSearchParams();
        const page = Number.isInteger(params.page) ? params.page : 0;
        const rows = Number.isInteger(params.rows) ? params.rows : 50; // Default to 50 if invalid
        
        urlParams.append('page', page + 1);
        urlParams.append('limit', rows);
        urlParams.append('sort_by', params.sortField);
        urlParams.append('sort_order', params.sortOrder === 1 ? 'ASC' : 'DESC');

        // Add provider filter if any provider is selected
        if (selectedProviders.length > 0) {
            urlParams.append('provider', selectedProviders.join(','));
        }

        if (selectedFroms.length > 0) { urlParams.append('origin', selectedFroms.join(',')); }
        if (selectedTos.length > 0) { urlParams.append('destination', selectedTos.join(',')); }
        if (selectedTransportTypes.length > 0) { urlParams.append('transport_type', selectedTransportTypes.join(',')); }
        if (selectedOperators.length > 0) { urlParams.append('operator_name', selectedOperators.join(',')); }

        // Add custom query conditions as a JSON string
        if (conditions.some(c => c.field && c.operator && c.value)) {
            urlParams.append('query_conditions', JSON.stringify(conditions));
        }
        
        if (selectedTimeline === 'Custom' && customRange) {
            // Format dates to YYYY-MM-DD in local timezone
            const formatDate = (date) => {
                const d = new Date(date);
                const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
                return localDate.toISOString().split('T')[0];
            };
            
            let dateConditions = [...conditions];
            
            // Handle both single date and date range
            if (customRange[0] && !customRange[1]) {
                // Single date selection
                const selectedDate = formatDate(customRange[0]);
                urlParams.append('start_date', selectedDate);
                urlParams.append('end_date', selectedDate);
                
                dateConditions.push(
                    {
                        field: 'travel_date',
                        operator: '=',
                        value: selectedDate
                    }
                );
            } else if (customRange[0] && customRange[1]) {
                // Date range selection
                const startDate = formatDate(customRange[0]);
                const endDate = formatDate(new Date(customRange[1].getTime() + 24 * 60 * 60 * 1000 - 1));
                
                urlParams.append('start_date', startDate);
                urlParams.append('end_date', endDate);
                
                dateConditions.push(
                    {
                        field: 'travel_date',
                        operator: '>=',
                        value: startDate
                    },
                    {
                        field: 'travel_date',
                        operator: '<=',
                        value: endDate
                    }
                );
            }
            
            if (dateConditions.length > 0) {
                urlParams.set('query_conditions', JSON.stringify(dateConditions));
            }
        } else if (selectedTimeline) {
            urlParams.append('timeline', selectedTimeline);
        }

        try {
            const apiUrl = `${import.meta.env.VITE_API_URL}/api/combined-trips?${urlParams.toString()}`;
            console.log('API Request URL:', apiUrl);

            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            const result = await response.json();

            if (result.success === false) {
                throw new Error(result.error || 'Failed to fetch data');
            }

            setResults(result.data || []);
            const newTotalRecords = result.total || 0;
            setTotalRecords(newTotalRecords);
            
            // Add this line to log the total records received from the API
            console.log('API returned Total Records:', newTotalRecords, 'Full response:', result);

            // FIX: If the current 'first' index is out of bounds for the new total, reset pagination
            if (params.first >= newTotalRecords && newTotalRecords > 0) {
                setLazyParams(prev => ({ ...prev, first: 0, page: 0 }));
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.message || 'An error occurred while fetching data');
        } finally {
            setLoading(false);
        }
    }, [selectedFroms, selectedTos, selectedTransportTypes, selectedOperators, selectedTimeline, customRange, conditions]);

    // This effect runs ONLY on component mount to fetch filter options
    useEffect(() => {
        fetchFilterOptions();
    }, [fetchFilterOptions]);
    
    // This effect handles both initial data fetch and subsequent fetches when filters change
    useEffect(() => {
        fetchData(lazyParams);
        // This effect depends on all filters and lazyParams to re-run
        // It's the central point for triggering data fetches
    }, [fetchData, lazyParams, selectedFroms, selectedTos, selectedTransportTypes, selectedOperators, selectedProviders, selectedTimeline, customRange, conditions, triggerFetch]);
    
    // This effect updates the URL whenever filters or conditions change
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        // Remove existing filter parameters before adding new ones
        ['origin', 'destination', 'transport_type', 'operator_name', 'provider', 'timeline', 'query_conditions', 'first', 'rows', 'page', 'sort_by', 'sort_order', 'start_date', 'end_date'].forEach(param => params.delete(param));
        
        if (selectedFroms.length > 0) params.append('origin', selectedFroms.join(','));
        if (selectedTos.length > 0) params.append('destination', selectedTos.join(','));
        if (selectedTransportTypes.length > 0) params.append('transport_type', selectedTransportTypes.join(','));
        if (selectedOperators.length > 0) params.append('operator_name', selectedOperators.join(','));
        if (selectedProviders.length > 0) params.append('provider', selectedProviders.join(','));
        
        if (selectedTimeline && selectedTimeline !== 'Custom') {
          params.append('timeline', selectedTimeline);
        } else if (selectedTimeline === 'Custom' && customRange && customRange[0] && customRange[1]) {
            const formatDate = (date) => {
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            params.append('start_date', formatDate(customRange[0]));
            params.append('end_date', formatDate(customRange[1]));
        }
        
        if (conditions.some(c => c.field && c.operator && c.value)) {
            params.append('query_conditions', JSON.stringify(conditions));
        }

        // Ensure we have valid numbers for pagination
        const first = Number.isInteger(lazyParams.first) ? lazyParams.first : 0;
        const rows = Number.isInteger(lazyParams.rows) ? lazyParams.rows : 50;
        const page = Number.isInteger(lazyParams.page) ? lazyParams.page : 0;
        
        params.append('first', first);
        params.append('rows', rows);
        params.append('page', page);
        params.append('sort_by', lazyParams.sortField || 'departure_time');
        params.append('sort_order', lazyParams.sortOrder === 1 ? 'ASC' : 'DESC');

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
        
    }, [selectedFroms, selectedTos, selectedTransportTypes, selectedOperators, selectedProviders, selectedTimeline, customRange, conditions, lazyParams]);

    const handleRunQuery = () => {
        // Reset to first page and trigger a new fetch
        setLazyParams(prev => ({ ...prev, first: 0, page: 0 }));
        setTriggerFetch(prev => prev + 1);
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
    
    // A mapping of field names to their display properties
    const columnMap = {
        'route_url': { header: 'Route URL', body: (rowData) => <a href={rowData.route_url} target="_blank" rel="noopener noreferrer">View Route</a> },
        'travel_date': { 
            header: 'Travel Date',
            body: (rowData) => {
                try {
                    const date = new Date(rowData.travel_date);
                    // Format as YYYY-MM-DD in local timezone
                    return date.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
                } catch (e) {
                    return rowData.travel_date || 'Invalid Date';
                }
            }
        },
        'origin': { header: 'Origin' },
        'destination': { header: 'Destination' },
        'price_inr': { header: 'Price', body: (rowData) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(rowData.price_inr) },
        'departure_time': { header: 'Departure Time', body: (rowData) => {
            try {
                const date = new Date(rowData.departure_time);
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            } catch (e) {
                return 'Invalid Time';
            }
        }},
        'arrival_time': { header: 'Arrival Time', body: (rowData) => {
            try {
                const date = new Date(rowData.arrival_time);
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            } catch (e) {
                return 'Invalid Time';
            }
        }},
        'transport_type': { header: 'Transport Type' },
        'duration_min': { header: 'Duration', body: (rowData) => {
            if (typeof rowData.duration_min === 'number') {
                const hours = Math.floor(rowData.duration_min / 60);
                const minutes = rowData.duration_min % 60;
                return `${hours}h ${minutes}m`;
            }
            return rowData.duration_min;
        }},
        'operator_name': { header: 'Operator Name' },
        'provider': { header: 'Provider' },
    };

    const getColumns = (conditions) => {
        const dynamicFields = conditions.filter(c => c.field).map(c => c.field);
        
        // Define a set of essential columns that should always be visible
        const essentialFields = new Set([
            'route_url', 'travel_date', 'origin', 'destination', 'price_inr', 
            'departure_time', 'arrival_time','duration_min', 'provider','transport_type', 'operator_name'
        ]);
        
        // Combine essential fields with dynamically selected fields
        const allFields = [...new Set([...essentialFields, ...dynamicFields])];
        
        return allFields.map(field => {
            const columnInfo = columnMap[field];
            if (!columnInfo) return null; // Fallback for fields not in the map
            
            return (
                <Column
                    key={field}
                    field={field}
                    header={columnInfo.header}
                    body={columnInfo.body}
                    sortable
                />
            );
        }).filter(Boolean); // Filter out any null values
    };

    return (
        <div className="query-builder">
            <Card className="shadow-4 border-round-2xl p-6 bg-white/80 backdrop-blur-sm w-full">
                <div className="mb-6">
                    <div className="dropdownoption flex flex-row gap-2 flex-wrap mb-8">
                        <div className="timeline min-w-[260px]">
                            <Dropdown
                                value={selectedTimeline}
                                onChange={(e) => setSelectedTimeline(e.value)}
                                options={timelineOptions.map(v => ({ label: v, value: v }))}
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
                        <div className="from min-w-[150px]">
                            <MultiSelect
                                value={selectedFroms}
                                onChange={(e) => setSelectedFroms(e.value)}
                                options={fromSuggestions}
                                optionLabel="label"
                                optionValue="value"
                                filter
                                display="chip"
                                placeholder="Search departure..."
                                selectedItemsLabel="{0} origins selected"
                                className="w-full text-sm"
                                showSelectAll
                                maxSelectedLabels={3}
                                loading={loadingFilters}
                                emptyFilterMessage="No origins found"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="provider min-w-[150px]">
                            <MultiSelect
                                value={selectedProviders}
                                onChange={(e) => {
                                    setSelectedProviders(e.value);
                                    // Update URL with the new provider selection
                                    const url = new URL(window.location);
                                    if (e.value && e.value.length > 0) {
                                        url.searchParams.set('provider', e.value.join(','));
                                    } else {
                                        url.searchParams.delete('provider');
                                    }
                                    window.history.pushState({}, '', url);
                                    // Trigger data fetch
                                    setLazyParams(prev => ({ ...prev, page: 0 }));
                                }}
                                options={providerOptions}
                                optionLabel="label"
                                optionValue="value"
                                display="chip"
                                placeholder="Select providers..."
                                selectedItemsLabel="{0} providers selected"
                                className="w-full text-sm"
                                showSelectAll
                                maxSelectedLabels={2}
                            />
                        </div>
                        <div className="to min-w-[150px]">
                            <MultiSelect
                                value={selectedTos}
                                onChange={(e) => setSelectedTos(e.value)}
                                options={toSuggestions}
                                optionLabel="label"
                                optionValue="value"
                                filter
                                display="chip"
                                placeholder="Search destination..."
                                selectedItemsLabel="{0} destinations selected"
                                className="w-full text-sm"
                                showSelectAll
                                maxSelectedLabels={3}
                                loading={loadingFilters}
                                emptyFilterMessage="No destinations found"
                            />
                        </div>
                        <div className="transport-type min-w-[150px]">
                            <MultiSelect
                                value={selectedTransportTypes}
                                onChange={(e) => setSelectedTransportTypes(e.value)}
                                options={transportTypeSuggestions}
                                optionLabel="label"
                                optionValue="value"
                                display="chip"
                                placeholder="Search transport type..."
                                selectedItemsLabel="{0} transport types selected"
                                className="w-full text-sm"
                                filter
                                showSelectAll
                                maxSelectedLabels={3}
                                loading={loadingFilters}
                                emptyFilterMessage="No transport types found"
                            />
                        </div>
                        <div className="operator min-w-[150px]">
                            <MultiSelect
                                value={selectedOperators}
                                onChange={(e) => setSelectedOperators(e.value)}
                                options={operatorSuggestions}
                                optionLabel="label"
                                optionValue="value"
                                display="chip"
                                placeholder="Search operator..."
                                selectedItemsLabel="{0} operators selected"
                                className="w-full text-sm"
                                filter
                                showSelectAll
                                maxSelectedLabels={3}
                                loading={loadingFilters}
                                emptyFilterMessage="No operators found"
                            />
                        </div>
                    </div>
                </div>

                <div className="my-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        Custom Query Conditions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {conditions.map((condition, index) => (
                            <div key={index} className="p-inputgroup mb-3 flex-wrap">
                                <Dropdown
                                    value={condition.field}
                                    onChange={(e) => updateCondition(index, 'field', e.value)}
                                    options={fieldOptions}
                                    placeholder="Field"
                                    className="p-inputgroup-addon flex-grow-1"
                                />
                                <Dropdown
                                    value={condition.operator}
                                    onChange={(e) => updateCondition(index, 'operator', e.value)}
                                    options={operatorOptions}
                                    placeholder="Operator"
                                    className="p-inputgroup-addon flex-grow-1"
                                />
                                {/* Conditional rendering for Calendar based on field */}
                                {condition.field === 'departure_time' || condition.field === 'arrival_time' ? (
                                    <Calendar
                                        value={condition.value ? new Date(`1970-01-01T${condition.value}`) : null}
                                        onChange={(e) => {
                                            const date = e.value;
                                            if (date) {
                                                const hours = String(date.getHours()).padStart(2, '0');
                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                const seconds = String(date.getSeconds()).padStart(2, '0');
                                                updateCondition(index, 'value', `${hours}:${minutes}:${seconds}`);
                                            } else {
                                                updateCondition(index, 'value', '');
                                            }
                                        }}
                                        timeOnly
                                        showTime
                                        placeholder="Select a time"
                                        readOnlyInput
                                    />
                                ) : condition.field === 'travel_date' ? (
                                    <Calendar
                                        value={condition.value ? new Date(condition.value) : null}
                                        onChange={(e) => {
                                            const date = e.value;
                                            if (date) {
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const year = date.getFullYear();
                                                updateCondition(index, 'value', `${year}-${month}-${day}`);
                                            } else {
                                                updateCondition(index, 'value', '');
                                            }
                                        }}
                                        dateFormat="dd-mm-yy"
                                        placeholder="Select a date"
                                        readOnlyInput
                                    />
                                ) : (
                                    <InputText
                                        value={condition.value}
                                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                                        placeholder="Value"
                                        className="p-inputtext-sm flex-grow-2"
                                    />
                                )}
                                {conditions.length > 1 && (
                                    <Button
                                        icon="pi pi-minus"
                                        className="p-button-danger p-button-sm p-inputgroup-addon"
                                        onClick={() => removeCondition(index)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label="Add Condition"
                            icon="pi pi-plus"
                            className="p-button-outlined p-button-sm"
                            onClick={addCondition}
                        />
                         <Button
                            label="Apply"
                            icon="pi pi-check"
                            onClick={handleRunQuery}
                            loading={loading}
                            style={{backgroundColor:'#007bff',color:'white',borderRadius:'5px',padding:'10px'}}
                        />
                    </div>
                </div>
            </Card>
            
            <div className="mt-8">
                <Card className="shadow-4 border-round-2xl p-6 bg-white/80 backdrop-blur-sm">
                    <div className="p-4 border-bottom-1 surface-border">
                        <h2 className="text-xl font-semibold m-0">Query Results</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {totalRecords > 0 ? `${totalRecords} records found` : 'No records found'}
                        </p>
                    </div>
                    {error && (
                        <div className="p-3 bg-red-100 text-red-800 border-round-md mb-4 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    <div className="card">
                        <DataTable
                            value={results}
                            loading={loading}
                            paginator
                            rows={lazyParams.rows}
                            first={lazyParams.first}
                            rowsPerPageOptions={[10, 25, 50]}
                            lazy
                            totalRecords={totalRecords}
                            tableStyle={{ minWidth: '50rem' }}
                            emptyMessage="No results to display."
                            sortField={lazyParams.sortField}
                            sortOrder={lazyParams.sortOrder}
                            onPage={(e) => {
                                const newPage = Math.floor(e.first / e.rows);
                                // Update URL with new pagination state first
                                const url = new URL(window.location);
                                url.searchParams.set('first', e.first);
                                url.searchParams.set('rows', e.rows);
                                url.searchParams.set('page', newPage);
                                window.history.pushState({}, '', url);
                                
                                // Then update state and trigger fetch
                                setLazyParams(prev => ({
                                    ...prev,
                                    first: e.first,
                                    rows: e.rows,
                                    page: newPage
                                }));
                                setTriggerFetch(prev => prev + 1);
                            }}
                            onSort={(e) => {
                                // Update URL with sort parameters
                                const url = new URL(window.location);
                                url.searchParams.set('sort_by', e.sortField);
                                url.searchParams.set('sort_order', e.sortOrder === 1 ? 'ASC' : 'DESC');
                                url.searchParams.set('first', '0');
                                url.searchParams.set('page', '0');
                                window.history.pushState({}, '', url);
                                
                                // Then update state and trigger fetch
                                setLazyParams(prev => ({
                                    ...prev,
                                    sortField: e.sortField,
                                    sortOrder: e.sortOrder,
                                    first: 0,
                                    page: 0
                                }));
                                setTriggerFetch(prev => prev + 1);
                            }}
                            scrollable 
                            scrollHeight="400px"
                            sortMode="single"
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} records"
                        >
                            {getColumns(conditions)}
                        </DataTable>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default QueryBuilder;