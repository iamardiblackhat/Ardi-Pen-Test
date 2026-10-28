import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const origin=new URL(process.env.ARDI_SITE_URL||'https://ardi-pen-test-api-server-one.vercel.app');
if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw new Error('ARDI_SITE_URL must be an HTTPS origin');
const site=origin.origin,esc=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export const pages={
 '/':'Investigate. Test. Prove.',
 '/capabilities':'Security capabilities',
 '/security':'Security and responsible use',
 '/intelligence':'Threat intelligence',
 '/faq':'Frequently asked questions',
 '/terms':'Terms of service',
 '/privacy':'Privacy policy',
 '/cookies':'Cookie policy',
 '/login':'Sign in',
 '/register':'Create an account',
};
export function brandDocument(html,path='/'){
 const title=`${pages[path]||'Security workspace'} | ARDI Sec`,url=site+path,image=site+'/branding/ardi-sec-social-en-v1.png';
 const description='ARDI Sec by Omnelia SI: public-source research, authorised security testing, findings and evidence in one security workspace.';
 html=html.replace(/<!-- BRAND:START -->[\s\S]*?<!-- BRAND:END -->/g,'').replace(/<title>[\s\S]*?<\/title>/g,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]*|theme-color|application-name|apple-mobile-web-app-title)"|property="og:[^"]*")[^>]*>/g,'').replace(/<link\b[^>]*rel="(?:canonical|icon|shortcut icon|apple-touch-icon|manifest)"[^>]*>/g,'').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
 const graph={'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':site+'/#publisher',name:'Omnelia SI'},{'@type':'WebSite','@id':site+'/#website',name:'ARDI Sec',url:site,image:site+'/branding/ardi-sec-icon-512.png',publisher:{'@id':site+'/#publisher'}},{'@type':'WebPage',name:title,url,description,isPartOf:{'@id':site+'/#website'}}]};
 return html.replace('</head>',`<!-- BRAND:START --><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${['/login','/register'].includes(path)||!pages[path]||process.env.VERCEL_ENV==='preview'?'noindex,follow':'index,follow'}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="ARDI Sec"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="ARDI Sec by Omnelia SI — green and cyan liquid-glass mascot"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="ARDI Sec liquid-glass mascot"><meta name="application-name" content="ARDI Sec"><meta name="apple-mobile-web-app-title" content="ARDI Sec"><meta name="theme-color" content="#09121b"><link rel="icon" type="image/png" sizes="32x32" href="/branding/ardi-sec-icon-32.png"><link rel="icon" type="image/png" sizes="192x192" href="/branding/ardi-sec-icon-192.png"><link rel="shortcut icon" href="/favicon.ico"><link rel="apple-touch-icon" sizes="180x180" href="/branding/ardi-sec-icon-180.png"><link rel="manifest" href="/site.webmanifest"><script type="application/ld+json">${JSON.stringify(graph).replaceAll('<','\\u003c')}</script><!-- BRAND:END --></head>`);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const source=process.argv.includes('--source'),dir=new URL(source?'../':'../dist/public/',import.meta.url),template=await readFile(new URL('index.html',dir),'utf8');
 await writeFile(new URL('index.html',dir),brandDocument(template));
 if(!source){
  for(const path of Object.keys(pages).filter(p=>p!=='/')){await mkdir(new URL(path.slice(1)+'/',dir),{recursive:true});await writeFile(new URL(path.slice(1)+'/index.html',dir),brandDocument(template,path));}
  await writeFile(new URL('sitemap.xml',dir),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Object.keys(pages).filter(p=>!['/login','/register'].includes(p)).map(p=>`<url><loc>${site+p}</loc></url>`).join('')+'</urlset>\n');
  await writeFile(new URL('robots.txt',dir),process.env.VERCEL_ENV==='preview'?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\nDisallow: /settings\nDisallow: /login\nDisallow: /register\nSitemap: ${site}/sitemap.xml\n`);
 }
}
