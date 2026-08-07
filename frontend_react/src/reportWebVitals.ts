import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

type OnPerfEntry = (metric: Metric) => void;

const reportWebVitals = (onPerfEntry?: OnPerfEntry): void => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    onCLS(onPerfEntry);
    onFCP(onPerfEntry);
    // INP replaced FID as the Core Web Vital; onFID was removed in web-vitals 5.
    onINP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
};

export default reportWebVitals;
