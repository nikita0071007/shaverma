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

/* ---------- music ---------- */
var musicOn=true,musicTimer=null,musicNext=0,musicStep=0,musicBus=null;
try{musicOn=localStorage.getItem('shaverma-music')!=='0';}catch(e){}
var BPM=96,STEP=60/BPM/4;
/* D hijaz-ish scale: D Eb F# G A Bb C */
var SCALE=[293.66,311.13,369.99,392,440,466.16,523.25,587.33];
var DRUM='D..tD.t.D..tD.tt';   /* doum / tek over 16 sixteenths */
var CHORDS=[0,0,3,4];
function bus(){if(!musicBus){musicBus=ac.createGain();musicBus.gain.value=0.33;musicBus.connect(master);}return musicBus;}
function pluck(f,t,vol){
  var o=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain(),lp=ac.createBiquadFilter();
  o.type='sawtooth';o2.type='triangle';o.frequency.value=f;o2.frequency.value=f*2.003;lp.type='lowpass';lp.frequency.setValueAtTime(2600,t);lp.frequency.exponentialRampToValueAtTime(500,t+0.35);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
  o.connect(lp);o2.connect(lp);lp.connect(g).connect(bus());o.start(t);o2.start(t);o.stop(t+0.5);o2.stop(t+0.5);
}
function drum(kind,t){
  var o=ac.createOscillator(),g=ac.createGain();
  if(kind==='D'){o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(55,t+0.18);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.5,t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);}
  else{o.frequency.setValueAtTime(700,t);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.18,t+0.002);g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
    var s=ac.createBufferSource(),f=ac.createBiquadFilter(),ng=ac.createGain();s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=3500;ng.gain.setValueAtTime(0.12,t);ng.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
    s.connect(f).connect(ng).connect(bus());s.start(t,Math.random());s.stop(t+0.08);}
  o.connect(g).connect(bus());o.start(t);o.stop(t+0.3);
}
var melodyIdx=4;
function scheduleMusic(){
  if(!ac||muted||!musicOn)return;
  while(musicNext<ac.currentTime+0.25){
    var t=musicNext,st=musicStep%16,bar=Math.floor(musicStep/16)%CHORDS.length,root=CHORDS[bar];
    var d=DRUM[st];if(d!=='.')drum(d,t);
    if(st%4===0)pluck(SCALE[root]/4,t,0.16);                                   /* bass on the beat */
    if(st%2===0&&Math.random()<0.55){                                           /* wandering melody */
      melodyIdx=Math.max(0,Math.min(SCALE.length-1,melodyIdx+[-2,-1,-1,1,1,2][Math.floor(Math.random()*6)]));
      pluck(SCALE[melodyIdx],t,0.07);
    }
    musicNext+=STEP;musicStep++;
  }
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
  /* background music: a laid-back oriental groove made on the fly (darbuka + oud-like pluck + bass) */
  get musicOn(){return musicOn;},
  setMusic:function(on){
    musicOn=!!on;try{localStorage.setItem('shaverma-music',musicOn?'1':'0');}catch(e){}
    var c=ctx();if(!c)return;
    if(musicOn&&!muted&&!musicTimer){musicNext=c.currentTime+0.1;musicStep=0;musicTimer=setInterval(scheduleMusic,100);}
    if((!musicOn||muted)&&musicTimer){clearInterval(musicTimer);musicTimer=null;}
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
    window.Sfx.setMusic(musicOn);
  }
};
})();
