import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Box,
  Typography
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingActionsIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const ScoreTable = ({
  scores,
  page,
  rowsPerPage,
  orderBy,
  order,
  selectedScores,
  onSort,
  onSelectAllClick,
  onSelectClick,
  onEdit,
  onDelete,
  onPageChange,
  onRowsPerPageChange,
  totalCount
}) => {
  const headCells = [
    { id: 'user.name', label: 'Utilisateur', sortable: true },
    { id: 'activity.name', label: 'Activité', sortable: true },
    { id: 'points', label: 'Points', sortable: true, align: 'right' },
    { id: 'approved', label: 'Statut', sortable: true },
    { id: 'createdAt', label: 'Date', sortable: true },
    { id: 'actions', label: 'Actions', sortable: false }
  ];

  const createSortHandler = (property) => (event) => {
    onSort(event, property);
  };

  const isSelected = (id) => selectedScores.indexOf(id) !== -1;

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - totalCount) : 0;

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedScores.length > 0 && selectedScores.length < totalCount
                  }
                  checked={totalCount > 0 && selectedScores.length === totalCount}
                  onChange={onSelectAllClick}
                  inputProps={{ 'aria-label': 'Sélectionner tout' }}
                />
              </TableCell>
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.align || 'left'}
                  sortDirection={orderBy === headCell.id ? order : false}
                >
                  {headCell.sortable ? (
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={createSortHandler(headCell.id)}
                    >
                      {headCell.label}
                    </TableSortLabel>
                  ) : (
                    headCell.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    Aucun score trouvé
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              scores.map((score) => {
                const isItemSelected = isSelected(score._id);
                return (
                  <TableRow
                    hover
                    key={score._id}
                    selected={isItemSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onChange={(event) => onSelectClick(event, score._id)}
                        inputProps={{ 'aria-label': `Sélectionner le score ${score._id}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar 
                          src={score.user?.avatar} 
                          alt={score.user?.name}
                          sx={{ width: 32, height: 32, mr: 1 }}
                        />
                        <Box>
                          <Typography variant="body2">
                            {score.user?.name || 'Utilisateur inconnu'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {score.user?.email || ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {score.activity?.name || 'Activité inconnue'}
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={score.points} 
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={score.approved ? 
                          <CheckCircleIcon fontSize="small" /> : 
                          <PendingActionsIcon fontSize="small" />
                        }
                        label={score.approved ? 'Approuvé' : 'En attente'}
                        color={score.approved ? 'success' : 'warning'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {format(parseISO(score.createdAt), 'PPp', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Modifier">
                          <IconButton 
                            size="small" 
                            onClick={() => onEdit(score)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton 
                            size="small" 
                            onClick={() => onDelete(score)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={7} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        labelRowsPerPage="Lignes par page:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
        }
      />
    </Paper>
  );
};

export default ScoreTable;
