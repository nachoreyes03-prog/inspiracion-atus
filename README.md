# Inspiración Atus

Archivo de webs de referencia: capturas, tipografías, paletas, layout y un prompt listo para pedir un diseño así. Es una web estática (HTML, CSS y JS), sin build ni dependencias.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | La página |
| `styles.css` | Estilos |
| `app.js` | Búsqueda, filtros, detalle, mezclador y copiar prompts |
| `data.js` | **Tus datos**: referencias, fuentes de inspiración y perfil de gusto |
| `img/` | Capturas de cada referencia |
| `live.js` | Webs nuevas de las galerías (lo escribe el robot, no se edita a mano) |
| `scripts/fetch-live.mjs` | El robot: lee los feeds de Minimal Gallery, One Page Love, Land-book y SiteInspire |
| `.github/workflows/live.yml` | Corre el robot todos los días a las 07:17 (hora de Argentina) |

## Descubrir

La pestaña **Descubrir** tiene dos partes:

- **Buscador:** escribís algo (mejor en inglés: *dark portfolio*, *architecture*) y cada botón abre esa búsqueda en Pinterest, Savee, Behance, Awwwards y otras galerías. *Sorprendeme* elige una idea al azar.
- **En vivo:** las webs nuevas que publican las galerías, actualizadas una vez por día. *Para vos* muestra las que coinciden con tu gusto, *Otra tanda* las mezcla y *Guardar* las anota en tu dispositivo para pasárselas a Claude con *Copiar para Claude*.

Para traer novedades en el momento: en GitHub andá a **Actions → Referencias en vivo → Run workflow**. Después tocá *Actualizar* en la página.

Para verla en tu compu, abrí `index.html` con doble clic.

## Publicarla en GitHub Pages

1. Creá un repositorio nuevo en GitHub (por ejemplo `inspiracion-atus`).
2. Subí todo el contenido de esta carpeta a la raíz del repo: arrastrá los archivos en la web de GitHub, o usá `git push`.
3. En el repo, andá a **Settings → Pages**. En *Source* elegí **Deploy from a branch**, branch `main` y carpeta `/ (root)`. Guardá.
4. En uno o dos minutos queda online en `https://TU-USUARIO.github.io/inspiracion-atus/`. Abrila en el celu y agregala a la pantalla de inicio.

Si el repo es público, cualquiera con el link puede verla.

## Agregar una referencia

1. Guardá una captura de la web (1440 × 900 queda bien) en `img/`, por ejemplo `img/nombre.jpg`. Si querés una segunda que aparezca al pasar el mouse, guardala como `img/nombre-2.jpg`.
2. Abrí `data.js` y pegá un bloque como este **al principio** de la lista `refs` (la primera es la más nueva):

```js
    {
      "id": "nombre",
      "name": "Nombre de la web",
      "url": "https://ejemplo.com/",
      "rubro": "Arquitectura",
      "atus": false,
      "tags": ["oscuro", "grotesk", "grilla"],
      "likes": "Lo que te gusta, con tus palabras.",
      "avoid": "",
      "shots": ["img/nombre.jpg", "img/nombre-2.jpg"],
      "fonts": ["Nombre de la fuente — dónde se usa · alt. Google: Parecida"],
      "palette": ["#0A0A0B fondo", "#F2EFEA texto", "#8EDB2E acento"],
      "layout": "",
      "motion": "",
      "stack": "",
      "dna": "",
      "prompt": ""
    },
```

Si dejás `prompt` vacío, la página arma uno con los otros campos. `"atus": true` la marca como buena para Atus. Ojo con las comas: cada bloque termina en `},` salvo el último de la lista.

También podés pedirle a Claude: “agregá esta web a mi Inspiración Atus” con el link y la captura.
