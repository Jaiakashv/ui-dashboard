import React, { useState, useMemo } from 'react';
import { Doughnut, Bar, Pie, Line, Radar, Bubble } from 'react-chartjs-2';
import ChartTypeSelector, { CHART_TYPES } from './ChartTypeSelector';
import { Chart as ChartJS, registerables } from 'chart.js';

// Register Chart.js components
ChartJS.register(...registerables);

const BookingHorizon = ({ data }) => {
  const [chartType, setChartType] = useState(CHART_TYPES.BAR);
  
  if (!data || data.length === 0) {
    return <div>No booking horizon data available</div>;
  }
  
  const handleChartTypeChange = (e) => {
    setChartType(e.value);
  };

  // Process data for the chart
  const chartData = useMemo(() => ({
    labels: data.map(item => item.platform),
    datasets: [
      {
        label: 'Min Months',
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        data: data.map(item => item.min_months)
      },
      {
        label: 'Max Months',
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        data: data.map(item => item.max_months)
      }
    ]
  }), [data]);

  const renderChart = () => {
    const isMobile = window.innerWidth < 640;
    
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'right',
          labels: {
            boxWidth: 12,
            padding: isMobile ? 10 : 20,
          },
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.raw} months`;
            }
          }
        }
      },
      scales: (chartType === CHART_TYPES.BAR || chartType === CHART_TYPES.LINE) ? {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Months in Advance',
            font: { weight: 'bold' }
          },
          min: 0,
          max: 12,
          ticks: {
            stepSize: 1
          }
        },
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45,
          },
        }
      } : {}
    };

    switch (chartType) {
      case CHART_TYPES.BAR:
        return <Bar data={chartData} options={commonOptions} />;
      case CHART_TYPES.PIE:
        return <Pie data={chartData} options={commonOptions} />;
      case CHART_TYPES.DOUGHNUT:
        return <Doughnut data={chartData} options={commonOptions} />;
      case CHART_TYPES.LINE:
        return <Line data={chartData} options={commonOptions} />;
      case CHART_TYPES.RADAR:
        return <Radar data={chartData} options={commonOptions} />;
      case CHART_TYPES.BUBBLE:
        return <Bubble data={chartData} options={commonOptions} />;
      default:
        return <Bar data={chartData} options={commonOptions} />;
    }
  };

  return (
    <div className="booking-horizon w-full h-full p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Booking Horizon</h2>
        <ChartTypeSelector 
          chartType={chartType} 
          onChange={handleChartTypeChange} 
          className="ml-auto"
        />
      </div>
      <div className="relative h-80 mb-6">
        {renderChart()}
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Booking Horizon by Platform</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Months</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Months</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.platform}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.min_months} months</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.max_months} months</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BookingHorizon;
