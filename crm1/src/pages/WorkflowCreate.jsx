import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import WorkflowForm from '../components/WorkflowForm';

const WorkflowCreate = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await axios.post(
        `http://localhost:3000/workflows`,
        values,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success('Workflow created successfully');
      navigate('/workflows');
    } catch (error) {
      message.error('Failed to create workflow');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Create Workflow</h1>
      <WorkflowForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
};

export default WorkflowCreate;