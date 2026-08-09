(()=>{
  const send=(path,value)=>fetch(path+'?m='+encodeURIComponent(String(value||'unknown'))).catch(()=>{});
  addEventListener('error',event=>send('/__client_error',(event.error&&event.error.stack)||event.message));
  addEventListener('unhandledrejection',event=>send('/__client_rejection',(event.reason&&event.reason.stack)||event.reason));
})();
