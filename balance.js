const P = require('./engine.js');
const strategies = {
  lazy_small: { d:{size:0,plants:0,trap:0,fountain:0}, pick:(s,w)=>[] },
  pretty_mow_algaecide: { d:{size:1,plants:0,trap:0,fountain:1}, pick:(s,w)=>['mow','algaecide'] },
  good_std: { d:{size:1,plants:1,trap:0,fountain:0}, pick:(s,w)=> s.season%2==0 ? ['buffer','outlet'] : ['buffer','flyer'] },
  good_std_smart: { d:{size:1,plants:1,trap:0,fountain:0}, pick:(s,w)=> w.season=='wet' ? ['buffer','outlet'] : ['buffer','flyer'] },
  wide_large: { d:{size:2,plants:2,trap:0,fountain:0}, pick:(s,w)=> ['buffer', w.season=='wet'?'outlet':'flyer'] },
  std_wide_trap: { d:{size:1,plants:2,trap:1,fountain:0}, pick:(s,w)=> ['buffer', w.season=='wet'?'outlet':(s.trapFill>0.4?'trapclean':'flyer')] },
  mow_outlet_std: { d:{size:1,plants:1,trap:0,fountain:0}, pick:(s,w)=> ['mow','outlet'] },
};
for (const [n,st] of Object.entries(strategies)) {
  let res = {wq:0,looks:0,cost:0,flood:0,unl:0,cash:0,A:0,mood:0,kills:0}; const N=200;
  for (let seed=1; seed<=N; seed++){
    let s = P.newGame(st.d, seed);
    for (let i=0;i<10;i++){ const w=s.weather[s.season]; s = P.runSeason(s, st.pick(s,w)).state; }
    const sc = P.score(s);
    res.wq+=sc.wq; res.looks+=sc.looks; res.cost+=sc.cost; res.flood+=sc.flood?1:0; res.unl+=sc.unlocked?1:0; res.cash+=s.cash; res.A+=sc.avgA; res.N=(res.N||0)+sc.avgN; res.mood+=sc.avgMood; res.kills+=s.fishKills;
  }
  for (const k in res) res[k]=+(res[k]/N).toFixed(2);
  console.log(n.padEnd(22), JSON.stringify(res));
}
