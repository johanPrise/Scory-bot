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
  TablePagination,
} from '@mui/material';
import GroupItem from './GroupItem';

const GroupsTable = ({
  groups,
  loading,
  onEdit,
  onDelete,
  onManageMembers,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Membres</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Créé le</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="textSecondary">Aucun groupe trouvé</Typography>
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <GroupItem
                  key={group._id}
                  group={group}
                  onEdit={() => onEdit(group)}
                  onDelete={() => onDelete(group)}
                  onManageMembers={() => onManageMembers(group)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={groups.length} // Should be total count from server
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </Paper>
  );
};

export default GroupsTable;
