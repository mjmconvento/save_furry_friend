import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        bgcolor: 'background.default',
        px: 4,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          fontSize: 80,
          mb: 3,
          color: 'primary.main',
        }}
      >
        😕
      </Box>
      <Typography variant="h3" component="h1" gutterBottom>
        Oops! Page Not Found
      </Typography>
      <Typography variant="body1" gutterBottom>
        We can't seem to find the page you're looking for.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 4 }}
        onClick={handleGoHome}
      >
        Go Back Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;
