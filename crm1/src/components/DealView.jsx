import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const BASE_URL = 'http://localhost:3000';

const STAGE_COLORS = {
  lead: 'bg-gray-100 text-gray-800',
  contact_made: 'bg-blue-100 text-blue-800',
  proposal_sent: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-yellow-100 text-yellow-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800'
};

const DealView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ open: false });

  useEffect(() => {
    const fetchDealData = async () => {
      try {
        console.log('Fetching deal with ID:', id);
        console.log('Using token:', token);
        
        const dealRes = await axios.get(`${BASE_URL}/pipeline/deals/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Deal response:', dealRes.data);
        setDeal(dealRes.data);
        
        const tasksRes = await axios.get(`${BASE_URL}/pipeline/deals/${id}/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Tasks response:', tasksRes.data);
        setTasks(tasksRes.data);
      } catch (error) {
        console.error('Error details:', error.response || error);
        setError(error.response?.data?.error || 'Failed to load deal details');
        toast.error('Failed to load deal details');
      } finally {
        setLoading(false);
      }
    };

    if (id && token) {
      fetchDealData();
    }
  }, [id, token]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;

    try {
      await axios.delete(`${BASE_URL}/pipeline/deals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Deal deleted successfully');
      navigate('/pipeline');
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Failed to delete deal');
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await axios.post(
        `${BASE_URL}/pipeline/deals/${id}/tasks`,
        taskData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewTask({ open: false });
      toast.success('Task created successfully');
      // Refresh tasks
      const { data } = await axios.get(
        `${BASE_URL}/pipeline/deals/${id}/tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTasks(data);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading deal details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 mb-4">{error}</div>
        <Link to="/pipeline" className="text-blue-600 hover:underline">
          Return to Pipeline
        </Link>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-gray-600 mb-4">Deal not found</div>
        <Link to="/pipeline" className="text-blue-600 hover:underline">
          Return to Pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">{deal.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STAGE_COLORS[deal.stage]}`}>
              {deal.stage.replace('_', ' ')}
            </span>
          </div>
          <p className="text-gray-600 mt-2">
            Created on {formatDate(deal.created_at)}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/pipeline/deals/${id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                     transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Deal Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Details</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Value</dt>
              <dd className="mt-1 text-xl font-semibold text-gray-900">
                {formatCurrency(deal.value)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Expected Close Date</dt>
              <dd className="mt-1 text-gray-900">
                {formatDate(deal.expected_close_date)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-gray-900">
                {formatDate(deal.updated_at || deal.created_at)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer Name</dt>
              <dd className="mt-1 text-gray-900">{deal.customer?.name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Company</dt>
              <dd className="mt-1 text-gray-900">{deal.customer?.company || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-gray-900">{deal.customer?.email || 'N/A'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Notes Section */}
      {deal.notes && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{deal.notes}</p>
        </div>
      )}

      {/* Campaign Information */}
      {deal.campaign && (
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Information</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Campaign Name</dt>
              <dd className="mt-1 text-gray-900">{deal.campaign.name}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Tasks Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
          <button
            onClick={() => setNewTask({ open: true })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Task
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <p className="text-sm text-gray-600">{task.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span>Due: {formatDate(task.due_date)}</span>
                      <span>Assigned to: {task.assigned_to?.name}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium
                    ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      'bg-yellow-100 text-yellow-800'}`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tasks created yet
            </div>
          )}
        </div>
      </div>

      {/* New Task Dialog */}
      {newTask.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleCreateTask({
                title: formData.get('title'),
                description: formData.get('description'),
                due_date: formData.get('due_date'),
                assigned_to: formData.get('assigned_to')
              });
            }}>
              <input
                type="text"
                name="title"
                placeholder="Task title"
                className="w-full rounded-lg border-gray-300 mb-4"
                required
              />
              
              <textarea
                name="description"
                placeholder="Task description"
                className="w-full rounded-lg border-gray-300 mb-4"
                rows="3"
              />

              <input
                type="datetime-local"
                name="due_date"
                className="w-full rounded-lg border-gray-300 mb-4"
                required
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNewTask({ open: false })}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealView;