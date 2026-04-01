import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(onNewLog) {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    if (onNewLog) {
      socketRef.current.on('new_log', onNewLog);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef;
}
