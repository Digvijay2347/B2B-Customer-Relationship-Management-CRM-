import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'agent'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false); // New state for success
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/auth/register', formData);
      setSuccess(true); // Set success to true on successful registration
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  // Effect to handle redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 2000); // Redirect after 2 seconds
      return () => clearTimeout(timer); // Cleanup timer on unmount
    }
  }, [success, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 animate-gradient">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow-xl transform transition-all hover:shadow-2xl">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
          Join Our CRM
        </h2>
        
        {success ? (
          <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 animate-pulse text-center">
            Successfully registered! Redirecting to login...
          </div>
        ) : error ? (
          <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 animate-pulse">
            {error}
          </div>
        ) : null}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50"
                required
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50"
                required
                placeholder="Create a password"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 appearance-none"
              >
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transform hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Create Account
            </button>
            
            <div className="text-center">
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200"
              >
                Already have an account? Sign in here
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;