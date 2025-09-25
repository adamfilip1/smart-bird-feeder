import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000', // update this to match your backend base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;