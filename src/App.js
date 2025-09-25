import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import FeederAnalyticsPage from './pages/FeederAnalyticsPage';
import AdminSection from './components/AdminSection';
import { UserContext } from './context/UserContext';


const RequireAdmin = ({ children }) => {
  const { user } = useContext(UserContext);
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* default route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* user routes */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/feederAnalytics/:feederId" element={<FeederAnalyticsPage />} />

        {/* admin route */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminSection />
            </RequireAdmin>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
