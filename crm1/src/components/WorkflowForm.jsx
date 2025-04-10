import React from 'react';
import {
  Form,
  Input,
  Select,
  Switch,
  Button,
  Card,
  Space,
  Divider,
  message
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const WORKFLOW_TRIGGERS = {
  CUSTOMER_CREATED: 'customer_created',
  CUSTOMER_UPDATED: 'customer_updated',
  CAMPAIGN_CREATED: 'campaign_created',
  LEAD_COLD: 'lead_cold',
  PAYMENT_OVERDUE: 'payment_overdue',
  TICKET_UNRESOLVED: 'ticket_unresolved'
};

const WORKFLOW_ACTIONS = {
  SEND_EMAIL: 'send_email',
  CREATE_TASK: 'create_task',
  UPDATE_RECORD: 'update_record',
  SEND_NOTIFICATION: 'send_notification'
};

const WorkflowForm = ({ initialValues, onSubmit, loading }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values) => {
    // Validate that at least one action is defined
    if (!values.actions || values.actions.length === 0) {
      message.error('Please add at least one action to the workflow');
      return;
    }
    onSubmit(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        ...initialValues,
        is_active: initialValues?.is_active ?? true,
        actions: initialValues?.actions || []
      }}
    >
      <Card title="Workflow Details">
        <Form.Item
          name="name"
          label="Workflow Name"
          rules={[{ required: true, message: 'Please enter workflow name' }]}
        >
          <Input placeholder="e.g., New Customer Welcome Flow" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea 
            rows={4} 
            placeholder="Describe what this workflow does and when it should trigger"
          />
        </Form.Item>

        <Form.Item
          name="trigger_type"
          label="Trigger Event"
          rules={[{ required: true, message: 'Please select trigger event' }]}
        >
          <Select>
            {Object.entries(WORKFLOW_TRIGGERS).map(([key, value]) => (
              <Select.Option key={value} value={value}>
                {key.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ')}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="is_active"
          label="Active"
          valuePropName="checked"
          tooltip="Inactive workflows won't execute automatically"
        >
          <Switch />
        </Form.Item>
      </Card>

      <Card title="Actions" className="mt-4">
        <Form.List name="actions">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} className="border p-4 mb-4 rounded bg-gray-50">
                  <Space direction="vertical" style={{ width: '100%' }} className="relative">
                    <Form.Item
                      {...restField}
                      name={[name, 'type']}
                      label="Action Type"
                      rules={[{ required: true, message: 'Please select action type' }]}
                    >
                      <Select>
                        {Object.entries(WORKFLOW_ACTIONS).map(([key, value]) => (
                          <Select.Option key={value} value={value}>
                            {key.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                            ).join(' ')}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, currentValues) =>
                        prevValues.actions?.[name]?.type !== currentValues.actions?.[name]?.type
                      }
                    >
                      {({ getFieldValue }) => {
                        const actionType = getFieldValue(['actions', name, 'type']);
                        
                        switch (actionType) {
                          case WORKFLOW_ACTIONS.SEND_EMAIL:
                            return (
                              <>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'template']}
                                  label="Email Template"
                                  rules={[{ required: true }]}
                                >
                                  <TextArea 
                                    rows={4} 
                                    placeholder="Available variables: ${customerName}, ${customerEmail}, etc."
                                  />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'subject']}
                                  label="Email Subject"
                                  rules={[{ required: true }]}
                                >
                                  <Input placeholder="Email subject line" />
                                </Form.Item>
                              </>
                            );
                          case WORKFLOW_ACTIONS.CREATE_TASK:
                            return (
                              <>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'taskTemplate']}
                                  label="Task Title"
                                  rules={[{ required: true }]}
                                >
                                  <Input placeholder="e.g., Follow up with ${customerName}" />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'dueInDays']}
                                  label="Due In (Days)"
                                  rules={[{ required: true }]}
                                >
                                  <Input type="number" min={1} />
                                </Form.Item>
                              </>
                            );
                          case WORKFLOW_ACTIONS.SEND_NOTIFICATION:
                            return (
                              <Form.Item
                                {...restField}
                                name={[name, 'message']}
                                label="Notification Message"
                                rules={[{ required: true }]}
                              >
                                <Input placeholder="Notification message with ${variables}" />
                              </Form.Item>
                            );
                        }
                      }}
                    </Form.Item>

                    <Button 
                      type="text" 
                      danger 
                      onClick={() => remove(name)}
                      className="absolute top-0 right-0"
                    >
                      <MinusCircleOutlined /> Remove
                    </Button>
                  </Space>
                </div>
              ))}
              
              <Form.Item>
                <Button 
                  type="dashed" 
                  onClick={() => add()} 
                  block 
                  icon={<PlusOutlined />}
                  className="mt-4"
                >
                  Add Action
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Card>

      <div className="mt-4 flex justify-end">
        <Space>
          <Button type="default" onClick={() => form.resetFields()}>
            Reset
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Workflow
          </Button>
        </Space>
      </div>
    </Form>
  );
};

export default WorkflowForm;