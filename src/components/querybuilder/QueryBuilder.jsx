import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
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

// Corrected fieldOptions for the custom query dropdown
const fieldOptions = [
    { label: 'Departure Date', value: 'departure_time' },
    { label: 'Arrival Date', value: 'arrival_time' },
    { label: 'Duration', value: 'duration_min' }, // FIX 1: Corrected field name
    { label: 'Price', value: 'price_inr' },
    { label: 'Transport Type', value: 'transport_type' },
    { label: 'Operator', value: 'operator_name' },
    { label: 'Origin', value: 'origin' },
    { label: 'Destination', value: 'destination' },
    { label: 'Route URL', value: 'route_url' },
];

const operatorOptions = [
    { label: 'Equals', value: '=' },
    { label: 'Not Equals', value: '!=' },
    { label: 'Greater Than', value: '>' },
    { label: 'Less Than', value: '<' },
    { label: 'Contains', value: 'ILIKE' },
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
    const [filterOptions, setFilterOptions] = useState({ from: [], to: [], transportType: [], operator: [] });
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
    
    // This state is to control when a data fetch should happen
    const [triggerFetch, setTriggerFetch] = useState(0);

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
        urlParams.append('page', params.page + 1);
        urlParams.append('limit', params.rows);
        urlParams.append('sort_by', params.sortField);
        urlParams.append('sort_order', params.sortOrder === 1 ? 'ASC' : 'DESC');

        if (selectedFroms.length > 0) { urlParams.append('origin', selectedFroms.join(',')); }
        if (selectedTos.length > 0) { urlParams.append('destination', selectedTos.join(',')); }
        if (selectedTransportTypes.length > 0) { urlParams.append('transport_type', selectedTransportTypes.join(',')); }
        if (selectedOperators.length > 0) { urlParams.append('operator_name', selectedOperators.join(',')); }

        // Add custom query conditions as a JSON string
        if (conditions.some(c => c.field && c.operator && c.value)) {
            urlParams.append('query_conditions', JSON.stringify(conditions));
        }
        
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
    }, [fetchData, lazyParams, selectedFroms, selectedTos, selectedTransportTypes, selectedOperators, selectedTimeline, customRange, conditions, triggerFetch]);
    
    // This effect updates the URL whenever filters or conditions change
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        // Remove existing filter parameters before adding new ones
        ['origin', 'destination', 'transport_type', 'operator_name', 'timeline', 'query_conditions', 'first', 'rows', 'page', 'sort_by', 'sort_order'].forEach(param => params.delete(param));
        
        if (selectedFroms.length > 0) params.append('origin', selectedFroms.join(','));
        if (selectedTos.length > 0) params.append('destination', selectedTos.join(','));
        if (selectedTransportTypes.length > 0) params.append('transport_type', selectedTransportTypes.join(','));
        if (selectedOperators.length > 0) params.append('operator_name', selectedOperators.join(','));
        
        if (selectedTimeline && selectedTimeline !== 'Custom') {
          params.append('timeline', selectedTimeline);
        }
        
        if (conditions.some(c => c.field && c.operator && c.value)) {
            params.append('query_conditions', JSON.stringify(conditions));
        }

        params.append('first', lazyParams.first);
        params.append('rows', lazyParams.rows);
        params.append('page', lazyParams.page);
        params.append('sort_by', lazyParams.sortField);
        params.append('sort_order', lazyParams.sortOrder === 1 ? 'ASC' : 'DESC');

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
        
    }, [selectedFroms, selectedTos, selectedTransportTypes, selectedOperators, selectedTimeline, conditions, lazyParams]);

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

    const formatCellValue = (value, field) => {
        if (value === null || value === undefined) return '-';
        
        // Format Departure and Arrival dates
        if (field === 'departure_time' || field === 'arrival_time') {
            try {
                const date = new Date(value);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}-${month}-${year}`;
            } catch (e) {
                console.error(`Error formatting date for field ${field}:`, e);
                return 'Invalid Date';
            }
        }
        
        // Format price
        if (field === 'price_inr' && typeof value === 'number') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(value);
        }
        
        // Format duration
        if (field === 'duration_min' && typeof value === 'number') { // FIX 2: Corrected field name
            const hours = Math.floor(value / 60);
            const minutes = value % 60;
            return `${hours}h ${minutes}m`;
        }
        
        // Format URL
        if (field === 'route_url') {
            return <a href={value} target="_blank" rel="noopener noreferrer">View Route</a>;
        }
        
        return String(value);
    };

    const getColumns = () => {
        const columnsToShow = [
            { field: 'route_url', header: 'Route URL' },
            { field: 'travel_date', header: 'Travel Date' },
            { field: 'origin', header: 'Origin' },
            { field: 'destination', header: 'Destination' },
            { field: 'price_inr', header: 'Price' },
            { field: 'departure_time', header: 'Departure Date' },
            { field: 'arrival_time', header: 'Arrival Date' },
            { field: 'transport_type', header: 'Transport Type' },
            { field: 'duration_min', header: 'Duration' }, // FIX 3: Corrected field name
            { field: 'operator_name', header: 'Operator Name' },
            { field: 'provider', header: 'Provider' },
        ];
    
        return columnsToShow.map(col => (
            <Column
                key={col.field}
                field={col.field}
                header={col.header}
                body={(rowData) => formatCellValue(rowData[col.field], col.field)}
                sortable
            />
        ));
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
                                {condition.field === 'departure_time' || condition.field === 'arrival_time' ? (
                                    <Calendar
                                        value={condition.value ? new Date(condition.value.split('-').reverse().join('-')) : null}
                                        onChange={(e) => {
                                            const date = e.value;
                                            if (date) {
                                                const day = String(date.getDate()).padStart(2, '0');
                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                const year = date.getFullYear();
                                                updateCondition(index, 'value', `${day}-${month}-${year}`);
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
                            onPage={(e) => {
                                setLazyParams({ ...e, sortField: lazyParams.sortField, sortOrder: lazyParams.sortOrder });
                            }}
                            onSort={(e) => {
                                setLazyParams({ ...e });
                            }}
                            scrollable 
                            scrollHeight="400px" 
                        >
                            {getColumns()}
                        </DataTable>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default QueryBuilder;