import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Define base URL - make sure this matches your backend server
const BASE_URL = 'http://localhost:3000'; // or your actual backend URL

const PIPELINE_STAGES = {
  LEAD: 'lead',
  CONTACT_MADE: 'contact_made',
  NEEDS_ANALYSIS: 'needs_analysis',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost'
};

const DealForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    customer_id: '',
    campaign_id: '',
    value: '',
    stage: PIPELINE_STAGES.LEAD,
    expected_close_date: '',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Use full URLs with BASE_URL
        const [customersRes, campaignsRes] = await Promise.all([
          axios.get(`${BASE_URL}/customers`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${BASE_URL}/campaigns`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        console.log('Customers response:', customersRes.data);
        console.log('Campaigns response:', campaignsRes.data);

        if (customersRes.data && customersRes.data.customers) {
          setCustomers(customersRes.data.customers);
        }

        if (campaignsRes.data) {
          setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : []);
        }

        if (id) {
          const dealRes = await axios.get(`${BASE_URL}/pipeline/deals/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const deal = dealRes.data;
          setFormData({
            title: deal.title || '',
            customer_id: deal.customer_id ? deal.customer_id.toString() : '',
            campaign_id: deal.campaign_id ? deal.campaign_id.toString() : '',
            value: deal.value || '',
            stage: deal.stage || PIPELINE_STAGES.LEAD,
            expected_close_date: deal.expected_close_date?.split('T')[0] || '',
            notes: deal.notes || ''
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const submitData = {
        ...formData,
        stage: formData.stage.toLowerCase(),
        value: parseFloat(formData.value),
        customer_id: formData.customer_id,
        campaign_id: formData.campaign_id || null,
      };

      console.log('Submitting deal data:', submitData);

      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      let response;
      if (id) {
        response = await axios.put(`${BASE_URL}/pipeline/deals/${id}`, submitData, config);
      } else {
        response = await axios.post(`${BASE_URL}/pipeline/deals`, submitData, config);
      }

      console.log('Server response:', response.data);
      
      toast.success(id ? 'Deal updated successfully' : 'Deal created successfully');
      navigate('/pipeline');
    } catch (error) {
      console.error('Error saving deal:', error);
      console.error('Error details:', error.response?.data);
      
      let errorMessage = 'Failed to save deal';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (errorMessage.includes('invalid input syntax for type uuid')) {
          errorMessage = 'Invalid customer or campaign selection';
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please check server configuration.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Please login again';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again';
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (!formData.customer_id) {
      toast.error('Customer is required');
      return false;
    }
    if (!formData.value || parseFloat(formData.value) <= 0) {
      toast.error('Value must be greater than 0');
      return false;
    }
    if (!formData.expected_close_date) {
      toast.error('Expected close date is required');
      return false;
    }
    return true;
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {id ? 'Edit Deal' : 'Create New Deal'}
      </h1>

      {/* Debug information */}
      <div className="mb-4 p-4 bg-gray-100 rounded text-sm">
        <p>Customers loaded: {customers.length}</p>
        <p>Campaigns loaded: {campaigns.length}</p>
        <p>Current stage: {formData.stage}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Customer</label>
          <select
            name="customer_id"
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.company ? `- ${customer.company}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Campaign (Optional)</label>
          <select
            name="campaign_id"
            value={formData.campaign_id}
            onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select Campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Value</label>
          <input
            type="number"
            name="value"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Expected Close Date</label>
          <input
            type="date"
            name="expected_close_date"
            value={formData.expected_close_date}
            onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Stage</label>
          <select
            name="stage"
            value={formData.stage}
            onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            {Object.entries(PIPELINE_STAGES).map(([key, value]) => (
              <option key={value} value={value}>
                {key.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => navigate('/pipeline')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : (id ? 'Update Deal' : 'Create Deal')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DealForm;