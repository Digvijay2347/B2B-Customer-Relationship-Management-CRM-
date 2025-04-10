import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { 
  Box, 
  Avatar, 
  IconButton, 
  CircularProgress, 
  Typography,
  Alert
} from '@mui/material';
import { Camera, X } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const ProfilePictureUpload = ({ onUpdate }) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const uploadImage = useCallback(async (file) => {
    try {
      setLoading(true);
      setError('');
  
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.userId}-${Math.random()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;
  
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
  
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }
  
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
  
      // Update user profile in database
      await axios.put(
        'http://localhost:3000/profile',
        { profile_picture: publicUrl },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
          }
        }
      );
  
      // Call update callback
      if (onUpdate) onUpdate(publicUrl);
      setPreview(publicUrl);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  }, [token, user, onUpdate]);

  return (
    <Box className="flex flex-col items-center gap-4">
      <Box className="relative">
        <Avatar
          src={preview || user?.profile_picture}
          alt="Profile"
          className="w-32 h-32"
        />
        {loading && (
          <CircularProgress
            size={24}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="profile-picture-input"
          onChange={handleFileChange}
          disabled={loading}
        />
        <label htmlFor="profile-picture-input">
          <IconButton
            component="span"
            className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white"
            disabled={loading}
          >
            <Camera size={20} />
          </IconButton>
        </label>
        {(preview || user?.profile_picture) && (
          <IconButton
            className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white"
            onClick={handleRemove}
            disabled={loading}
          >
            <X size={20} />
          </IconButton>
        )}
      </Box>
      
      {error && (
        <Alert severity="error" className="w-full">
          {error}
        </Alert>
      )}
      
      <Typography variant="caption" className="text-gray-600">
        Click the camera icon to upload a new profile picture
      </Typography>
    </Box>
  );
};

export default ProfilePictureUpload;