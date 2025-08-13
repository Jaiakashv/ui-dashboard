import { PrimeReactProvider } from 'primereact/api';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isComparePage = location.pathname === '/compare';
  const [tableData, setTableData] = useState([]);
  const [combinedData, setCombinedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProvider, setActiveProvider] = useState('12go');
  const [activeView, setActiveView] = useState('data');
  const [virtualizeView, setVirtualizeView] = useState('popular-routes');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [bookingHorizonData, setBookingHorizonData] = useState([]);
  const [selectedChartType, setSelectedChartType] = useState(CHART_TYPES.DOUGHNUT);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const handleMenuItemClick = (provider) => {
    setActiveProvider(provider);
    if (window.innerWidth < 768) setSidebarVisible(false);
  };

  const handleVirtualizeMenuClick = (viewId) => {
    setActiveView('virtualize');
    setVirtualizeView(viewId);
    if (window.innerWidth < 768) setSidebarVisible(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips/all`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const apiData = await response.json();
      const transformedData = apiData.map(item => {
        const formatDuration = (minutes) => {
          if (!minutes) return null;
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        };

        return {
          'Route URL': item.route_url || '',
          'Title': item.title || `${item.origin} → ${item.destination}`,
          'From-To': `${item.origin} → ${item.destination}`,
          'From': item.origin || 'Unknown',
          'To': item.destination || 'Unknown',
          'Duration': formatDuration(item.duration_min) || 'N/A',
          'Price': `₹${parseFloat(item.price_thb).toFixed(2)}` || '₹0.00',
          'Transport Type': item.transport_type || 'N/A',
          'Operator': item.operator_name || item.provider || 'N/A',
          'Departure Time': item.departure_time ? 
            new Date(item.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--',
          'Arrival Time': item.arrival_time ? 
            new Date(item.arrival_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--',
          'Date': item.travel_date ? 
            new Date(item.travel_date).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0],
          'source': item.provider || '12go'
        };
      });

      setTableData(transformedData);
      setCombinedData(transformedData);
      return transformedData;
    } catch (error) {
      console.error('Error fetching data:', error);
      setTableData([]);
      setCombinedData([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Handle URL parameters on component mount and when location changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const view = searchParams.get('view');
    const provider = searchParams.get('provider');

    if (view === 'data' && provider) {
      setActiveView('data');
      setActiveProvider(provider);
    } else if (view) {
      setActiveView('virtualize');
      setVirtualizeView(view);
    }
  }, [location.search]);

  useEffect(() => {
    loadData();
  }, [activeProvider]);

  const renderContent = () => {
    if (activeView === 'virtualize') {
      switch (virtualizeView) {
        case 'popular-routes':
          return <PopularRoutes data={combinedData} />;
        case 'price-graph':
          return <PriceGraph data={combinedData} chartType={selectedChartType} />;
        case 'booking-horizon':
          return <BookingHorizon data={bookingHorizonData} />;
        case 'cheapest-carrier':
          return <CheapestCarrier data={combinedData} />;
        case 'custom-dashboard':
          return <CustomDashboard data={combinedData} />;
        case 'query-builder':
          return <QueryBuilder data={combinedData} />;
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
      <DataTable data={tableData} />
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
                activeProvider={activeView === 'data' ? activeProvider : null}
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
