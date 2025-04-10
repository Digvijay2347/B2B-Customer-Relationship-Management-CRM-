import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Box, Container, Grid, Paper, Typography, CircularProgress, Card, CardContent, useTheme, List, ListItem, ListItemText, Chip, IconButton, Tooltip as MuiTooltip } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { alpha } from '@mui/material/styles';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TimelineIcon from '@mui/icons-material/Timeline';
import { LineChart, Line, AreaChart, Area } from 'recharts';
import moment from 'moment';

const Dashboard = () => {
  const theme = useTheme();
  const [stats, setStats] = useState({ totalCustomers: 0, newCustomers: 0, activeUsers: 0, customersByCompany: [], campaigns: { total: 0, active: 0, draft: 0, completed: 0, recentCampaigns: [] }, recentActivities: [], calendarEvents: [] });
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [customersResponse, campaignsResponse, activitiesResponse, calendarEventsResponse] = await Promise.all([
        axios.get('http://localhost:3000/customers', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3000/campaigns', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3000/activities', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3000/calendar-events', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const customers = customersResponse.data.customers || [];
      const campaigns = campaignsResponse.data || [];
      const activities = activitiesResponse.data || [];
      const calendarEvents = calendarEventsResponse.data || [];

      const companyCount = customers.reduce((acc, customer) => ({ ...acc, [customer.company]: (acc[customer.company] || 0) + 1 }), {});
      const customersByCompany = Object.entries(companyCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newCustomers = customers.filter(customer => new Date(customer.created_at) > thirtyDaysAgo).length;

      const campaignStats = {
        total: campaigns.length,
        active: campaigns.filter(c => c.status === 'active').length,
        draft: campaigns.filter(c => c.status === 'draft').length,
        completed: campaigns.filter(c => c.status === 'completed').length,
        recentCampaigns: campaigns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
      };

      const processedActivities = activities.map(activity => ({
        id: activity.id,
        description: activity.description,
        createdAt: moment(activity.created_at).format('MMMM Do YYYY, h:mm a'),
        user: activity.user || 'System',
      }));

      setStats({
        totalCustomers: customers.length,
        newCustomers,
        customersByCompany,
        activeUsers: customers.filter(c => c.status === 'active').length,
        campaigns: campaignStats,
        recentActivities: processedActivities.slice(0, 10),
        calendarEvents
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => { const interval = setInterval(() => fetchDashboardData(), 300000); return () => clearInterval(interval); }, [fetchDashboardData]);
  useEffect(() => { if (refreshKey > 0) fetchDashboardData(); }, [refreshKey, fetchDashboardData]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);
  const getStatusColor = (status) => ({ draft: 'default', active: 'success', paused: 'warning', completed: 'info', cancelled: 'error' }[status] || 'default');

  if (isLoading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  const renderStatCard = (icon, title, value, subValue, color, description, status, startDate, endDate) => (
    <Card elevation={3} sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {React.cloneElement(icon, { sx: { fontSize: 40, color, mr: 2 } })}
          <Typography color="textSecondary" variant="h6">{title}</Typography>
        </Box>
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>{value}</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>{subValue}</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>{description}</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Status: {status}</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Start Date: {startDate}</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>End Date: {endDate}</Typography>
      </CardContent>
    </Card>
  );

  const renderChartTooltip = ({ active, payload, label }) => active && payload && payload.length ? (
    <Box sx={{ p: 2, backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2" color="textSecondary">Total Customers: <strong>{payload[0].value}</strong></Typography>
        <Typography variant="body2" color="textSecondary">Active Users: <strong>{payload[0].payload.activeUsers}</strong></Typography>
        <Typography variant="body2" color={payload[0].payload.growth > 0 ? 'success.main' : 'error.main'}>Growth: <strong>{payload[0].payload.growth}%</strong></Typography>
      </Box>
    </Box>
  ) : null;

  const renderCalendarEvents = () => (
    <Box>
      <Typography variant="h6">Upcoming Events</Typography>
      {stats.calendarEvents.map(event => (
        <Card key={event.id}>
          <CardContent>
            <Typography variant="h6">{event.title}</Typography>
            <Typography variant="body2">{moment(event.start_date).format('MMMM Do YYYY, h:mm a')}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const renderActivityTimeline = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Activity Timeline</Typography>
      <List sx={{ maxHeight: 400, overflow: 'auto' }}>
        {stats.recentActivities.map(activity => (
          <ListItem key={activity.id} sx={{ py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium', color: theme.palette.text.primary }}>
                    {activity.description}
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    {activity.createdAt}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    by {activity.user}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        ))}
        {stats.recentActivities.length === 0 && (
          <Box display="flex" justifyContent="center" alignItems="center" height={200}>
            <Typography color="textSecondary">No recent activities</Typography>
          </Box>
        )}
      </List>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>Dashboard Overview</Typography>
        <MuiTooltip title="Refresh Dashboard"><IconButton onClick={handleRefresh} color="primary"><RefreshIcon /></IconButton></MuiTooltip>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { icon: <GroupIcon />, title: 'Total Customers', value: stats.totalCustomers, subValue: `Active users: ${stats.activeUsers}`, color: theme.palette.primary.main },
          { icon: <PersonAddIcon />, title: 'New Customers (30d)', value: stats.newCustomers, subValue: `Growth rate: ${((stats.newCustomers / stats.totalCustomers) * 100).toFixed(1)}%`, color: theme.palette.success.main },
          { icon: <BusinessIcon />, title: 'Active Companies', value: stats.customersByCompany.length, subValue: 'Total organizations', color: theme.palette.info.main },
          { 
            icon: <BusinessIcon />, 
            title: 'Active Campaigns', 
            value: stats.campaigns.active, 
            subValue: `Total campaigns: ${stats.campaigns.total}`, 
            color: theme.palette.warning.main,
            description: 'Campaigns aimed at increasing customer engagement.',
            status: 'Active',
            startDate: '2023-01-01',
            endDate: '2023-12-31'
          }
        ].map((card, index) => (
          <Grid item xs={12} md={3} key={index}>{renderStatCard(card.icon, card.title, card.value, card.subValue, card.color, card.description, card.status, card.startDate, card.endDate)}</Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, background: theme.palette.background.paper, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 'bold', mb: 1 }}>Customer Distribution by Company</Typography>
              <Typography variant="body2" color="textSecondary">Top {stats.customersByCompany.length} companies by customer count</Typography>
            </Box>
            {stats.customersByCompany.length > 0 ? (
              <Box sx={{ width: '100%', height: 400, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.customersByCompany.map((item, index) => ({ ...item, color: theme.palette.primary[index % 2 ? 'light' : 'main'], activeUsers: Math.round(item.value * 0.8), growth: ((Math.random() * 40) - 20).toFixed(1) }))} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
                    <YAxis tick={{ fill: theme.palette.text.secondary }} label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', fill: theme.palette.text.secondary }} />
                    <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8, boxShadow: theme.shadows[3] }} content={renderChartTooltip} />
                    <Legend />
                    <Bar dataKey="value" name="Total Customers" radius={[4, 4, 0, 0]}>
                      {stats.customersByCompany.map((entry, index) => (
                        <Cell key={`cell-${entry.name}-${index}`} fill={theme.palette.primary[index % 2 ? 'light' : 'main']} style={{ filter: `drop-shadow(0px 2px 4px ${alpha(theme.palette.primary.main, 0.2)})` }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={400} sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
                <Typography color="textSecondary">No company data available</Typography>
              </Box>
            )}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                { title: 'Average Customers per Company', value: Math.round(stats.totalCustomers / stats.customersByCompany.length) },
                { title: 'Total Companies', value: stats.customersByCompany.length },
                { title: 'Top Company Share', value: `${((stats.customersByCompany[0]?.value / stats.totalCustomers) * 100).toFixed(1)}%` }
              ].map((card, index) => (
                <Card sx={{ flexGrow: 1, minWidth: 200 }} key={index}>
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary">{card.title}</Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>{card.value}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, background: theme.palette.background.paper, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Activity Timeline</Typography>
              <Chip 
                label={`Last ${stats.recentActivities.length} activities`}
                size="small"
                color="primary"
                sx={{ borderRadius: 1 }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Quick Stats (Last 24h)
              </Typography>
              <Grid container spacing={1}>
                {['customer', 'campaign', 'email', 'other'].map((type) => {
                  const count = stats.recentActivities.filter(a => 
                    a.description?.toLowerCase?.().includes(type) || false
                  ).length;
                  return (
                    <Grid item xs={6} key={type}>
                      <Card sx={{ p: 1, backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'capitalize' }}>
                          {type} Activities
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                          {count}
                        </Typography>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            {renderActivityTimeline()}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mt: 3, background: theme.palette.background.paper, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
            <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 'bold', mb: 3 }}>Recent Campaigns</Typography>
            <List>
              {stats.campaigns.recentCampaigns.map((campaign) => (
                <ListItem key={campaign.id} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, '&:last-child': { borderBottom: 'none' } }}>
                  <ListItemText
                    primary={campaign.name}
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Chip size="small" label={campaign.status.toUpperCase()} color={getStatusColor(campaign.status)} sx={{ mr: 1 }} />
                        <Typography variant="caption" color="textSecondary" component="span">{moment(campaign.created_at).fromNow()}</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Trend Analysis Card */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, background: theme.palette.background.paper }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon /> Growth Trends
              </Typography>
              <Typography variant="body2" color="textSecondary">30-day activity analysis</Typography>
            </Box>
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.recentActivities.reduce((acc, activity, index) => {
                    const date = moment(activity.created_at).format('MMM DD');
                    const existing = acc.find(item => item.date === date);
                    if (existing) {
                      existing.count += 1;
                      existing.value += activity.value || 0;
                    } else {
                      acc.push({ date, count: 1, value: activity.value || 0 });
                    }
                    return acc;
                  }, []).slice(-30)}
                >
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke={theme.palette.primary.main} />
                  <Line type="monotone" dataKey="value" stroke={theme.palette.secondary.main} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, background: theme.palette.background.paper }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon /> Performance Metrics
              </Typography>
              <Typography variant="body2" color="textSecondary">Key performance indicators</Typography>
            </Box>
            <Grid container spacing={2}>
              {[
                {
                  label: 'Average Response Time',
                  value: '2.5 hours',
                  trend: '+5%',
                  color: theme.palette.success.main
                },
                {
                  label: 'Customer Engagement',
                  value: '78%',
                  trend: '+12%',
                  color: theme.palette.primary.main
                },
                {
                  label: 'Campaign Success Rate',
                  value: '65%',
                  trend: '-3%',
                  color: theme.palette.error.main
                },
                {
                  label: 'Revenue Growth',
                  value: '23%',
                  trend: '+8%',
                  color: theme.palette.success.main
                }
              ].map((metric, index) => (
                <Grid item xs={6} key={index}>
                  <Box sx={{ p: 2, backgroundColor: alpha(metric.color, 0.1), borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {metric.label}
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 1, color: theme.palette.text.primary }}>
                      {metric.value}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: metric.trend.startsWith('+') ? 'success.main' : 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      {metric.trend} from last period
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Activity Heatmap */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, background: theme.palette.background.paper }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>
                Activity Distribution
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Customer interaction patterns over time
              </Typography>
            </Box>
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.recentActivities.reduce((acc, activity) => {
                    const hour = moment(activity.created_at).format('HH');
                    const existing = acc.find(item => item.hour === hour);
                    if (existing) {
                      existing.value += 1;
                    } else {
                      acc.push({ hour, value: 1 });
                    }
                    return acc;
                  }, Array.from({ length: 24 }, (_, i) => ({ hour: i.toString().padStart(2, '0'), value: 0 })))}
                >
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={theme.palette.primary.main}
                    fill={alpha(theme.palette.primary.main, 0.2)}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="textSecondary">
                Peak Activity Time: {(() => {
                  const peakHour = stats.recentActivities.reduce((acc, activity) => {
                    const hour = moment(activity.created_at).format('HH');
                    acc[hour] = (acc[hour] || 0) + 1;
                    return acc;
                  }, {});
                  const max = Math.max(...Object.values(peakHour));
                  const peak = Object.entries(peakHour).find(([_, value]) => value === max);
                  return peak ? `${peak[0]}:00` : 'N/A';
                })()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Average Daily Activities: {Math.round(stats.recentActivities.length / 30)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {renderCalendarEvents()}
    </Container>
  );
};

export default Dashboard;