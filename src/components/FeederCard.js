import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, Typography, Box, Divider, Button, TextField,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper
} from '@mui/material';
import Modal from '@mui/material/Modal';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import styles from '../styles/FeederCard.module.css';
import { editFeeder } from '../api/feederApi';
import {
  getFeederUsers,
  removeFeederUser,
  promoteFeederUser,
} from '../api/feederUsers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getFeederActivity } from '../api/feederApi';

dayjs.extend(relativeTime);

const formatAlertTime = (minutes) => {
  if (typeof minutes !== 'number' || minutes <= 0) return 'No alert time set';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let result = '';
  if (hrs > 0) result += `${hrs} hour${hrs > 1 ? 's' : ''}`;
  if (mins > 0) result += `${hrs > 0 ? ' and ' : ''}${mins} minute${mins > 1 ? 's' : ''}`;
  return result;
};

const FeederCard = ({ feeder, onToggle, onUpdate }) => {
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();
  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [formData, setFormData] = useState({
    feederName: feeder.feederName || '',
    location: feeder.location || '',
    feederAlertTime: feeder.feederAlertTime || 0,
  });
  const [loading, setLoading] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user'));

  const formattedLastActivity = feeder.feederLastActivity
    ? new Date(feeder.feederLastActivity).toLocaleString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'No data';

  const relativeLastActivity = feeder.feederLastActivity
    ? dayjs(feeder.feederLastActivity).fromNow()
    : 'No data';

  const formattedAlertTime = formatAlertTime(feeder.feederAlertTime);
  
  const [activityData, setActivityData] = useState([]);

  useEffect(() => {
    const fetchActivity = async () => {
      const startOfDay = dayjs().startOf('day').toISOString();
      const endOfDay = dayjs().endOf('day').toISOString();

      try {
        const timestamps = await getFeederActivity(feeder.feederId, startOfDay, endOfDay);
        const hourlyCounts = Array(24).fill(0);
        timestamps.forEach(ts => {
          const hour = dayjs(ts).hour();
          hourlyCounts[hour]++;
        });

        const chartData = hourlyCounts.map((count, hour) => ({
          hour: `${hour}:00`,
          activity: count,
        }));
        setActivityData(chartData);
      } catch (err) {
        console.error('Failed to load activity:', err.message);
      }
    };

    fetchActivity();
  }, [feeder.feederId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'feederAlertTime' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.feederName.trim()) {
      alert('Feeder name is required');
      return;
    }
    if (!formData.location.trim()) {
      alert('Location is required');
      return;
    }
    if (formData.feederAlertTime === '' || isNaN(formData.feederAlertTime) || formData.feederAlertTime < 0) {
      alert('Alert time must be a non-negative number');
      return;
    }

    setLoading(true);
    try {
      const updated = await editFeeder(feeder.feederId, formData);
      onUpdate(updated.updatedFeeder);
      setEditMode(false);
    } catch (err) {
      alert(err.message || 'Failed to update feeder');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      feederName: feeder.feederName || '',
      location: feeder.location || '',
      feederAlertTime: feeder.feederAlertTime || 0,
    });
    setEditMode(false);
  };

  const handleToggleUsers = async () => {
    if (!showUsers) {
      try {
        const result = await getFeederUsers(feeder.feederId);
        setOwnerId(result.owner.userId);
        const combinedUsers = [result.owner, ...(result.sharedUsers || [])];
        setUsers(combinedUsers);
      } catch (err) {
        alert('Failed to fetch users');
        return;
      }
    }
    setShowUsers(!showUsers);
  };

  const handlePromote = async (username) => {
    await promoteFeederUser(feeder.feederId, username);
    const result = await getFeederUsers(feeder.feederId);
    setOwnerId(result.owner.userId);
    const combinedUsers = [result.owner, ...(result.sharedUsers || [])];
    setUsers(combinedUsers);
  };

  const handleDelete = async (username) => {
    if (window.confirm(`Are you sure you want to remove ${username}?`)) {
      await removeFeederUser(feeder.feederId, username);
      setUsers(users.filter((u) => u.username !== username));
    }
  };

  return (
  <>
    <Modal open={addUserModalOpen} onClose={() => setAddUserModalOpen(false)}>
      <Box className={styles.modalBox}>
        <Typography variant="h6">Add User</Typography>
        <TextField
          label="Username"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          fullWidth
        />
        <Box className={styles.modalActions}>
          <Button onClick={() => setAddUserModalOpen(false)} color="error" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                const { addFeederUser } = await import('../api/feederUsers');
                await addFeederUser(feeder.feederId, newUsername);
                const updated = await getFeederUsers(feeder.feederId);
                setOwnerId(updated.owner.userId);
                setUsers([updated.owner, ...(updated.sharedUsers || [])]);
                setAddUserModalOpen(false);
                setNewUsername('');
              } catch (err) {
                alert(err.message || 'Failed to add user');
              }
            }}
            color="primary"
            variant="contained"
          >
            Add
          </Button>
        </Box>
      </Box>
    </Modal>

    <Card className={styles.card}>
      <CardContent className={styles.cardContent}>
        {showUsers ? (
          <>
            <Typography variant="h6" className={styles.cardTitle}>Feeder Users</Typography>
            <TableContainer component={Paper} className={styles.userTable}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell align="center">Role</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const isSelf = String(user.userId) === String(currentUser?.userId);
                    const isOwnerUser = String(user.userId) === String(ownerId);
                    const isCurrentUserOwner = String(currentUser?.userId) === String(ownerId);
                    return (
                      <TableRow key={user.username}>
                        <TableCell className={styles.usernameCell}>{user.username}</TableCell>
                        <TableCell align="center">
                          <Box className={styles.roleBox}>
                            <FiberManualRecordIcon fontSize="small" sx={{ color: isOwnerUser ? 'blue' : 'green' }} />
                            <Typography variant="body2">{isOwnerUser ? 'owner' : 'user'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {isCurrentUserOwner && !isSelf && !isOwnerUser && (
                            <Box className={styles.actionButtons}>
                              <IconButton size="small" onClick={() => handlePromote(user.username)}>
                                <ArrowUpwardIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDelete(user.username)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                          {!isCurrentUserOwner && isSelf && (
                            <IconButton size="small" onClick={() => handleDelete(user.username)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {String(currentUser?.userId) === String(ownerId) && (
              <Box className={styles.addUserWrapper}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setAddUserModalOpen(true)}
                  fullWidth
                  startIcon={<AddIcon sx={{ color: 'white' }} />}
                  className={styles.addUserButton}
                >
                  Add New User
                </Button>
              </Box>
            )}
          </>
        ) : editMode ? (
          <>
            <TextField
              label="Feeder Name"
              name="feederName"
              value={formData.feederName}
              onChange={handleChange}
              fullWidth
              margin="dense"
              size="small"
              className={styles.textField}
            />
            <TextField
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              fullWidth
              margin="dense"
              size="small"
              className={styles.textField}
            />
            <TextField
              label="Alert Time (minutes)"
              name="feederAlertTime"
              type="number"
              inputProps={{ min: 0 }}
              value={formData.feederAlertTime}
              onChange={handleChange}
              fullWidth
              margin="dense"
              size="small"
              className={styles.textField}
            />
            <Box className={styles.editButtons}>
              <Button variant="contained" color="success" onClick={handleSave} disabled={loading}>
                Save
              </Button>
              <Button variant="contained" color="error" onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="h6" className={styles.cardTitle}>{feeder.feederName}</Typography>
            <Box className={styles.stateBox}>
              <FiberManualRecordIcon className={styles.statusIcon} sx={{ color: feeder.feederState ? 'green' : 'red' }} />
              <Typography variant="subtitle1">
                {feeder.feederState ? 'Active' : 'Disabled'}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              color={feeder.feederState ? 'error' : 'success'}
              onClick={() => onToggle(feeder.feederId, feeder.feederState)}
              className={styles.toggleButton}
            >
              {feeder.feederState ? 'Deactivate' : 'Activate'}
            </Button>
            <Divider className={styles.divider} />
            <Typography variant="body2" className={styles.infoText}>
              <span className={styles.label}>Location:</span>{' '}
              <span className={styles.value}>{feeder.location}</span>
            </Typography>

            <Typography variant="body2" className={styles.infoText}>
              <span className={styles.label}>Last Activity:</span>{' '}
              <span className={styles.value}>{formattedLastActivity}</span>
            </Typography>

            <Typography variant="body2" className={styles.infoText}>
              <span className={styles.label}>Time from last activity:</span>{' '}
              <span className={styles.value}>{relativeLastActivity}</span>
            </Typography>

            <Typography variant="body2" className={styles.infoText}>
              <span className={styles.label}>Alert Time:</span>{' '}
              <span className={styles.value}>{formattedAlertTime}</span>
            </Typography>

            <Box
                sx={{
                  height: 120,
                  mt: 2,
                  backgroundColor: '#1565c0', // blue background
                  px: 1,
                  borderRadius: 2,
                  border: '1px solid #333', // subtle dark border
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ResponsiveContainer width="120%" height="100%" style={{ marginLeft: '-50px' }}>
                  <BarChart data={activityData}>
                    <XAxis dataKey="hour" tick={{ fontSize: 13, fill: 'white' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'white' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1976d2', border: 'none' }}
                      itemStyle={{ color: 'white' }}
                      labelStyle={{ color: 'white' }}
                    />
                    <Bar dataKey="activity" fill="#66bb6a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            </Box>

          </>
        )}
      </CardContent>
      <Box className={styles.cardFooter}>
        <IconButton
          onClick={() => navigate(`/feederAnalytics/${feeder.feederId}`)}
          className={styles.footerIcon}
          size="small"
        >
          <BarChartIcon />
        </IconButton>
        <IconButton onClick={handleToggleUsers} className={styles.footerIcon} size="small">
          <PeopleIcon />
        </IconButton>
        <IconButton onClick={() => setEditMode(!editMode)} className={styles.footerIcon} size="small">
          <SettingsIcon />
        </IconButton>
      </Box>
    </Card>
  </>
);

};

export default FeederCard;
