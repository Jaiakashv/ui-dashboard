import { PrimeReactProvider } from 'primereact/api';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { StatsCacheProvider } from './contexts/StatsCacheContext';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'chart.js/auto';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

import Sidebar from './components/Sidebar';
import DataTable from './components/DataTable';
import PopularRoutes from './components/visualizations/PopularRoutes';
import PriceGraph from './components/visualizations/PriceGraph';
import BookingHorizon from './components/visualizations/BookingHorizon';
import CheapestCarrier from './components/visualizations/CheapestCarrier';
import CustomDashboard from './components/visualizations/CustomDashboard';
import ChartTypeSelector, { CHART_TYPES } from './components/visualizations/ChartTypeSelector';
import { Button } from 'primereact/button';
import QueryBuilder from './components/querybuilder/QueryBuilder';
import ComparePage from './pages/ComparePage';

function App() {
  return (
    <StatsCacheProvider>
      <Router>
        <AppContent />
      </Router>
    </StatsCacheProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isComparePage = location.pathname === '/compare';
  const [tableData, setTableData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeProvider, setActiveProvider] = useState('12go');
  const [activeView, setActiveView] = useState('data');
  const [virtualizeView, setVirtualizeView] = useState('popular-routes');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [bookingHorizonData, setBookingHorizonData] = useState([]);
  const [selectedChartType, setSelectedChartType] = useState(CHART_TYPES.DOUGHNUT);
  
  // Server-side pagination state
  const [lazyState, setLazyState] = useState({
    first: 0,
    rows: 50,
    page: 0,
    totalRecords: 0,
    sortField: null,
    sortOrder: null
  });

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const handleMenuItemClick = (provider) => {
    console.log('Provider changed to:', provider);
    setActiveProvider(provider);
    // Update URL to reflect the new provider
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('provider', provider);
    searchParams.set('view', 'data');
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    // Reset table data to trigger a refresh
    setTableData([]);
    setLazyState(prev => ({
      ...prev,
      first: 0, // Reset to first page
      totalRecords: 0
    }));
    
    if (window.innerWidth < 768) setSidebarVisible(false);
  };

  const handleVirtualizeMenuClick = useCallback((viewId) => {
    try {
      setVirtualizeView(viewId);
      setActiveView('virtualize');
      navigate(`/?view=virtualize&tab=${viewId}`, { replace: true });
      if (window.innerWidth < 768) setSidebarVisible(false);
    } catch (error) {
      console.error('Error handling virtualize menu click:', error);
    }
  }, [navigate]);

    // Load stats when component mounts or active provider changes
  // useEffect(() => {
  //   const fetchStats = async () => {
  //     try {
  //       const response = await fetch(`${API_BASE_URL}/api/${activeProvider}/stats`);
  //       if (!response.ok) throw new Error('Failed to fetch stats');
  //       const data = await response.json();
  //       setStats(data);
  //     } catch (error) {
  //       console.error(`Error fetching ${activeProvider} stats:`, error);
  //     }
  //   };
    
  //   fetchStats();
  // }, [activeProvider]);

  // Function to load data with pagination
  const loadData = async (lazyStateParam) => {
    setLoading(true);
    try {
      // Use the provided lazy state or fall back to the component's state
      const state = lazyStateParam || lazyState;
      const { first = 0, rows = 50 } = state;
      
      // Fetch a smaller initial dataset for the PopularRoutes component
      const limit = activeView === 'virtualize' && virtualizeView === 'popular-routes' ? 200 : rows;
      
      // Use the new API endpoint with provider
      const apiUrl = `${API_BASE_URL}/api/${activeProvider}/trips?limit=${limit}&offset=${first}`;
      console.log('Fetching data from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('API Response:', responseData); // Debug log
      let apiData = [];
      
      // Handle both array and object response formats
      if (Array.isArray(responseData)) {
        console.log('Response is an array');
        apiData = responseData;
      } else if (responseData.data) {
        console.log('Response has data property');
        apiData = responseData.data;
        setLazyState(prev => ({
          ...prev,
          totalRecords: responseData.pagination?.total || responseData.data?.length || 0
        }));
      } else {
        console.log('Unexpected response format:', responseData);
      }

      const transformedData = apiData.map(item => {
        try {
          // Map backend fields to frontend expected fields
          const mappedItem = {
            // Map backend fields to frontend expected fields
            'From': item.From || 'N/A',
            'To': item.To || 'N/A',
            'Price': item.Price || 0,
            'Operator': item.Operator || 'N/A',
            'Date': item.Date || 'N/A',
            'route_url': item.route_url || '#',
            'transport_type': item.transport_type || 'N/A',
            'departure_time': item.departure_time || '--:--',
            'arrival_time': item.arrival_time || '--:--',
            'source': item.source || activeProvider,
            // Additional fields for display
            'From-To': `${item.From || 'N/A'} → ${item.To || 'N/A'}`,
            'Route URL': item.route_url || '#',
            'Transport Type': item.transport_type || 'N/A',
            'Departure Time': item.departure_time || '--:--',
            'Arrival Time': item.arrival_time || '--:--',
            'rawData': item // Keep raw data for debugging
          };
          
          return mappedItem;
        } catch (error) {
          console.error('Error processing item:', { item, error });
          return null; // Skip this item if there's an error
        }
      }).filter(Boolean); // Remove any null entries from mapping errors

      console.log('Transformed data sample:', transformedData.slice(0, 3));
      setTableData(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error in loadData:', err);
      setError(`Failed to load data: ${err.message}. Please try again later.`);
      setTableData([]); // Reset table data on error
    } finally {
      setLoading(false);
    }
  };

  const onPage = (event) => {
    setLazyState(event);
    loadData(event);
  };

  const onSort = (event) => {
    setLazyState(event);
    loadData(event);
  };

  // Handle URL parameters and update state
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const view = searchParams.get('view');
    const provider = searchParams.get('provider');
    const tab = searchParams.get('tab');

    try {
      if (view === 'data' && provider) {
        setActiveView('data');
        setActiveProvider(provider);
        // Reset table data when provider changes
        setTableData([]);
      } else if (view === 'virtualize') {
        setActiveView('virtualize');
        if (tab && ['popular-routes', 'price-graph', 'booking-horizon', 'cheapest-carrier', 'custom-dashboard', 'query-builder'].includes(tab)) {
          setVirtualizeView(tab);
        }
      } else if (location.pathname === '/') {
        // Default to popular routes if no view is specified
        navigate('/?view=virtualize&tab=popular-routes', { replace: true });
      }
    } catch (error) {
      console.error('Error handling URL parameters:', error);
      // Fallback to default view on error
      navigate('/?view=virtualize&tab=popular-routes', { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  // Load data when the component mounts or when activeProvider/activeView/virtualizeView changes
  useEffect(() => {
    const loadDataForCurrentState = async () => {
      console.log('useEffect triggered - activeProvider:', activeProvider, 'activeView:', activeView, 'virtualizeView:', virtualizeView);
      if (location.pathname !== '/compare') {
        try {
          console.log('Loading data for provider:', activeProvider);
          // Always load fresh data when provider changes
          await loadData({ 
            ...lazyState,
            first: 0 // Always start from the first page when changing providers
          });
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    };

    loadDataForCurrentState();
  }, [activeProvider, activeView, virtualizeView, location.pathname]);

  const renderContent = () => {
    if (activeView === 'virtualize') {
      switch (virtualizeView) {
        case 'popular-routes':
          return <PopularRoutes data={tableData} />;
        case 'price-graph':
          return <PriceGraph data={tableData} chartType={selectedChartType} />;
        case 'booking-horizon':
          return <BookingHorizon data={bookingHorizonData} />;
        case 'cheapest-carrier':
          return <CheapestCarrier data={tableData} />;
        case 'custom-dashboard':
          return <CustomDashboard data={tableData} />;
        case 'query-builder':
          return <QueryBuilder data={tableData} />;
        default:
          return <div>Select a view</div>;
      }
    }

    return loading ? (
      <div className="p-8 text-center">
        <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
        <p className="mt-4 text-gray-600">Loading {activeProvider} data...</p>
      </div>
    ) : (
      <DataTable 
        data={tableData} 
        totalRecords={lazyState.totalRecords}
        loading={loading}
        onPage={onPage}
        onSort={onSort}
        first={lazyState.first}
        rows={lazyState.rows}
      />
    );
  };

  return (
    <PrimeReactProvider>
      <div className="flex flex-col md:flex-row h-screen bg-gray-100">
        {!isComparePage && (
          <>
            <div className="md:hidden flex items-center justify-between p-4 bg-white shadow-sm">
              <Button icon="pi pi-bars" className="p-button-text p-button-rounded" onClick={toggleSidebar} aria-label="Menu" />
              <h1 className="text-xl font-semibold text-blue-700">Trip Dashboard</h1>
              <div className="w-10"></div>
            </div>

            <div className={`${sidebarVisible ? 'block' : 'hidden'} md:block fixed md:static z-50 md:z-auto h-full`}>
              <Sidebar
                onProviderSelect={handleMenuItemClick}
                onViewSelect={(view) => {
                  setActiveView(view);
                  if (window.innerWidth < 768) setSidebarVisible(false);
                }}
                onVirtualizeViewSelect={handleVirtualizeMenuClick}
                activeProvider={activeProvider}
                activeView={activeView}
                virtualizeView={virtualizeView}
              />
            </div>

            {sidebarVisible && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
                onClick={() => setSidebarVisible(false)}
              ></div>
            )}
          </>
        )}

        <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
          <Routes>
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/" element={
              <div className="p-4 md:p-6">
                {renderContent()}
              </div>
            } />
            <Route path="*" element={
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
                <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                <Button 
                  label="Go to Home" 
                  icon="pi pi-home" 
                  className="p-button-outlined"
                  onClick={() => window.location.href = '/'}
                />
              </div>
            } />
          </Routes>
        </main>
      </div>
    </PrimeReactProvider>
  );
}

export default App;
