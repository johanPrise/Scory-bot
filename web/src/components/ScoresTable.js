import React from 'react';
import { Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Box, CircularProgress, Typography } from '@mui/material';
import ScoreItem from './ScoreItem';

const ScoresTable = ({
  loading,
  scores,
  tabValue,
  hasPermission,
  handleApprove,
  handleReject,
  handleAddSubScore
}) => (
  <Paper sx={{ width: '100%', overflow: 'hidden' }}>
    {loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    ) : (
      <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {(tabValue !== 1) && <TableCell>Utilisateur</TableCell>}
              <TableCell>Activité</TableCell>
              <TableCell>Points</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Statut</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.length > 0 ? (
              scores.map((score) => (
                <ScoreItem
                  key={score._id}
                  score={score}
                  showUser={tabValue !== 1}
                  showActivity={true}
                  onApprove={tabValue === 3 && hasPermission('approve_scores') ? handleApprove : undefined}
                  onReject={tabValue === 3 && hasPermission('approve_scores') ? handleReject : undefined}
                  onAddSubScore={tabValue !== 3 ? handleAddSubScore : undefined}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tabValue === 1 ? 5 : 6} align="center">
                  <Box sx={{ py: 3 }}>
                    <Typography color="textSecondary">
                      Aucun score trouvé
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Paper>
);

export default ScoresTable;
