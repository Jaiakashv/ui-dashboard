import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

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

  return (
    <div className="query-builder">
      <Card className="shadow-2 border-round p-4 bg-white mb-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-800 mb-1">Enter Your Query</h3>
          <p className="text-sm text-600 m-0">Set conditions and run the query on available data</p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-800 border-round mb-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-column gap-3 mb-3">
          {conditions.map((condition, index) => (
            <div key={index} className="flex align-items-center flex-wrap gap-2">
              {index > 0 && <span className="font-medium text-600">AND</span>}
              <Dropdown
                value={condition.field}
                options={fields}
                onChange={(e) => updateCondition(index, 'field', e.value)}
                placeholder="Field"
                className="w-12rem md:w-14rem"
              />
              <Dropdown
                value={condition.operator}
                options={operators}
                onChange={(e) => updateCondition(index, 'operator', e.value)}
                placeholder="Operator"
                className="w-10rem"
              />
              <InputText
                value={condition.value}
                onChange={(e) => updateCondition(index, 'value', e.target.value)}
                placeholder="Value"
                className="w-12rem md:w-14rem"
              />
              {conditions.length > 1 && (
                <Button
                  icon="pi pi-times"
                  className="p-button-rounded p-button-text p-button-danger"
                  onClick={() => removeCondition(index)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            label="Add Condition"
            icon="pi pi-plus"
            className="p-button-text"
            onClick={addCondition}
          />
          <Button
            label="Run Query"
            icon="pi pi-search"
            onClick={runQuery}
            loading={loading}
          />
        </div>
      </Card>

      {results.length > 0 && (
        <Card className="mt-4 shadow-2 border-round p-4">
          <h3 className="text-lg font-semibold text-800 mb-3">Query Results</h3>
          <DataTable
            value={results}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25]}
            tableStyle={{ minWidth: '50rem' }}
            loading={loading}
            className="p-datatable-sm"
          >
            {Object.keys(results[0] || {}).map((key) => (
              <Column key={key} field={key} header={key} sortable />
            ))}
          </DataTable>
        </Card>
      )}
    </div>
  );
};

export default QueryBuilder;
