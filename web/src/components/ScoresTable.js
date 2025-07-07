import React from 'react';
import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  CircularProgress,
  Typography,
  Checkbox,
  TablePagination,
} from '@mui/material';
import ScoreItem from './ScoreItem';

const ScoresTable = ({
  scores,
  loading,
  selected,
  onSelectAllClick,
  onRowClick,
  isSelected,
  onEdit,
  onDelete,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const numSelected = selected.length;
  const rowCount = scores.length;

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={numSelected > 0 && numSelected < rowCount}
                  checked={rowCount > 0 && numSelected === rowCount}
                  onChange={onSelectAllClick}
                />
              </TableCell>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Activité</TableCell>
              <TableCell>Points</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : scores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary">Aucun score trouvé</Typography>
                </TableCell>
              </TableRow>
            ) : (
              scores.map((score) => (
                <ScoreItem
                  key={score._id}
                  score={score}
                  isSelected={isSelected(score._id)}
                  onCheckboxClick={(e) => onRowClick(e, score._id)}
                  onEdit={() => onEdit(score)}
                  onDelete={() => onDelete(score)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={scores.length} // This should be total count from server in a real scenario
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </Paper>
  );
};

export default ScoresTable;
