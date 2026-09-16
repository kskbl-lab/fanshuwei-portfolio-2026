const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.PREVIEW_ROOT||path.join(__dirname,'../site'));
const port=Number(process.env.PORTFOLIO_PORT||4187);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.gif':'image/gif'};
http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400);return res.end();}
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(file===root||req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');
 let stat;try{stat=fs.statSync(file);if(!stat.isFile())throw Error();}catch{res.writeHead(404);return res.end();}
 const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
 let start=0,end=stat.size-1,status=200;
 if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416);return res.end();}start=Number(match[1]||0);end=match[2]?Math.min(Number(match[2]),end):end;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
 headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(file,{start,end});stream.pipe(res);res.on('close',()=>stream.destroy());
}).listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}/`));
