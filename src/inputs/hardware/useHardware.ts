import { useEffect, useState } from 'react';
import { hardwareHub } from './hub';

/** Re-renderiza el componente cuando cambia el estado de las conexiones. */
export function useHardware() {
  const [, setTick] = useState(0);
  useEffect(() => hardwareHub.subscribe(() => setTick((t) => t + 1)), []);
  return hardwareHub;
}
