import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  message,
  Modal,
  Tag,
  Space,
  Tooltip,
  Popconfirm,
  Select
} from 'antd';
import {
  UserAddOutlined,
  DeleteOutlined,
  EditOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  BankOutlined,
  UserSwitchOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import CustomerForm from '../components/CustomerForm';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const { token, user } = useAuth();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/customers', {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // Handle both array and object responses
      const customerData = response.data.customers || response.data;
      setCustomers(Array.isArray(customerData) ? customerData : []);
  
    } catch (error) {
      console.error('Error fetching customers:', error);
      message.error('Failed to fetch customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get('http://localhost:3000/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter only users with agent role
      const agentUsers = response.data.filter(user => user.role === 'agent');
      setAgents(agentUsers);
    } catch (error) {
      console.error('Error fetching agents:', error);
      message.error('Failed to fetch agents');
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchAgents();
  }, [token]);

  const handleCreate = async (values) => {
    setFormLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:3000/customers',
        values,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success('Customer created successfully');
      setModalVisible(false);
      // Make sure we're getting the correct data structure
      const newCustomer = response.data;
      setCustomers(prev => [...prev, newCustomer]);
    } catch (error) {
      console.error('Create error:', error);
      message.error('Failed to create customer');
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    console.log('Current user role:', user.role);
    console.log('Customers:', customers);
  }, [user.role, customers]);

  const handleEdit = async (values) => {
    setFormLoading(true);
    try {
      await axios.put(
        `http://localhost:3000/customers/${editingCustomer.id}`,
        values,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success('Customer updated successfully');
      setModalVisible(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error) {
      message.error('Failed to update customer');
      console.error('Update error:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (customerId) => {
    try {
      await axios.delete(`http://localhost:3000/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      message.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      message.error('Failed to delete customer');
      console.error('Delete error:', error);
    }
  };

  const handleAssignAgent = async (customerId, agentId) => {
    try {
      setFormLoading(true);
      await axios.post(
        `http://localhost:3000/customers/${customerId}/assign`,
        { agent_id: agentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success('Customer assigned successfully');
      fetchCustomers();
    } catch (error) {
      console.error('Error assigning agent:', error);
      message.error('Failed to assign agent');
    } finally {
      setFormLoading(false);
    }
  };

  const showAssignmentHistory = async (customerId) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/customers/${customerId}/assignments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Modal.info({
        title: 'Assignment History',
        width: 600,
        content: (
          <div>
            <p className="mb-4">History of agent assignments for this customer:</p>
            <Table
              dataSource={response.data}
              columns={[
                {
                  title: 'Date',
                  dataIndex: 'created_at',
                  render: (date) => new Date(date).toLocaleString(),
                },
                {
                  title: 'Assigned To',
                  dataIndex: ['assigned_to'],
                  render: (_, record) => (
                    <Tag icon={<UserSwitchOutlined />} color="blue">
                      {record.assigned_to?.email || 'N/A'}
                      {record.assigned_to?.name && ` (${record.assigned_to.name})`}
                    </Tag>
                  ),
                },
                {
                  title: 'Assigned By',
                  dataIndex: ['assigned_by'],
                  render: (_, record) => (
                    <Tag color="purple">
                      {record.assigned_by?.email || 'N/A'}
                      {record.assigned_by?.name && ` (${record.assigned_by.name})`}
                    </Tag>
                  ),
                },
              ]}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </div>
        ),
        className: 'assignment-history-modal',
      });
    } catch (error) {
      console.error('Error fetching assignment history:', error);
      message.error('Failed to fetch assignment history');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: email => email && (
        <Tooltip title={`Send email to ${email}`}>
          <a href={`mailto:${email}`}>
            <Space>
              <MailOutlined />
              {email}
            </Space>
          </a>
        </Tooltip>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: phone => phone && (
        <Tooltip title={`Call ${phone}`}>
          <a href={`tel:${phone}`}>
            <Space>
              <PhoneOutlined />
              {phone}
            </Space>
          </a>
        </Tooltip>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      render: company => company && (
        <Space>
          <BankOutlined />
          {company}
        </Space>
      ),
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
      render: industry => industry && <Tag color="blue">{industry}</Tag>,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: location => location && (
        <Space>
          <GlobalOutlined />
          {location}
        </Space>
      ),
    },
    {
      title: 'Assigned To',
      dataIndex: ['assigned_to'],
      key: 'assigned_to',
      render: (assigned_to, record) => {

        if (!record) return null;
        // Only show assignment dropdown for admins and managers
        if (user.role === 'admin' || user.role === 'manager' || user.role === 'agent') {
          return (
            <Space>
              <Select
                style={{ width: 200 }}
                placeholder="Select an agent"
                value={assigned_to?.id || null}
                onChange={(value) => handleAssignAgent(record.id, value)}
                allowClear
                loading={formLoading}
              >
                {agents.map(agent => (
                  <Select.Option key={agent.id} value={agent.id}>
                    <Space>
                      <UserSwitchOutlined />
                      {agent.email}
                      {agent.name && ` (${agent.name})`}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
              <Tooltip title="View Assignment History">
                <Button
                  icon={<HistoryOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    showAssignmentHistory(record.id);
                  }}
                  size="small"
                />
              </Tooltip>
            </Space>
          );
        }
        // For agents, just show the assignment info
        return (
          <Space>
            {assigned_to ? (
              <Tag icon={<UserSwitchOutlined />} color="blue">
                {assigned_to.email}
                {assigned_to.name && ` (${assigned_to.name})`}
              </Tag>
            ) : (
              <Tag color="orange">Unassigned</Tag>
            )}
            <Tooltip title="View Assignment History">
              <Button
                icon={<HistoryOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  showAssignmentHistory(record.id);
                }}
                size="small"
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingCustomer(record);
              setModalVisible(true);
            }}
          />
          {(user.role === 'admin' || user.role === 'manager') && (
            <Popconfirm
              title="Are you sure you want to delete this customer?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button icon={<DeleteOutlined />} danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <Space>
            <span>Customers</span>
            <Tag color="blue">{customers.length}</Tag>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => {
              setEditingCustomer(null);
              setModalVisible(true);
            }}
          >
            Add Customer
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `Total ${total} items`
          }}
        />
      </Card>

      <Modal
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingCustomer(null);
        }}
        footer={null}
        width={800}
      >
        <CustomerForm
          initialValues={editingCustomer}
          onSubmit={editingCustomer ? handleEdit : handleCreate}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
};

export default Customers;