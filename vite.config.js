import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on all network interfaces, not just localhost, so other
    // devices on the same LAN can open the app via this machine's IP.
    host: true,
  },
});
