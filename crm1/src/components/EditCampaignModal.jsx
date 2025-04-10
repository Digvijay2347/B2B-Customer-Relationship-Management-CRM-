import React from 'react';
import { Modal, message } from 'antd';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import CampaignForm from './CampaignForm';

const EditCampaignModal = ({ 
  visible, 
  onCancel, 
  campaign,
  loading,
  onSuccess, // Add this prop for handling successful updates
}) => {
  const { token } = useAuth();

  const handleSubmit = async (values) => {
    try {
      await axios.put(
        `http://localhost:3000/campaigns/${campaign.id}`,
        {
          ...values,
          start_date: values.date_range[0].toISOString(),
          end_date: values.date_range[1].toISOString(),
          status: values.status
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success('Campaign updated successfully');
      onSuccess(); // Call the success callback
      onCancel(); // Close the modal
    } catch (error) {
      console.error('Update error:', error);
      message.error('Failed to update campaign');
    }
  };

  return (
    <Modal
      title="Edit Campaign"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      {campaign && (
        <CampaignForm
          initialValues={campaign}
          onSubmit={handleSubmit}
          loading={loading}
          mode="edit"
        />
      )}
    </Modal>
  );
};

export default EditCampaignModal;