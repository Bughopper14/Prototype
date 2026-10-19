import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 const apiPort=Number(env.PORT||3001);
 return {base:'./',plugins:[react()],server:{host:'0.0.0.0',port:4174,strictPort:true,proxy:{'/api':{
  target:`http://127.0.0.1:${apiPort}`,
  changeOrigin:false,
  configure(proxy){proxy.on('proxyReq',(proxyReq,req)=>{
   if(req.headers.host)proxyReq.setHeader('host',req.headers.host);
  });}
 }}},build:{outDir:'dist'}};
});
