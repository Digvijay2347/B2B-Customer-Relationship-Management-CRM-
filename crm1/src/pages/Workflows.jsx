import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Tag, 
  Space, 
  message,
  Popconfirm,
  Tooltip,
  Badge 
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';

const Workflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchWorkflows = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/workflows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkflows(response.data);
    } catch (error) {
      message.error('Failed to fetch workflows');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [token]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/workflows/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      message.success('Workflow deleted successfully');
      fetchWorkflows();
    } catch (error) {
      message.error('Failed to delete workflow');
      console.error('Error:', error);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await axios.put(
        `http://localhost:3000/workflows/${id}`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success(`Workflow ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchWorkflows();
    } catch (error) {
      message.error('Failed to update workflow status');
      console.error('Error:', error);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <span className="font-medium">{text}</span>
          {record.description && (
            <Tooltip title={record.description}>
              <InfoCircleOutlined className="text-gray-400" />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'Trigger',
      dataIndex: 'trigger_type',
      key: 'trigger_type',
      render: trigger => (
        <Tag color="blue">
          {trigger.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ')}
        </Tag>
      )
    },
    {
      title: 'Actions',
      dataIndex: 'actions',
      key: 'actions',
      render: actions => (
        <Badge count={actions?.length || 0} showZero color="blue">
          <span className="mr-2">Actions</span>
        </Badge>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: active => (
        <Tag color={active ? 'success' : 'warning'} icon={active ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>
          {active ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: date => moment(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type={record.is_active ? 'default' : 'primary'}
            onClick={() => handleToggleActive(record.id, record.is_active)}
          >
            {record.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this workflow?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <span className="text-xl">Automated Workflows</span>
            <Tag color="blue">{workflows.length}</Tag>
          </div>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/workflows/create')}
          >
            Create Workflow
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={workflows}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} workflows`
          }}
        />
      </Card>
    </div>
  );
};

export default Workflows;