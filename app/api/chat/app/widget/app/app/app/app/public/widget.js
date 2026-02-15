(function() {
  'use strict';
  
  // UPDATE THIS URL AFTER DEPLOYING
  var WIDGET_URL = 'https://YOUR_PROJECT.vercel.app/widget';
  
  if (window.xumiiroAgentLoaded) return;
  window.xumiiroAgentLoaded = true;
  
  var container = document.createElement('div');
  container.id = 'xumiiro-agent-container';
  container.style.cssText = 'position:fixed;bottom:0;right:0;width:420px;height:580px;z-index:2147483647;pointer-events:none;';
  
  var iframe = document.createElement('iframe');
  iframe.src = WIDGET_URL;
  iframe.id = 'xumiiro-agent-frame';
  iframe.style.cssText = 'width:100%;height:100%;border:none;background:transparent;';
  iframe.setAttribute('allowtransparency', 'true');
  
  iframe.onload = function() {
    container.style.pointerEvents = 'auto';
  };
  
  container.appendChild(iframe);
  
  if (document.body) {
    document.body.appendChild(container);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(container);
    });
  }
})();
