import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  message,
  Modal,
  Popconfirm,
  Tooltip,
  Progress,
  Badge,
  Typography,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  MailOutlined,
  EyeOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import EditCampaignModal from '../components/EditCampaignModal';
import CampaignDetails from '../components/CampaignDetails';
import moment from 'moment';

const { Text, Paragraph } = Typography;

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get('http://localhost:3000/campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error('Failed to fetch campaigns');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [token]);

  const handleDelete = async (campaignId) => {
    try {
      await axios.delete(`http://localhost:3000/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      message.success('Campaign deleted successfully');
      fetchCampaigns();
    } catch (error) {
      message.error('Failed to delete campaign');
      console.error('Delete error:', error);
    }
  };

  const viewCampaignDetails = async (campaign) => {
    try {
      const response = await axios.get(`http://localhost:3000/campaigns/${campaign.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCampaign(response.data);
      setDetailsVisible(true);
    } catch (error) {
      message.error('Failed to load campaign details');
      console.error('Error:', error);
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return '#52c41a';
    if (progress >= 50) return '#1890ff';
    if (progress >= 30) return '#faad14';
    return '#ff4d4f';
  };

  const columns = [
    {
      title: 'Campaign',
      key: 'campaign',
      fixed: 'left',
      width: 300,
      render: (record) => (
        <Space>
          <Avatar 
            icon={record.type === 'email' ? <MailOutlined /> : <UserOutlined />}
            style={{ 
              backgroundColor: record.type === 'email' ? '#1890ff' : '#52c41a'
            }}
          />
          <Space direction="vertical" size={0}>
            <Text strong>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Created {moment(record.created_at).fromNow()}
            </Text>
          </Space>
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Type & Description',
      dataIndex: 'type',
      key: 'type',
      width: 250,
      render: (type, record) => (
        <Space direction="vertical" size={0}>
          <Tag color="blue">{type?.toUpperCase()}</Tag>
          <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
            {record.description || 'No description provided'}
          </Paragraph>
        </Space>
      ),
    },
    {
      title: 'Status & Progress',
      key: 'status',
      width: 200,
      render: (record) => {
        const progress = record.progress || 0;
        const colors = {
          draft: 'default',
          active: 'green',
          completed: 'gray',
          paused: 'orange',
        };
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Tag color={colors[record.status]}>
              {record.status?.toUpperCase()}
            </Tag>
            <Progress 
              percent={progress} 
              size="small" 
              strokeColor={getProgressColor(progress)}
            />
          </Space>
        );
      },
    },
    {
      title: 'Target Audience',
      key: 'audience',
      width: 200,
      render: (record) => (
        <Space direction="vertical" size={0}>
          <Space>
            <TeamOutlined />
            <Text>{record.total_recipients || 0} Recipients</Text>
          </Space>
          {record.filters?.industries && (
            <Space wrap>
              {record.filters.industries.map(industry => (
                <Tag key={industry} color="cyan" style={{ margin: '2px' }}>
                  {industry}
                </Tag>
              ))}
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Performance',
      key: 'performance',
      width: 200,
      render: (record) => (
        <Space direction="vertical" size={2}>
          <Space>
            <Badge status="success" />
            <Text><EyeOutlined /> {record.opened_count || 0} Opens</Text>
          </Space>
          <Space>
            <Badge status="processing" />
            <Text><LinkOutlined /> {record.clicked_count || 0} Clicks</Text>
          </Space>
          <Space>
            <Badge status="warning" />
            <Text><CheckCircleOutlined /> {record.conversion_count || 0} Conversions</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 200,
      render: (record) => (
        <Space direction="vertical" size={0}>
          <Space>
            <CalendarOutlined />
            <Text>
              {moment(record.start_date).format('MMM D')} - {moment(record.end_date).format('MMM D, YYYY')}
            </Text>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {moment(record.start_date).fromNow()}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              icon={<BarChartOutlined />}
              onClick={() => viewCampaignDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Campaign">
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setEditingCampaign({
                  ...record,
                  date_range: [moment(record.start_date), moment(record.end_date)],
                  status: record.status
                });
                setModalVisible(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this campaign?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Campaign">
              <Button icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 lg:p-6">
      <Card
        title={
          <Space>
            <Text strong style={{ fontSize: '20px' }}>Campaigns</Text>
            <Tag color="blue">{campaigns.length} Total</Tag>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/campaigns/create')}
          >
            Create Campaign
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={campaigns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} campaigns`,
          }}
        />
      </Card>

      {/* Campaign Details Modal */}
      <Modal
        title="Campaign Details"
        open={detailsVisible}
        onCancel={() => {
          setDetailsVisible(false);
          setSelectedCampaign(null);
        }}
        width={1000}
        footer={null}
      >
        <CampaignDetails campaign={selectedCampaign} />
      </Modal>

      {/* Edit Campaign Modal */}
      <EditCampaignModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingCampaign(null);
        }}
        campaign={editingCampaign}
        loading={formLoading}
        onSuccess={fetchCampaigns}
      />
    </div>
  );
};

export default Campaigns;