require('dotenv').config();
const express = require('express'), { createClient } = require('@supabase/supabase-js'),
      jwt = require('jsonwebtoken'), bcrypt = require('bcrypt'), cors = require('cors'),
      http = require('http'), { initializeChat } = require('./chat-server');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');

const app = express(), PORT = process.env.PORT || 3000;
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"], credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const server = http.createServer(app), io = initializeChat(server);
app.set('io', io);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const ROLES = { ADMIN: 'admin', MANAGER: 'manager', AGENT: 'agent' },
      ACTIVITY_TYPES = { LOGIN_SUCCESS: 'login_success', LOGIN_FAILED: 'login_failed', LOGOUT: 'logout', PASSWORD_CHANGE: 'password_change', PROFILE_UPDATE: 'profile_update' },
      PERMISSIONS = { CREATE_USER: 'create_user', READ_USER: 'read_user', UPDATE_USER: 'update_user', DELETE_USER: 'delete_user', CREATE_CUSTOMER: 'create_customer', READ_CUSTOMER: 'read_customer', UPDATE_CUSTOMER: 'update_customer', DELETE_CUSTOMER: 'delete_customer', CREATE_CAMPAIGN: 'create_campaign', READ_CAMPAIGN: 'read_campaign', UPDATE_CAMPAIGN: 'update_campaign', DELETE_CAMPAIGN: 'delete_campaign', ASSIGN_CUSTOMER: 'assign_customer', };

const rolePermissions = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: [PERMISSIONS.READ_USER, PERMISSIONS.CREATE_CUSTOMER, PERMISSIONS.READ_CUSTOMER, PERMISSIONS.UPDATE_CUSTOMER, PERMISSIONS.CREATE_CAMPAIGN, PERMISSIONS.READ_CAMPAIGN, PERMISSIONS.UPDATE_CAMPAIGN, PERMISSIONS.ASSIGN_CUSTOMER],
  [ROLES.AGENT]: [PERMISSIONS.READ_CUSTOMER, PERMISSIONS.UPDATE_CUSTOMER, PERMISSIONS.READ_CAMPAIGN]
};

const WORKFLOW_TRIGGERS = { CUSTOMER_CREATED: 'customer_created', CUSTOMER_UPDATED: 'customer_updated', CAMPAIGN_CREATED: 'campaign_created', LEAD_COLD: 'lead_cold', PAYMENT_OVERDUE: 'payment_overdue', TICKET_UNRESOLVED: 'ticket_unresolved' },
      WORKFLOW_ACTIONS = { SEND_EMAIL: 'send_email', CREATE_TASK: 'create_task', UPDATE_RECORD: 'update_record', SEND_NOTIFICATION: 'send_notification' },
      CUSTOMER_STATUSES = { ACTIVE: 'active', INACTIVE: 'inactive', LEAD: 'lead', CONVERTED: 'converted' };

const PIPELINE_STAGES = {
  LEAD: 'lead',
  CONTACT_MADE: 'contact_made',
  NEEDS_ANALYSIS: 'needs_analysis',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost'
};

// Define stage probabilities for forecasting
const STAGE_PROBABILITIES = {
  [PIPELINE_STAGES.LEAD]: 0.1,
  [PIPELINE_STAGES.CONTACT_MADE]: 0.2,
  [PIPELINE_STAGES.NEEDS_ANALYSIS]: 0.3,
  [PIPELINE_STAGES.PROPOSAL]: 0.5,
  [PIPELINE_STAGES.NEGOTIATION]: 0.7,
  [PIPELINE_STAGES.CLOSED_WON]: 1.0,
  [PIPELINE_STAGES.CLOSED_LOST]: 0
};

const executeWorkflow = async (trigger, context) => {
  try {
    const { data: workflows, error } = await supabase.from('workflow_rules').select('*').eq('trigger_type', trigger).eq('is_active', true);
    if (error) throw error;

    for (const { actions } of workflows) {
      for (const action of actions) {
        if (action.type === WORKFLOW_ACTIONS.SEND_EMAIL) console.log('Sending email:', action.template, context);
        else if (action.type === WORKFLOW_ACTIONS.CREATE_TASK) 
          await supabase.from('tasks').insert([{ 
            title: action.taskTemplate.replace(/\${(\w+)}/g, (_, key) => context[key]), 
            assigned_to: action.assignTo || context.userId, 
            due_date: new Date(Date.now() + action.dueInDays * 86400000).toISOString() 
          }]);
      }
    }
  } catch (error) {
    console.error('Workflow execution error:', error);
  }
};

const executeWorkflowForCustomer = async (workflow, customer, trigger) => {
  try {
    const executionRecord = { workflow_id: workflow.id, customer_id: customer.id, trigger_type: trigger, execution_status: 'pending', action_results: [] };
    const { data: execution, error } = await supabase.from('workflow_executions').insert([executionRecord]).select().single();
    if (error) throw error;

    for (const action of workflow.actions) {
      try {
        executionRecord.action_results.push({ action: action.type, status: 'success', result: await executeWorkflowAction(action, customer, workflow) });
      } catch (actionError) {
        executionRecord.action_results.push({ action: action.type, status: 'failed', error: actionError.message });
      }
    }

    await supabase.from('workflow_executions').update({ execution_status: 'completed', action_results: executionRecord.action_results }).eq('id', execution.id);
  } catch (error) {
    console.error('Workflow execution failed:', error);
  }
};

const trackCustomerActivity = async (customerId, activityType, details) => {
  try {
    await supabase.from('customer_activities').insert([{ customer_id: customerId, activity_type: activityType, ...details }]);
  } catch (error) {
    console.error('Failed to track customer activity:', error);
  }
};

const logActivity = async (userId, activityType, details = {}) => {
  try {
    await supabase.from('user_activities').insert([{ user_id: userId, activity_type: activityType, ip_address: details.ip_address || null, ...details }]);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

const authorize = (requiredPermissions) => (req, res, next) => {
  const hasAllPermissions = requiredPermissions.every(p => rolePermissions[req.user.role].includes(p));
  if (!hasAllPermissions) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',  // Changed from '/tmp/uploads/' to './uploads/'
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!Object.values(ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{ email, password: hashedPassword, role }]).select();
    if (error) throw error;
    const token = jwt.sign({ userId: data[0].id, email: data[0].email, role: data[0].role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !data || !(await bcrypt.compare(password, data.password))) {
      await logActivity(data?.id || null, ACTIVITY_TYPES.LOGIN_FAILED, { email, ip_address: req.ip, reason: error ? 'User not found' : 'Invalid password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: data.id, email: data.email, role: data.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    await logActivity(data.id, ACTIVITY_TYPES.LOGIN_SUCCESS, { ip_address: req.ip });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activity and session routes
app.get('/activities', authenticateToken, authorize([PERMISSIONS.READ_USER]), async (req, res) => {
  try {
    let query = supabase.from('user_activities').select('id, activity_type, details, created_at, users (id, email, role)').order('created_at', { ascending: false });
    if (req.user.role !== ROLES.ADMIN) query = query.eq('user_id', req.user.userId);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/sessions', authenticateToken, authorize([PERMISSIONS.READ_USER]), async (req, res) => {
  try {
    let query = supabase.from('user_activities').select('id, activity_type, details, created_at, users (id, email, role)').in('activity_type', [ACTIVITY_TYPES.LOGIN_SUCCESS, ACTIVITY_TYPES.LOGOUT]).order('created_at', { ascending: false });
    if (req.user.role !== ROLES.ADMIN) query = query.eq('user_id', req.user.userId);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User routes
app.get('/users', authenticateToken, authorize([PERMISSIONS.READ_USER]), async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id, email, role, created_at');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/users/import', authenticateToken, authorize([PERMISSIONS.CREATE_USER]), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process file based on type
    const users = await parseImportFile(req.file);

    // Process users in batches
    for (const userData of users) {
      try {
        // Validate required fields
        if (!userData.email || !userData.password || !userData.role) {
          results.failed.push({
            email: userData.email || 'unknown',
            error: 'Missing required fields (email, password, or role)'
          });
          continue;
        }

        // Validate role
        if (!Object.values(ROLES).includes(userData.role)) {
          results.failed.push({
            email: userData.email,
            error: 'Invalid role'
          });
          continue;
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', userData.email)
          .single();

        if (existingUser) {
          results.failed.push({
            email: userData.email,
            error: 'User already exists'
          });
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Insert user
        const { data: user, error } = await supabase
          .from('users')
          .insert([{
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            name: userData.name,
            phone: userData.phone
          }])
          .select('id, email, role, name')
          .single();

        if (error) throw error;

        results.successful.push({
          id: user.id,
          email: user.email,
          role: user.role
        });

        // Log activity
        await logActivity(req.user.userId, 'user_imported', {
          imported_user_id: user.id,
          imported_user_email: user.email
        });

      } catch (error) {
        results.failed.push({
          email: userData.email,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });

    res.status(201).json({
      summary: {
        total: users.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      results
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }
    console.error('Bulk user import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to parse import file
const parseImportFile = (file) => {
  return new Promise((resolve, reject) => {
    if (file.mimetype === 'application/json') {
      fs.readFile(file.path, 'utf8', (err, data) => {
        if (err) return reject(err);
        try {
          const users = JSON.parse(data);
          if (!Array.isArray(users)) {
            return reject(new Error('JSON file must contain an array of users'));
          }
          resolve(users);
        } catch (error) {
          reject(new Error('Invalid JSON format'));
        }
      });
    } else if (file.mimetype === 'text/csv') {
      const users = [];
      fs.createReadStream(file.path)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (row) => {
          users.push({
            email: row.email,
            password: row.password,
            role: row.role,
            name: row.name,
            phone: row.phone
          });
        })
        .on('end', () => resolve(users))
        .on('error', reject);
    } else {
      reject(new Error('Unsupported file type'));
    }
  });
};

app.post('/customers', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, company, industry, location, tags, notes } = req.body;
    const { data: customer, error } = await supabase
      .from('customers')
      .insert([{ ...req.body, created_by: req.user.id, last_contact_date: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/customers', authenticateToken, async (req, res) => {
  try {
    const { search, industry, location, status, assigned_to, page = 1, pageSize = 10 } = req.query;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('customers')
      .select(`
        *,
        assigned_to:users!customers_assigned_to_fkey(id, email, name),
        assigned_by:users!customers_assigned_by_fkey(id, email, name),
        created_by:users!customers_created_by_fkey(id, email)
      `, { count: 'exact' });

    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    if (industry) query = query.eq('industry', industry);
    if (location) query = query.eq('location', location);
    if (status) query = query.eq('status', status);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);

    // If user is an agent, only show their assigned customers
    if (req.user.role === ROLES.AGENT) {
      query = query.eq('assigned_to', req.user.userId);
    }

    const { data: customers, error, count } = await query.range(from, to);

    if (error) throw error;

    res.json({ 
      customers, 
      total: count, 
      page: parseInt(page), 
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update customer
app.put('/customers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: customer, error } = await supabase
      .from('customers')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/customers/:id', authenticateToken, authorize([PERMISSIONS.DELETE_CUSTOMER]), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track customer activity
app.post('/customers/:id/activities', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, details } = req.body;

    const { data: activity, error } = await supabase
      .from('customer_activities')
      .insert([{ customer_id: id, type, details, created_by: req.user.id }])
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('customers')
      .update({ last_contact_date: new Date().toISOString() })
      .eq('id', id);

    res.status(201).json(activity);
  } catch (error) {
    console.error('Error tracking customer activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Profile routes
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id, email, role, name, phone, profile_picture, created_at').eq('id', req.user.userId).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, currentPassword, newPassword, profile_picture } = req.body;
    const updates = { name, phone, email, profile_picture };
    if (currentPassword && newPassword) {
      const { data: user } = await supabase.from('users').select('password').eq('id', req.user.userId).single();
      if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ error: 'Current password is incorrect' });
      updates.password = await bcrypt.hash(newPassword, 10);
    }
    const { data, error } = await supabase.from('users').update(updates).eq('id', req.user.userId).select('id, email, role, name, phone, profile_picture, created_at');
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign routes
app.post('/campaigns', authenticateToken, authorize([PERMISSIONS.CREATE_CAMPAIGN]), async (req, res) => {
  try {
    const { name, description, status, type, start_date, end_date, target_audience, filters } = req.body;
    const { data, error } = await supabase.from('campaigns').insert([{ name, description, status, type, start_date, end_date, target_audience, filters, created_by: req.user.userId }]).select();
    if (error) throw error;
    await logActivity(req.user.userId, 'campaign_created', { campaign_id: data[0].id, campaign_name: name });
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/campaigns', authenticateToken, authorize([PERMISSIONS.READ_CAMPAIGN]), async (req, res) => {
  try {
    const { data, error } = await supabase.from('campaigns').select('*, created_by_user:users!campaigns_created_by_fkey (email)');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get campaign details endpoint
app.get('/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch campaign and recipients in parallel
    const [campaignResponse, recipientsResponse] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', id).single(),
      supabase.from('campaign_customers').select(`
        customer_id,
        status,
        updated_at,
        customers!campaign_customers_customer_id_fkey (
          id,
          name,
          email
        )
      `).eq('campaign_id', id)
    ]);

    if (campaignResponse.error) {
      console.error('Campaign fetch error:', campaignResponse.error);
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (recipientsResponse.error) {
      console.error('Recipients fetch error:', recipientsResponse.error);
      return res.status(500).json({ error: 'Failed to fetch recipients' });
    }

    const recipients = (recipientsResponse.data || []).map(({ customers, status, updated_at }) => ({
      id: customers?.id,
      name: customers?.name,
      email: customers?.email,
      status,
      updated_at
    }));

    const stats = {
      total_recipients: recipients.length,
      sent_count: recipients.filter(r => r.status === 'sent').length,
      opened_count: recipients.filter(r => r.status === 'opened').length,
      clicked_count: recipients.filter(r => r.status === 'clicked').length
    };

    res.json({ ...campaignResponse.data, ...stats, recipients });

  } catch (error) {
    console.error('Campaign details error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign details', details: error.message });
  }
});

// Update campaign endpoint
app.put('/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      status,
      start_date,
      end_date,
      filters
    } = req.body;

    // Update campaign details
    const { data: campaign, error: updateError } = await supabase
      .from('campaigns')
      .update({
        name,
        description,
        type,
        status,
        start_date,
        end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update campaign filters if provided
    if (filters) {
      const { error: filterError } = await supabase
        .from('campaign_filters')
        .upsert({
          campaign_id: id,
          filters,
          updated_at: new Date().toISOString()
        });

      if (filterError) throw filterError;
    }

    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/campaigns/:id', authenticateToken, authorize([PERMISSIONS.DELETE_CAMPAIGN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) throw error;
    await logActivity(req.user.userId, 'campaign_deleted', { campaign_id: id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customer targeting endpoint
app.post('/campaigns/target-audience', authenticateToken, authorize([PERMISSIONS.READ_CUSTOMER]), async (req, res) => {
  try {
    const { filters } = req.body;
    let query = supabase.from('customers').select('*');
    if (filters?.industries?.length > 0) query = query.in('industry', filters.industries);
    if (filters?.locations?.length > 0) query = query.in('location', filters.locations);
    if (filters?.lastContactDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.lastContactDays);
      query = query.lt('last_contact_date', cutoffDate.toISOString());
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/campaigns/:campaignId/target', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { filters } = req.body;
    
    // Build the query based on filters
    let query = supabase.from('customers').select('*');
    
    if (filters?.industries?.length > 0) {
      query = query.in('industry', filters.industries);
    }
    
    if (filters?.locations?.length > 0) {
      query = query.in('location', filters.locations);
    }
    
    if (filters?.lastContactDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.lastContactDays);
      query = query.lt('last_contact_date', cutoffDate.toISOString());
    }

    // Get matching customers
    const { data: customers, error } = await query;
    if (error) throw error;

    // Add customers to campaign
    const campaignCustomers = customers.map(customer => ({
      campaign_id: campaignId,
      customer_id: customer.id,
      status: 'pending'
    }));

    const { error: insertError } = await supabase
      .from('campaign_customers')
      .upsert(campaignCustomers);

    if (insertError) throw insertError;

    res.json({ count: customers.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/campaigns/:id/target', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { filters } = req.body;

    // Build query with filters
    let query = supabase.from('customers').select('id');
    if (filters) {
      if (filters.industries?.length) query = query.in('industry', filters.industries);
      if (filters.locations?.length) query = query.in('location', filters.locations);
      if (filters.lastContactDays) {
        const cutoffDate = new Date(Date.now() - filters.lastContactDays * 24 * 60 * 60 * 1000);
        query = query.lt('last_contact_date', cutoffDate.toISOString());
      }
    }

    const { data: customers, error: customersError } = await query;
    if (customersError) throw customersError;

    // Upsert campaign_customers records
    const { error: insertError } = await supabase
      .from('campaign_customers')
      .upsert(customers.map(({ id }) => ({
        campaign_id: id,
        customer_id: id,
        status: 'pending',
        created_at: new Date().toISOString()
      })));

    if (insertError) throw insertError;

    res.json({ success: true, targeted_customers: customers.length });
  } catch (error) {
    console.error('Campaign targeting error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/campaigns/target-preview', authenticateToken, async (req, res) => {
  try {
    const { filters } = req.body;
    let query = supabase.from('customers').select('id, name, email, company, industry, location, last_contact_date');

    // Apply filters
    if (filters) {
      if (filters.industries?.length) query = query.in('industry', filters.industries);
      if (filters.locations?.length) query = query.in('location', filters.locations);
      if (filters.lastContactDays) {
        const cutoffDate = new Date(Date.now() - filters.lastContactDays * 24 * 60 * 60 * 1000);
        query = query.lt('last_contact_date', cutoffDate.toISOString());
      }
    }

    const { data: customers, error } = await query.limit(10);
    if (error) throw error;

    res.json({
      total: customers.length,
      preview: customers.map(({ id, name, company, email }) => ({ id, name, company, email }))
    });
  } catch (error) {
    console.error('Target preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Workflow routes
app.get('/workflows', authenticateToken, authorize([PERMISSIONS.READ_CAMPAIGN]), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workflow_rules')
      .select('*, created_by_user:users!workflow_rules_created_by_fkey (email)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/workflows', authenticateToken, authorize([PERMISSIONS.CREATE_CAMPAIGN]), async (req, res) => {
  try {
    const { name, description, trigger_type, conditions, actions, is_active } = req.body;
    const { data, error } = await supabase
      .from('workflow_rules')
      .insert([{ ...req.body, created_by: req.user.userId }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/workflows/:id', authenticateToken, authorize([PERMISSIONS.UPDATE_CAMPAIGN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('workflow_rules')
      .update(req.body)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/workflows/:id', authenticateToken, authorize([PERMISSIONS.DELETE_CAMPAIGN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('workflow_rules')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track email opens
app.get('/track/email/:campaignId/:customerId', async (req, res) => {
  const { campaignId, customerId } = req.params;
  
  try {
    // Update campaign_customers status
    await supabase
      .from('campaign_customers')
      .update({ status: 'opened', last_action_date: new Date().toISOString() })
      .match({ campaign_id: campaignId, customer_id: customerId });

    // Track activity
    await trackCustomerActivity(customerId, 'email_opened', {
      campaign_id: campaignId,
      timestamp: new Date().toISOString()
    });

    // Return tracking pixel
    res.sendFile('pixel.gif');
  } catch (error) {
    console.error('Tracking error:', error);
    res.sendFile('pixel.gif');
  }
});

// Track link clicks
app.get('/track/click/:campaignId/:customerId', async (req, res) => {
  const { campaignId, customerId } = req.params;
  const { redirect } = req.query;
  
  try {
    // Update campaign_customers status
    await supabase
      .from('campaign_customers')
      .update({ status: 'clicked', last_action_date: new Date().toISOString() })
      .match({ campaign_id: campaignId, customer_id: customerId });

    // Track activity
    await trackCustomerActivity(customerId, 'link_clicked', {
      campaign_id: campaignId,
      link: redirect,
      timestamp: new Date().toISOString()
    });

    res.redirect(redirect);
  } catch (error) {
    console.error('Tracking error:', error);
    res.redirect(redirect);
  }
});

// Chat Routes
app.post('/chat/sessions', authenticateToken, async (req, res) => {
  try {
    const { customer_data } = req.body;
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert([{
        customer_data,
        status: 'pending',
        created_by: req.user.userId
      }])
      .select()
      .single();

    if (error) throw error;

    // Notify connected agents about new chat
    io.emit('chat_queued', session);
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/chat/sessions', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('chat_sessions')
      .select(`
        *,
        agent:users!chat_sessions_agent_id_fkey(id, email, name),
        created_by:users!chat_sessions_created_by_fkey(id, email, name)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: sessions, error } = await query;
    if (error) throw error;
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/chat/messages/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:users!chat_messages_sender_id_fkey(id, email, name)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat history routes
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('chat_sessions')
      .select(`
        *,
        agent:users!chat_sessions_agent_id_fkey(id, name, email),
        created_by:users!chat_sessions_created_by_fkey(id, name, email)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (req.user.role !== 'admin') {
      query = query.or(`agent_id.eq.${req.user.userId},created_by.eq.${req.user.userId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { data: chat, error: chatError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', chatId)
      .single();

    if (chatError || !chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        chat.agent_id !== req.user.userId && 
        chat.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:users!inner(id, name, email)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint to assign customers
app.post('/customers/:id/assign', authenticateToken, authorize([PERMISSIONS.ASSIGN_CUSTOMER]), async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_id } = req.body;

    // Verify the agent exists and is actually an agent
    const { data: agent, error: agentError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (agent.role !== ROLES.AGENT) {
      return res.status(400).json({ error: 'Selected user is not an agent' });
    }

    // Update customer assignment
    const { data: customer, error } = await supabase
      .from('customers')
      .update({ 
        assigned_to: agent_id,
        assignment_date: new Date().toISOString(),
        assigned_by: req.user.userId
      })
      .eq('id', id)
      .select(`
        *,
        assigned_to:users!customers_assigned_to_fkey(id, email, name),
        assigned_by:users!customers_assigned_by_fkey(id, email, name)
      `)
      .single();

    if (error) throw error;

    // Track the assignment activity
    await trackCustomerActivity(id, 'customer_assigned', {
      assigned_to: agent_id,
      assigned_by: req.user.userId,
      previous_agent: customer.assigned_to
    });

    res.json(customer);
  } catch (error) {
    console.error('Error assigning customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to get assignment history
app.get('/customers/:id/assignments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: assignments, error } = await supabase
      .from('customer_activities')
      .select(`
        *,
        assigned_to:users!customer_activities_details->assigned_to_fkey(id, email, name),
        assigned_by:users!customer_activities_details->assigned_by_fkey(id, email, name)
      `)
      .eq('customer_id', id)
      .eq('activity_type', 'customer_assigned')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignment history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calendar routes
app.post('/calendar-events', authenticateToken, async (req, res) => {
  try {
    const { title, description, start_date, end_date, type, customer_id, assigned_to } = req.body;
    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert([{
        title,
        description,
        start_date,
        end_date,
        type,
        customer_id,
        assigned_to: assigned_to || req.user.userId,
        created_by: req.user.userId
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/calendar-events', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        customer:customers(id, name, email),
        assigned_user:users!calendar_events_assigned_to_fkey(id, name, email),
        created_by:users!calendar_events_created_by_fkey(id, name, email)
      `);

    if (start_date) query = query.gte('start_date', start_date);
    if (end_date) query = query.lte('end_date', end_date);
    
    // If user is an agent, only show their events
    if (req.user.role === ROLES.AGENT) {
      query = query.eq('assigned_to', req.user.userId);
    }

    const { data: events, error } = await query.order('start_date', { ascending: true });
    if (error) throw error;
    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/calendar-events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: event, error } = await supabase
      .from('calendar_events')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(event);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/calendar-events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all pipeline stages
app.get('/pipeline/stages', authenticateToken, async (req, res) => {
  try {
    const stages = Object.entries(PIPELINE_STAGES).map(([key, value]) => ({
      id: value,
      name: key.toLowerCase().replace(/_/g, ' '),
      order: Object.values(PIPELINE_STAGES).indexOf(value)
    }));
    res.json(stages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deals in pipeline
app.get('/pipeline/deals', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('deals')
      .select(`
        *,
        customer:customers(id, name, email, company),
        assigned_to:users!deals_assigned_to_fkey(id, name, email),
        campaign:campaigns(id, name)
      `)
      .order('updated_at', { ascending: false });

    // If user is an agent, only show their deals
    if (req.user.role === ROLES.AGENT) {
      query = query.eq('assigned_to', req.user.userId);
    }

    const { data: deals, error } = await query;
    if (error) throw error;

    // Group deals by stage
    const pipeline = Object.values(PIPELINE_STAGES).reduce((acc, stage) => {
      acc[stage] = deals.filter(deal => deal.stage === stage);
      return acc;
    }, {});

    res.json(pipeline);
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new deal
app.post('/pipeline/deals', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      customer_id,
      campaign_id,
      value,
      stage = PIPELINE_STAGES.LEAD,
      expected_close_date,
      notes
    } = req.body;

    const { data: deal, error } = await supabase
      .from('deals')
      .insert([{
        title,
        customer_id,
        campaign_id,
        value,
        stage,
        expected_close_date,
        notes,
        assigned_to: req.user.userId,
        created_by: req.user.userId
      }])
      .select(`
        *,
        customer:customers(id, name, email, company),
        assigned_to:users!deals_assigned_to_fkey(id, name, email),
        campaign:campaigns(id, name)
      `)
      .single();

    if (error) throw error;

    // Track customer activity
    await trackCustomerActivity(customer_id, 'deal_created', {
      deal_id: deal.id,
      deal_title: title,
      deal_value: value,
      deal_stage: stage
    });

    res.status(201).json(deal);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update deal
app.put('/pipeline/deals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data: deal, error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(id, name, email, company),
        assigned_to:users!deals_assigned_to_fkey(id, name, email),
        campaign:campaigns(id, name)
      `)
      .single();

    if (error) throw error;

    // Track stage change if applicable
    if (req.body.stage) {
      await trackCustomerActivity(deal.customer_id, 'deal_stage_changed', {
        deal_id: deal.id,
        deal_title: deal.title,
        previous_stage: deal.stage,
        new_stage: req.body.stage
      });
    }

    res.json(deal);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete deal
app.delete('/pipeline/deals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single deal
app.get('/pipeline/deals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get deal with related data
    const { data: deal, error } = await supabase
      .from('deals')
      .select(`
        *,
        customer:customer_id (*),
        campaign:campaign_id (*),
        assigned_to:assigned_to (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update deal stage
app.patch('/pipeline/deals/:id/stage', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    const { data: deal, error } = await supabase
      .from('deals')
      .update({ 
        stage,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Track stage change in customer activity
    await trackCustomerActivity(deal.customer_id, 'deal_stage_changed', {
      deal_id: deal.id,
      deal_title: deal.title,
      previous_stage: deal.stage,
      new_stage: stage
    });

    res.json(deal);
  } catch (error) {
    console.error('Error updating deal stage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get deal statistics
app.get('/pipeline/statistics', authenticateToken, async (req, res) => {
  try {
    let query = supabase.from('deals').select('*');
    
    if (req.user.role === ROLES.AGENT) {
      query = query.eq('assigned_to', req.user.userId);
    }

    const { data: deals, error } = await query;
    if (error) throw error;

    const statistics = {
      total_deals: deals.length,
      total_value: deals.reduce((sum, deal) => sum + (deal.value || 0), 0),
      by_stage: Object.values(PIPELINE_STAGES).reduce((acc, stage) => {
        const stageDeals = deals.filter(deal => deal.stage === stage);
        acc[stage] = {
          count: stageDeals.length,
          value: stageDeals.reduce((sum, deal) => sum + (deal.value || 0), 0)
        };
        return acc;
      }, {}),
      win_rate: deals.length ? 
        (deals.filter(deal => deal.stage === PIPELINE_STAGES.CLOSED_WON).length / deals.length) * 100 
        : 0
    };

    res.json(statistics);
  } catch (error) {
    console.error('Error fetching pipeline statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pipeline forecast
app.get('/pipeline/forecast', authenticateToken, async (req, res) => {
  try {
    let query = supabase
      .from('deals')
      .select('*')
      .not('stage', 'eq', PIPELINE_STAGES.CLOSED_LOST);
    
    if (req.user.role === ROLES.AGENT) {
      query = query.eq('assigned_to', req.user.userId);
    }

    const { data: deals, error } = await query;
    if (error) throw error;

    const forecast = {
      total_weighted_value: 0,
      by_month: {},
      by_stage: {}
    };

    deals.forEach(deal => {
      const probability = STAGE_PROBABILITIES[deal.stage];
      const weightedValue = (deal.value || 0) * probability;
      const month = new Date(deal.expected_close_date).toISOString().slice(0, 7);

      // Total weighted value
      forecast.total_weighted_value += weightedValue;

      // By month
      forecast.by_month[month] = forecast.by_month[month] || { count: 0, weighted_value: 0 };
      forecast.by_month[month].count++;
      forecast.by_month[month].weighted_value += weightedValue;

      // By stage
      forecast.by_stage[deal.stage] = forecast.by_stage[deal.stage] || { count: 0, weighted_value: 0 };
      forecast.by_stage[deal.stage].count++;
      forecast.by_stage[deal.stage].weighted_value += weightedValue;
    });

    res.json(forecast);
  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deal tasks endpoints
app.post('/pipeline/deals/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const { id: deal_id } = req.params;
    const { title, description, due_date, assigned_to } = req.body;

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('deal_tasks')
      .insert([{
        deal_id,
        title,
        description,
        due_date,
        assigned_to: assigned_to || req.user.userId,
        created_by: req.user.userId,
        status: 'pending'
      }])
      .select()
      .single();

    if (taskError) throw taskError;

    // Create calendar event for the task
    if (due_date) {
      const { error: calendarError } = await supabase
        .from('calendar_events')
        .insert([{
          title: `Deal Task: ${title}`,
          description,
          start_date: due_date,
          end_date: due_date,
          type: 'deal_task',
          assigned_to: assigned_to || req.user.userId,
          created_by: req.user.userId,
          deal_task_id: task.id
        }]);

      if (calendarError) throw calendarError;
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating deal task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record loss reason when deal is closed as lost
app.post('/pipeline/deals/:id/loss-reason', authenticateToken, async (req, res) => {
  try {
    const { id: deal_id } = req.params;
    const { reason, details } = req.body;

    // Update deal status
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .update({ 
        stage: PIPELINE_STAGES.CLOSED_LOST,
        updated_at: new Date().toISOString()
      })
      .eq('id', deal_id)
      .select()
      .single();

    if (dealError) throw dealError;

    // Record loss reason
    const { data: lossReason, error: reasonError } = await supabase
      .from('deal_loss_reasons')
      .insert([{
        deal_id,
        reason,
        details,
        recorded_by: req.user.userId
      }])
      .select()
      .single();

    if (reasonError) throw reasonError;

    // Track in customer activity
    await trackCustomerActivity(deal.customer_id, 'deal_lost', {
      deal_id,
      reason,
      details
    });

    res.json({ deal, loss_reason: lossReason });
  } catch (error) {
    console.error('Error recording deal loss reason:', error);
    res.status(500).json({ error: error.message });
  }
});

// Custom pipeline stages management (admin only)
app.post('/pipeline/stages', authenticateToken, authorize([PERMISSIONS.CREATE_CAMPAIGN]), async (req, res) => {
  try {
    const { name, order, probability } = req.body;

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .insert([{
        name: name.toLowerCase().replace(/ /g, '_'),
        display_name: name,
        order,
        probability: probability || 0,
        created_by: req.user.userId
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(stage);
  } catch (error) {
    console.error('Error creating pipeline stage:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/pipeline/stages/:id', authenticateToken, authorize([PERMISSIONS.UPDATE_CAMPAIGN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, order, probability, is_active } = req.body;

    const updates = {};
    if (name) {
      updates.name = name.toLowerCase().replace(/ /g, '_');
      updates.display_name = name;
    }
    if (order !== undefined) updates.order = order;
    if (probability !== undefined) updates.probability = probability;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(stage);
  } catch (error) {
    console.error('Error updating pipeline stage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add route for deal tasks
app.get('/pipeline/deals/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: tasks, error } = await supabase
      .from('deal_tasks')
      .select(`
        *,
        assigned_to:assigned_to (*)
      `)
      .eq('deal_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.json(tasks || []);
  } catch (error) {
    console.error('Error fetching deal tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update the listen call to use the HTTP server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Chat server initialized and ready for connections`);
});