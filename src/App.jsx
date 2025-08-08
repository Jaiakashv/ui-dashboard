import { PrimeReactProvider } from 'primereact/api';
import { BrowserRouter as Router } from 'react-router-dom';
import { useState, useEffect } from 'react';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'chart.js/auto';
import './App.css';

// Import environment variables - Vite uses import.meta.env
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

import Sidebar from './components/Sidebar';
import DataTable from './components/DataTable';
import PopularRoutes from './components/visualizations/PopularRoutes';
import PriceGraph from './components/visualizations/PriceGraph';
import BookingHorizon from './components/visualizations/BookingHorizon';
import CheapestCarrier from './components/visualizations/CheapestCarrier';
import ChartTypeSelector, { CHART_TYPES } from './components/visualizations/ChartTypeSelector';
import { Button } from 'primereact/button';

function App() {
  const [tableData, setTableData] = useState([]);
  const [combinedData, setCombinedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProvider, setActiveProvider] = useState('12go');
  const [activeView, setActiveView] = useState('data');
  const [virtualizeView, setVirtualizeView] = useState('popular-routes');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [bookingHorizonData, setBookingHorizonData] = useState([]);
  const [selectedChartType, setSelectedChartType] = useState(CHART_TYPES.DOUGHNUT);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleMenuItemClick = (provider) => {
    setActiveProvider(provider);
    if (window.innerWidth < 768) {
      setSidebarVisible(false);
    }
  };

  const handleVirtualizeMenuClick = (viewId) => {
    setActiveView('virtualize');
    setVirtualizeView(viewId);
    if (window.innerWidth < 768) {
      setSidebarVisible(false);
    }
  };

  // Single data loading function - Fixed version
  const loadData = async () => {
    console.log('Starting to load data from API...');
    setLoading(true);
    
    try {
      // Using the correct endpoint from your backend
      const response = await fetch(`${API_BASE_URL}/api/trips/all`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiData = await response.json();
      console.log(`Loaded ${apiData.length} items from API`);
      
      // Transform API data to match your expected format
      const transformedData = apiData.map(item => {
        // Format duration from minutes to 'Xh Ym' format (e.g., '2h 30m')
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
      
      console.log(`Processed ${transformedData.length} items from API`);
      
      // Check data quality
      const itemsWithPrices = transformedData.filter(item => item.Price > 0);
      console.log(`Found ${itemsWithPrices.length} items with prices > 0`);
      
      if (itemsWithPrices.length > 0) {
        const minPrice = Math.min(...itemsWithPrices.map(item => item.Price));
        const maxPrice = Math.max(...itemsWithPrices.map(item => item.Price));
        console.log(`Price range: ${minPrice} - ${maxPrice} THB`);
      }
      
      // Update both table data and combined data
      setTableData(transformedData);
      setCombinedData(transformedData);
      
      return transformedData;
      
    } catch (error) {
      console.error('Error fetching data from API:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      
      // Set empty arrays on error
      setTableData([]);
      setCombinedData([]);
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load booking horizon data with fallback to empty array
  useEffect(() => {
    const loadBookingHorizonData = async () => {
      try {
        // Try to fetch from API first
        const response = await fetch(`${API_BASE_URL}/api/booking-horizon`);
        if (response.ok) {
          const data = await response.json();
          setBookingHorizonData(Array.isArray(data) ? data : []);
        } else {
          // // Fallback to local file if API fails
          // try {
          //   const data = await import('./Data/booking-horizon.json');
          //   setBookingHorizonData(data.default || []);
          // } catch (fileError) {
          //   console.warn('Using empty booking horizon data - no API or file available');
          //   setBookingHorizonData([]);
          // }
        }
      } catch (error) {
        console.error('Error loading booking horizon data:', error);
        setBookingHorizonData([]);
      }
    };

    loadBookingHorizonData();
  }, []);

  // Load data when component mounts or active provider changes
  useEffect(() => {
    console.log('Loading data for provider:', activeProvider);
    loadData().then(data => {
      console.log(`Data loaded. Total items: ${data.length}`);
      if (data.length > 0) {
        console.log('Sample data item:', data[0]);
        console.log('Data structure:', {
          keys: Object.keys(data[0]),
          priceExample: data[0].Price,
          fromToExample: data[0]['From-To']
        });
      }
    });
  }, [activeProvider]);

  const renderContent = () => {
    if (activeView === 'virtualize') {
      switch (virtualizeView) {
        case 'popular-routes':
          return (
            <div className="space-y-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Popular Routes</h1>
              <div className="bg-white p-4 md:p-6 rounded-lg shadow">
                <PopularRoutes data={combinedData} />
              </div>
            </div>
          );

        case 'price-graph':
          return (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-0">
                  Price Distribution
                </h1>
                <ChartTypeSelector
                  selectedType={selectedChartType}
                  onTypeChange={setSelectedChartType}
                />
              </div>
              <div className="bg-white p-4 md:p-6 rounded-lg shadow">
                <PriceGraph data={combinedData} chartType={selectedChartType} />
              </div>
            </div>
          );

        case 'booking-horizon':
          return (
            <div className="space-y-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Booking Horizon</h1>
              <div className="bg-white p-4 md:p-6 rounded-lg shadow">
                <BookingHorizon data={bookingHorizonData} />
              </div>
            </div>
          );

        case 'cheapest-carrier':
          return (
            <div className="space-y-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Cheapest Carriers by Route</h1>
              <div className="bg-white p-4 md:p-6 rounded-lg shadow">
                <CheapestCarrier data={combinedData} />
              </div>
            </div>
          );

        default:
          return (
            <div className="space-y-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Visualization Dashboard</h1>
              <div className="bg-white p-4 md:p-6 rounded-lg shadow">
                <p className="text-gray-600">Select a view from the sidebar</p>
              </div>
            </div>
          );
      }
    }

    return (
      <>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">{activeProvider} Routes</h1>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <i className="pi pi-spin pi-spinner text-3xl text-blue-500"></i>
              <p className="mt-4 text-gray-600">Loading {activeProvider} data...</p>
            </div>
          ) : (
            <DataTable data={tableData} />
          )}
        </div>
      </>
    );
  };

  return (
    <Router>
      <PrimeReactProvider>
        <div className="flex flex-col md:flex-row h-screen bg-gray-100">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between p-4 bg-white shadow-sm">
            <Button
              icon="pi pi-bars"
              className="p-button-text p-button-rounded"
              onClick={toggleSidebar}
              aria-label="Menu"
            />
            <h1 className="text-xl font-semibold text-blue-700">Trip Dashboard</h1>
            <div className="w-10"></div>
          </div>

          {/* Sidebar */}
          <div className={`${sidebarVisible ? 'block' : 'hidden'} md:block fixed md:static z-50 md:z-auto h-full`}>
            <Sidebar
              onProviderSelect={handleMenuItemClick}
              onViewSelect={(view) => {
                setActiveView(view);
                if (window.innerWidth < 768) setSidebarVisible(false);
              }}
              onVirtualizeViewSelect={handleVirtualizeMenuClick}
              activeProvider={activeView === 'virtualize' ? virtualizeView : activeProvider}
              activeView={activeView}
              virtualizeView={virtualizeView}
            />
          </div>

          {/* Mobile overlay */}
          {sidebarVisible && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setSidebarVisible(false)}
            ></div>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
            <div className="p-4 md:p-6">{renderContent()}</div>
          </main>
        </div>
      </PrimeReactProvider>
    </Router>
  );
}

export default App;
