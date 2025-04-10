import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Space,
  Divider,
  InputNumber,
  Tag,
  Statistic,
  Alert,
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import moment from 'moment';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const CampaignForm = ({ initialValues, onSubmit, loading, mode = 'create' }) => {
  const [form] = Form.useForm();
  const [targetPreview, setTargetPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Define default values
  const defaultValues = {
    type: 'email',
    status: 'draft',
    filters: {
      industries: [],
      locations: [],
      lastContactDays: null
    },
    date_range: null,
  };

  // Merge initial values with defaults
  useEffect(() => {
    if (initialValues) {
      const mergedValues = {
        ...defaultValues,
        ...initialValues,
        date_range: initialValues.date_range || null,
        filters: {
          ...defaultValues.filters,
          ...(initialValues.filters || {}),
        }
      };
      form.setFieldsValue(mergedValues);
    } else {
      form.setFieldsValue(defaultValues);
    }
  }, [initialValues, form]);

  const campaignTypes = [
    { label: 'Email Campaign', value: 'email' },
    { label: 'SMS Campaign', value: 'sms' },
    { label: 'Push Notification', value: 'push' },
  ];

  const campaignStatuses = [
    { label: 'Draft', value: 'draft' },
    { label: 'Active', value: 'active' },
    { label: 'Paused', value: 'paused' },
    { label: 'Completed', value: 'completed' },
  ];

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    // Add more industries as needed
  ];

  const locations = [
    'North America',
    'Europe',
    'Asia',
    'South America',
    'Africa',
    'Australia',
    // Add more locations as needed
  ];

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      // Remove initialValues prop from here
    >
      <Card title="Campaign Information">
        <Form.Item
          name="name"
          label="Campaign Name"
          rules={[{ required: true, message: 'Please enter campaign name' }]}
        >
          <Input placeholder="Enter campaign name" />
        </Form.Item>

        <Form.Item
          name="type"
          label="Campaign Type"
          rules={[{ required: true, message: 'Please select campaign type' }]}
        >
          <Select options={campaignTypes} />
        </Form.Item>

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <Select options={campaignStatuses} />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea rows={4} placeholder="Enter campaign description" />
        </Form.Item>

        <Form.Item
          name="date_range"
          label="Campaign Duration"
          rules={[{ required: true, message: 'Please select campaign duration' }]}
        >
          <RangePicker style={{ width: '100%' }} />
        </Form.Item>
      </Card>

      <Card title="Target Audience" className="mt-4">
        <Form.Item
          name={['filters', 'industries']}
          label="Target Industries"
        >
          <Select
            mode="multiple"
            placeholder="Select target industries"
            options={industries.map(industry => ({ label: industry, value: industry }))}
          />
        </Form.Item>

        <Form.Item
          name={['filters', 'locations']}
          label="Target Locations"
        >
          <Select
            mode="multiple"
            placeholder="Select target locations"
            options={locations.map(location => ({ label: location, value: location }))}
          />
        </Form.Item>

        <Form.Item
          name={['filters', 'lastContactDays']}
          label="Last Contact (Days)"
        >
          <InputNumber
            min={0}
            placeholder="Enter number of days"
            style={{ width: '100%' }}
          />
        </Form.Item>

        {targetPreview && (
          <div className="mt-4">
            <Divider>Target Preview</Divider>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Statistic 
                title="Matching Customers" 
                value={targetPreview.total} 
                prefix={<UserOutlined />} 
              />
              {targetPreview.preview?.length > 0 && (
                <Alert
                  message="Sample Customers"
                  description={
                    <ul>
                      {targetPreview.preview.map((customer) => (
                        <li key={customer.id}>
                          {customer.name} - {customer.company}
                        </li>
                      ))}
                    </ul>
                  }
                  type="info"
                />
              )}
            </Space>
          </div>
        )}
      </Card>

      <div className="flex justify-end mt-4">
        <Space>
          <Button onClick={() => form.resetFields()}>Reset</Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
          >
            {mode === 'edit' ? 'Save Campaign' : 'Create Campaign'}
          </Button>
        </Space>
      </div>
    </Form>
  );
};

export default CampaignForm;