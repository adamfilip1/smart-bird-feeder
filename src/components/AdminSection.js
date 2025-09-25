// src/components/AdminSection.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Modal
} from '@mui/material';

import {
  getAllFeeders,
  registerFeeder,
  deleteFeeder,
  activateFeeder,
  deactivateFeeder,
} from '../api/feederApi';

import {
  getFeederUsers,
  addFeederUser,
  removeFeederUser,
  promoteFeederUser
} from '../api/feederUsers';

import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import VisibilityIcon from '@mui/icons-material/Visibility';
import GroupIcon from '@mui/icons-material/Group';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCode2Icon from '@mui/icons-material/QrCode2';

const AdminSection = () => {
  const [allFeeders, setAllFeeders] = useState([]);
  const [ownerMap, setOwnerMap] = useState({});
  const [selectedUsers, setSelectedUsers] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registeredFeeder, setRegisteredFeeder] = useState(null);
  const [justViewingQr, setJustViewingQr] = useState(false);

  const navigate = useNavigate();

  /* ---------- data loading helpers ---------- */
  const buildOwnerMap = useCallback(async (feeders) => {
    try {
      const ownerPromises = feeders.map(async (feeder) => {
        try {
          const userData = await getFeederUsers(feeder.feederId);
          return { id: feeder.feederId, username: userData.owner?.username || '—' };
        } catch {
          return { id: feeder.feederId, username: '—' };
        }
      });

      const owners = await Promise.all(ownerPromises);
      const map = {};
      owners.forEach(({ id, username }) => (map[id] = username));
      setOwnerMap(map);
    } catch (e) {
      console.error('Failed to build owner map:', e.message);
    }
  }, []);

  const refreshFeeders = useCallback(async () => {
    try {
      const feeders = await getAllFeeders();
      setAllFeeders(feeders);
      await buildOwnerMap(feeders);
    } catch (e) {
      console.error('Failed to load feeders or owners:', e.message);
    }
  }, [buildOwnerMap]);

  useEffect(() => {
    refreshFeeders();
  }, [refreshFeeders]);

  /* ---------- actions ---------- */
  const handleShowUsers = async (feederId) => {
    try {
      const users = await getFeederUsers(feederId);
      setSelectedUsers(users);
      setModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch users:', error.message);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUsers(null);
  };

  const handleDeleteFeeder = async (feederId) => {
    try {
      await deleteFeeder(feederId);
    } catch (error) {
      console.error('Failed to delete feeder:', error.message);
    } finally {
      await refreshFeeders();
    }
  };

  const handleRegisterFeeder = async () => {
    try {
      const data = await registerFeeder();
      setRegisteredFeeder(data);
      setJustViewingQr(false);
      setRegisterModalOpen(true);
    } catch (err) {
      console.error('Registration failed:', err.message);
    } finally {
      await refreshFeeders();
    }
  };

  const handleActivate = async (feederId) => {
    try {
      await activateFeeder(feederId); 
    } catch (e) {
      console.error('Failed to activate:', e.message);
    } finally {
      await refreshFeeders();
    }
  };

  const handleDeactivate = async (feederId) => {
    try {
      await deactivateFeeder(feederId);
    } catch (e) {
      console.error('Failed to deactivate:', e.message);
    } finally {
      await refreshFeeders();
    }
  };

  /* ---------- render ---------- */
  return (
    <Box sx={{ backgroundColor: '#2e2e2e', color: 'white', p: 3, borderRadius: 2, mb: 5, border: '1px solid #555' }}>
      <Typography variant="h5" gutterBottom textAlign="center">Admin Section</Typography>

      <Typography variant="h6" textAlign="center" mb={2}>
        Total Feeders in System: {allFeeders.length}
      </Typography>

      <Box textAlign="center" mb={3} display="flex" gap={2} justifyContent="center">
        <Button variant="contained" color="primary" onClick={handleRegisterFeeder}>
          Register Feeder
        </Button>
        <Button variant="outlined" onClick={refreshFeeders}>
          Refresh
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: '#1e1e1e' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white' }}>Feeder Name</TableCell>
              <TableCell sx={{ color: 'white' }}>Connect Code</TableCell>
              <TableCell sx={{ color: 'white' }}>Owner</TableCell>
              <TableCell sx={{ color: 'white' }}>State</TableCell>
              <TableCell sx={{ color: 'white' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allFeeders.map((feeder) => (
              <TableRow key={feeder.feederId}>
                <TableCell sx={{ color: 'white' }}>{feeder.feederName}</TableCell>

                <TableCell sx={{ color: 'white' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {feeder.feederConnectCode}
                    <IconButton
                      size="small"
                      onClick={() => {
                        setJustViewingQr(true);
                        setRegisteredFeeder({
                          feederId: feeder.feederId,
                          feederConnectCode: feeder.feederConnectCode
                        });
                        setRegisterModalOpen(true);
                      }}
                    >
                      <QrCode2Icon sx={{ color: 'white', fontSize: 20 }} />
                    </IconButton>
                  </Box>
                </TableCell>

                <TableCell sx={{ color: 'white' }}>
                  {ownerMap[feeder.feederId] ?? '—'}
                </TableCell>

                <TableCell sx={{ color: 'white' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FiberManualRecordIcon
                      sx={{ color: feeder.feederState ? 'green' : 'red' }}
                      fontSize="small"
                    />
                    <Typography variant="body2">
                      {feeder.feederState ? 'Active' : 'Disabled'}
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell>
                  <IconButton onClick={() => navigate(`/feederAnalytics/${feeder.feederId}`)}>
                    <VisibilityIcon sx={{ color: 'white' }} />
                  </IconButton>

                  <IconButton onClick={() => handleShowUsers(feeder.feederId)}>
                    <GroupIcon sx={{ color: 'white' }} />
                  </IconButton>

                  <IconButton onClick={() => handleDeleteFeeder(feeder.feederId)}>
                    <DeleteIcon sx={{ color: 'white' }} />
                  </IconButton>

                  {feeder.feederState ? (
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                      onClick={() => handleDeactivate(feeder.feederId)}
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      sx={{ ml: 1 }}
                      onClick={() => handleActivate(feeder.feederId)}
                    >
                      Activate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {allFeeders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: 'gray', textAlign: 'center', py: 4 }}>
                  No feeders yet. Use “Register Feeder” to add one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Register / QR Modal */}
      <Modal
        open={registerModalOpen}
        onClose={() => {
          setRegisterModalOpen(false);
          setJustViewingQr(false);
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: '#1e1e1e',
            color: 'white',
            p: 4,
            borderRadius: 2,
            width: 400,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" gutterBottom>
            {justViewingQr ? 'Connection Info' : 'Feeder Registered'}
          </Typography>

          {registeredFeeder && (
            <>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Feeder ID:</strong> {registeredFeeder.feederId}
              </Typography>
              <Typography variant="body1">
                <strong>Connect Code:</strong> {registeredFeeder.feederConnectCode}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
                <QRCodeSVG
                  id="qr-code"
                  value={registeredFeeder.feederConnectCode}
                  size={128}
                  bgColor="#1e1e1e"
                  fgColor="#ffffff"
                  level="H"
                />
              </Box>

              <Button
                variant="outlined"
                sx={{ mb: 1 }}
                onClick={() => {
                  const svg = document.getElementById('qr-code');
                  const serializer = new XMLSerializer();
                  const svgBlob = new Blob([serializer.serializeToString(svg)], {
                    type: 'image/svg+xml',
                  });
                  const url = URL.createObjectURL(svgBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `feeder-qr-${registeredFeeder.feederId}.svg`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download QR Code
              </Button>

              <Box textAlign="center">
                <Button variant="contained" onClick={() => setRegisterModalOpen(false)}>
                  Confirm
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* Users Modal */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: '#1e1e1e',
            color: 'white',
            p: 4,
            borderRadius: 2,
            width: 500,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Feeder Users
          </Typography>

          {selectedUsers && (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'white' }}>Username</TableCell>
                    <TableCell sx={{ color: 'white' }}>Role</TableCell>
                    <TableCell sx={{ color: 'white' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: 'white' }}>{selectedUsers.owner.username}</TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      <FiberManualRecordIcon sx={{ color: 'blue', mr: 1 }} fontSize="small" />
                      Owner
                    </TableCell>
                    <TableCell sx={{ color: 'gray' }}>—</TableCell>
                  </TableRow>

                  {selectedUsers.sharedUsers.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell sx={{ color: 'white' }}>{user.username}</TableCell>
                      <TableCell sx={{ color: 'white' }}>
                        <FiberManualRecordIcon sx={{ color: 'green', mr: 1 }} fontSize="small" />
                        User
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            await promoteFeederUser(selectedUsers.feederId, user.username);
                            const users = await getFeederUsers(selectedUsers.feederId);
                            setSelectedUsers(users);
                          }}
                          sx={{ color: '#2196f3' }}
                        >
                          <ArrowUpwardIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            await removeFeederUser(selectedUsers.feederId, user.username);
                            const users = await getFeederUsers(selectedUsers.feederId);
                            setSelectedUsers(users);
                          }}
                          sx={{ color: '#f44336' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Box mt={2} display="flex" gap={2} alignItems="center">
                <input
                  type="text"
                  placeholder="Enter username"
                  id="new-username-input"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #888',
                    backgroundColor: '#2e2e2e',
                    color: 'white',
                  }}
                />
                <Button
                  variant="contained"
                  color="success"
                  onClick={async () => {
                    const input = document.getElementById('new-username-input');
                    const username = input?.value.trim();
                    if (username) {
                      await addFeederUser(selectedUsers.feederId, username);
                      const users = await getFeederUsers(selectedUsers.feederId);
                      setSelectedUsers(users);
                      input.value = '';
                    }
                  }}
                >
                  Add User
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default AdminSection;
