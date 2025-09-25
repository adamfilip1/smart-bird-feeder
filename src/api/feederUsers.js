// src/api/feederUsers.js
import axiosInstance from './axiosInstance';

const BASE_PATH = '/feeder';

export const getFeederUsers = async (feederId) => {
  const res = await axiosInstance.get(`${BASE_PATH}/${feederId}/users`);
  return res.data;
};

export const addFeederUser = async (feederId, username) => {
  const res = await axiosInstance.post(`${BASE_PATH}/${feederId}/addUser`, { username });
  return res.data;
};

export const removeFeederUser = async (feederId, username) => {
  const res = await axiosInstance.delete(`${BASE_PATH}/${feederId}/removeUser`, {
    data: { username },
  });
  return res.data;
};

export const promoteFeederUser = async (feederId, username) => {
  const res = await axiosInstance.put(`${BASE_PATH}/${feederId}/promoteUser`, { username });
  return res.data;
};
