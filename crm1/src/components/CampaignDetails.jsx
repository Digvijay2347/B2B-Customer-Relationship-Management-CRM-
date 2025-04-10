import React from 'react';
import {
  Card,
  Statistic,
  Row,
  Col,
  Table,
  Tag,
  Progress,
  Empty,
  Space
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LinkOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const CampaignDetails = ({ campaign }) => {
  if (!campaign) {
    return <Empty description="No campaign data available" />;
  }

  // Calculate campaign progress
  const startDate = moment(campaign.start_date);
  const endDate = moment(campaign.end_date);
  const now = moment();
  const totalDays = endDate.diff(startDate, 'days');
  const daysElapsed = now.diff(startDate, 'days');
  const progress = Math.min(Math.round((daysElapsed / totalDays) * 100), 100);

  return (
    <div className="space-y-4">
      {/* Campaign Overview */}
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <h2 className="text-xl font-semibold mb-2">{campaign.name}</h2>
            {campaign.description && (
              <p className="text-gray-600 mb-4">{campaign.description}</p>
            )}
            <Space>
              <Tag color="blue">{campaign.type?.toUpperCase()}</Tag>
              <Tag color={campaign.status === 'active' ? 'green' : 'default'}>
                {campaign.status?.toUpperCase()}
              </Tag>
            </Space>
          </Col>
          <Col span={8}>
            <div className="text-right">
              <p className="mb-2">Campaign Progress</p>
              <Progress percent={progress} status="active" />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Campaign Statistics */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Recipients"
              value={campaign.total_recipients || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Sent"
              value={campaign.sent_count || 0}
              prefix={<MailOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Opened"
              value={campaign.opened_count || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Clicked"
              value={campaign.clicked_count || 0}
              prefix={<LinkOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Recipients Table */}
      <Card title="Campaign Recipients">
        {campaign.recipients && campaign.recipients.length > 0 ? (
          <Table
            dataSource={campaign.recipients}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: status => (
                  <Tag color={
                    status === 'sent' ? 'blue' :
                    status === 'opened' ? 'green' :
                    status === 'clicked' ? 'purple' :
                    'default'
                  }>
                    {status?.toUpperCase()}
                  </Tag>
                ),
              },
              {
                title: 'Last Updated',
                dataIndex: 'updated_at',
                key: 'updated_at',
                render: date => date ? moment(date).format('MMM D, YYYY HH:mm') : '-',
              },
            ]}
          />
        ) : (
          <Empty description="No recipients added to this campaign yet" />
        )}
      </Card>
    </div>
  );
};

export default CampaignDetails;