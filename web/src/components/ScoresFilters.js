import React from 'react';
import { Paper, Grid, FormControl, InputLabel, Select, MenuItem, TextField, IconButton, Tooltip } from '@mui/material';
import { FilterList as FilterListIcon, Search as SearchIcon } from '@mui/icons-material';

const ScoresFilters = ({
  filters,
  tabValue,
  handleFilterChange,
  handleSearch
}) => (
  <Paper sx={{ p: 2, mb: 3 }}>
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Période</InputLabel>
          <Select
            name="period"
            value={filters.period}
            onChange={handleFilterChange}
            label="Période"
          >
            <MenuItem value="day">Aujourd'hui</MenuItem>
            <MenuItem value="week">Cette semaine</MenuItem>
            <MenuItem value="month">Ce mois</MenuItem>
            <MenuItem value="year">Cette année</MenuItem>
            <MenuItem value="all">Tout</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Type</InputLabel>
          <Select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            label="Type"
            disabled={tabValue !== 0}
          >
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="personal">Personnel</MenuItem>
            <MenuItem value="team">Équipe</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          size="small"
          name="search"
          label="Rechercher"
          value={filters.search}
          onChange={handleFilterChange}
          InputProps={{
            endAdornment: (
              <IconButton size="small" onClick={handleSearch}>
                <SearchIcon />
              </IconButton>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Tooltip title="Filtres avancés">
          <IconButton color="primary">
            <FilterListIcon />
          </IconButton>
        </Tooltip>
      </Grid>
    </Grid>
  </Paper>
);

export default ScoresFilters;
