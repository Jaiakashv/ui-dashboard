import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

const CompareTable = ({ data, columns, rows, selectedFroms, selectedTos, selectedTransportTypes = [] }) => {
  if (!data || !data.length || !columns?.length || !rows?.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        Select columns, rows, and apply filters to see the comparison
      </div>
    );
  }

  // Process data to create comparison rows
  const processData = () => {
    // First, filter the data based on selected 'from', 'to', and transport type filters
    const filteredData = data.filter(item => {
      const matchesFrom = !selectedFroms.length || selectedFroms.includes(item['From']);
      const matchesTo = !selectedTos.length || selectedTos.includes(item['To']);
      const matchesTransportType = !selectedTransportTypes.length || 
                                 selectedTransportTypes.some(type => 
                                   item['Transport Type']?.toLowerCase().includes(type.toLowerCase())
                                 );
      return matchesFrom && matchesTo && matchesTransportType;
    });

    // Group data by provider
    const groupedData = filteredData.reduce((acc, item) => {
      const provider = item['source'] || 'Unknown';
      if (!acc[provider]) {
        acc[provider] = {
          provider,
          routes: [],
          prices: []
        };
      }
      
      // Collect all routes and prices for calculations
      acc[provider].routes.push(item);
      
      // Extract numeric price for calculations (remove currency symbol and convert to number)
      const price = parseFloat(item['Price']?.replace(/[^0-9.-]+/g, '')) || 0;
      if (price > 0) {
        acc[provider].prices.push(price);
      }
      
      return acc;
    }, {});

    // Calculate metrics for each provider
    return Object.values(groupedData).map(providerData => {
      const { provider, routes, prices } = providerData;
      const result = { provider };
      
      // Calculate metrics for each requested row
      rows.forEach(row => {
        switch(row.name) {
          case 'Total Routes':
            result['Total Routes'] = routes.length;
            break;
            
          case 'Mean Price Average':
            result['Mean Price Average'] = prices.length 
              ? `₹${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)}`
              : 'N/A';
            break;
            
          case 'Lowest Price':
            result['Lowest Price'] = prices.length 
              ? `₹${Math.min(...prices).toFixed(2)}`
              : 'N/A';
            break;
            
          case 'Highest Price':
            result['Highest Price'] = prices.length 
              ? `₹${Math.max(...prices).toFixed(2)}`
              : 'N/A';
            break;
            
          case 'Median Price':
            if (prices.length) {
              const sorted = [...prices].sort((a, b) => a - b);
              const middle = Math.floor(sorted.length / 2);
              const median = sorted.length % 2 === 0 
                ? (sorted[middle - 1] + sorted[middle]) / 2 
                : sorted[middle];
              result['Median Price'] = `₹${median.toFixed(2)}`;
            } else {
              result['Median Price'] = 'N/A';
            }
            break;
            
          case 'No of Unique Providers':
            const uniqueProviders = new Set(routes.map(r => r['Operator']));
            result['No of Unique Providers'] = uniqueProviders.size;
            break;
            
          default:
            result[row.name] = 'N/A';
        }
      });
      
      return result;
    });
  };

  const tableData = processData();

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <DataTable 
        value={tableData}
        scrollable 
        scrollHeight="flex"
        className="p-datatable-sm"
        rowHover
        stripedRows
      >
        <Column 
          field="provider" 
          header="Provider" 
          style={{ minWidth: '150px' }}
          frozen
          className="font-medium"
        />
        {rows.map(row => (
          <Column 
            key={row.id}
            field={row.name}
            header={row.name}
            style={{ minWidth: '150px' }}
            body={(rowData) => rowData[row.name] ?? 'N/A'}
            className="text-center"
          />
        ))}
      </DataTable>
    </div>
  );
};

export default CompareTable;
