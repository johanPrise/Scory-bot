import React from 'react';
import { Grid, Card, CardContent, Box, Typography, CircularProgress } from '@mui/material';

const StatsCards = ({ statsCards, loading }) => (
  <Grid container spacing={3} sx={{ mb: 4 }}>
    {statsCards.map((stat, index) => (
      <Grid item xs={12} sm={6} md={3} key={index}>
        <Card elevation={3}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
            <Box
              sx={{
                backgroundColor: `${stat.color}.light`,
                color: `${stat.color}.main`,
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
              }}
            >
              <stat.icon />
            </Box>
            <Typography variant="body2" color="textSecondary" align="center">
              {stat.title}
            </Typography>
            {loading ? (
              <CircularProgress size={24} sx={{ my: 1 }} />
            ) : (
              <Typography variant="h5" color={`${stat.color}.main`} align="center">
                {stat.value}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export default StatsCards;
