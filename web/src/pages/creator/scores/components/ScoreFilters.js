import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { Clear as ClearIcon } from '@mui/icons-material';

const ScoreFilters = ({
  filters,
  users,
  activities,
  onFilterChange,
  onResetFilters,
  showFilters,
  onToggleFilters
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDateChange = (name) => (date) => {
    onFilterChange('dateRange', {
      ...filters.dateRange,
      [name]: date
    });
  };

  const handleClearDate = (name) => {
    onFilterChange('dateRange', {
      ...filters.dateRange,
      [name]: null
    });
  };

  return (
    <Box mb={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Scores</Typography>
        <Button 
          size="small" 
          startIcon={<ClearIcon />}
          onClick={onResetFilters}
          disabled={
            filters.status === 'all' && 
            !filters.userId && 
            !filters.activityId && 
            !filters.dateRange.start && 
            !filters.dateRange.end
          }
        >
          Réinitialiser les filtres
        </Button>
      </Box>
      
      <Button 
        size="small" 
        startIcon={showFilters ? <ClearIcon /> : null}
        onClick={onToggleFilters}
        sx={{ mb: 1 }}
      >
        {showFilters ? 'Masquer les filtres' : 'Afficher les filtres avancés'}
      </Button>
      
      {showFilters && (
        <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
          <Typography variant="subtitle2" gutterBottom>
            Filtres avancés
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.status}
                  label="Statut"
                  onChange={(e) => onFilterChange('status', e.target.value)}
                >
                  <MenuItem value="all">Tous les statuts</MenuItem>
                  <MenuItem value="approved">Approuvés</MenuItem>
                  <MenuItem value="pending">En attente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Utilisateur</InputLabel>
                <Select
                  value={filters.userId}
                  label="Utilisateur"
                  onChange={(e) => onFilterChange('userId', e.target.value)}
                >
                  <MenuItem value="">Tous les utilisateurs</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user._id} value={user._id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Activité</InputLabel>
                <Select
                  value={filters.activityId}
                  label="Activité"
                  onChange={(e) => onFilterChange('activityId', e.target.value)}
                >
                  <MenuItem value="">Toutes les activités</MenuItem>
                  {activities.map((activity) => (
                    <MenuItem key={activity._id} value={activity._id}>
                      {activity.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                <DatePicker
                  label="Date de début"
                  value={filters.dateRange.start}
                  onChange={handleDateChange('start')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: filters.dateRange.start && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearDate('start');
                            }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        )
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                <DatePicker
                  label="Date de fin"
                  value={filters.dateRange.end}
                  onChange={handleDateChange('end')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: filters.dateRange.end && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearDate('end');
                            }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        )
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default ScoreFilters;
