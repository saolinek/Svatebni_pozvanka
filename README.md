# Svatební pozvánka

Jednostránková svatební pozvánka připravená pro Netlify.

## Úpravy obsahu

- V `index.html` upravte jména, datum, místo, harmonogram, kontakt a texty.
- V atributu `data-wedding-date` nastavte datum pro odpočet ve formátu `YYYY-MM-DDTHH:mm:ss+02:00`.
- Obrázky jsou načítané z Unsplash URL ve `styles.css`; pro vlastní fotky je stačí nahradit cestou k souboru.

## Potvrzení účasti

- Hosté jsou v `data/guests.json`.
- Ženich a nevěsta do seznamu hostů nepatří.
- Každý host má unikátní `id`, viditelné `name` a volitelnou `group`.
- Veřejný formulář nechává hosta vyplnit vlastní jméno a doprovod.
- Ruční přiřazení odpovědi k hostovi se ukládá v admin přehledu na `/admin`.
- Formulář ukládá každé potvrzení přes Netlify Function do Netlify Blobs.
- Admin přehled je dostupný na `/admin` bez hesla.

Příklad hosta:

```json
{
  "id": "jan-novak",
  "name": "Jan Novák",
  "group": "Rodina"
}
```

## Netlify

Netlify načte konfiguraci z `netlify.toml`. Build command není potřeba, publish directory je kořen projektu a funkce jsou v `netlify/functions`.

Pro lokální test serverless funkcí použijte Netlify CLI:

```bash
netlify dev
```

## Lokální server

Pro statickou kontrolu bez Netlify Functions:

```bash
python3 server.py
```

Server běží výchozně na `http://localhost:3000` a obsluhuje statické soubory z kořene projektu.
