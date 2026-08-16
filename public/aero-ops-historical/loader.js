(async()=>{
  const parts = ['game.part01.txt','game.part02.txt','game.part03.txt','game.part04.txt','game.part05.txt','game.part06.txt','game.part07.txt'];
  const code = (await Promise.all(parts.map(async p => {
    const r = await fetch(p);
    if (!r.ok) throw new Error(`Impossibile caricare ${p}`);
    return r.text();
  }))).join('');
  (0, eval)(code);
})().catch(err=>{
  console.error(err);
  document.body.innerHTML = `<pre style="padding:20px;color:white;background:#111">Errore di caricamento: ${err.message}</pre>`;
});
