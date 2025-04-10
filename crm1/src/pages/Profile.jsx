import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormHelperText
} from '@mui/material';

const Profile = () => {
  const { token, user: authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [activeTab, setActiveTab] = useState(0);
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('http://localhost:3000/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(
        'http://localhost:3000/profile',
        {
          ...profile,
          ...(passwords.currentPassword && {
            currentPassword: passwords.currentPassword,
            newPassword: passwords.newPassword,
          }),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Profile updated successfully');
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 0, mt: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Personal Info" />
          <Tab label="Security" />
        </Tabs>

        {error && <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ m: 3 }}>{success}</Alert>}

        <Box sx={{ p: 4 }}>
          <form onSubmit={handleProfileUpdate}>
            {activeTab === 0 ? (
              // Personal Info Tab
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Name</Typography>
                  <TextField
                    fullWidth
                    placeholder="John Doe"
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                  <FormHelperText>
                    This is the name that will be displayed on your profile.
                  </FormHelperText>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Email</Typography>
                  <TextField
                    fullWidth
                    placeholder="john@example.com"
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                  <FormHelperText>
                    This email will be used for account-related notifications.
                  </FormHelperText>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Phone (optional)</Typography>
                  <TextField
                    fullWidth
                    placeholder="+1 (555) 123-4567"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                  <FormHelperText>
                    Add a phone number for additional security options.
                  </FormHelperText>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{ mt: 2 }}
                >
                  Update Personal Info
                </Button>
              </Box>
            ) : (
              // Security Tab
              <Box>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Current Password</Typography>
                  <TextField
                    fullWidth
                    type="password"
                    placeholder="••••••••"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  />
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>New Password</Typography>
                  <TextField
                    fullWidth
                    type="password"
                    placeholder="••••••••"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  />
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Confirm New Password</Typography>
                  <TextField
                    fullWidth
                    type="password"
                    placeholder="••••••••"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    error={passwords.newPassword !== passwords.confirmPassword}
                    helperText={
                      passwords.newPassword !== passwords.confirmPassword
                        ? "Passwords don't match"
                        : ''
                    }
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{ mt: 2 }}
                  disabled={
                    passwords.newPassword !== passwords.confirmPassword &&
                    passwords.newPassword !== ''
                  }
                >
                  Update Password
                </Button>
              </Box>
            )}
          </form>
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;