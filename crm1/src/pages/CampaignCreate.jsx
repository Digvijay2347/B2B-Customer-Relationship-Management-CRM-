import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  message, 
  Steps,
  Button,
  Space
} from 'antd';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import CampaignForm from '../components/CampaignForm';

const { Step } = Steps;

const CampaignCreate = () => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignData, setCampaignData] = useState(null);
  const navigate = useNavigate();
  const { token } = useAuth();

  const steps = [
    {
      title: 'Campaign Details',
      description: 'Basic information',
    },
    {
      title: 'Target Audience',
      description: 'Select recipients',
    },
    {
      title: 'Review',
      description: 'Verify and create',
    },
  ];

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // First, create the campaign
      const campaignResponse = await axios.post(
        'http://localhost:3000/campaigns',
        {
          name: values.name,
          description: values.description,
          start_date: values.date_range[0].toISOString(),
          end_date: values.date_range[1].toISOString(),
          status: values.status || 'draft',
          type: values.type || 'email',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const campaignId = campaignResponse.data.id;

      // Then, add the target audience
      if (values.filters) {
        await axios.post(
          `http://localhost:3000/campaigns/${campaignId}/target`,
          { filters: values.filters },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      message.success('Campaign created successfully');
      // Navigate back with refresh state
      navigate('/campaigns', { 
        state: { 
          refresh: true,
          message: 'Campaign created successfully'
        }
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      message.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const initialValues = {
    type: 'email',
    status: 'draft',
    filters: {
      industries: [],
      locations: [],
      lastContactDays: null
    },
    date_range: null,
  };

  return (
    <div className="p-6">
      <Card>
        <Steps current={currentStep} className="mb-8">
          {steps.map(item => (
            <Step 
              key={item.title} 
              title={item.title} 
              description={item.description} 
            />
          ))}
        </Steps>

        <CampaignForm 
          onSubmit={handleSubmit} 
          loading={loading}
          initialValues={initialValues}
          mode="create"
        />
      </Card>
    </div>
  );
};

export default CampaignCreate;