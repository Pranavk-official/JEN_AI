'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  useToast,
  VStack,
  HStack,
  Button,
} from '@chakra-ui/react';

interface LogPageProps {
  params: {
    jobName: string;
    buildNumber: string;
  };
}

export default function LogPage({ params }: LogPageProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const toast = useToast();
  const { jobName, buildNumber } = params;

  useEffect(() => {
    // Ensure buildNumber is valid before connecting
    if (!buildNumber || buildNumber === 'undefined') {
      setError('Invalid build number.');
      return;
    }

    const connectWebSocket = () => {
      // Construct the absolute WebSocket URL for the backend
      const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const wsUrl = `${backendApiUrl.replace(/^http/, 'ws')}/ws/logs/${jobName}/${buildNumber}`;
      console.log('Connecting to WebSocket:', wsUrl); // Debug log

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            console.error('WebSocket received error:', data.error);
            setError(data.error);
            ws.close();
          } else if (data.status) {
            console.log('WebSocket received status:', data.status);
            toast({
              title: 'Build Status',
              description: data.status,
              status: 'info',
              duration: 5000,
              isClosable: true,
            });
          }
        } catch {
          // If it's not JSON, it's a log message
          setLogs((prevLogs) => [...prevLogs, event.data]);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket connection error:', event);
        setError('WebSocket connection error');
        setConnected(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        // Optionally, display a message if the disconnection was unexpected
        if (!event.wasClean) {
          setError('WebSocket connection closed unexpectedly.');
        }
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    // Cleanup function: Close WebSocket when component unmounts or params change
    return () => {
      if (wsRef.current) {
        console.log('Closing WebSocket connection.');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // Add jobName and buildNumber as dependencies
  }, [jobName, buildNumber, toast]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">
            Logs for {jobName} #{buildNumber}
          </Heading>
          <Box>
            {connected ? (
              <Text color="green.500">Connected</Text>
            ) : (
              <Text color="red.500">Disconnected</Text>
            )}
          </Box>
        </HStack>

        {error && (
          <Box p={4} bg="red.50" color="red.700" borderRadius="md">
            {error}
          </Box>
        )}

        <Box
          bg="gray.50"
          p={4}
          borderRadius="md"
          fontFamily="mono"
          whiteSpace="pre-wrap"
          maxH="70vh"
          overflowY="auto"
        >
          {logs.map((log, index) => (
            <Text key={index}>{log}</Text>
          ))}
        </Box>
      </VStack>
    </Container>
  );
} 