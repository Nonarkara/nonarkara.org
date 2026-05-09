# City photo credits

All photos in this folder are CC BY-SA licensed via Wikipedia / Wikimedia Commons. Attribution is rendered on the image inside the city modal.

| File | Source | License | Credit |
|------|--------|---------|--------|
| `bangkok.jpg`  | [File:Bangkok_Montage_2024_2.jpg](https://commons.wikimedia.org/wiki/File:Bangkok_Montage_2024_2.jpg)   | CC BY-SA 3.0 | Wikipedia editors (montage) |
| `london.jpg`   | [Wikipedia · London](https://en.wikipedia.org/wiki/London)        | CC BY-SA     | Wikipedia editors |
| `tokyo.jpg`    | [Wikipedia · Tokyo](https://en.wikipedia.org/wiki/Tokyo)          | CC BY-SA 3.0 | Morio |
| `new-york.jpg` | [Wikipedia · New York City](https://en.wikipedia.org/wiki/New_York_City) | CC BY-SA 4.0 | Dllu |
| `sydney.jpg`   | [Wikipedia · Sydney](https://en.wikipedia.org/wiki/Sydney)        | CC BY-SA     | Wikipedia editors |

To add a new city photo:

1. Pick a recognisable view of the city from a CC-licensed source (Wikimedia Commons preferred — `pageimage` of `https://en.wikipedia.org/wiki/<City>` is usually a good candidate).
2. Verify the license — must allow commercial use + share-alike attribution.
3. Resize to 1200 px wide max via `sips -Z 1200 source.jpg --out city-photos/<slug>.jpg`.
4. Add an entry to `CITY_PHOTOS` in `index.html` with the slug, src, and a one-line credit including author + license + source.
5. Add a row to this table.
6. Bump `CACHE_VERSION` in `sw.js` and add the new file to the precache `SHELL` list so it's offline-ready.

Anti-regression: never replace earned screenshots or his own portraits with these. They live only in the city modal as a hero image — additive context, not filler.
