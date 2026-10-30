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
| `scripts/robot.mjs` + `.github/workflows/agregar.yml` | El robot de **Subir**: aplica a `data.js` lo que cambiaste (webs nuevas, sacadas, ★, carpetas). Usa `scripts/capture.mjs` (capturas, tipografías y colores) y `scripts/data-file.mjs` (lee y escribe `data.js`) |
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

## Web design y Graphic design

Arriba, al lado del nombre, elegís la mitad: **Web design** (Referencias, Descubrir, Mezclar, Gusto) o **Graphic design**: sitios de recursos por categoría (mockups, texturas, logos, tipografías, colores). En Graphic design, **+ Agregar** suma un sitio con su categoría (o una nueva) y **Sacar** lo saca; los dos se suben con **Subir**, como todo lo demás. Los recursos están en `data.js`, en la lista `graphic`.

## Carpetas

Las referencias se ordenan en **carpetas, una por cliente** (cActus, U.Dent, Propia…). Arriba de los filtros tocás una carpeta para ver solo esas webs; **+ Carpeta** crea otra y **Editar** la renombra o la borra (las webs no se borran). En la ficha de cada referencia elegís en qué carpetas está. Al guardar con la ★ en Descubrir te pregunta en qué carpeta, y **+ Agregar** también.

## Cómo se guarda todo en todos lados

Lo que hacés (agregar, sacar, guardar con ★, carpetas) se ve al instante en ese dispositivo. Abajo aparece **"N cambios solo en este dispositivo · Subir"**: tocás **Subir**, se abre GitHub con un issue ya escrito y tocás **Create**. Un robot (`.github/workflows/agregar.yml` + `scripts/robot.mjs`) aplica todo a `data.js` y te responde en el issue; en uno o dos minutos está en todos tus dispositivos y Claude lo ve. **+ Agregar** y **Sacar** abren ese issue solos. Solo procesa issues tuyos.

## Agregar una referencia

**Con el botón (lo más rápido):** en Referencias tocá **+ Agregar** y pegá el link (en la compu también podés pegarlo directo con Ctrl+V). Para las webs nuevas el robot (con `scripts/capture.mjs`) las abre en Chrome, les saca dos capturas, lee las tipografías y los colores que usan y las suma al principio de `data.js` con `"auto": true`. Para probarlo sin guardar nada: **Actions → Cambios en Referencias → Run workflow** con el link y *prueba* en 1.

Las fichas automáticas no tienen layout, movimiento ni "por qué funciona": pedile a Claude que las complete.

**A mano:**

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
