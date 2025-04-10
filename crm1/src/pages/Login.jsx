import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'rgb(8,7,7)',
        background: 'linear-gradient(90deg, rgba(8,7,7,1) 8%, rgba(135,71,71,1) 32%, rgba(115,11,179,1) 49%, rgba(47,12,12,1) 78%, rgba(70,17,17,1) 85%, rgba(8,7,7,1) 91%, rgba(48,0,87,1) 98%)'
      }}
    >
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow-xl transform transition-all hover:shadow-2xl">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
          Welcome to CRM
        </h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 animate-pulse">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="container">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder=" "
            />
            <label className="label">Email</label>
          </div>
          
          <div className="container">
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder=" "
            />
            <label className="label">Password</label>
          </div>
          
          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transform hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Sign In
          </button>
          
          <div className="text-center">
            <Link
              to="/register"
              className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors duration-200"
            >
              Don't have an account? Register here
            </Link>
          </div>
        </form>
      </div>

      <style>
        {`
          .container {
            display: flex;
            flex-direction: column;
            gap: 7px;
            position: relative;
            color: white;
          }

          .container .label {
            font-size: 15px;
            padding-left: 10px;
            position: absolute;
            top: 13px;
            transition: 0.3s;
            pointer-events: none;
            color: #fff; /* Default color white */
          }

          .input {
            width: 100%;
            height: 45px;
            border: none;
            outline: none;
            padding: 0px 7px;
            border-radius: 6px;
            color: #fff;
            font-size: 15px;
            background-color: #000;
            box-shadow: 3px 3px 10px rgba(0,0,0,1),
            -1px -1px 6px rgba(255, 255, 255, 0.4);
          }

          .input:focus {
            border: 2px solid transparent;
            color: #fff;
            background-color: #000;
            box-shadow: 3px 3px 10px rgba(0,0,0,1),
            -1px -1px 6px rgba(255, 255, 255, 0.4),
            inset 3px 3px 10px rgba(0,0,0,1),
            inset -1px -1px 6px rgba(255, 255, 255, 0.4);
          }

          .container .input:valid ~ .label,
          .container .input:focus ~ .label {
            transition: 0.3s;
            padding-left: 2px;
            transform: translateY(-35px);
            color: #000; /* Black when focused or valid */
          }

          .container .input:valid,
          .container .input:focus {
            box-shadow: 3px 3px 10px rgba(0,0,0,1),
            -1px -1px 6px rgba(255, 255, 255, 0.4),
            inset 3px 3px 10px rgba(0,0,0,1),
            inset -1px -1px 6px rgba(255, 255, 255, 0.4);
          }
        `}
      </style>
    </div>
  );
};

export default Login;