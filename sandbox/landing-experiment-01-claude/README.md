# Landing Experiment 01 [Claude]

> **⚠️ Claude verze** – Toto je experimentální kopie vytvořená pro testování a vývoj s AI asistentem Claude. Data se ukládají do oddělené kolekce `landing-lab-claude` a nijak neovlivňují původní `landing-experiment-01`.

Tento sandbox je připravený pro rychlé experimenty – můžeš v něm stavět nové moduly (např. landing page) napojené na náš Firebase backend, aniž bys ovlivnil ostrou aplikaci nebo původní verzi.

## Vlastnosti
- **Oddělené kolekce**: všechna data se ukládají pod cestu `sandboxProjects/landing-lab-claude`, takže se nedotknou produkčních kolekcí ani původního sandboxu.
- **Připravené Firebase přihlášení**: stačí kliknout na „Přihlásit přes Google“.
- **Rychlý náhled dat**: panel „Testovací dokumenty“ ukáže položky, které jste vytvořil v sandboxu.
- **Snadné zahození**: když je experiment hotový, složku můžeš smazat nebo ji zkomprimovat a poslat do Gemini – na produkci nic nepokazíš.

## Jak začít
1. Otevři `index.html` (např. přes VS Code Live Server nebo `http://localhost:5500/public/DAY73/sandbox/landing-experiment-01-claude/index.html`).
2. Přihlas se přes tlačítko Google.
3. V pravém panelu si vyzkoušej vytvořit testovací dokument – okamžitě se uloží do oddělené kolekce.
4. V souboru `app.js` doplň vlastní UI logiku nebo komponenty landing page.

## Struktura
```
landing-experiment-01-claude/
├── README.md                  ← tento soubor s instrukcemi
├── index.html                 ← základní HTML scaffold
├── app.css                    ← jednoduché styly
├── app.js                     ← JavaScript s přihlášením a sandbox logikou
├── firebase-config.js         ← Firebase konfigurace
└── firebase-placeholder.js    ← Firebase wrapper
```

## Přenos do hlavní aplikace
Až budeš spokojený s výsledkem:
1. Zkopíruj relevantní části (komponenty, styly, logiku) do produkční složky.
2. Pokud chceš zachovat sandbox pro budoucí experimenty, změň jen namespace (`LAB_NAMESPACE`) a pracuj dál.

## Rozdíly oproti originálu
- **Namespace**: `landing-lab-claude` místo `landing-lab`
- **Branding**: Všude označeno [Claude] pro snadnou identifikaci
- **Izolace dat**: Kompletně oddělená Firebase kolekce

## Bezpečnostní poznámka
- Kolekce `sandboxProjects/landing-lab-claude` je sdílená mezi všemi uživateli v projektu – do produkce ji nenasazujeme.
- Pokud potřebuješ čistý start, v `app.js` je připravená utilita pro reset, která smaže všechny testovací dokumenty. Používej ji pouze, když víš, že nebudeš mazat cizí práci.

Happy hacking! ✨
