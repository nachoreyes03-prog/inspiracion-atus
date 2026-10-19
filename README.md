# Inspiración Atus

Archivo de webs de referencia: capturas, tipografías, paletas, layout y un prompt listo para pedir un diseño así. Es una web estática (HTML, CSS y JS), sin build ni dependencias.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | La página |
| `styles.css` | Estilos |
| `app.js` | Buscador, filtros, detalle, mezclador y copiar prompts |
| `data.js` | **Tus datos**: referencias y perfil de gusto |
| `img/` | Capturas de cada referencia |
| `live.js` | Webs nuevas de las galerías (lo escribe el robot, no se edita a mano) |
| `scripts/fetch-live.mjs` | El robot: lee los feeds de Minimal Gallery, One Page Love, SiteInspire, Lapa Ninja, CSS Winner, Behance, The FWA, Typewolf y Mindsparkle |
| `.github/workflows/live.yml` | Corre el robot cada 6 horas; además busca en One Page Love unos 95 rubros (dentist, restaurant, hotel…) |

## Descubrir

La pestaña **Descubrir** tiene dos partes:

- **Buscador por rubro:** escribí en español o en inglés (*dentista*, *restaurante*, *hotel*) y te muestra las mejores webs del archivo para ese rubro, más links directos a esa búsqueda en Pinterest, Awwwards, Savee, Behance y otras galerías. El buscador de Referencias también te muestra webs de galerías para lo que busques.
- **En vivo:** miles de webs publicadas en esas galerías (hasta 3.000), con filtros por galería y por tema. *Más nuevas* las ordena por fecha y *Al azar* las mezcla. *Otra tanda* trae siempre webs que todavía no viste. Al bajar se cargan más solas. *Para vos* muestra las que coinciden con tu gusto y *Guardar* las anota en tu dispositivo para pasárselas a Claude con *Copiar para Claude*.

Para traer novedades en el momento: en GitHub andá a **Actions → Referencias en vivo → Run workflow**. En *Páginas* poné 100 si querés volver a traer webs viejas de Minimal Gallery y One Page Love.

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
