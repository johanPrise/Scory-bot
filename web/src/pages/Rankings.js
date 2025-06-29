import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { scores, activities } from '../api';

const Rankings = () => {
  const [tab, setTab] = useState('individual');
  const [activityId, setActivityId] = useState('');
  const [subActivity, setSubActivity] = useState('');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activitiesList, setActivitiesList] = useState([]);
  const [subActivitiesList, setSubActivitiesList] = useState([]);

  useEffect(() => {
    activities.getAll().then(data => setActivitiesList(data.activities || data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activityId) {
      activities.getById(activityId).then(data => {
        setSubActivitiesList((data.activity?.subActivities) || []);
      });
    } else {
      setSubActivitiesList([]);
    }
  }, [activityId]);

  useEffect(() => {
    setLoading(true);
    scores.getRankings({ scope: tab, activityId, subActivity }).then(data => {
      setRankings(data.rankings || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tab, activityId, subActivity]);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Classements</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="individual" label="Classement individuel" />
          <Tab value="team" label="Classement par équipe" />
        </Tabs>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel>Activité</InputLabel>
            <Select value={activityId} label="Activité" onChange={e => setActivityId(e.target.value)}>
              <MenuItem value="">Toutes</MenuItem>
              {activitiesList.map(act => (
                <MenuItem key={act.id || act._id} value={act.id || act._id}>{act.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }} size="small" disabled={!activityId}>
            <InputLabel>Sous-activité</InputLabel>
            <Select value={subActivity} label="Sous-activité" onChange={e => setSubActivity(e.target.value)}>
              <MenuItem value="">Toutes</MenuItem>
              {subActivitiesList.map(sub => (
                <MenuItem key={sub.id || sub._id} value={sub.name}>{sub.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>
      <Paper sx={{ p: 2 }}>
        {loading ? <CircularProgress /> : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                {tab === 'individual' ? <TableCell>Utilisateur</TableCell> : <TableCell>Équipe</TableCell>}
                <TableCell>Score total</TableCell>
                <TableCell>Nombre de scores</TableCell>
                <TableCell>Score moyen</TableCell>
                <TableCell>Dernier score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rankings.map((row, idx) => (
                <TableRow key={row.userId || row.teamId}>
                  <TableCell>{idx + 1}</TableCell>
                  {tab === 'individual' ? <TableCell>{row.username} {row.firstName} {row.lastName}</TableCell> : <TableCell>{row.name}</TableCell>}
                  <TableCell>{row.totalScore}</TableCell>
                  <TableCell>{row.scoreCount}</TableCell>
                  <TableCell>{row.averageScore}</TableCell>
                  <TableCell>{row.lastScore ? new Date(row.lastScore).toLocaleString() : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default Rankings;
