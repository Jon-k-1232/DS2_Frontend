import { Alert, LinearProgress, Stack } from '@mui/material';
export default function RouteLoading(){return <Stack role='status' aria-live='polite' spacing={1} sx={{p:3}}><LinearProgress/><Alert severity='info'>Loading page…</Alert></Stack>;}
