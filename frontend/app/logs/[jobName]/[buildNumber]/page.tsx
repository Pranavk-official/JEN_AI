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

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws')}/ws/logs/${params.jobName}/${params.buildNumber}`
      );

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setError(data.error);
            ws.close();
          } else if (data.status) {
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

      ws.onerror = (error) => {
        setError('WebSocket connection error');
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [params.jobName, params.buildNumber, toast]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">
            Logs for {params.jobName} #{params.buildNumber}
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