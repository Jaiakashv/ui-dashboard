import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { FilterMatchMode } from 'primereact/api';
import { Toast } from 'primereact/toast';
import { Calendar } from 'primereact/calendar';
import { Tag } from 'primereact/tag';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

const DataTableComponent = ({ 
  data, 
  totalRecords, 
  rows = 50, 
  first = 0, 
  onPage = () => {},
  onSort = () => {},
  loading = false
}) => {
  const toast = useRef(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filteredData, setFilteredData] = useState([]);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    From: { value: null, matchMode: FilterMatchMode.CONTAINS },
    To: { value: null, matchMode: FilterMatchMode.CONTAINS },
    Operator: { value: null, matchMode: FilterMatchMode.EQUALS },
    Price: { value: null, matchMode: FilterMatchMode.CONTAINS },
    Date: { value: null, matchMode: FilterMatchMode.CONTAINS },
    source: { value: null, matchMode: FilterMatchMode.EQUALS }
  });

  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [lazyState, setLazyState] = useState({
    first,
    rows,
    page: 0,
    sortField: null,
    sortOrder: null
  });
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const timeoutRef = useRef(null);

  const operators = useMemo(() =>
    [...new Set(data.map(item => item['Operator']).filter(Boolean))],
    [data]
  );

  const providers = useMemo(() =>
    [...new Set(data.map(item => item.source).filter(Boolean))],
    [data]
  );

  const onPageChange = (event) => {
    setLazyState(event);
    onPage(event);
  };

  // Debounce filter updates
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedFilter(globalFilterValue);
    }, 300); // 300ms delay

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [globalFilterValue]);

  // Apply debounced filter
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      global: { value: debouncedFilter, matchMode: FilterMatchMode.CONTAINS }
    }));
  }, [debouncedFilter]);

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
  };

  const clearFilters = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      From: { value: null, matchMode: FilterMatchMode.CONTAINS },
      To: { value: null, matchMode: FilterMatchMode.CONTAINS },
      Operator: { value: null, matchMode: FilterMatchMode.EQUALS },
      Price: { value: null, matchMode: FilterMatchMode.CONTAINS },
      Date: { value: null, matchMode: FilterMatchMode.CONTAINS },
      source: { value: null, matchMode: FilterMatchMode.EQUALS }
    });
    setGlobalFilterValue('');
    setDebouncedFilter('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    toast.current.show({ severity: 'info', summary: 'Filters Cleared', life: 2000 });
  };

  // Filter data based on selected date
  useEffect(() => {
    if (!selectedDate) {
      setFilteredData(data);
    } else {
      // Create date range for the selected date (in local timezone)
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      
      const filtered = data.filter(item => {
        if (!item.Date) return false;
        const itemDate = new Date(item.Date);
        return itemDate >= startDate && itemDate <= endDate;
      });
      
      setFilteredData(filtered);
    }
  }, [data, selectedDate]);

  const renderHeader = () => (
    <div className="w-full mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
        <div className="flex flex-col">
          <h2 className="text-xl sm:text-2xl font-semibold text-700">Travel Routes</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-1">
            <div className="flex items-center gap-2 mt-5">
              <span className="text-sm text-600">Filter by date:</span>
              <Calendar
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.value)}
                showIcon
                dateFormat="dd/mm/yy"
                placeholder="  Select a date"
                showButtonBar
                className="p-calendar-sm mt-2"
              />
              {selectedDate && (
                <Button
                  type="button"
                  icon="pi pi-times"
                  className="p-button-text p-button-sm"
                  onClick={() => setSelectedDate(null)}
                  tooltip="Clear date filter"
                  tooltipOptions={{ position: 'top' }}
                />
              )}
            </div>
            <span className="text-sm font-medium mt-5">
              {filteredData.length} {filteredData.length === 1 ? 'route' : 'routes'} found
              {selectedDate && ` for ${selectedDate.toLocaleDateString()}`}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <Button
            type="button"
            icon="pi pi-filter-slash"
            label="Clear Filters"
            className="p-button-outlined p-button-sm w-full sm:w-auto"
            onClick={clearFilters}
          />
        </div>
      </div>
      <div className="relative w-full">
        <span className="p-input-icon-right w-full">
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Search all routes..."
            className="p-inputtext-sm w-full"
            style={{ paddingRight: '2rem' }}
          />
          <i className="pi pi-search" style={{ right: '1rem', color: '#6c757d', pointerEvents: 'none' }} />
        </span>
      </div>
    </div>
  );

  const providerBodyTemplate = (rowData) => {
    if (!rowData.source) return 'N/A';
    const providerName = rowData.source
      .replace('.json', '')
      .replace(/^\w/, (c) => c.toUpperCase());
    return (
      <Tag
        value={providerName}
        severity="info"
        style={{ minWidth: '80px', textAlign: 'center' }}
      />
    );
  };

  const priceBodyTemplate = (rowData) => {
    // Use price_inr field if available, otherwise fall back to price
    const price = rowData.price_inr !== undefined ? rowData.price_inr : rowData.Price;
    const isAvailable = price !== undefined && price !== null && price !== 'Not Available' && !isNaN(price);
    
    // Format the price with 2 decimal places and add INR symbol
    const formattedPrice = isAvailable 
      ? `₹${Number(price).toFixed(2)}`
      : 'N/A';
      
    return (
      <Tag
        value={formattedPrice}
        severity={isAvailable ? 'success' : 'danger'}
        style={{ minWidth: '120px', textAlign: 'center' }}
      />
    );
  };

  const routeBodyTemplate = (rowData, field) => {
    if (!rowData[field]) return '-';
    return (
      <a href={rowData['Route URL']} target="_blank" rel="noopener noreferrer">
        <i className="pi pi-map-marker" /> {rowData[field]}
      </a>
    );
  };

  const dateBodyTemplate = (rowData) => {
    if (!rowData.Date) return '-';
    return new Date(rowData.Date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVisibleColumns = () => {
    const width = window.innerWidth;
    const all = [
      {
        field: 'Date',
        header: 'Date',
        body: dateBodyTemplate,
        priority: 1,
        style: { minWidth: '150px' },
        sortable: true
      },
      {
        field: 'Departure Time',
        header: 'Departs',
        priority: 2,
        style: { minWidth: '100px' }
      },
      {
        field: 'Arrival Time',
        header: 'Arrives',
        priority: 2,
        style: { minWidth: '100px' }
      },
      {
        field: 'Duration',
        header: 'Duration',
        priority: 1,
        style: { minWidth: '80px' }
      },
      {
        field: 'Price',
        header: 'Price',
        body: priceBodyTemplate,
        priority: 1,
        style: { minWidth: '90px' }
      }
    ];
    if (width < 640) return all.filter(col => col.priority === 1);
    else if (width < 1024) return all.filter(col => col.priority <= 2);
    return all;
  };

  const [visibleColumns, setVisibleColumns] = useState(getVisibleColumns());

  useEffect(() => {
    const handleResize = () => {
      setVisibleColumns(getVisibleColumns());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <Toast ref={toast} />
      {/* <div className="p-4 pb-2">{renderHeader()}</div> */}
      <div className="flex-1 overflow-hidden">
        <DataTable
          value={data}
          lazy
          paginator
          first={lazyState.first}
          rows={lazyState.rows}
          totalRecords={totalRecords}
          onPage={onPage}
          onSort={onSort}
          sortField={lazyState.sortField}
          sortOrder={lazyState.sortOrder}
          rowsPerPageOptions={[10, 25, 50, 100]}
          className="p-datatable-sm"
          loading={loading}
          filters={filters}
          globalFilterFields={['From', 'To', 'Operator', 'Price', 'Date', 'source']}
          header={renderHeader()}
          emptyMessage="No routes found"
          scrollable
          scrollHeight="flex"
          resizableColumns
          showGridlines
          stripedRows
          size="small"
          filterDisplay="menu"
          rowHover
          dataKey="Route URL"
          rowClassName={() => 'cursor-pointer'}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} routes"
        >
          {/* Static columns with custom filters */}
          <Column
            field="From"
            header="From"
            body={(rowData) => routeBodyTemplate(rowData, 'From')}
            filter
            filterField="From"
            filterMatchMode="contains"
            filterElement={(options) => (
              <InputText
                value={options.value || ''}
                onChange={(e) => options.filterApplyCallback(e.target.value)}
                placeholder="Search from..."
                className="p-column-filter"
              />
            )}
            sortable
            style={{ minWidth: '120px' }}
          />

          <Column
            field="To"
            header="To"
            body={(rowData) => routeBodyTemplate(rowData, 'To')}
            filter
            filterField="To"
            filterMatchMode="contains"
            filterElement={(options) => (
              <InputText
                value={options.value || ''}
                onChange={(e) => options.filterApplyCallback(e.target.value)}
                placeholder="Search to..."
                className="p-column-filter"
              />
            )}
            sortable
            style={{ minWidth: '120px' }}
          />

          <Column
            field="Operator"
            header="Operator"
            filter
            filterField="Operator"
            filterMatchMode="equals"
            filterElement={(options) => (
              <Dropdown
                value={options.value || null}
                options={[{ label: 'All', value: null }, ...operators.map(op => ({ label: op, value: op }))]}
                onChange={(e) => options.filterApplyCallback(e.value)}
                placeholder="Select Operator"
                className="p-column-filter"
                showClear
              />
            )}
            sortable
            style={{ minWidth: '150px' }}
          />

          <Column
            field="source"
            header="Provider"
            body={providerBodyTemplate}
            filter
            filterField="source"
            filterMatchMode="equals"
            filterElement={(options) => (
              <Dropdown
                value={options.value || null}
                options={[
                  { label: 'All', value: null },
                  ...providers.map(src => ({
                    label: src.replace('.json', '').replace(/^\w/, c => c.toUpperCase()),
                    value: src
                  }))
                ]}
                onChange={(e) => options.filterApplyCallback(e.value)}
                placeholder="Select Provider"
                className="p-column-filter"
                showClear
              />
            )}
            sortable
            style={{ minWidth: '120px' }}
          />

          {/* Dynamic columns */}
          {visibleColumns.map((col) => (
            <Column
              key={col.field}
              field={col.field}
              header={col.header}
              body={col.body}
              sortable={col.sortable}
              style={col.style || { minWidth: '120px' }}
            />
          ))}
        </DataTable>
      </div>
    </div>
  );
};

export default DataTableComponent;