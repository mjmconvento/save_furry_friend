// Import the types from the web-vitals package
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Declare the type for the performance entry function
type OnPerfEntry = (metric: {
  name: string;
  delta: number;
  id: string;
  value: number;
  label?: string;
}) => void;

const reportWebVitals = (onPerfEntry?: OnPerfEntry): void => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    // Import web-vitals specifically and then use the metrics
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  }
};

export default reportWebVitals;