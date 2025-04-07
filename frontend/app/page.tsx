'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  useToast,
} from '@chakra-ui/react';

interface Job {
  name: string;
  url: string;
  color: string;
  lastBuild: {
    number: number;
    url: string;
  };
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Ensure we have a valid API URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        console.log('Fetching jobs from:', apiUrl); // Debug log
        
        const response = await fetch(`${apiUrl}/api/jobs`);
        console.log('Response:', response); // Debug log 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Data:', data); // Debug log
        if (data.error) {
          console.error('Error in data:', data.error); // Debug log
          throw new Error(data.error);
        }
        setJobs(data.jobs);
      } catch (error) {
        console.error('Error fetching jobs:', error); // Debug log
        toast({
          title: 'Error fetching jobs',
          description: error instanceof Error ? error.message : 'Failed to fetch jobs',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [toast]);

  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={8}>Jenkins Jobs</Heading>
      {loading ? (
        <Text>Loading jobs...</Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Job Name</Th>
                <Th>Status</Th>
                <Th>Last Build</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {jobs.map((job) => (
                <Tr key={job.name}>
                  <Td>{job.name}</Td>
                  <Td>
                    <Box
                      as="span"
                      px={2}
                      py={1}
                      borderRadius="md"
                      bg={job.color === 'blue' ? 'green.100' : 'red.100'}
                      color={job.color === 'blue' ? 'green.800' : 'red.800'}
                    >
                      {job.color === 'blue' ? 'Success' : 'Failed'}
                    </Box>
                  </Td>
                  <Td>
                    <a
                      href={job.lastBuild?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'blue', textDecoration: 'underline' }}
                    >
                      #{job.lastBuild.number}
                    </a>
                  </Td>
                  <Td>
                    <a
                      href={`/logs/${job.name}/${job.lastBuild.number}`}
                      style={{ color: 'blue', textDecoration: 'underline' }}
                    >
                      View Logs
                    </a>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Container>
  );
} 