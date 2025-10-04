# Notes Lab – Gemini Sandbox

Tahle složka je připravená na rychlý prototyp v Gemini (nebo jiném AI editoru).

## Použití

1. **Vyraž si ZIP**
   ```bash
   cd public/DAY73
   zip -r notes-gemini.zip gemini-notes-lab
   ```
2. **V Gemini** vyber „Importovat kód“ → „Nahrát složku“ a nahraj `notes-gemini.zip`.
3. Experimentuj – soubory jsou připravené bez citlivých dat.
4. Pokud chceš výsledek vrátit do projektu, stáhni změněné soubory a ručně je promítni zpět.
5. Nevyšlo to? ZIP smaž a hotovo, hlavní repo se tím nedotklo.

## Firebase konfigurace

- Vyplň soubor `firebase-config.js` údaji z webové aplikace ve Firebase Console (sekce **Project settings → General → Your apps**). V repu je placeholder, přihlašovací údaje nenechávej ve veřejném repozitáři.
- Firestore kolekce nese název `students`. Každý dokument reprezentuje jedno dítě a může vypadat takto:

```json
{
  "name": "Amy Nováková",
  "grade": "1. třída · ZŠ Komenského",
  "focus": "Amy si zvyká na rytmus první třídy...",
  "routine": ["Domácí příprava po příchodu..."],
  "projects": [
    {
      "id": "amy-reading-journal",
      "title": "Čtenářský deník",
      "subject": "Český jazyk",
      "status": "active",
      "baselineStatus": "active",
      "dueDate": "2024-05-01",
      "owner": "Amy + mamka",
      "description": "...",
      "tasks": [
        { "id": "task-1", "title": "Přečíst kapitolu", "note": "", "completed": false }
      ],
      "milestones": ["Plynulé čtení"],
      "notes": "Amy nejlépe pracuje po svačině."
    }
  ]
}
```

- Při změně stavu úkolu se aktualizuje pole `projects` v odpovídajícím dokumentu (operace `setDoc` s `merge: true`). Pokud kolekce nebo dokument neexistuje, vytvoř je ručně ve Firebase Console.
- Firebase Storage (`storageBucket`) musí být aktivní. Přílohy se ukládají do cesty `attachments/{studentId}/{projectId}/` a metadata se zapisují do pole `attachments` v dokumentu studenta. Limit je 10 MB na soubor (obrázky nebo PDF).

> Tip: pro testování si můžeš zkopírovat lokální vzorová data z `notes-lab.js` a vložit je do Firestore.

## Tipy
- Přidej krátký popis změn v `NOTES_CHANGELOG.md`, ať víš, co z experimentu přenést zpět.
- Když upravuješ Quill, můžeš do HTML přidat CDN moduly pro pluginy nebo vlastní toolbar.
- Pokud chceš testovat i upload obrázků, rozšiř `firebase-placeholder.js` o konfiguraci Storage, nebo zcela vypni nahrávání a používej data URL.
