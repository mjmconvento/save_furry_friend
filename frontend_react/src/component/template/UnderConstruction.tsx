import React from 'react';
import { Box, Typography } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';

const UnderConstruction: React.FC<{ message?: string }> = ({
  message = 'Page is under construction',
}) => {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 4,
        backgroundColor: 'background.default',
      }}
    >
      <BuildIcon sx={{ fontSize: 80, mb: 2, color: 'text.disabled' }} />
      <Typography variant="h4" gutterBottom>
        {message}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        We're working on this page. Please check back later.
      </Typography>
    </Box>
  );
};

export default UnderConstruction;
