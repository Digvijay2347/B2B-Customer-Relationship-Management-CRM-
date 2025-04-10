import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const BASE_URL = 'http://localhost:3000';

const PIPELINE_STAGES = {
  LEAD: 'lead',
  CONTACT_MADE: 'contact_made',
  NEEDS_ANALYSIS: 'needs_analysis',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost'
};

// Add stage colors
const STAGE_COLORS = {
  lead: '#E5E7EB',
  contact_made: '#BFDBFE',
  needs_analysis: '#E9D5FF',
  proposal: '#FEF3C7',
  negotiation: '#FDE68A',
  closed_won: '#BBF7D0',
  closed_lost: '#FEE2E2'
};

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444'];

const PRIORITY_BADGES = {
  high: { color: 'bg-red-100 text-red-800', label: 'High Priority' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium Priority' },
  low: { color: 'bg-green-100 text-green-800', label: 'Low Priority' }
};

// Add this function after the PIPELINE_STAGES definition
const initializePipelineStages = (data) => {
  const initialized = {};
  // Initialize all stages with empty arrays
  Object.values(PIPELINE_STAGES).forEach(stage => {
    initialized[stage] = [];
  });
  // Merge with existing data
  return { ...initialized, ...data };
};

const Pipeline = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState({});
  const [statistics, setStatistics] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'week', 'month', 'quarter'
  const [analyticsView, setAnalyticsView] = useState('value'); // 'value', 'count'
  const [forecast, setForecast] = useState(null);
  const [lossReason, setLossReason] = useState({ open: false, dealId: null });

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      const [pipelineRes, statsRes, forecastRes] = await Promise.all([
        axios.get(`${BASE_URL}/pipeline/deals`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BASE_URL}/pipeline/statistics`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BASE_URL}/pipeline/forecast`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      console.log('Raw Pipeline response:', pipelineRes.data);

      // Initialize pipeline with empty arrays for all stages
      const initializedPipeline = {};
      Object.values(PIPELINE_STAGES).forEach(stage => {
        initializedPipeline[stage] = [];
      });

      // Get deals array from response
      let deals = [];
      if (Array.isArray(pipelineRes.data)) {
        deals = pipelineRes.data;
      } else if (pipelineRes.data && typeof pipelineRes.data === 'object') {
        if (pipelineRes.data.deals) {
          deals = pipelineRes.data.deals;
        } else {
          deals = Object.values(pipelineRes.data).flat();
        }
      }

      // Process each deal
      deals.forEach(deal => {
        if (!deal) return;
        
        // Normalize the stage value
        let normalizedStage = (deal.stage || '').toLowerCase().trim();
        
        // Map to correct stage
        if (Object.values(PIPELINE_STAGES).includes(normalizedStage)) {
          initializedPipeline[normalizedStage].push({
            ...deal,
            stage: normalizedStage // Ensure consistent stage value
          });
        } else {
          console.warn(`Deal with unknown stage:`, deal);
        }
      });

      console.log('Processed Pipeline:', initializedPipeline);
      
      // Log the count of deals in each stage
      Object.entries(initializedPipeline).forEach(([stage, stageDeals]) => {
        console.log(`${stage} stage has ${stageDeals.length} deals`);
      });

      setPipeline(initializedPipeline);
      setStatistics(statsRes.data);
      setForecast(forecastRes.data);
    } catch (error) {
      console.error('Error fetching pipeline:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, [token]);

  // Add this useEffect to monitor pipeline changes
  useEffect(() => {
    if (Object.keys(pipeline).length > 0) {
      console.log('Current pipeline state:', pipeline);
      Object.entries(pipeline).forEach(([stage, deals]) => {
        console.log(`Stage ${stage} has ${deals.length} deals:`, deals);
      });
    }
  }, [pipeline]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTimeAgo = (date) => {
    const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleDealClick = (dealId) => {
    navigate(`/pipeline/deals/${dealId}`);
  };

  const getFilteredDeals = () => {
    const now = new Date();
    const deals = Object.values(pipeline).flat();
    
    switch (timeFilter) {
      case 'week':
        return deals.filter(deal => {
          const dealDate = new Date(deal.created_at);
          return (now - dealDate) / (1000 * 60 * 60 * 24) <= 7;
        });
      case 'month':
        return deals.filter(deal => {
          const dealDate = new Date(deal.created_at);
          return (now - dealDate) / (1000 * 60 * 60 * 24) <= 30;
        });
      case 'quarter':
        return deals.filter(deal => {
          const dealDate = new Date(deal.created_at);
          return (now - dealDate) / (1000 * 60 * 60 * 24) <= 90;
        });
      default:
        return deals;
    }
  };

  const getAnalyticsData = () => {
    const deals = getFilteredDeals();
    return Object.entries(PIPELINE_STAGES).map(([name, key]) => ({
      name: name.replace('_', ' '),
      value: analyticsView === 'value'
        ? deals.filter(d => d.stage === key).reduce((sum, d) => sum + (d.value || 0), 0)
        : deals.filter(d => d.stage === key).length
    }));
  };

  const getPieChartData = () => {
    const deals = getFilteredDeals();
    const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    
    return Object.entries(PIPELINE_STAGES).map(([name, key]) => {
      const stageDeals = deals.filter(d => d.stage === key);
      const value = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      return {
        name: name.replace('_', ' '),
        value,
        percentage: totalValue ? ((value / totalValue) * 100).toFixed(1) : 0
      };
    });
  };

  const getConversionRates = () => {
    const deals = getFilteredDeals();
    const totalDeals = deals.length;
    const wonDeals = deals.filter(d => d.stage === PIPELINE_STAGES.CLOSED_WON).length;
    const lostDeals = deals.filter(d => d.stage === PIPELINE_STAGES.CLOSED_LOST).length;
    
    return {
      winRate: totalDeals ? ((wonDeals / totalDeals) * 100).toFixed(1) : 0,
      lossRate: totalDeals ? ((lostDeals / totalDeals) * 100).toFixed(1) : 0,
      avgDealSize: deals.length 
        ? formatCurrency(deals.reduce((sum, d) => sum + (d.value || 0), 0) / deals.length)
        : formatCurrency(0)
    };
  };

  const getPriorityFromValue = (value) => {
    if (value >= 100000) return 'high';
    if (value >= 50000) return 'medium';
    return 'low';
  };

  // Add a helper function to ensure consistent stage values
  const normalizeStageValue = (stage) => {
    return stage ? stage.toLowerCase() : '';
  };

  // Add loss reason dialog
  const handleDealLoss = async (dealId, reason, details) => {
    try {
      await axios.post(
        `${BASE_URL}/pipeline/deals/${dealId}/loss-reason`,
        { reason, details },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLossReason({ open: false, dealId: null });
      toast.success('Deal marked as lost');
      fetchPipeline();
    } catch (error) {
      console.error('Error recording deal loss:', error);
      toast.error('Failed to record deal loss reason');
    }
  };

  // Add forecast section to the UI
  const renderForecast = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium">Weighted Pipeline Value</h3>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {formatCurrency(forecast?.total_weighted_value || 0)}
        </p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium">Monthly Forecast</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Object.entries(forecast?.by_month || {}).map(([month, data]) => ({
              month,
              value: data.weighted_value
            }))}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-gray-500 text-sm font-medium">Stage Distribution</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={Object.entries(forecast?.by_stage || {}).map(([stage, data]) => ({
                  name: stage,
                  value: data.weighted_value
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#3B82F6"
              >
                {Object.entries(forecast?.by_stage || {}).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header with Create Deal button */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-gray-600 mt-1">Manage and track your deals</p>
        </div>
        <Link
          to="/pipeline/deals/new"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 
                   transition-colors duration-200 flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Deal
        </Link>
      </div>

      {/* Analytics Controls */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex gap-4">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm"
          >
            <option value="all">All Time</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
          </select>
          <select
            value={analyticsView}
            onChange={(e) => setAnalyticsView(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm"
          >
            <option value="value">Deal Value</option>
            <option value="count">Deal Count</option>
          </select>
        </div>
      </div>

      {/* Add Forecast Section */}
      {forecast && renderForecast()}

      {/* Statistics Section */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Total Deals</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.total_deals}</p>
            <div className="mt-2 text-sm text-gray-600">Active opportunities</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Total Value</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(statistics.total_value)}</p>
            <div className="mt-2 text-sm text-gray-600">Pipeline value</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Win Rate</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.win_rate.toFixed(1)}%</p>
            <div className="mt-2 text-sm text-gray-600">Conversion rate</div>
          </div>
        </div>
      )}

      {/* Enhanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getAnalyticsData()}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getPieChartData()}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {getPieChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(getConversionRates()).map(([key, value]) => (
          <div key={key} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">
              {key === 'winRate' ? 'Win Rate' : 
               key === 'lossRate' ? 'Loss Rate' : 'Average Deal Size'}
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {key.includes('Rate') ? `${value}%` : value}
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline Stages with Enhanced Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {Object.entries(PIPELINE_STAGES).map(([stageName, stageValue]) => {
          const stageDeals = pipeline[stageValue] || [];
          console.log(`Rendering stage ${stageName}:`, stageDeals);

          return (
            <div key={stageName} className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className={`p-4 border-b ${STAGE_COLORS[stageValue]} transition-colors duration-200`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {stageName.replace('_', ' ')}
                  </h3>
                  <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600 shadow-sm">
                    {stageDeals.length}
                  </span>
                </div>
              </div>
              
              <div className="p-3 space-y-3 min-h-[200px]">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => handleDealClick(deal.id)}
                    className="group cursor-pointer block bg-white rounded-lg border border-gray-100
                              hover:border-blue-300 hover:shadow-md transition-all duration-200"
                  >
                    {/* Deal Card Content */}
                    <div className="p-4">
                      {/* Header with Title and Actions */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 
                                       transition-colors duration-200">
                            {deal.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">
                              {deal.customer?.name || 'No Customer'}
                            </span>
                            {deal.customer?.company && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-sm text-gray-600">
                                  {deal.customer.company}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium
                                          ${PRIORITY_BADGES[getPriorityFromValue(deal.value)].color}`}>
                            {PRIORITY_BADGES[getPriorityFromValue(deal.value)].label}
                          </span>
                        </div>
                      </div>

                      {/* Deal Details */}
                      <div className="mt-3 space-y-2">
                        {/* Value and Progress */}
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-semibold text-blue-600">
                            {formatCurrency(deal.value)}
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-600">
                              {deal.expected_close_date ? 
                                new Date(deal.expected_close_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'No date set'}
                            </span>
                          </div>
                        </div>

                        {/* Footer Information */}
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {deal.assigned_to && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {deal.assigned_to.name}
                              </div>
                            )}
                            {deal.campaign && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                                {deal.campaign.name}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {getTimeAgo(deal.updated_at || deal.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div className="text-center py-6 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm">No deals in this stage</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Loss Reason Dialog */}
      {lossReason.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Record Loss Reason</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleDealLoss(
                lossReason.dealId,
                formData.get('reason'),
                formData.get('details')
              );
            }}>
              <select
                name="reason"
                className="w-full rounded-lg border-gray-300 mb-4"
                required
              >
                <option value="">Select a reason</option>
                <option value="price">Price too high</option>
                <option value="competition">Lost to competition</option>
                <option value="timing">Bad timing</option>
                <option value="needs">Needs changed</option>
                <option value="other">Other</option>
              </select>
              
              <textarea
                name="details"
                placeholder="Additional details..."
                className="w-full rounded-lg border-gray-300 mb-4"
                rows="3"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setLossReason({ open: false, dealId: null })}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pipeline;