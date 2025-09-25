import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Modal,
  TextField,
  Stack,
  IconButton
} from '@mui/material';
import { loginUser, registerUser } from '../api/authApi';
import styles from '../styles/Navbar.module.css';
import { UserContext } from '../context/UserContext';
import HomeIcon from '@mui/icons-material/Home';

const Navbar = () => {
  const navigate = useNavigate();

  const { user, setUser } = useContext(UserContext);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword0, setRegPassword0] = useState('');
  const [regPassword1, setRegPassword1] = useState('');

  const handleLogin = async () => {
    try {
      const response = await loginUser({ username: loginUsername, password: loginPassword });
      const newUser = {
        userId: response.userId,
        username: response.username,
        userRole: response.userRole,
      };
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      setLoginOpen(false);
      setLoginUsername('');
      setLoginPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRegister = async () => {
    if (regPassword0 !== regPassword1) {
      alert('Passwords do not match');
      return;
    }
    try {
      const response = await registerUser({
        username: regUsername,
        password_0: regPassword0,
        password_1: regPassword1,
      });

      const newUser = {
        userId: response.userId,
        username: response.username,
        userRole: response.userRole,
      };

      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);

      setRegisterOpen(false);
      setRegUsername('');
      setRegPassword0('');
      setRegPassword1('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/dashboard');
  };

  return (
    <>
      <AppBar position="static" className={styles.appBar}>
        <Toolbar className={styles.toolbar} sx={{ position: 'relative' }}>
          <Box sx={{ position: 'absolute', left: 16 }}>
            <IconButton color="inherit" onClick={() => navigate('/dashboard')} edge="start">
              <HomeIcon />
            </IconButton>
          </Box>

          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
            Bird Feeder App
          </Typography>

          {user ? (
            <Box sx={{ position: 'absolute', right: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>Welcome, {user.username}</Typography>
              <Button variant="contained" color="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          ) : (
            <Box sx={{ position: 'absolute', right: 16, display: 'flex', gap: 1 }}>
              <Button color="inherit" onClick={() => setLoginOpen(true)}>
                Login
              </Button>
              <Button color="inherit" onClick={() => setRegisterOpen(true)}>
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Login Modal */}
      <Modal open={loginOpen} onClose={() => setLoginOpen(false)}>
        <Box className={styles.modalBox}>
          <Typography variant="h6" mb={2}>
            Login
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Username"
              variant="outlined"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={handleLogin}>
              Login
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* Register Modal */}
      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)}>
        <Box className={styles.modalBox}>
          <Typography variant="h6" mb={2}>
            Register
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Username"
              variant="outlined"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              value={regPassword0}
              onChange={(e) => setRegPassword0(e.target.value)}
              fullWidth
            />
            <TextField
              label="Confirm Password"
              type="password"
              variant="outlined"
              value={regPassword1}
              onChange={(e) => setRegPassword1(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={handleRegister}>
              Register
            </Button>
          </Stack>
        </Box>
      </Modal>
    </>
  );
};

export default Navbar;
