import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const CreatorRoute = ({ children }) => (
  <ProtectedRoute requiredRole="creator">
    {children}
  </ProtectedRoute>
);

export const GroupAdminRoute = ({ children }) => (
  <ProtectedRoute requiredRole="groupAdmin">
    {children}
  </ProtectedRoute>
);
