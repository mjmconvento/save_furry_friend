import { CircularProgress, Box, Typography } from '@mui/material';

const LoadingIndicator = ({ message = 'Loading...', size = 60 }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <CircularProgress size={size} color="primary" />
      <Typography variant="body1" sx={{ mt: 2, color: 'text.primary' }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingIndicator;
