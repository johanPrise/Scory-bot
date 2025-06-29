import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { TableChart as TableChartIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material';

const ExportScoresDialog = ({
  open,
  onClose,
  onExport,
  exportOptions,
  setExportOptions,
  exporting,
  scoresLength,
  handleFieldToggle
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TableChartIcon />
        Exporter les scores
      </Box>
    </DialogTitle>
    <DialogContent>
      <Box sx={{ pt: 2 }}>
        {/* Format d'export */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Format d'export</InputLabel>
          <Select
            value={exportOptions.format}
            label="Format d'export"
            onChange={e => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
          >
            <MenuItem value="csv">CSV (Excel)</MenuItem>
            <MenuItem value="json">JSON</MenuItem>
            <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
          </Select>
        </FormControl>

        {/* Plage de dates */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Plage de dates</InputLabel>
          <Select
            value={exportOptions.dateRange}
            label="Plage de dates"
            onChange={e => setExportOptions(prev => ({ ...prev, dateRange: e.target.value }))}
          >
            <MenuItem value="current">Filtres actuels</MenuItem>
            <MenuItem value="today">Aujourd'hui</MenuItem>
            <MenuItem value="week">Cette semaine</MenuItem>
            <MenuItem value="month">Ce mois</MenuItem>
            <MenuItem value="year">Cette année</MenuItem>
            <MenuItem value="all">Toutes les données</MenuItem>
          </Select>
        </FormControl>

        {/* Options supplémentaires */}
        <FormControlLabel
          control={
            <Checkbox
              checked={exportOptions.includeSubScores}
              onChange={e => setExportOptions(prev => ({ ...prev, includeSubScores: e.target.checked }))}
            />
          }
          label="Inclure les sous-scores"
          sx={{ mb: 2 }}
        />

        {/* Champs à exporter */}
        <Typography variant="subtitle2" gutterBottom>
          Champs à exporter :
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {[
            { key: 'user', label: 'Utilisateur' },
            { key: 'activity', label: 'Activité' },
            { key: 'points', label: 'Points' },
            { key: 'team', label: 'Équipe' },
            { key: 'date', label: 'Date' },
            { key: 'status', label: 'Statut' },
            { key: 'description', label: 'Description' }
          ].map((field) => (
            <FormControlLabel
              key={field.key}
              control={
                <Checkbox
                  size="small"
                  checked={exportOptions.fields.includes(field.key)}
                  onChange={() => handleFieldToggle(field.key)}
                />
              }
              label={field.label}
            />
          ))}
        </Box>

        {/* Aperçu */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Aperçu :</strong> {scoresLength} score(s) seront exporté(s)
            {exportOptions.includeSubScores ? ' (avec sous-scores)' : ''}
            {' '}au format {exportOptions.format && exportOptions.format.toUpperCase()}.
          </Typography>
        </Alert>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Annuler</Button>
      <Button
        variant="contained"
        onClick={onExport}
        disabled={exporting || exportOptions.fields.length === 0}
        startIcon={exporting ? <CircularProgress size={20} /> : <FileDownloadIcon />}
      >
        {exporting ? 'Export en cours...' : 'Exporter'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ExportScoresDialog;
