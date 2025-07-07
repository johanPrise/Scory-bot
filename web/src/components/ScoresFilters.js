import React from 'react';
import {
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Collapse,
  Box,
} from '@mui/material';
import { FilterList as FilterListIcon, Search as SearchIcon } from '@mui/icons-material';

const ScoresFilters = ({
  filters,
  onFilterChange,
  searchQuery,
  onSearchChange,
  showAdvanced,
  onToggleAdvanced,
  users,
  activities,
}) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Rechercher par nom d'utilisateur ou activité..."
            value={searchQuery}
            onChange={onSearchChange}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            fullWidth
            startIcon={<FilterListIcon />}
            onClick={onToggleAdvanced}
          >
            {showAdvanced ? 'Masquer les filtres' : 'Filtres avancés'}
          </Button>
        </Grid>
      </Grid>
      <Collapse in={showAdvanced}>
        <Box mt={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleInputChange}
                  label="Statut"
                >
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="approved">Approuvé</MenuItem>
                  <MenuItem value="pending">En attente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Utilisateur</InputLabel>
                <Select
                  name="userId"
                  value={filters.userId}
                  onChange={handleInputChange}
                  label="Utilisateur"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user._id} value={user._id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Activité</InputLabel>
                <Select
                  name="activityId"
                  value={filters.activityId}
                  onChange={handleInputChange}
                  label="Activité"
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {activities.map((activity) => (
                    <MenuItem key={activity._id} value={activity._id}>
                      {activity.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ScoresFilters;
