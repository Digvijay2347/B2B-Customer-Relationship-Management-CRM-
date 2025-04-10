import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'agent'
  });
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:3000/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user.role === 'admin') {
      fetchUsers();
    } else {
      setError('Unauthorized access');
      setIsLoading(false);
    }
  }, [token, user.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        'http://localhost:3000/auth/register',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData({ email: '', password: '', role: 'agent' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
    setImportResults(null);
    setError(null);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setError('Please select a file to import');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);
    setIsImporting(true);

    try {
      const response = await axios.post(
        'http://localhost:3000/users/import',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setImportResults(response.data);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import users');
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (user.role !== 'admin') return <div>Access denied</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Users Management</h2>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Add User Form */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Add Single User</h3>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add User
              </button>
            </div>
          </form>
        </div>

        {/* Bulk Import Form */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Bulk Import Users</h3>
          <form onSubmit={handleImport}>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Import File (CSV or JSON)</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".csv,.json"
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  CSV Format: email,password,role,name,phone
                </p>
              </div>
              <button
                type="submit"
                disabled={isImporting || !importFile}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {isImporting ? 'Importing...' : 'Import Users'}
              </button>
            </div>
          </form>

          {/* Import Results */}
          {importResults && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h4 className="font-semibold mb-2">Import Results</h4>
              <div className="space-y-2">
                <p>Total: {importResults.summary.total}</p>
                <p className="text-green-600">Successful: {importResults.summary.successful}</p>
                <p className="text-red-600">Failed: {importResults.summary.failed}</p>
                {importResults.results.failed.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Failed Imports:</p>
                    <ul className="text-sm text-red-600">
                      {importResults.results.failed.map((fail, index) => (
                        <li key={index}>
                          {fail.email}: {fail.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 
                      user.role === 'manager' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;