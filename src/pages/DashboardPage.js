import React, { useEffect, useState } from 'react';
import { useContext } from 'react';
import { UserContext } from '../context/UserContext';

import {
  Grid,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  Modal,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import {
  getFeeders,
  activateFeeder,
  deactivateFeeder,
  connectFeeder,
} from '../api/feederApi';
import FeederCard from '../components/FeederCard';
import Navbar from '../components/Navbar';
import AdminSection from '../components/AdminSection';

const DashboardPage = () => {
  const [feeders, setFeeders] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useContext(UserContext);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectCode, setConnectCode] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [filter, setFilter] = useState(null);
  const [showFeeders, setShowFeeders] = useState(false);

  const toggleFilter = (type) => {
    setFilter(prev => (prev === type ? null : type));
  };

  const fetchFeeders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getFeeders(user.userId);
      setFeeders(data?.feeders || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeders();
  }, [user]);

  useEffect(() => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) setUser(JSON.parse(storedUser));
}, []);

  const toggleFeederState = async (feederId, currentState) => {
    try {
      if (currentState) {
        await deactivateFeeder(feederId);
      } else {
        await activateFeeder(feederId);
      }
      fetchFeeders();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateFeeder = async (updatedFeeder) => {
    await fetchFeeders();
  };

  const handleLogout = () => {
  localStorage.removeItem('user');
  setUser(null);
  setFeeders([]);
};

  const handleConnectFeeder = async () => {
    try {
      const res = await connectFeeder(user.userId, connectCode);
      setSnackbar({ open: true, message: res.message, severity: 'success' });
      setConnectModalOpen(false);
      setConnectCode('');
      fetchFeeders();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const activeFeeders = feeders.filter(f => f.feederState).length;
  const disabledFeeders = feeders.filter(f => !f.feederState).length;
  const totalFeeders = feeders.length;

  return (
  <>
    <Navbar />

    <Box
      sx={{
        bgcolor: '#121212',
        color: '#e0e0e0',
        minHeight: '100vh',
        py: 6,
        px: 2,
      }}
    >
      {!user ? (
        <Typography variant="h6" align="center" sx={{ mt: 6 }}>
          Please log in to see your feeders.
        </Typography>
      ) : (
        <>
          {/* Admin Section */}
          {user.userRole === 'admin' && (
            <>
              <AdminSection />
              <Box textAlign="center" mt={2}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setShowFeeders(prev => !prev)}
                >
                  {showFeeders ? 'Hide Feeders Dashboard' : 'Show Feeders Dashboard'}
                </Button>
              </Box>
            </>
          )}


          {(user.userRole !== 'admin' || showFeeders) && (
            <>
              <Typography variant="h4" align="center" gutterBottom sx={{ color: '#90caf9', mt: 2 }}>
                Feeders Dashboard
              </Typography>

              <Typography variant="h6" align="center" sx={{ mb: 4 }}>
                Total Feeders: {totalFeeders}
              </Typography>

              <Box textAlign="center" sx={{ mb: 4 }}>
                <Button variant="contained" onClick={() => setConnectModalOpen(true)}>
                  Connect Feeder
                </Button>
              </Box>

              <Grid container justifyContent="center" spacing={4} sx={{ mb: 6 }}>
                <Grid item>
                  <Card
                    onClick={() => toggleFilter('active')}
                    sx={{
                      width: 130,
                      height: 80,
                      bgcolor: filter === 'active' ? '#1565c0' : '#1976d2',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      py: 3,
                      cursor: 'pointer',
                      border: filter === 'active' ? '2px solid #ffffff' : 'none',
                      '&:hover': {
                        bgcolor: filter === 'active' ? '#0d47a1' : '#1565c0'
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">Active</Typography>
                      <Box display="flex" justifyContent="center" alignItems="center" mt={1}>
                        <FiberManualRecordIcon sx={{ color: 'green', mr: 1 }} />
                        <Typography variant="h5">{activeFeeders}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item>
                  <Card
                    onClick={() => toggleFilter('disabled')}
                    sx={{
                      width: 130,
                      height: 80,
                      bgcolor: filter === 'disabled' ? '#1565c0' : '#1976d2',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      py: 3,
                      cursor: 'pointer',
                      border: filter === 'disabled' ? '2px solid #ffffff' : 'none',
                      '&:hover': {
                        bgcolor: filter === 'active' ? '#0d47a1' : '#1565c0'
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">Disabled</Typography>
                      <Box display="flex" justifyContent="center" alignItems="center" mt={1}>
                        <FiberManualRecordIcon sx={{ color: 'red', mr: 1 }} />
                        <Typography variant="h5">{disabledFeeders}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box
                sx={{
                  borderBottom: '1px solid #ccc',
                  width: '100%',
                  maxWidth: '800px',
                  margin: '20px auto'
                }}
              />

              <Grid container justifyContent="center" spacing={3}>
                {feeders
                  .filter(feeder => feeder && feeder.feederId)
                  .filter(feeder => {
                    if (filter === 'active') return feeder.feederState;
                    if (filter === 'disabled') return !feeder.feederState;
                    return true;
                  })
                  .map(feeder => (
                    <Grid item xs={12} sm={6} md={4} key={feeder.feederId}>
                      <FeederCard
                        feeder={feeder}
                        onToggle={toggleFeederState}
                        onUpdate={handleUpdateFeeder}
                      />
                    </Grid>
                  ))}
              </Grid>
            </>
          )}

        </>
      )}
    </Box>

    <Modal open={connectModalOpen} onClose={() => setConnectModalOpen(false)}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 300,
          bgcolor: '#1e1e1e',
          color: '#fff',
          p: 4,
          borderRadius: 2,
          boxShadow: 24,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Connect Feeder
        </Typography>
        <TextField
          label="Feeder Connect Code"
          variant="outlined"
          fullWidth
          value={connectCode}
          onChange={(e) => setConnectCode(e.target.value)}
          sx={{ mb: 2 }}
          InputLabelProps={{ style: { color: '#aaa' } }}
          InputProps={{ style: { color: '#fff' } }}
        />
        <Button fullWidth variant="contained" onClick={handleConnectFeeder}>
          Connect
        </Button>
      </Box>
    </Modal>

    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      onClose={() => setSnackbar({ ...snackbar, open: false })}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        severity={snackbar.severity}
        sx={{ width: '100%' }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  </>
);

};

export default DashboardPage;
