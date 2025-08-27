import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { AutoComplete } from 'primereact/autocomplete';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import { Menu } from 'primereact/menu';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { saveAs } from 'file-saver';

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
    const [conditions, setConditions] = useState([{ field: '', operator: '=', value: '' }]);
    const [selectedTimeline, setSelectedTimeline] = useState(getSingleParam('timeline', 'Next 14 Days'));
    const [selectedFroms, setSelectedFroms] = useState(getParamsAsArray('origin'));
    const [selectedTos, setSelectedTos] = useState(getParamsAsArray('destination'));
    const [selectedTransportTypes, setSelectedTransportTypes] = useState(getParamsAsArray('transport_type'));
    const [selectedOperators, setSelectedOperators] = useState(getParamsAsArray('operator_name'));
    const [filterOptions, setFilterOptions] = useState({ from: [], to: [], transportType: [], operator: [] });
    const [loadingFilters, setLoadingFilters] = useState(false);
    const [customRange, setCustomRange] = useState(null); 
    
    // State management for results
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalRecords, setTotalRecords] = useState(0);
    const [error, setError] = useState('');
    
    // State for lazy pagination and sorting 
    const [lazyParams, setLazyParams] = useState({
        first: parseInt(getSingleParam('first', 0), 10),
        rows: parseInt(getSingleParam('rows', 50), 10),
        page: parseInt(getSingleParam('page', 0), 10),
        sortField: getSingleParam('sort_by', 'departure_time'),
        sortOrder: getSingleParam('sort_order', 'ASC') === 'DESC' ? -1 : 1,
    });
    
    const [fromSuggestions, setFromSuggestions] = useState([]);
    const [toSuggestions, setToSuggestions] = useState([]);
    const [transportTypeSuggestions, setTransportTypeSuggestions] = useState([]);
    const [operatorSuggestions, setOperatorSuggestions] = useState([]);

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
                operator: operators
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
        urlParams.append('page', params.page + 1); // DataTable page is 0-indexed, API is 1-indexed
        urlParams.append('limit', params.rows);
        urlParams.append('sort_by', params.sortField);
        urlParams.append('sort_order', params.sortOrder === 1 ? 'ASC' : 'DESC');

        if (selectedFroms.length > 0) { urlParams.append('origin', selectedFroms.join(',')); }
        if (selectedTos.length > 0) { urlParams.append('destination', selectedTos.join(',')); }
        if (selectedTransportTypes.length > 0) { urlParams.append('transport_type', selectedTransportTypes.join(',')); }
        if (selectedOperators.length > 0) { urlParams.append('operator_name', selectedOperators.join(',')); }
        
        if (selectedTimeline === 'Custom' && customRange && customRange[0] && customRange[1]) {
            const formatDate = (date) => {
                const d = new Date(date);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${year}-${month}-${day}`;
            };
            urlParams.append('start_date', formatDate(customRange[0]));
            urlParams.append('end_date', formatDate(customRange[1]));
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
            setTotalRecords(result.pagination.total);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            setError(error.message || 'An error occurred while fetching data');
        } finally {
            setLoading(false);
        }
    }, [selectedFroms, selectedTos, selectedTransportTypes, selectedOperators, selectedTimeline, customRange]);

    // 1. Fetch filter options on mount (runs once)
    useEffect(() => {
        fetchFilterOptions();
    }, [fetchFilterOptions]);
    
    // 2. This effect runs ONLY on component mount to read URL params and set initial state.
    // It's the only place where fetchData is called directly on load.
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const newFroms = urlParams.get('origin') ? urlParams.get('origin').split(',') : [];
        const newTos = urlParams.get('destination') ? urlParams.get('destination').split(',') : [];
        const newTransportTypes = urlParams.get('transport_type') ? urlParams.get('transport_type').split(',') : [];
        const newOperators = urlParams.get('operator_name') ? urlParams.get('operator_name').split(',') : [];
        const newTimeline = urlParams.get('timeline') || 'Next 14 Days';
        
        setSelectedFroms(newFroms);
        setSelectedTos(newTos);
        setSelectedTransportTypes(newTransportTypes);
        setSelectedOperators(newOperators);
        setSelectedTimeline(newTimeline);
        
        const newLazyParams = {
            first: parseInt(urlParams.get('first') || 0, 10),
            rows: parseInt(urlParams.get('rows') || 50, 10),
            page: parseInt(urlParams.get('page') || 0, 10),
            sortField: urlParams.get('sort_by') || 'departure_time',
            sortOrder: urlParams.get('sort_order') === 'DESC' ? -1 : 1,
        };
        setLazyParams(newLazyParams);
        
        // Initial data fetch based on URL params
        fetchData(newLazyParams);
    }, []); // Empty dependency array means it runs once on mount
    
    // 3. This effect updates the URL whenever filters change, but does NOT trigger a fetch
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        // Remove existing filter parameters before adding new ones
        ['origin', 'destination', 'transport_type', 'operator_name', 'timeline'].forEach(param => params.delete(param));
        
        if (selectedFroms.length > 0) params.append('origin', selectedFroms.join(','));
        if (selectedTos.length > 0) params.append('destination', selectedTos.join(','));
        if (selectedTransportTypes.length > 0) params.append('transport_type', selectedTransportTypes.join(','));
        if (selectedOperators.length > 0) params.append('operator_name', selectedOperators.join(','));
        
        if (selectedTimeline && selectedTimeline !== 'Custom') {
          params.append('timeline', selectedTimeline);
        }
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
        
    }, [selectedFroms, selectedTos, selectedTransportTypes, selectedOperators, selectedTimeline]);

    const handleRunQuery = () => {
        const newLazyParams = { ...lazyParams, first: 0, page: 0 };
        setLazyParams(newLazyParams);
        fetchData(newLazyParams);
    };

    const formatCellValue = (value, field) => {
        if (value === null || value === undefined) return '-';
        if (field === 'price' && typeof value === 'number') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        }
        if (field === 'duration' && typeof value === 'number') {
            const hours = Math.floor(value / 60);
            const minutes = value % 60;
            return `${hours}h ${minutes}m`;
        }
        return String(value);
    };

    const getColumns = (data) => {
        if (!data || data.length === 0) return [];
        const columns = Object.keys(data[0] || {});
        return columns.map(field => {
            return (
                <Column 
                    key={field} 
                    field={field} 
                    header={field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    body={(rowData) => formatCellValue(rowData[field], field)}
                    sortable
                />
            );
        });
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
                                onFilter={(e) => onFilter(e, 'from')}
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
                        <div className="to min-w-[150px]">
                            <MultiSelect
                                value={selectedTos}
                                onChange={(e) => setSelectedTos(e.value)}
                                options={toSuggestions}
                                optionLabel="label"
                                optionValue="value"
                                filter
                                onFilter={(e) => onFilter(e, 'to')}
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
                                onFilter={(e) => onFilter(e, 'transport')}
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
                                onFilter={(e) => onFilter(e, 'operator')}
                                showSelectAll
                                maxSelectedLabels={3}
                                loading={loadingFilters}
                                emptyFilterMessage="No operators found"
                            />
                        </div>
                        <div className="submit" style={{marginTop:'2px'}}>
                            <Button label="Apply" icon="pi pi-check" onClick={handleRunQuery} loading={loading} style={{backgroundColor:'#007bff',color:'white',borderRadius:'5px',padding:'10px'}} />
                        </div>
                    </div>

                    <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                        Enter Your Query
                    </h2>
                    <p className="text-sm text-gray-500">
                        Set conditions to filter and analyze your data efficiently.
                    </p>
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
                            onPage={(e) => {
                                setLazyParams({ ...e, sortField: lazyParams.sortField, sortOrder: lazyParams.sortOrder });
                                fetchData({ ...e, sortField: lazyParams.sortField, sortOrder: lazyParams.sortOrder });
                            }}
                            onSort={(e) => {
                                setLazyParams({ ...e });
                                fetchData({ ...e });
                            }}
                            scrollable 
                            scrollHeight="400px" 
                        >
                            {getColumns(results)}
                        </DataTable>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default QueryBuilder;