import React, { useState, useRef, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
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
  const [conditions, setConditions] = useState([{ field: '', operator: '=', value: '' }]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showChart, setShowChart] = useState(false);
  const [showChartConfig, setShowChartConfig] = useState(false);
  const [chartConfig, setChartConfig] = useState({
    type: 'bar',
    xAxis: '',
    yAxis: ''
  });
  const menuRef = useRef(null);

  // Header filter states
  const [selectedTimeline, setSelectedTimeline] = useState('Last 14 Days');
  const [selectedFroms, setSelectedFroms] = useState([]);
  const [selectedTos, setSelectedTos] = useState([]);
  const [selectedTransportTypes, setSelectedTransportTypes] = useState([]);
  const [selectedOperators, setSelectedOperators] = useState([]);
  const [customRange, setCustomRange] = useState(null); // [startDate, endDate]

  const chartTypes = [
    { label: 'Bar Chart', value: 'bar' },
    { label: 'Line Chart', value: 'line' },
    { label: 'Pie Chart', value: 'pie' }
  ];

  // Get available fields for axes
  const availableFields = useMemo(() => {
    if (!results.length) {
      console.log('No results available for fields');
      return [];
    }
    const fields = Object.keys(results[0] || {});
    console.log('Available fields:', fields);
    return fields.map(field => ({
      label: field,
      value: field
    }));
  }, [results]);

  const handleVisualizeClick = () => {
    if (results.length === 0) return;
    
    // Set default axes if not set
    if (!chartConfig.xAxis && availableFields.length > 0) {
      setChartConfig(prev => ({
        ...prev,
        xAxis: availableFields[0].value,
        yAxis: availableFields[1]?.value || availableFields[0].value
      }));
    }
    
    setShowChartConfig(true);
  };

  const handleChartGenerate = () => {
    console.log('Generating chart with config:', chartConfig);
    if (!chartConfig.xAxis || !chartConfig.yAxis) {
      console.error('Missing axis configuration');
      return;
    }
    setShowChartConfig(false);
    setShowChart(true);
  };

  // Prepare chart data based on user configuration
  const chartData = useMemo(() => {
    console.log('Preparing chart data with results:', results.length, 'and config:', chartConfig);
    if (!results.length || !chartConfig.xAxis || !chartConfig.yAxis) {
      console.log('Not enough data to render chart');
      return { 
        labels: [], 
        datasets: [],
        chartType: chartConfig.type || 'bar'
      };
    }

    // Group by x-axis value and calculate y-axis values
    const groupedData = results.reduce((acc, item) => {
      const xValue = String(item[chartConfig.xAxis] || 'Unknown');
      const yValue = parseFloat(item[chartConfig.yAxis]) || 0;

      if (!acc[xValue]) {
        acc[xValue] = [];
      }
      acc[xValue].push(yValue);
      return acc;
    }, {});

    // Calculate average for each x-axis value
    const labels = Object.keys(groupedData);
    const values = labels.map(label => {
      const nums = groupedData[label];
      const sum = nums.reduce((a, b) => a + b, 0);
      return Math.round((sum / nums.length) * 100) / 100; // Round to 2 decimal places
    });

    // Calculate Y-axis scale
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const stepSize = Math.max(1, Math.ceil(range / 5));
    const minY = Math.max(0, Math.floor(minValue / stepSize) * stepSize);

    // Generate colors for the chart
    const backgroundColors = [
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 99, 132, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(153, 102, 255, 0.6)'
    ];

    return {
      labels,
      datasets: [
        {
          label: chartConfig.yAxis,
          data: values,
          backgroundColor: chartConfig.type === 'pie' 
            ? backgroundColors.slice(0, Math.min(labels.length, 5))
            : backgroundColors[0],
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1,
        },
      ],
      minY,
      stepSize,
      chartType: chartConfig.type
    };
  }, [results]);
  
  // Extract unique values for autocomplete
  const getFieldSuggestions = (field) => {
    if (!data || !Array.isArray(data)) return [];
    const values = new Set();
    data.forEach(item => {
      if (item[field]) values.add(item[field]);
    });
    return Array.from(values).sort();
  };
  
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

  const runQuery = () => {
    setError('');
    setLoading(true);
    setShowChart(false);
    if (!data || !Array.isArray(data)) {
      setError('No data available to query');
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
        const d = new Date(); d.setDate(d.getDate() - 1);
        const start = new Date(d); start.setHours(0,0,0,0);
        const end = new Date(d); end.setHours(23,59,59,999);
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
      const t = Date.parse(v);
      return isNaN(t) ? null : new Date(t);
    };

    // Build date range from preset or custom
    let dateRange = null;
    if (selectedTimeline === 'Custom') {
      if (Array.isArray(customRange) && customRange[0] && customRange[1]) {
        const start = new Date(customRange[0]); start.setHours(0,0,0,0);
        const end = new Date(customRange[1]); end.setHours(23,59,59,999);
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
      if (dateRange) {
        const dep = parseDate(item['Departure Time'] ?? item['departureTime'] ?? item['DepartureTime']);
        const arr = parseDate(item['Arrival Time'] ?? item['arrivalTime'] ?? item['ArrivalTime']);
        const anyDate = dep || arr;
        if (anyDate) {
          timeOk = anyDate >= dateRange.start && anyDate <= dateRange.end;
        }
      }
      return fromOk && toOk && transportOk && operatorOk && timeOk;
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
    } catch (error) {
      setError(`Error running query: ${error.message}`);
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

      {/* From */}
      <div className="from min-w-[220px]">
        <MultiSelect
          value={selectedFroms}
          onChange={(e) => setSelectedFroms(e.value)}
          options={useMemo(() => getFieldSuggestions('From').map(v => ({ label: v, value: v })), [data])}
          optionLabel="label"
          optionValue="value"
          display="chip"
          placeholder="Departure Country"
          className="w-full"
          filter
          showSelectAll
        />
      </div>

      {/* To */}
      <div className="to min-w-[220px]">
        <MultiSelect
          value={selectedTos}
          onChange={(e) => setSelectedTos(e.value)}
          options={useMemo(() => getFieldSuggestions('To').map(v => ({ label: v, value: v })), [data])}
          optionLabel="label"
          optionValue="value"
          display="chip"
          placeholder="Arrival Country"
          className="w-full"
          filter
          showSelectAll
        />
      </div>

      {/* Transport Type */}
      <div className="transport-type min-w-[220px]">
        <MultiSelect
          value={selectedTransportTypes}
          onChange={(e) => setSelectedTransportTypes(e.value)}
          options={useMemo(() => getFieldSuggestions('Transport Type').map(v => ({ label: v, value: v })), [data])}
          optionLabel="label"
          optionValue="value"
          display="chip"
          placeholder="Travel Mode"
          className="w-full"
          filter
          showSelectAll
        />
      </div>

      {/* Operator (data operator, not query op list) */}
      <div className="operator min-w-[220px]">
        <MultiSelect
          value={selectedOperators}
          onChange={(e) => setSelectedOperators(e.value)}
          options={useMemo(() => getFieldSuggestions('Operator').map(v => ({ label: v, value: v })), [data])}
          optionLabel="label"
          optionValue="value"
          display="chip"
          placeholder="Operator"
          className="w-full"
          filter
          showSelectAll
        />
      </div>

      {/* Submit */}
      <div className="submit" style={{marginTop:'2px'}}>
        <Button label="Apply" icon="pi pi-check" onClick={runQuery} style={{backgroundColor:'#007bff',color:'white',borderRadius:'5px',padding:'10px'}} />
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
      onClick={runQuery}
      loading={loading}
    />
  </div>
</Card>

      {/* Chart Configuration Dialog */}
      <Dialog 
        header="Configure Chart" 
        visible={showChartConfig} 
        style={{ width: '50vw' }} 
        onHide={() => setShowChartConfig(false)}
      >
        <div className="p-fluid">
          <div className="field">
            <label htmlFor="chartType">Chart Type</label>
            <Dropdown
              id="chartType"
              value={chartConfig.type}
              options={chartTypes}
              onChange={(e) => setChartConfig({...chartConfig, type: e.value})}
              placeholder="Select Chart Type"
            />
          </div>
          
          <div className="field">
            <label htmlFor="xAxis">X-Axis</label>
            <Dropdown
              id="xAxis"
              value={chartConfig.xAxis}
              options={availableFields}
              onChange={(e) => setChartConfig({...chartConfig, xAxis: e.value})}
              placeholder="Select X-Axis"
            />
          </div>
          
          <div className="field">
            <label htmlFor="yAxis">Y-Axis</label>
            <Dropdown
              id="yAxis"
              value={chartConfig.yAxis}
              options={availableFields}
              onChange={(e) => setChartConfig({...chartConfig, yAxis: e.value})}
              placeholder="Select Y-Axis"
            />
          </div>
          
          <div className="flex justify-content-end gap-2 mt-4">
            <Button 
              label="Cancel" 
              className="p-button-text" 
              onClick={() => setShowChartConfig(false)} 
            />
            <Button 
              label="Generate Chart" 
              onClick={handleChartGenerate}
              disabled={!chartConfig.xAxis || !chartConfig.yAxis}
            />
          </div>
        </div>
      </Dialog>

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
                 { label: 'Export as CSV', icon: 'pi pi-file', command: () => exportToCSV() },
                 { label: 'Export as JSON', icon: 'pi pi-file-export', command: () => exportToJSON() },
               ]}
               popup
               ref={menuRef}
               id="export_menu"
             />
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