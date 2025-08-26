import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Menu } from 'primereact/menu';
import { AutoComplete } from 'primereact/autocomplete';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import { saveAs } from 'file-saver';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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
  const [conditions, setConditions] = useState([{ field: '', operator: '=', value: '' }]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const menuRef = useRef(null);

  // Header filter states
  const [selectedTimeline, setSelectedTimeline] = useState('Last 14 Days');
  const [selectedFroms, setSelectedFroms] = useState([]);
  const [selectedTos, setSelectedTos] = useState([]);
  const [selectedTransportTypes, setSelectedTransportTypes] = useState([]);
  const [selectedOperators, setSelectedOperators] = useState([]);
  
  // Loading states
  const [loadingFroms, setLoadingFroms] = useState(false);
  const [loadingTos, setLoadingTos] = useState(false);
  const [loadingTransportTypes, setLoadingTransportTypes] = useState(false);
  const [loadingOperators, setLoadingOperators] = useState(false);
  
  // Options states
  const [fromOptions, setFromOptions] = useState([]);
  const [toOptions, setToOptions] = useState([]);
  const [transportTypeOptions, setTransportTypeOptions] = useState([]);
  const [operatorOptions, setOperatorOptions] = useState([]);
  const [customRange, setCustomRange] = useState(null); // [startDate, endDate]
  const [selectedDateField, setSelectedDateField] = useState('');

  // Build date field options from dataset keys that look like dates/times
  const dateFieldOptions = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const keys = Array.from(new Set(data.flatMap(obj => Object.keys(obj || {}))));
    const candidates = keys.filter(k => /date|time/i.test(k));
    return candidates.map(k => ({ label: k, value: k }));
  }, [data]);

  // Default the date field to 'Date' if present
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

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (field, query = '', setLoadingFn, setOptions) => {
    if (!query || query.length < 2) return;
    setLoadingFn(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/12go/search?field=${field}&q=${encodeURIComponent(query)}`);
      const s = response.data?.results || [];
      const formattedOptions = s.map(item => ({
        label: item[field] || item.label || item.value || item,
        value: item[field] || item.value || item
      }));
      setOptions(formattedOptions);
    } catch (error) {
      console.error(`Error fetching ${field} suggestions:`, error);
      setOptions([]);
    } finally {
      setLoadingFn(false);
    }
  }, []);

  // Fetch filter options on component mount
  useEffect(() => {
    const fetchInitialOptions = async () => {
      try {
        const [fromRes, toRes, transportRes, operatorRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/filters?field=from`),
          axios.get(`${API_BASE_URL}/api/filters?field=to`),
          axios.get(`${API_BASE_URL}/api/filters?field=transport_type`),
          axios.get(`${API_BASE_URL}/api/filters?field=operator_name`)
        ]);

        setFromOptions(formatFilterOptions(fromRes.data));
        setToOptions(formatFilterOptions(toRes.data));
        setTransportTypeOptions(formatFilterOptions(transportRes.data));
        setOperatorOptions(formatFilterOptions(operatorRes.data));
      } catch (error) {
        console.error('Error fetching initial filter options:', error);
      }
    };

    fetchInitialOptions();
  }, []);

  const formatFilterOptions = (dataStr) => {
    if (!dataStr) return [];
    return dataStr
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(item => ({ label: item, value: item }));
  };

  // Search handlers for each field (header MultiSelect async loading)
  const searchFroms = (event) => {
    fetchSuggestions('from', event.query, setLoadingFroms, setFromOptions);
  };

  const searchTos = (event) => {
    fetchSuggestions('to', event.query, setLoadingTos, setToOptions);
  };

  const searchTransportTypes = (event) => {
    fetchSuggestions('transport_type', event.query, setLoadingTransportTypes, setTransportTypeOptions);
  };

  const searchOperators = (event) => {
    fetchSuggestions('operator_name', event.query, setLoadingOperators, setOperatorOptions);
  };

  // Universal AutoComplete search used in the conditions rows
  const searchSuggestions = (event, fieldLabel) => {
    const q = (event?.query || '').toLowerCase();
    const base = (opts) => (opts || []).filter(o => (o?.label || '').toLowerCase().includes(q)).map(o => o.value || o.label);

    if (fieldLabel === 'From') {
      setSuggestions(base(fromOptions));
    } else if (fieldLabel === 'To') {
      setSuggestions(base(toOptions));
    } else if (fieldLabel === 'Operator') {
      setSuggestions(base(operatorOptions));
    } else if (fieldLabel === 'Transport Type') {
      setSuggestions(base(transportTypeOptions));
    } else {
      setSuggestions([]); // fallback
    }
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

  const runQuery = () => {
    setError('');
    setLoading(true);
    if (!data || !Array.isArray(data)) {
      setError('No data available to query');
      setLoading(false);
      return;
    }

    // 1) Apply header filters first
    const presets = {
      'Today': () => {
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);
        return { start, end };
      },
      'Yesterday': () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const start = new Date(yesterday);
        start.setHours(0, 0, 0, 0);
        const end = new Date(yesterday);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      },
      'Last 7 Days': () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate()-6); start.setHours(0,0,0,0); end.setHours(23,59,59,999); return { start, end }; },
      'Last 14 Days': () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate()-13); start.setHours(0,0,0,0); end.setHours(23,59,59,999); return { start, end }; },
      'Last 28 Days': () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate()-27); start.setHours(0,0,0,0); end.setHours(23,59,59,999); return { start, end }; },
      'Last 30 Days': () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate()-29); start.setHours(0,0,0,0); end.setHours(23,59,59,999); return { start, end }; },
      'Last 90 Days': () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate()-89); start.setHours(0,0,0,0); end.setHours(23,59,59,999); return { start, end }; },
      'This Month': () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); const end = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999); return { start, end }; },
      'This Year': () => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 1); const end = new Date(now.getFullYear(), 11, 31, 23,59,59,999); return { start, end }; },
    };

    const inSelected = (arr, val) => arr.length === 0 || arr.map(String).includes(String(val));
    const parseDate = (v) => {
      if (!v) return null;
      if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
      if (typeof v === 'number') {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof v !== 'string') {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      }
      const s = v.trim();
      let d = new Date(s);
      if (!isNaN(d.getTime())) return d;

      const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (dmY) {
        const day = parseInt(dmY[1], 10);
        const month = parseInt(dmY[2], 10) - 1;
        let year = parseInt(dmY[3], 10);
        if (year < 100) year += 2000;
        const hh = parseInt(dmY[4] ?? '0', 10);
        const mm = parseInt(dmY[5] ?? '0', 10);
        const ss = parseInt(dmY[6] ?? '0', 10);
        d = new Date(year, month, day, hh, mm, ss);
        return isNaN(d.getTime()) ? null : d;
      }

      const yMd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (yMd) {
        const year = parseInt(yMd[1], 10);
        const month = parseInt(yMd[2], 10) - 1;
        const day = parseInt(yMd[3], 10);
        const hh = parseInt(yMd[4] ?? '0', 10);
        const mm = parseInt(yMd[5] ?? '0', 10);
        const ss = parseInt(yMd[6] ?? '0', 10);
        d = new Date(year, month, day, hh, mm, ss);
        return isNaN(d.getTime()) ? null : d;
      }

      const dmYdash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
      if (dmYdash) {
        const day = parseInt(dmYdash[1], 10);
        const month = parseInt(dmYdash[2], 10) - 1;
        let year = parseInt(dmYdash[3], 10);
        if (year < 100) year += 2000;
        d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }

      const mDy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mDy) {
        const month = parseInt(mDy[1], 10) - 1;
        const day = parseInt(mDy[2], 10);
        const year = parseInt(mDy[3], 10);
        d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    // Build date range from preset or custom
    let dateRange = null;
    if (selectedTimeline === 'Custom') {
      if (Array.isArray(customRange)) {
        if (customRange[0] && customRange[1]) {
          const start = new Date(customRange[0]); start.setHours(0,0,0,0);
          const end = new Date(customRange[1]); end.setHours(23,59,59,999);
          dateRange = { start, end };
        } else if (customRange[0]) {
          const start = new Date(customRange[0]); start.setHours(0,0,0,0);
          const end = new Date(customRange[0]); end.setHours(23,59,59,999);
          dateRange = { start, end };
        }
      } else if (customRange instanceof Date) {
        const start = new Date(customRange); start.setHours(0,0,0,0);
        const end = new Date(customRange); end.setHours(23,59,59,999);
        dateRange = { start, end };
      }
    } else {
      dateRange = presets[selectedTimeline]?.();
    }

    const base = data.filter(item => {
      const fromOk = inSelected(selectedFroms, item['From'] ?? item['from']);
      const toOk = inSelected(selectedTos, item['To'] ?? item['to']);
      const transportOk = inSelected(selectedTransportTypes, item['Transport Type'] ?? item['TransportType'] ?? item['transportType']);
      const operatorOk = inSelected(selectedOperators, item['Operator'] ?? item['operator']);

      let timeOk = true;
      if (dateRange && dateRange.start && dateRange.end) {
        const dayKey = (d) => {
          const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          return dd.getFullYear() * 10000 + (dd.getMonth() + 1) * 100 + dd.getDate();
        };
        const startKey = dayKey(dateRange.start);
        const endKey = dayKey(dateRange.end);

        let foundDate = selectedDateField ? parseDate(item[selectedDateField]) : null;
        if (!foundDate) {
          const dateKeys = [
            'Departure Time','departureTime','DepartureTime',
            'Arrival Time','arrivalTime','ArrivalTime',
            'Date','date','Travel Date','travelDate','TravelDate'
          ];
          for (const k of dateKeys) {
            const d = parseDate(item[k]);
            if (d) { foundDate = d; break; }
          }
        }
        if (foundDate) {
          const fKey = dayKey(foundDate);
          timeOk = fKey >= startKey && fKey <= endKey;
        } else {
          timeOk = false;
        }
      }
      const ok = fromOk && toOk && transportOk && operatorOk && timeOk;
      return ok;
    });

    const hasValidCondition = conditions.some(
      cond => cond.field && cond.value && cond.operator
    );

    try {
      const filteredData = (!hasValidCondition ? base : base).filter(item =>
        conditions.every(condition => {
          if (!condition.field || !condition.value) return true;

          const fieldKey = condition.field.replace(/\s+/g, '');
          const itemValue = item[fieldKey] || item[condition.field];
          if (itemValue === undefined || itemValue === null) return false;

          const itemValueStr = itemValue.toString().toLowerCase();
          const conditionValueStr = condition.value.toString().toLowerCase();

          switch (condition.operator) {
            case '=': return itemValueStr === conditionValueStr;
            case '!=': return itemValueStr !== conditionValueStr;
            case 'LIKE': return itemValueStr.includes(conditionValueStr);
            case '>': return parseFloat(itemValue) > parseFloat(condition.value);
            case '<': return parseFloat(itemValue) < parseFloat(condition.value);
            default: return true;
          }
        })
      );

      setResults(filteredData);
      if (filteredData.length === 0) {
        setError('No results found matching your criteria');
      }
      if (onRunQuery) onRunQuery(filteredData);
    } catch (err) {
      setError(`Error running query: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;
    const headers = Object.keys(results[0]);
    const csvContent = [
      headers.join(','),
      ...results.map(row =>
        headers.map(fieldName =>
          `"${String(row[fieldName] || '').replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\r\n');
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
    { label: 'Export as CSV', icon: 'pi pi-file-excel', command: exportToCSV },
    { label: 'Export as JSON', icon: 'pi pi-code', command: exportToJSON }
  ];

  return (
    <div className="query-builder">
      {/* Single shared popup Menu for exports */}
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
              />
            </div>

            {/* From */}
            <div className="from min-w-[150px]">
              <MultiSelect
                value={selectedFroms}
                onChange={(e) => setSelectedFroms(e.value)}
                options={fromOptions}
                optionLabel="label"
                optionValue="value"
                display="chip"
                placeholder="Departure Country"
                className="w-full"
                filter
                showSelectAll
                onFilter={searchFroms}
                filterBy="label"
                loading={loadingFroms}
              />
            </div>

            {/* To */}
            <div className="to min-w-[150px]">
              <MultiSelect
                value={selectedTos}
                onChange={(e) => setSelectedTos(e.value)}
                options={toOptions}
                optionLabel="label"
                optionValue="value"
                display="chip"
                placeholder="Arrival Country"
                className="w-full"
                filter
                showSelectAll
                onFilter={searchTos}
                filterBy="label"
                loading={loadingTos}
              />
            </div>

            {/* Transport Type */}
            <div className="transport-type min-w-[180px]">
              <MultiSelect
                value={selectedTransportTypes}
                onChange={(e) => setSelectedTransportTypes(e.value)}
                options={transportTypeOptions}
                optionLabel="label"
                optionValue="value"
                display="chip"
                placeholder="Travel Mode"
                className="w-full"
                filter
                showSelectAll
                onFilter={searchTransportTypes}
                filterBy="label"
                loading={loadingTransportTypes}
              />
            </div>

            {/* Operator */}
            <div className="operator min-w-[220px]">
              <MultiSelect
                value={selectedOperators}
                onChange={(e) => setSelectedOperators(e.value)}
                options={operatorOptions}
                optionLabel="label"
                optionValue="value"
                display="chip"
                placeholder="Operator"
                className="w-full"
                filter
                showSelectAll
                onFilter={searchOperators}
                filterBy="label"
                loading={loadingOperators}
              />
            </div>

            {/* Submit */}
            <div className="submit flex items-end" style={{ marginTop: '2px' }}>
              <Button
                label="Apply"
                icon="pi pi-check"
                onClick={runQuery}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  borderRadius: '5px',
                  padding: '10px 20px',
                  height: '40px'
                }}
              />
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
                {['From', 'To', 'Operator', 'Transport Type'].includes(condition.field) ? (
                  <AutoComplete
                    value={condition.value}
                    suggestions={suggestions}
                    completeMethod={(e) => searchSuggestions(e, condition.field)}
                    onChange={(e) => updateCondition(index, 'value', e.value)}
                    placeholder={`Search ${condition.field}...`}
                    className="w-full"
                    dropdown
                    forceSelection={false}
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
            onClick={runQuery}
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
                  onClick={(e) => menuRef.current?.toggle(e)}
                  aria-controls="export_menu"
                  aria-haspopup
                  disabled={results.length === 0}
                />
                {/* Removed duplicate Menu here; using the shared one at the top */}
              </div>
            </div>

            {/* Scrollable Table Area */}
            <div className="max-h-[400px] overflow-auto">
              <DataTable
                value={results}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25]}
                loading={loading}
                className="p-datatable-sm min-w-full"
              >
                {Object.keys(results[0] || {}).map((key) => (
                  <Column key={key} field={key} header={key} sortable />
                ))}
              </DataTable>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default QueryBuilder;
