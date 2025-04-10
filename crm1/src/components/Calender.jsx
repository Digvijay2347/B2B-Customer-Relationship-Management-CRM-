import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import isToday from 'date-fns/isToday';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  message,
  Tooltip,
  Popconfirm,
  Card,
  Row,
  Col,
  Badge,
  Statistic,
  Timeline,
  Tag,
  Space
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  FilterOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';

const locales = {
  'en-US': enUS
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingEvent, setEditingEvent] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuth();

  // New state variables
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventStats, setEventStats] = useState({
    total: 0,
    upcoming: 0,
    today: 0,
    completed: 0
  });
  const [filterForm] = Form.useForm();
  const [filters, setFilters] = useState({
    type: null,
    customer: null,
    dateRange: null
  });

  // Function to calculate event statistics
  const calculateEventStats = (eventsList) => {
    const now = new Date();
    const stats = {
      total: eventsList.length,
      upcoming: 0,
      today: 0,
      completed: 0
    };

    eventsList.forEach(event => {
      const startDate = new Date(event.start);
      if (isToday(startDate)) {
        stats.today++;
      }
      if (startDate > now) {
        stats.upcoming++;
      }
      if (new Date(event.end) < now) {
        stats.completed++;
      }
    });

    setEventStats(stats);
  };

  // Function to get upcoming events
  const getUpcomingEvents = (eventsList) => {
    const now = new Date();
    const upcoming = eventsList
      .filter(event => new Date(event.start) > now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5);
    setUpcomingEvents(upcoming);
  };

  // Modified fetchEvents to include filtering
  const fetchEvents = async () => {
    try {
      let url = 'http://localhost:3000/calendar-events';
      const params = {};
      
      if (filters.dateRange) {
        params.start_date = filters.dateRange[0].toISOString();
        params.end_date = filters.dateRange[1].toISOString();
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      let filteredEvents = response.data;

      if (filters.type) {
        filteredEvents = filteredEvents.filter(event => event.type === filters.type);
      }
      if (filters.customer) {
        filteredEvents = filteredEvents.filter(event => event.customer_id === filters.customer);
      }

      const formattedEvents = filteredEvents.map(event => ({
        ...event,
        start: new Date(event.start_date),
        end: new Date(event.end_date),
        title: `${event.title}${event.customer?.name ? ` - ${event.customer.name}` : ''}`
      }));

      setEvents(formattedEvents);
      calculateEventStats(formattedEvents);
      getUpcomingEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      message.error('Failed to fetch events');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('http://localhost:3000/customers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data.customers || response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      message.error('Failed to fetch customers');
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchCustomers();
  }, [token]);

  const handleEventCreate = async (values) => {
    try {
      setLoading(true);
      const eventData = {
        ...values,
        start_date: values.dateRange[0].toISOString(),
        end_date: values.dateRange[1].toISOString()
      };
      delete eventData.dateRange;

      if (editingEvent) {
        await axios.put(
          `http://localhost:3000/calendar-events/${editingEvent.id}`,
          eventData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success('Event updated successfully');
      } else {
        await axios.post(
          'http://localhost:3000/calendar-events',
          eventData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success('Event created successfully');
      }
      
      setModalVisible(false);
      setEditingEvent(null);
      form.resetFields();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      message.error('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleEventDelete = async (eventId) => {
    try {
      await axios.delete(`http://localhost:3000/calendar-events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      message.success('Event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      message.error('Failed to delete event');
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#1890ff';
    switch (event.type) {
      case 'meeting':
        backgroundColor = '#52c41a';
        break;
      case 'task':
        backgroundColor = '#722ed1';
        break;
      case 'reminder':
        backgroundColor = '#faad14';
        break;
      default:
        break;
    }
    return { style: { backgroundColor } };
  };

  const CustomEvent = ({ event }) => (
    <Tooltip title={
      <div>
        <p><strong>{event.title}</strong></p>
        <p>{event.description}</p>
        <p>Customer: {event.customer?.name || 'N/A'}</p>
        <p>Assigned to: {event.assigned_user?.name || 'N/A'}</p>
      </div>
    }>
      <div className="rbc-event-content">
        {event.title}
      </div>
    </Tooltip>
  );

  // New function to handle filter changes
  const handleFilterChange = (values) => {
    setFilters(values);
    fetchEvents();
  };

  const handleAddEventClick = () => {
    setEditingEvent(null);
    setModalVisible(true);
    setFilterModalVisible(false);
  };

  const handleFilterClick = () => {
    setFilterModalVisible(true);
    setModalVisible(false);
  };

  return (
    <div className="p-6">
      <Row gutter={[16, 16]}>
        {/* Statistics Cards */}
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Events"
              value={eventStats.total}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Today's Events"
              value={eventStats.today}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Upcoming Events"
              value={eventStats.upcoming}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed Events"
              value={eventStats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        {/* Main Calendar and Sidebar */}
        <Col xs={24} lg={18}>
          <Card
            title="Calendar"
            extra={
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={handleFilterClick}
                >
                  Filters
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddEventClick}
                >
                  Add Event
                </Button>
              </Space>
            }
          >
            <div style={{ height: 'calc(100vh - 300px)' }}>
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                components={{ event: CustomEvent }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event) => {
                  setEditingEvent(event);
                  form.setFieldsValue({
                    ...event,
                    dateRange: [moment(event.start), moment(event.end)],
                    customer_id: event.customer_id
                  });
                  setModalVisible(true);
                }}
              />
            </div>
          </Card>
        </Col>

        {/* Upcoming Events Sidebar */}
        <Col xs={24} lg={6}>
          <Card title="Upcoming Events" className="h-full">
            <Timeline>
              {upcomingEvents.map((event) => (
                <Timeline.Item
                  key={event.id}
                  color={getEventColor(event.type)}
                >
                  <div className="mb-3">
                    <h4 className="font-medium">{event.title}</h4>
                    <p className="text-gray-500 text-sm">
                      {moment(event.start).format('MMM DD, YYYY HH:mm')}
                    </p>
                    {event.customer?.name && (
                      <Tag color="blue">{event.customer.name}</Tag>
                    )}
                    <Tag color={getEventTypeColor(event.type)}>
                      {event.type}
                    </Tag>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
      </Row>

      {/* Event Form Modal */}
      <Modal
        title={editingEvent ? 'Edit Event' : 'Create Event'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingEvent(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          onFinish={handleEventCreate}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Date Range"
            rules={[{ required: true, message: 'Please select date range' }]}
          >
            <DatePicker.RangePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Event Type"
            rules={[{ required: true, message: 'Please select event type' }]}
          >
            <Select>
              <Select.Option value="meeting">Meeting</Select.Option>
              <Select.Option value="task">Task</Select.Option>
              <Select.Option value="reminder">Reminder</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="customer_id"
            label="Related Customer"
          >
            <Select
              allowClear
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {customers.map(customer => (
                <Select.Option key={customer.id} value={customer.id}>
                  {customer.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end gap-2">
            {editingEvent && (
              <Popconfirm
                title="Are you sure you want to delete this event?"
                onConfirm={() => {
                  handleEventDelete(editingEvent.id);
                  setModalVisible(false);
                  setEditingEvent(null);
                  form.resetFields();
                }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            )}
            <Button type="primary" htmlType="submit" loading={loading}>
              {editingEvent ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Filters Modal */}
      <Modal
        title="Filter Events"
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        footer={null}
      >
        <Form
          form={filterForm}
          onFinish={handleFilterChange}
          layout="vertical"
        >
          <Form.Item name="type" label="Event Type">
            <Select allowClear>
              <Select.Option value="meeting">Meeting</Select.Option>
              <Select.Option value="task">Task</Select.Option>
              <Select.Option value="reminder">Reminder</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="customer" label="Customer">
            <Select
              allowClear
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {customers.map(customer => (
                <Select.Option key={customer.id} value={customer.id}>
                  {customer.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="dateRange" label="Date Range">
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Apply Filters
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// Helper functions
const getEventColor = (type) => {
  switch (type) {
    case 'meeting': return 'green';
    case 'task': return 'purple';
    case 'reminder': return 'gold';
    default: return 'blue';
  }
};

const getEventTypeColor = (type) => {
  switch (type) {
    case 'meeting': return 'success';
    case 'task': return 'processing';
    case 'reminder': return 'warning';
    default: return 'default';
  }
};

export default Calendar;