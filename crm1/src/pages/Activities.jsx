import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Tabs, message } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import moment from 'moment';

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Activities response:', response.data); // For debugging
      setActivities(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      message.error('Failed to load activities');
      setActivities([]);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Sessions response:', response.data); // For debugging
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      message.error('Failed to load sessions');
      setSessions([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchActivities(), fetchSessions()]);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const getActivityTypeColor = (type) => {
    const colors = {
      login_success: 'success',
      login_failed: 'error',
      logout: 'warning',
      password_change: 'processing',
      profile_update: 'processing'
    };
    return colors[type] || 'default';
  };

  const activityColumns = [
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: 'User',
      dataIndex: 'users',
      key: 'user',
      render: (user) => user?.email || 'Unknown',
      filters: activities
        .map(activity => activity.users?.email)
        .filter((email, index, self) => email && self.indexOf(email) === index)
        .map(email => ({ text: email, value: email })),
      onFilter: (value, record) => record.users?.email === value
    },
    {
      title: 'Activity Type',
      dataIndex: 'activity_type',
      key: 'activity_type',
      filters: [
        { text: 'Login Success', value: 'login_success' },
        { text: 'Login Failed', value: 'login_failed' },
        { text: 'Logout', value: 'logout' },
        { text: 'Password Change', value: 'password_change' },
        { text: 'Profile Update', value: 'profile_update' }
      ],
      onFilter: (value, record) => record.activity_type === value,
      render: (type) => (
        <Tag color={getActivityTypeColor(type)}>
          {type.replace(/_/g, ' ').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'IP Address',
      dataIndex: 'details',
      key: 'ip_address',
      render: (details) => details?.ip_address || '-'
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      render: (details) => {
        if (!details) return '-';
        
        const detailsArray = [];
        
        if (details.reason) {
          detailsArray.push(<Tag key="reason" color="red">{details.reason}</Tag>);
        }
        
        if (details.email && details.reason === 'User not found') {
          detailsArray.push(<div key="attempted-email">Attempted email: {details.email}</div>);
        }

        return detailsArray.length > 0 ? detailsArray : '-';
      }
    }
  ];

  const sessionColumns = [
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: 'User',
      dataIndex: 'users',
      key: 'user',
      render: (user) => user?.email || 'Unknown',
      filters: sessions
        .map(session => session.users?.email)
        .filter((email, index, self) => email && self.indexOf(email) === index)
        .map(email => ({ text: email, value: email })),
      onFilter: (value, record) => record.users?.email === value
    },
    {
      title: 'Action',
      dataIndex: 'activity_type',
      key: 'activity_type',
      filters: [
        { text: 'Login', value: 'login_success' },
        { text: 'Logout', value: 'logout' }
      ],
      onFilter: (value, record) => record.activity_type === value,
      render: (type) => (
        <Tag color={type === 'login_success' ? 'success' : 'warning'}>
          {type === 'login_success' ? 'LOGIN' : 'LOGOUT'}
        </Tag>
      )
    },
    {
      title: 'IP Address',
      dataIndex: 'details',
      key: 'ip_address',
      render: (details) => details?.ip_address || '-'
    }
  ];

  const tabItems = [
    {
      key: 'activities',
      label: 'All Activities',
      children: (
        <Table
          columns={activityColumns}
          dataSource={activities}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: true }}
        />
      )
    },
    {
      key: 'sessions',
      label: 'Login Sessions',
      children: (
        <Table
          columns={sessionColumns}
          dataSource={sessions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: true }}
        />
      )
    }
  ];

  return (
    <div className="space-y-4">
      <Card title="Activity Monitoring">
        <Tabs 
          defaultActiveKey="activities" 
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default Activities;