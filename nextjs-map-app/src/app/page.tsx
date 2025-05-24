import Map from '@/components/Map';
import HUD from '@/components/HUD'; // Import HUD
import Box from '@mui/material/Box'; // Optional: for layout

export default function Home() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box sx={{ flexGrow: 1, position: 'relative' }}> {/* Map container */}
        <Map />
      </Box>
      <HUD /> {/* HUD is placed after the map container */}
    </Box>
  );
}
