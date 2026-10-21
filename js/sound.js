/* Game sounds synthesized with Web Audio: no files to download, works offline.
   window.Sfx.play(name) for one-shots, Sfx.loop(name,on) for the kitchen sizzle and pouring. */
(function(){
var ac=null,master=null,noiseBuf=null,loops={};
var muted=false;
try{muted=localStorage.getItem('shaverma-muted')==='1';}catch(e){}

function ctx(){
  if(ac)return ac;
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ac=new AC();master=ac.createGain();master.gain.value=muted?0:0.8;master.connect(ac.destination);
  noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);
  var d=noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return ac;
}
/* browsers only allow audio after a user gesture */
['pointerdown','keydown'].forEach(function(ev){
  window.addEventListener(ev,function(){var c=ctx();if(c&&c.state==='suspended')c.resume();},{capture:true,passive:true});
});

function env(g,t,a,peak,d){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);}
function tone(freq,t,dur,type,vol,slideTo){
  var o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.frequency.setValueAtTime(freq,t);
  if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
  env(g,t,0.005,vol,dur);o.connect(g).connect(master);o.start(t);o.stop(t+dur+0.05);
}
function noise(t,dur,filter,f1,f2,vol,q){
  var s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
  s.buffer=noiseBuf;s.loop=true;f.type=filter;f.Q.value=q||1;
  f.frequency.setValueAtTime(f1,t);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+dur);
  env(g,t,0.004,vol,dur);s.connect(f).connect(g).connect(master);s.start(t,Math.random());s.stop(t+dur+0.05);
}

var SOUNDS={
  sliver:function(t){noise(t,0.05,'bandpass',4200+Math.random()*1500,2500,0.12,4);},
  shave:function(t){noise(t,0.13,'bandpass',5200,1400,0.5,3);noise(t+0.03,0.25,'highpass',3000,0,0.12);},
  drop:function(t){tone(190,t,0.12,'sine',0.35,70);noise(t,0.06,'lowpass',900,0,0.15);},
  squeeze:function(t){
    for(var i=0;i<3;i++)noise(t+i*0.09,0.11,'bandpass',500+i*140,260,0.35,6);
    tone(140,t,0.3,'sawtooth',0.04,90);
  },
  wrap:function(t){for(var i=0;i<5;i++)noise(t+i*0.07+Math.random()*0.03,0.07,'highpass',2500+Math.random()*2500,0,0.18);},
  coin:function(t){tone(1318,t,0.12,'triangle',0.25);tone(1760,t+0.08,0.35,'triangle',0.25);},
  perfect:function(t){[784,988,1175,1568].forEach(function(f,i){tone(f,t+i*0.07,0.22,'triangle',0.18);});},
  bad:function(t){tone(220,t,0.18,'square',0.07,180);tone(165,t+0.16,0.3,'square',0.07,130);},
  door:function(t){tone(1046,t,0.5,'sine',0.18);tone(1318,t+0.12,0.6,'sine',0.15);},
  order:function(t){tone(880,t,0.09,'sine',0.12);tone(1175,t+0.07,0.12,'sine',0.12);},
  click:function(t){tone(660,t,0.05,'triangle',0.1);},
  dayEnd:function(t){[523,659,784,1046].forEach(function(f,i){tone(f,t+i*0.12,0.4,'triangle',0.16);});},
  buy:function(t){tone(988,t,0.08,'square',0.06);tone(1318,t+0.07,0.25,'triangle',0.2);}
};

/* looping beds: sizzle near the spits, liquid while pouring */
function startLoop(name){
  var s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
  s.buffer=noiseBuf;s.loop=true;g.gain.value=0.0001;
  if(name==='sizzle'){f.type='highpass';f.frequency.value=2200;}
  else{f.type='bandpass';f.frequency.value=700;f.Q.value=2;}
  s.connect(f).connect(g).connect(master);s.start();
  var target=name==='sizzle'?0.05:0.22;
  g.gain.exponentialRampToValueAtTime(target,ac.currentTime+0.25);
  var l={s:s,f:f,g:g,crackle:null};
  if(name==='sizzle')l.crackle=setInterval(function(){if(Math.random()<0.6)noise(ac.currentTime,0.02,'highpass',4000,0,0.06+Math.random()*0.08);},90);
  return l;
}

window.Sfx={
  play:function(name){var c=ctx();if(!c||muted||!SOUNDS[name])return;SOUNDS[name](c.currentTime+0.01);},
  loop:function(name,on){
    var c=ctx();if(!c)return;
    if(on&&!loops[name]&&!muted)loops[name]=startLoop(name);
    else if(!on&&loops[name]){
      var l=loops[name];delete loops[name];if(l.crackle)clearInterval(l.crackle);
      l.g.gain.cancelScheduledValues(c.currentTime);l.g.gain.setTargetAtTime(0.0001,c.currentTime,0.08);l.s.stop(c.currentTime+0.4);
    }
  },
  /* the cook's voice: the browser's built-in Russian speech, no audio files */
  say:function(text){
    if(muted||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
    var voices=speechSynthesis.getVoices(),ru=voices.filter(function(v){return /^ru/i.test(v.lang);});
    if(voices.length&&!ru.length)return;   /* no Russian voice on this device: stay quiet rather than mangle it */
    var u=new SpeechSynthesisUtterance(text);u.lang='ru-RU';u.rate=1.05;u.pitch=0.85;u.volume=0.9;
    var male=ru.filter(function(v){return /pavel|dmitr|yuri|maxim|male|муж/i.test(v.name);})[0];
    if(male||ru[0])u.voice=male||ru[0];
    speechSynthesis.cancel();speechSynthesis.speak(u);
  },
  /* pouring pitch rises as the cup fills, like a real glass */
  pourLevel:function(k){if(loops.pour)loops.pour.f.frequency.setTargetAtTime(500+k*1300,ac.currentTime,0.05);},
  get muted(){return muted;},
  set muted(v){
    muted=!!v;try{localStorage.setItem('shaverma-muted',muted?'1':'0');}catch(e){}
    if(master)master.gain.value=muted?0:0.8;
    if(muted)Object.keys(loops).forEach(function(n){window.Sfx.loop(n,false);});
  }
};
})();
