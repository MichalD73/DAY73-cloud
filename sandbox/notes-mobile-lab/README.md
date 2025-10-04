# Notes Mobile Lab

Sandboxová kopie poznámkového modulu pro návrh mobilního UX. Obsahuje:

- **Stejné Firebase napojení** jako produkční `notes-app` (kolekce `project73-notes`).
- Kompletní kopii HTML/CSS/JS, takže můžeš bezpečně upravovat layout, breakpoints i interakce.
- Izolované `localStorage`/`sessionStorage` klíče, aby se změny v sandboxu nepromítaly do ostré aplikace.

## Jak spustit
1. Otevři `index.html` (např. přes `http://localhost:5500/public/DAY73/sandbox/notes-mobile-lab/index.html`).
2. Přihlas se Google účtem. Zobrazí se stejné poznámky jako v hlavní aplikaci.
3. Uprav `app.css` a `app.js` podle potřeby (např. mobilní toolbar, animace, gesta).

## Přenos zpět
Až budeš spokojený s UX:
1. Porovnej změny v `app.css` / `app.js` se soubory `notes-app.css` / `notes-app.js`.
2. Přenes ověřené úpravy do ostré verze (nebo vytvoř PR diff).

## Tipy
- V devtools přepni na iPhone viewport (např. iPhone 16 Pro Max) a testuj.
- Pokud chceš začít od čistého stavu, zkopíruj znovu `../notes-app.css` a `../notes-app.js`.
- Experimentální větev můžeš verzovat samostatně (např. pomocí Git branch `notes/mobile-ux`).

Happy prototyping! 📱
