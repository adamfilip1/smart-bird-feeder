import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekday from 'dayjs/plugin/weekday';
import { Box, Typography, Button, ToggleButton, ToggleButtonGroup, IconButton, Divider,Table, TableBody, TableCell, TableContainer,TableHead, TableRow, Paper} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar';
import { UserContext } from '../context/UserContext';
import { getFeederActivity, getFeederById  } from '../api/feederApi';
import { getFeederUsers } from '../api/feederUsers';

dayjs.extend(relativeTime);
dayjs.extend(isoWeek);
dayjs.extend(weekday);

const FeederAnalyticsPage = () => {
  const { feederId } = useParams();
  const [feederInfo, setFeederInfo] = useState(null);
  const { user } = useContext(UserContext);

  const [feederUsers, setFeederUsers] = useState([]);
  const [feederOwnerId, setFeederOwnerId] = useState(null);

  const [viewMode, setViewMode] = useState('day');
  const [referenceDate, setReferenceDate] = useState(dayjs());
  const [activityData, setActivityData] = useState([]);
  const [monthlyHeatmapData, setMonthlyHeatmapData] = useState([]);
  
  useEffect(() => {
    const fetchFeederInfo = async () => {
        try {
        const data = await getFeederById(feederId);
        setFeederInfo(data);
        } catch (err) {
        console.error('Failed to load feeder info:', err.message);
        }
    };
    fetchFeederInfo();
  }, [feederId]);

  useEffect(() => {
  const fetchFeederUsers = async () => {
    try {
      const res = await getFeederUsers(feederId);
      const combined = [res.owner, ...(res.sharedUsers || [])];
      setFeederUsers(combined);
      setFeederOwnerId(res.owner.userId);
    } catch (err) {
      console.error('Failed to fetch users:', err.message);
    }
  };

  fetchFeederUsers();
  }, [feederId]);

const formatAlertTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let result = '';
    if (hrs > 0) result += `${hrs} hour${hrs > 1 ? 's' : ''}`;
    if (mins > 0) result += `${hrs > 0 ? ' and ' : ''}${mins} minute${mins > 1 ? 's' : ''}`;
    return result || 'No alert time set';
};


const formatActivityData = (timestamps) => {
    const counts = {};

    if (viewMode === 'day') {
        for (let hour = 0; hour < 24; hour++) {
        counts[`${hour}:00`] = 0;
        }
    } else if (viewMode === 'week') {
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        weekdays.forEach(day => {
        counts[day] = 0;
        });
    } else if (viewMode === 'month') {
        const daysInMonth = referenceDate.daysInMonth();
        for (let day = 1; day <= daysInMonth; day++) {
        counts[`${day}`] = 0;
        }
    } else if (viewMode === 'year') {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        months.forEach(month => {
            counts[month] = 0;
        });
    }

    timestamps.forEach(ts => {
        const d = dayjs(ts);
        let key = '';
        if (viewMode === 'day') key = `${d.hour()}:00`;
        else if (viewMode === 'week') key = d.format('dddd');
        else if (viewMode === 'month') key = d.format('D');
        else if (viewMode === 'year') key = d.format('MMMM');

        if (counts[key] !== undefined) {
        counts[key]++;
        }
    });

    const sortedKeys = Object.keys(counts).sort((a, b) => {
        if (viewMode === 'day') return parseInt(a) - parseInt(b);
        if (viewMode === 'month') return parseInt(a) - parseInt(b);
        if (viewMode === 'week') {
        const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b);
        }
        return new Date(`2000 ${a}`) - new Date(`2000 ${b}`);
    });

    return sortedKeys.map(key => ({
        label: key,
        activity: counts[key]
    }));
};


const getTimeRange = () => {
    if (viewMode === 'day') {
      return [referenceDate.startOf('day'), referenceDate.endOf('day')];
    } else if (viewMode === 'week') {
      return [referenceDate.startOf('week'), referenceDate.endOf('week')];
    } else if (viewMode === 'month') {
      return [referenceDate.startOf('month'), referenceDate.endOf('month')];
    } else if (viewMode === 'year') {
      return [referenceDate.startOf('year'), referenceDate.endOf('year')];
    }
};

const loadActivity = async () => {
  const [from, to] = getTimeRange();
  try {
    const timestamps = await getFeederActivity(feederId, from.toISOString(), to.toISOString());
    const chartData = formatActivityData(timestamps);
    setActivityData(chartData);

    // Always generate heatmap for the current month
    const currentMonthTimestamps = await getFeederActivity(
      feederId,
      referenceDate.startOf('month').toISOString(),
      referenceDate.endOf('month').toISOString()
    );
    const matrix = generateHeatmapData(currentMonthTimestamps, referenceDate);
    setMonthlyHeatmapData(matrix);

  } catch (err) {
    console.error('Failed to fetch activity:', err.message);
  }
};


const generateHeatmapData = (timestamps, baseDate) => {
  const matrix = Array(6).fill(null).map(() => Array(7).fill(0)); // [week][day]
  timestamps.forEach(ts => {
    const d = dayjs(ts);
    if (d.month() === baseDate.month()) {
      const weekOfMonth = Math.floor((d.date() + dayjs(baseDate).startOf('month').day()) / 7);
      const weekday = d.day(); // 0 = Sunday
      if (weekOfMonth < 6 && weekday < 7) {
        matrix[weekOfMonth][weekday]++;
      }
    }
  });
  return matrix;
};

const getCellColor = (count) => {
  if (count === 0) return '#2e2e2e';
  if (count <= 5) return '#66bb6a';
  if (count <= 10) return '#43a047';
  if (count <= 15) return '#388e3c';
  if (count <= 20) return '#2e7d32';
  if (count <= 30) return '#1b5e20';
  return '#004d00';
};

useEffect(() => {
    loadActivity();
}, [viewMode, referenceDate]);

const handlePrev = () => {
    const newRef = referenceDate.subtract(1, viewMode);
    setReferenceDate(newRef);
};

const handleNext = () => {
    const newRef = referenceDate.add(1, viewMode);
    setReferenceDate(newRef);
};

const handleViewChange = (_, newView) => {
    if (newView) setViewMode(newView);
};

const handleBarClick = (data) => {
  const label = data.label;

  if (viewMode === 'year') {
    // Convert full month name to month index (0–11)
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = monthNames.indexOf(label);
    if (monthIndex !== -1) {
      const newDate = referenceDate.month(monthIndex);
      setReferenceDate(newDate);
      setViewMode('month');
    }
  } else if (viewMode === 'month') {
    const day = parseInt(label);
    if (!isNaN(day)) {
      const newDate = referenceDate.date(day);
      setReferenceDate(newDate);
      setViewMode('day');
    }
  } else if (viewMode === 'week') {
    const weekdayIndex = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(label);
    if (weekdayIndex !== -1) {
      const newDate = referenceDate.day(weekdayIndex);
      setReferenceDate(newDate);
      setViewMode('day');
    }
  }
};



return (
  <>
    <Navbar />
    <Box sx={{ bgcolor: '#121212', color: '#e0e0e0', minHeight: '100vh', p: 4 }}>
      <Typography textAlign="center" variant="h4" color="primary" gutterBottom>
        Feeder Analytics
      </Typography>

    {feederInfo && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 8, mb: 3, alignItems: 'flex-start' }}>

            {/* LEFT COLUMN - USERS */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 300 }}>
            <Typography variant="h6" color="white" gutterBottom>
                Users
            </Typography>
            <Box sx={{
                width: 300,
                height: 200,
                backgroundColor: '#1e1e1e',
                borderRadius: 2,
                p: 2,
                overflowY: 'auto'
            }}>
                <TableContainer component={Paper} sx={{ backgroundColor: '#2a2a2a' }}>
                <Table size="small">
                    <TableHead>
                    <TableRow>
                        <TableCell sx={{ color: 'white' }}>Username</TableCell>
                        <TableCell sx={{ color: 'white' }}>Role</TableCell>
                    </TableRow>
                    </TableHead>
                    <TableBody>
                    {feederUsers.map((user) => (
                        <TableRow key={user.username}>
                        <TableCell sx={{ color: 'white' }}>{user.username}</TableCell>
                        <TableCell sx={{ color: 'white' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <FiberManualRecordIcon
                                fontSize="small"
                                sx={{ color: user.userId === feederOwnerId ? 'blue' : 'green', mr: 1 }}
                            />
                            {user.userId === feederOwnerId ? 'Owner' : 'User'}
                            </Box>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </TableContainer>
            </Box>
            </Box>

            {/* CENTER COLUMN - FEEDER INFO */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 300 }}>
            <Typography variant="h6" color="white" gutterBottom>
                Feeder
            </Typography>
            <Box sx={{
                width: 300,
                height: 200,
                backgroundColor: '#1976d2',
                color: 'white',
                borderRadius: 2,
                p: 2,
                textAlign: 'center'
            }}>
                <Typography variant="h6">{feederInfo.feederName}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
                <Box
                    sx={{
                    width: 17,
                    height: 17,
                    borderRadius: '50%',
                    backgroundColor: feederInfo.feederState ? 'green' : 'red',
                    mr: 1,
                    }}
                />
                <Typography variant="body2">
                    {feederInfo.feederState ? 'Active' : 'Disabled'}
                </Typography>
                </Box>

                <Divider sx={{ my: 1, backgroundColor: '#aaa' }} />

                <Typography variant="body2" sx={{ mb: 0.5 }}>
                <span style={{ fontWeight: 'bold', color: 'black' }}>Location:</span>{' '}
                <span style={{ fontWeight: 'normal', color: 'white' }}>{feederInfo.location}</span>
                </Typography>

                <Typography variant="body2" sx={{ mb: 0.5 }}>
                <span style={{ fontWeight: 'bold', color: 'black' }}>Last Activity:</span>{' '}
                <span style={{ fontWeight: 'normal', color: 'white' }}>
                    {dayjs(feederInfo.feederLastActivity).format('D MMMM YYYY HH:mm')}
                </span>
                </Typography>

                <Typography variant="body2" sx={{ mb: 0.5 }}>
                <span style={{ fontWeight: 'bold', color: 'black' }}>Time from last activity:</span>{' '}
                <span style={{ fontWeight: 'normal', color: 'white' }}>
                    {dayjs(feederInfo.feederLastActivity).fromNow()}
                </span>
                </Typography>

                <Typography variant="body2">
                <span style={{ fontWeight: 'bold', color: 'black' }}>Alert Time:</span>{' '}
                <span style={{ fontWeight: 'normal', color: 'white' }}>
                    {formatAlertTime(feederInfo.feederAlertTime)}
                </span>
                </Typography>
            </Box>
            </Box>

            {/* RIGHT COLUMN - EMPTY FOR NOW */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 300 }}>
            <Typography variant="h6" color="white" gutterBottom>
                Monthly Activity
            </Typography>
            <Box sx={{
                width: 300,
                height: 200,
                backgroundColor: '#1e1e1e',
                borderRadius: 2,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
                }}>
                {/* Compact heatmap with week numbers and tooltips */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 1 }}>
                {monthlyHeatmapData.map((week, weekIndex) => (
                    <Box key={weekIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    {/* Week number */}
                    <Typography variant="caption" color="gray" sx={{ width: 10, textAlign: 'right' }}>
                        {weekIndex + 1}
                    </Typography>

                    {/* Day cells */}
                    {week.map((count, dayIndex) => (
                        <Box
                        key={dayIndex}
                        title={`${count} event${count !== 1 ? 's' : ''}`}
                        sx={{
                            width: 28,
                            height: 28,
                            backgroundColor: getCellColor(count),
                            borderRadius: 1,
                            transition: '0.2s',
                            '&:hover': {
                            outline: '2px solid #aaa'
                            }
                        }}
                        />
                    ))}
                    </Box>
                ))}

                {/* Day names below */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 0.5, pl: '20px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                    <Typography key={label} variant="caption" color="gray" sx={{ width: 28, textAlign: 'center' }}>
                        {label}
                    </Typography>
                    ))}
                </Box>
                </Box>

            </Box>
            </Box>
        </Box>
    )}




      {/* CONTROLS and GRAPH */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={handlePrev} color="inherit">
          <ArrowBackIosNewIcon />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 160, textAlign: 'center' }}>
          {referenceDate.format(viewMode === 'day' ? 'MMMM D, YYYY' : viewMode === 'year' ? 'YYYY' : 'MMMM YYYY')}
        </Typography>
        <IconButton onClick={handleNext} color="inherit">
          <ArrowForwardIosIcon />
        </IconButton>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          color="primary"
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: 'white',
              border: '1px solid gray',
            },
            '& .Mui-selected': {
              color: 'black !important',
              backgroundColor: '#1976d2 !important',
            },
          }}
        >
          <ToggleButton value="day">Day</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="year">Year</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ height: 400, backgroundColor: '#1e1e1e', borderRadius: 2, p: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={activityData}>
            <XAxis dataKey="label" tick={{ fill: 'white' }} />
            <YAxis tick={{ fill: 'white' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#333' }}
              itemStyle={{ color: 'white' }}
              labelStyle={{ color: 'white' }}
            />
            <Bar
              dataKey="activity"
              fill="#4caf50"
              onClick={(data) => handleBarClick(data)}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  </>
);

};

export default FeederAnalyticsPage;
