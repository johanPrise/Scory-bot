import React, { useState } from 'react';
import { TableRow, TableCell, Box, Avatar, Typography, Chip, IconButton, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { SubdirectoryArrowRight as SubdirectoryArrowRightIcon, SportsSoccer as SportsSoccerIcon, Group as GroupIcon, Person as PersonIcon, ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon, Pending as PendingIcon } from '@mui/icons-material';

// Fonction utilitaire pour obtenir la couleur de la catégorie
const getCategoryColor = (category) => {
  switch (category) {
    case 'Sport':
      return 'success';
    case 'Culture':
      return 'primary';
    case 'Éducation':
      return 'info';
    case 'Bénévolat':
      return 'warning';
    default:
      return 'default';
  }
};

// Composant pour afficher un score individuel avec sous-scores et actions
const ScoreItem = ({ score, showUser = true, showActivity = true, onApprove, onReject, onAddSubScore, level = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const [subScoreDialog, setSubScoreDialog] = useState(false);
  const [newSubScore, setNewSubScore] = useState({ points: '', description: '' });

  const handleAddSubScore = async () => {
    if (onAddSubScore) {
      await onAddSubScore(score._id, Number(newSubScore.points), newSubScore.description);
      setSubScoreDialog(false);
      setNewSubScore({ points: '', description: '' });
    }
  };

  const hasSubScores = score.subScores && score.subScores.length > 0;

  return (
    <>
      <TableRow hover sx={{ backgroundColor: level > 0 ? 'action.hover' : 'inherit' }}>
        {showUser && (
          <TableCell sx={{ pl: level * 3 + 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {level > 0 && <SubdirectoryArrowRightIcon fontSize="small" color="action" />}
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {score.user?.username?.charAt(0) || score.user?.firstName?.charAt(0) || 'U'}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {score.user?.username || score.user?.firstName || 'Utilisateur inconnu'}
                </Typography>
                {score.user?.telegramId && (
                  <Typography variant="caption" color="textSecondary">
                    @{score.user.telegramUsername || score.user.telegramId}
                  </Typography>
                )}
              </Box>
            </Box>
          </TableCell>
        )}
        {showActivity && (
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={score.activity?.name || 'Activité inconnue'} 
                size="small"
                color={getCategoryColor(score.activity?.category)}
                icon={<SportsSoccerIcon fontSize="small" />}
              />
              {score.description && (
                <Typography variant="caption" color="textSecondary">
                  {score.description}
                </Typography>
              )}
            </Box>
          </TableCell>
        )}
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              {score.points}
            </Typography>
            {hasSubScores && (
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>
        </TableCell>
        <TableCell>
          {score.team ? (
            <Chip 
              label={score.team.name} 
              size="small"
              color="secondary"
              icon={<GroupIcon fontSize="small" />}
            />
          ) : (
            <Chip 
              label="Personnel" 
              size="small"
              color="primary"
              icon={<PersonIcon fontSize="small" />}
            />
          )}
        </TableCell>
        <TableCell>
          {new Date(score.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {score.approved ? (
              <Chip 
                label="Approuvé" 
                size="small"
                color="success"
                icon={<CheckCircleIcon fontSize="small" />}
              />
            ) : score.rejected ? (
              <Chip 
                label="Rejeté" 
                size="small"
                color="error"
                icon={<CancelIcon fontSize="small" />}
              />
            ) : (
              <Chip 
                label="En attente" 
                size="small"
                color="warning"
                icon={<PendingIcon fontSize="small" />}
              />
            )}
            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {onApprove && !score.approved && !score.rejected && (
                <Button size="small" color="success" variant="outlined" onClick={() => onApprove(score._id)}>
                  Approuver
                </Button>
              )}
              {onReject && !score.approved && !score.rejected && (
                <Button size="small" color="error" variant="outlined" onClick={() => onReject(score._id)}>
                  Rejeter
                </Button>
              )}
              {onAddSubScore && level === 0 && (
                <Button size="small" variant="outlined" onClick={() => setSubScoreDialog(true)}>
                  + Sous-score
                </Button>
              )}
            </Box>
          </Box>
        </TableCell>
      </TableRow>

      {/* Sous-scores */}
      {hasSubScores && expanded && score.subScores.map((subScore) => (
        <ScoreItem
          key={subScore._id}
          score={subScore}
          showUser={showUser}
          showActivity={showActivity}
          level={level + 1}
        />
      ))}

      {/* Dialog pour ajouter un sous-score */}
      <Dialog open={subScoreDialog} onClose={() => setSubScoreDialog(false)}>
        <DialogTitle>Ajouter un sous-score</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Points"
            type="number"
            value={newSubScore.points}
            onChange={e => setNewSubScore(s => ({ ...s, points: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={newSubScore.description}
            onChange={e => setNewSubScore(s => ({ ...s, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubScoreDialog(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAddSubScore}
            disabled={!newSubScore.points}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ScoreItem;
