import React, { useState, useRef } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Menu } from 'primereact/menu';
import { AutoComplete } from 'primereact/autocomplete';
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
  const menuRef = useRef(null);
  
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
    if (!data || !Array.isArray(data)) {
      setError('No data available to query');
      return;
    }

    const hasValidCondition = conditions.some(
      cond => cond.field && cond.value && cond.operator
    );
    if (!hasValidCondition) {
      setError('Please add at least one condition to run the query');
      return;
    }

    setLoading(true);
    try {
      const filteredData = data.filter(item =>
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
      if (filteredData.length === 0) setError('No results found matching your criteria');
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
      <Card className="shadow-4 border-round-2xl p-6 bg-white/80 backdrop-blur-sm max-w-5xl mx-auto">
  {/* Header */}
  <div className="mb-6">
    <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
      🔍 Enter Your Query
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

      {results.length > 0 && (
       <div className="max-w-screen-xl mx-auto px-4">
       <Card className="mt-6 shadow-3 border-round-lg overflow-hidden">
         {/* Header Section */}
         <div className="flex flex-column md:flex-row justify-between items-start md:items-center gap-3 p-4 border-bottom-1 border-300 bg-gray-50">
           <div>
             <h3 className="text-lg md:text-xl font-semibold text-gray-800 m-0">Query Results</h3>
             <p className="text-sm text-gray-600 mt-1">{results.length} records found</p>
           </div>
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