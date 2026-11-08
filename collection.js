const collection=document.querySelector('.collection');
const closeButton=collection.querySelector('.close');
const panels=[...collection.querySelectorAll('.panel')];
const middlePanel=panels[1];
const dismissOnOutsideClick=!collection.closest('#editor-preview');
const panelControls='button,a,input,select,textarea,[role="button"],[role="slider"]';
const centerCircle='#central-disc,#hub,.stage-ring';
const stacked=matchMedia('(max-width:989px)');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let activeFrame=null;
let overviewScroll=0;
let timer;
const slideTime=420;
const collapseTime=580;

function alignActive(){
 if(!activeFrame)return;
 const panel=activeFrame.parentElement;
 const center=collection.clientWidth/2;
 panel.style.setProperty('--shift-x',`${center-panel.offsetLeft-panel.offsetWidth/2}px`);
 panel.style.setProperty('--shift-y',`${48-panel.offsetTop}px`);
 // The middle circle takes the vacated side slot when a side circle opens.
 middlePanel.style.setProperty('--peer-shift-x',`${panel.offsetLeft-middlePanel.offsetLeft}px`);
}

function afterMotion(duration,callback){
 clearTimeout(timer);
 if(reduced.matches)callback();
 else timer=setTimeout(callback,duration);
}

function close(){
 const phase=collection.dataset.phase;
 if(!activeFrame||phase==='closing'||phase==='collapsing')return;
 const frame=activeFrame;
 frame.contentDocument.removeEventListener('click',closeOnPanelBackground);
 closeButton.hidden=true;
 frame.parentElement.inert=true;
 if(phase==='open'){
  collection.dataset.phase='collapsing';
  frame.contentWindow.dispatchEvent(new Event('curiosity:closing'));
  afterMotion(collapseTime,()=>slideBack(frame));
 }else slideBack(frame);
}

function closeOnPanelBackground(event){
 if(event.defaultPrevented||event.target.closest?.(panelControls))return;
 // The circle can be pointer-transparent while an item is selected.
 const circle=event.currentTarget.querySelector(centerCircle)?.getBoundingClientRect();
 if(circle?.width&&circle.height){
  const x=(event.clientX-circle.left)*2/circle.width-1;
  const y=(event.clientY-circle.top)*2/circle.height-1;
  if(x*x+y*y<=1)return;
 }
 close();
}

function slideBack(frame){
 frame.contentWindow.dispatchEvent(new Event('curiosity:close'));
 collection.dataset.phase='closing';
 afterMotion(slideTime,()=>{
  frame.parentElement.removeAttribute('data-active');
  for(const panel of panels)panel.inert=false;
  collection.dataset.phase='overview';
  activeFrame=null;
  if(stacked.matches)window.scrollTo({top:overviewScroll,behavior:'instant'});
  frame.contentDocument.querySelector('[data-collection-gate]')?.focus({preventScroll:true});
 });
}

collection.addEventListener('curiosity:open',event=>{
 const frame=event.target;
 if(frame===activeFrame&&collection.dataset.phase==='open')return;
 event.preventDefault();
 if(activeFrame||!panels.some(panel=>panel.firstElementChild===frame))return;

 activeFrame=frame;
 overviewScroll=window.scrollY;
 alignActive();
 frame.parentElement.setAttribute('data-active','');
 for(const panel of panels)panel.inert=true;
 collection.dataset.phase='opening';
 closeButton.hidden=false;
 if(stacked.matches)window.scrollTo({top:0,behavior:'instant'});
 closeButton.focus({preventScroll:true});
 afterMotion(slideTime,()=>{
  collection.dataset.phase='open';
  frame.parentElement.inert=false;
  frame.contentWindow.dispatchEvent(new Event('curiosity:activate'));
  if(dismissOnOutsideClick)frame.contentDocument.addEventListener('click',closeOnPanelBackground);
 });
});

collection.addEventListener('curiosity:return',event=>{
 if(event.target!==activeFrame)return;
 event.preventDefault();
 close();
});
closeButton.addEventListener('click',close);
if(dismissOnOutsideClick)document.addEventListener('click',event=>{
 if(!event.defaultPrevented)close();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
new ResizeObserver(alignActive).observe(collection);
