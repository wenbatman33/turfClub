import {defineConfig} from 'vite';
export default defineConfig({
 server:{host:'0.0.0.0',port:8770,strictPort:true},
 build:{chunkSizeWarningLimit:650,rollupOptions:{output:{manualChunks(id){if(id.includes('node_modules/three/src/')||id.includes('node_modules/three/build/'))return 'three';if(id.includes('node_modules/three/examples/'))return 'three-addons';}}}}
});
