import axiosInstance from './axiosInstance';

export async function loginUser({ username, password }) {
  try {
    const response = await axiosInstance.post('/login', { username, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
}

export async function registerUser({ username, password_0, password_1 }) {
  try {
    const response = await axiosInstance.post('/register', { username, password_0, password_1 });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
}
