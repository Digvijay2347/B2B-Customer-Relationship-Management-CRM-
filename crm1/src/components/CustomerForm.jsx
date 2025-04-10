import React from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  Row,
  Col
} from 'antd';
import { PhoneOutlined, MailOutlined, BankOutlined, GlobalOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const CustomerForm = ({ initialValues, onSubmit, loading }) => {
  const [form] = Form.useForm();

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Retail',
    'Manufacturing',
    'Education',
    'Real Estate',
    'Other'
  ];

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      initialValues={initialValues}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="name"
            label="Customer Name"
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input placeholder="Enter customer name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Enter email" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="phone"
            label="Phone"
          >
            <Input prefix={<PhoneOutlined />} placeholder="Enter phone number" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="company"
            label="Company"
          >
            <Input prefix={<BankOutlined />} placeholder="Enter company name" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="industry"
            label="Industry"
          >
            <Select
              placeholder="Select industry"
              allowClear
            >
              {industries.map(industry => (
                <Select.Option key={industry.toLowerCase()} value={industry.toLowerCase()}>
                  {industry}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="location"
            label="Location"
          >
            <Input prefix={<GlobalOutlined />} placeholder="Enter location" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="notes"
        label="Notes"
      >
        <TextArea rows={4} placeholder="Add any additional notes" />
      </Form.Item>

      <Form.Item className="mb-0">
        <Space>
          <Button onClick={() => form.resetFields()}>
            Reset
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Customer
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default CustomerForm;