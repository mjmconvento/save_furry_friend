import React from 'react';
import { Alert, Typography } from '@mui/material';

interface ErrorListProps {
  errors: string[];
}

const ErrorList: React.FC<ErrorListProps> = ({ errors }) => {
  if (errors.length === 0) return null;

  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Please fix the following errors:
      </Typography>
      <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
        {errors.map((err, idx) => (
          <li key={idx} style={{ fontSize: '0.9rem' }}>
            {err}
          </li>
        ))}
      </ul>
    </Alert>
  );
};

export default ErrorList;
