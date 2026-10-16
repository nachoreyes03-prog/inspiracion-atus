// Datos de Inspiración Atus. Editá este archivo para sumar o cambiar referencias (ver README.md).
// Las referencias se muestran en el orden de esta lista: la primera es la más nueva.
window.ATUS_DATA = {
  "updated": "2026-10-16",
  "refs": [
    {
      "id": "roomandpillar",
      "name": "Room & Pillar",
      "url": "https://www.roomandpillar.com/",
      "rubro": "Inversión",
      "atus": false,
      "tags": ["oscuro","grotesk","mono","lima","3d"],
      "likes": "",
      "avoid": "",
      "shots": ["img/roomandpillar.jpg","img/roomandpillar-2.jpg"],
      "fonts": ["ABC Diatype — titulares y texto, de 100 a 900 · alt. Google: Host Grotesk o Geist","Fraktion Mono — etiquetas y bajadas en mayúscula chica · alt. Google: Geist Mono o JetBrains Mono"],
      "palette": ["#13141A fondo","#F2F2F6 texto","#DBFD85 acento lima","#C2C2DB secundario"],
      "layout": "Wordmark partido a los extremos con una línea fina en el medio (Room —— & —— Pillar). Hero con el titular gigante en una sola línea sobre una roca 3D y dos bajadas en mono a izquierda y derecha. Navegación flotante abajo al centro, tipo dock, con el CTA en lima. Párrafo manifiesto enorme con el logo como sangría de la primera línea.",
      "motion": "Scroll suave con Lenis, video de fondo, botones lima con flecha que reaccionan al hover.",
      "stack": "Lenis · video",
      "dna": "Funciona por contraste: titular enorme y apretado contra textos chicos en mono. Un solo acento (lima) que aparece solo en lo que se toca. La roca 3D le da peso físico a una marca de inversión.",
      "prompt": "Diseñá una web con la dirección visual de Room & Pillar (roomandpillar.com).\nFondo casi negro #13141A, texto #F2F2F6 y un único acento lima #DBFD85 solo en botones y estados activos; gris lavanda #C2C2DB para textos secundarios.\nTipografía: grotesk neo tipo ABC Diatype (en Google: Host Grotesk) para todo, titulares enormes en una línea con tracking -0.04em; etiquetas y bajadas en mono mayúscula chica (Geist Mono).\nHeader: el nombre partido a los extremos con una línea de 1px que los une al centro.\nHero: un objeto 3D o una foto recortada al centro, el titular gigante encima y dos bajadas en mono a los costados.\nNavegación flotante abajo al centro, como un dock, con el CTA en lima y flecha →.\nEtiquetas de sección entre corchetes en mono: [ RECENT PARTNERS ].\nPárrafo manifiesto en grotesk grande (40 a 56px) con el logo como sangría de la primera línea.\nMovimiento: scroll suave (Lenis), video de fondo sutil, botones que reaccionan al hover.\nEvitar: más colores, cards con sombra, gradientes.\nAdaptalo a: [tu proyecto]."
    },
    {
      "id": "varsity",
      "name": "Varsity",
      "url": "https://www.varsity.vc/",
      "rubro": "Inversión",
      "atus": false,
      "tags": ["claro","serif","grilla","foto","mayúsculas"],
      "likes": "",
      "avoid": "",
      "shots": ["img/varsity.jpg","img/varsity-2.jpg"],
      "fonts": ["Tfarrow — titulares en mayúscula, serif de alto contraste · alt. Google: Marcellus o Cormorant SC","Pliant — etiquetas, botones y texto, en mayúscula con tracking · alt. Google: Hanken Grotesk"],
      "palette": ["#FFFFFF fondo","#1C231A texto verde casi negro","#B5E35E acento lima","#F3A9D2 rosa","#A7C3D4 celeste","#8C1250 magenta"],
      "layout": "Header blanco con la fecha y la hora en vivo a la izquierda, wordmark serif al centro y CTA lima a la derecha. El hero es una foto a sangre dividida por una grilla de 3×2 con líneas blancas de 1px: cada celda es un link (About, Portfolio, Team…) con su flecha, y el titular serif ocupa una celda.",
      "motion": "GSAP: nube de palabras en mayúscula, bloques de color que aparecen en grilla, etiquetas de color tipo pastilla.",
      "stack": "Webflow · GSAP",
      "dna": "La grilla sobre la foto convierte la navegación en parte de la imagen. La serif en mayúscula le da peso institucional y los pasteles (rosa, celeste, lima) le sacan lo solemne a un fondo de inversión.",
      "prompt": "Diseñá una web con la dirección visual de Varsity (varsity.vc).\nHeader blanco: a la izquierda la fecha y la hora en vivo en texto chico, al centro el nombre en serif mayúscula, a la derecha un botón rectangular lima #B5E35E.\nHero: una foto editorial a sangre dividida por una grilla de 3×2 con líneas blancas de 1px. Cada celda es un link de navegación con su flecha → abajo; una celda lleva el titular.\nTitular en serif de alto contraste, todo en mayúscula, interlineado 0.9 (en Google: Marcellus o Cormorant SC). Texto y etiquetas en grotesk mayúscula con tracking +0.04em (Hanken Grotesk).\nColor: blanco, texto verde casi negro #1C231A y acentos pastel solo en etiquetas y bloques: rosa #F3A9D2, celeste #A7C3D4, magenta #8C1250, lima #B5E35E.\nSección de valores como nube de palabras en mayúscula que se van iluminando.\nMovimiento con GSAP: bloques de color que aparecen en grilla, palabras que entran escalonadas.\nEvitar: bordes redondeados, sombras, íconos.\nAdaptalo a: [tu proyecto]."
    },
    {
      "id": "ledup",
      "name": "Ledup",
      "url": "https://ledup.pt/",
      "rubro": "Producto",
      "atus": false,
      "tags": ["claro","redondeado","bento","tierra","producto"],
      "likes": "",
      "avoid": "La intro de entrada.",
      "shots": ["img/ledup.jpg","img/ledup-2.jpg"],
      "fonts": ["Poppins — todo, de 200 a 600; titulares en 500 · Google Fonts"],
      "palette": ["#FAFAFA fondo","#4B423B texto marrón","#8A7B70 botón topo","#4F4B49 cards oscuras","#C77A3E cobre"],
      "layout": "Hero a sangre con foto de producto y las esquinas de abajo muy redondeadas, titular abajo a la izquierda y paginación 01 02. Menú en una pastilla translúcida al centro, CTA marrón y dos botones circulares. Después, un bento de cards con fotos que se funden a gris y flechas dentro de círculos.",
      "motion": "Slider en el hero, cards con fundido de foto a color sólido, hover en las flechas. Tiene una intro animada al entrar que conviene saltear.",
      "stack": "",
      "dna": "Una marca industrial que se ve cálida: marrones y grises en lugar del azul técnico de siempre, fotos de producto con luz real y un bento ordenado para catálogo, fichas técnicas y revendedores.",
      "prompt": "Diseñá una web con la dirección visual de Ledup (ledup.pt), sin intro animada al entrar.\nRubro: marca de producto técnico (iluminación) que tiene que verse cálida y premium.\nTipografía: Poppins en todo; titulares en 500 grandes y aireados, texto en 400, sin mayúsculas forzadas.\nPaleta: fondo #FAFAFA, texto marrón #4B423B, botones topo #8A7B70, cards oscuras #4F4B49 y un acento cobre #C77A3E.\nHero: foto de producto a sangre con las esquinas de abajo redondeadas (radio grande), titular abajo a la izquierda y paginación 01 02.\nMenú en una pastilla translúcida centrada; a la derecha un botón “Contacto ↗” y botones circulares de búsqueda y cuenta.\nDebajo, un bento de cards de distintos tamaños: foto que se funde a gris sólido, título en blanco y flecha dentro de un círculo con borde.\nMovimiento: slider suave en el hero, hover en flechas, entradas cortas. Sin loader ni intro.\nAdaptalo a: [tu proyecto]."
    },
    {
      "id": "juanmora",
      "name": "Juan Mora Romero",
      "url": "https://www.juanmoraromero.com/",
      "rubro": "Portfolio",
      "atus": true,
      "tags": ["oscuro","grotesk","grilla","grano","portfolio"],
      "likes": "Buena para Atus.",
      "avoid": "",
      "shots": ["img/juanmora.jpg"],
      "fonts": ["Neue Haas Grotesk Display — manifiesto en 600 y 700 con tracking muy negativo · alt. Google: Host Grotesk en 700","Geist — navegación y datos chicos · Google Fonts"],
      "palette": ["#343131 fondo gris cálido con grano","#F9FAFB texto","#979595 etiquetas"],
      "layout": "Grilla suiza a pantalla completa marcada con líneas de 1px. Columna izquierda angosta con foto de perfil, datos en pares etiqueta/valor (Services:, Role:) y formas geométricas blancas; a la derecha una frase manifiesto enorme con sangría en la primera línea. Abajo, carrusel horizontal de proyectos con imágenes de distintos tamaños y contador 01/05.",
      "motion": "Scroll horizontal de proyectos, grano animado sobre todo el fondo, navegación mínima (Work, About, Lab) con el activo en blanco.",
      "stack": "",
      "dna": "Es un CV convertido en póster: la frase dice quién es antes que cualquier menú. La grilla con líneas finas ordena todo y el grano le saca lo digital. Pocas piezas, cada una en su lugar.",
      "prompt": "Diseñá una web con la dirección visual de Juan Mora Romero (juanmoraromero.com), para un portfolio personal.\nFondo gris cálido oscuro #343131 con grano sutil animado encima; texto #F9FAFB; etiquetas en gris #979595.\nTipografía: grotesk display en 700 (Neue Haas Grotesk Display; en Google: Host Grotesk) con tracking -0.04em e interlineado 0.95 para el manifiesto; Geist chica para navegación y datos.\nGrilla suiza a pantalla completa marcada con líneas de 1px. Columna izquierda angosta: foto de perfil en blanco y negro, datos en pares etiqueta/valor (“Servicios:” en gris, el valor en blanco) y formas geométricas blancas (círculo, triángulo).\nColumna derecha: una frase manifiesto enorme con sangría en la primera línea y una flecha ↳ al inicio.\nDebajo: carrusel horizontal de proyectos con imágenes de distintos tamaños, contador 01/05 y “Ver detalle”.\nNav mínima arriba (Work, About, Lab) con el activo en blanco y el resto en gris; “Contacto” subrayado a la derecha.\nMovimiento: scroll horizontal en proyectos, hover que cambia el proyecto activo, nada de intros.\nAdaptalo a: [tu proyecto]."
    },
    {
      "id": "mersi",
      "name": "Mersi Architecture",
      "url": "https://www.mersi-architecture.com/projets/aurelien-cohen-levallois",
      "rubro": "Interiores",
      "atus": false,
      "tags": ["claro","grilla","grano","tierra","foto"],
      "likes": "Diseño de interiores muy bueno.",
      "avoid": "",
      "shots": ["img/mersi.jpg","img/mersi-2.jpg"],
      "fonts": ["Doner — nombre del cliente y números grandes, ancha y geométrica · alt. Google: Archivo con ancho 115 en 700","Switzer — texto y listas en 500 · alt. Google: Hanken Grotesk"],
      "palette": ["#EDE7DE fondo arena","#1A1A1A texto","#DC8B3F naranja","#AE4F2D terracota","#2B3A8C azul de los azulejos"],
      "layout": "Página de proyecto en paneles: mitad izquierda de color sólido (naranja con grano) con lugar y año arriba, una foto chica enmarcada y el nombre del cliente enorme abajo; mitad derecha con la foto del local a sangre. Al scrollear aparecen paneles arena con una lista numerada de servicios (01 a 05) separada por líneas y el dato grande del proyecto: 60 m².",
      "motion": "Textos que entran palabra por palabra, paneles que se desplazan, intro con el logo MS en textura de travertino. Hecha por Flot Noir.",
      "stack": "Webflow · GSAP · Lenis",
      "dna": "Trata cada proyecto como una nota de revista: color sacado del propio local, el número como protagonista (60 m²) y una lista numerada que de verdad es una secuencia de trabajo. El grano y el logo en travertino traen lo material a la pantalla.",
      "prompt": "Diseñá una página de proyecto con la dirección visual de Mersi Architecture (mersi-architecture.com, proyecto Aurélien Cohen).\nRubro: interiorismo de lujo silencioso; cada proyecto se cuenta como una nota de revista.\nTipografía: display ancha y geométrica para el nombre del cliente y los números (Doner; en Google: Archivo con ancho 115 en 700), texto en grotesk 500 (Switzer; en Google: Hanken Grotesk).\nPaleta: fondo arena #EDE7DE, texto #1A1A1A y un color sólido sacado del proyecto (naranja #DC8B3F o terracota #AE4F2D) con grano encima.\nLayout en paneles: mitad izquierda de color sólido con lugar y año arriba, una foto chica enmarcada al centro y el nombre del cliente enorme abajo; mitad derecha con la foto del espacio a sangre.\nDespués: un párrafo corto, una lista numerada de servicios (01 a 05) separada por líneas de 1px y el dato del proyecto en grande (“60 m²”).\nNav en mayúscula mínima arriba a la derecha.\nMovimiento: scroll suave (Lenis), texto que entra palabra por palabra (GSAP SplitText), paneles que se desplazan en horizontal.\nAdaptalo a: [tu proyecto]."
    },
    {
      "id": "oharchitecture",
      "name": "OH Architecture",
      "url": "https://www.oharchitecture.com.au/",
      "rubro": "Arquitectura",
      "atus": false,
      "tags": ["claro","grotesk","foto","mayúsculas","paréntesis"],
      "likes": "",
      "avoid": "",
      "shots": ["img/oharchitecture.jpg","img/oharchitecture-2.jpg"],
      "fonts": ["PP Neue Montreal — todo, de 200 a 800; títulos en mayúscula 500 con tracking -0.03em · alt. Google: Host Grotesk o Hanken Grotesk"],
      "palette": ["#FCFCFC fondo","#000000 texto","#545454 secundario","#D30000 rojo mínimo"],
      "layout": "Hero a sangre con la foto del proyecto destacado y el nombre del estudio enorme arriba a la izquierda; una fila de datos (proyecto destacado · nombre · año · ver proyecto) cruza la foto a media altura y la frase del estilo va abajo a la izquierda. Después, mucho blanco, texto en una columna angosta y títulos gigantes en mayúscula (FEATURED).",
      "motion": "Loader negro con OH gigante, scroll suave (Lenis) y GSAP. Botones en pastilla negra con un circulito. Etiquetas entre paréntesis: (ARCHITECTURE + INTERIOR DESIGN STUDIO), (06), (SCROLL DOWN).",
      "stack": "Webflow · GSAP · Lenis",
      "dna": "Una sola familia alcanza: el mismo grotesk hace de logo, titular, dato y botón; solo cambian tamaño y caja. Los paréntesis como sistema de etiquetas y una foto que manda le dan tono de estudio serio.",
      "prompt": "Diseñá una web con la dirección visual de OH Architecture (oharchitecture.com.au).\nRubro: estudio de arquitectura e interiores, sobrio y seguro.\nTipografía: una sola grotesk neo (PP Neue Montreal; en Google: Host Grotesk) para todo. Nombre del estudio enorme con tracking -0.04em, títulos de sección gigantes en mayúscula, texto en una columna angosta de 16 a 18px.\nPaleta: blanco #FCFCFC, negro #000000, gris #545454 para lo secundario y un rojo #D30000 solo en detalles mínimos.\nHero: foto del proyecto destacado a sangre; arriba a la izquierda el nombre del estudio enorme en blanco; una fila de datos cruza la foto a media altura (Proyecto destacado · Nombre · Año · Ver proyecto); abajo a la izquierda una frase sobre el estilo.\nSistema de etiquetas entre paréntesis en mayúscula chica: (ESTUDIO), (06), (SCROLL).\nBotones en pastilla negra con un círculo chico al lado del texto.\nMovimiento: loader corto con las iniciales gigantes, scroll suave (Lenis), títulos que entran por línea.\nAdaptalo a: [tu proyecto]."
    },
    {
      "id": "juliamarro",
      "name": "Julia Marro",
      "url": "https://juliamarro.com/",
      "rubro": "Música",
      "atus": false,
      "tags": ["oscuro","foto","grano","verde","mayúsculas"],
      "likes": "",
      "avoid": "",
      "shots": ["img/juliamarro.jpg","img/juliamarro-2.jpg"],
      "fonts": ["Poppins — todo; el nombre en 200 contra 700, en mayúscula con tracking -0.035em · Google Fonts"],
      "palette": ["#0A0A0B fondo","#F2EFEA texto","#8EDB2E acento verde","#8FC0A9 verde salvia","#375542 verde profundo"],
      "layout": "Hero a pantalla completa con foto en blanco y negro con grano y el nombre enorme abajo a la izquierda: JULIA en 200 y MARRO en 700. Nav simple arriba a la derecha. Secciones con títulos que repiten el contraste fino/bold (ABOUT ME) y fotos en collage superpuestas (pasaporte, retratos).",
      "motion": "Reproductor de audio fijo abajo a la derecha con play verde, scroll suave (Lenis) y entradas con GSAP.",
      "stack": "GSAP · Lenis",
      "dna": "El contraste de pesos en una sola fuente (Poppins 200 contra 700) arma la identidad sin logo. La foto con grano y el reproductor siempre visible hacen que la web se sienta como escuchar el disco.",
      "prompt": "Diseñá una web con la dirección visual de Julia Marro (juliamarro.com), para una artista o productora musical.\nTipografía: Poppins en todo. Nombre gigante en mayúscula con contraste de pesos: nombre en 200, apellido en 700, tracking -0.035em. Títulos de sección con la misma lógica (ABOUT en 200 + ME en 700).\nPaleta: fondo #0A0A0B, texto #F2EFEA, acento verde #8EDB2E solo en el play y en estados activos; verdes de apoyo #8FC0A9 y #375542 para una sección de color.\nHero: foto en blanco y negro con grano a pantalla completa, el nombre abajo a la izquierda y el rol (“Producer · Artist.”) abajo a la derecha.\nReproductor de audio fijo abajo a la derecha, en pastilla oscura, con play verde.\nSecciones con fotos en collage superpuestas (retratos, documentos) al lado de texto en 300 con buen interlineado.\nMovimiento: scroll suave (Lenis), títulos que entran por línea, fotos que se desplazan apenas al scrollear.\nAdaptalo a: [tu proyecto]."
    },
    {
      "id": "cactus",
      "name": "Cactus Estudio",
      "url": "https://cactusestudio.com/",
      "rubro": "Estudio creativo",
      "atus": false,
      "tags": ["oscuro","grano","lima","humor","tuyo"],
      "likes": "",
      "avoid": "",
      "shots": ["img/cactus.jpg","img/cactus-2.jpg"],
      "fonts": ["Poppins — todo; titulares en 700 minúscula con tracking muy negativo (-0.1em) · Google Fonts","Script con brillo — una sola palabra (afuera) para el contraste · alt. Google: Pinyon Script"],
      "palette": ["#191919 fondo","#F6F6F6 texto","#7BE600 verde lima","#EBEBEB claro"],
      "layout": "Hero con el logotipo gigante en textura de impresión gastada ocupando todo el ancho y el remate debajo: “no te quedes” en lima bold + “afuera” en script con brillo. Nav en minúscula con el contacto en un recuadro. Servicios para elegir y consultar juntos por WhatsApp, y objetos retro recortados en blanco y negro (un celular viejo con el logo). Firma: formada por Atus y cami.",
      "motion": "GSAP + Lenis, videos cortos en loop, un chiste de etiqueta de advertencia (ATENCIÓN: contiene diseño).",
      "stack": "GSAP · Lenis",
      "dna": "Tu agencia con cami. Tiene humor y textura: el logo gastado, el bold apretado contra el script y los objetos retro la sacan de lo corporativo. Es la referencia más cercana a tu propia voz.",
      "prompt": "Diseñá una web con la dirección visual de Cactus (cactusestudio.com).\nRubro: agencia de diseño gráfico y multimedia joven, con humor.\nTipografía: Poppins en 700 para titulares, en minúscula y con tracking muy negativo (-0.1em); texto en 300 y 400. Una sola palabra en script con brillo (en Google: Pinyon Script) para el remate.\nPaleta: fondo #191919, texto #F6F6F6 y un verde lima #7BE600 como único acento.\nHero: el logotipo gigante a todo el ancho con textura de impresión gastada (grano, bordes comidos) y debajo el remate: dos palabras en lima bold + una en script blanca con brillo.\nNav en minúscula; el contacto en un recuadro de borde blanco.\nServicios como opciones que se eligen y se consultan todas juntas por WhatsApp.\nObjetos retro recortados en blanco y negro (un celular viejo con el logo) y un chiste de etiqueta de advertencia (“ATENCIÓN: contiene diseño”).\nMovimiento: scroll suave (Lenis), GSAP, videos cortos en loop.\nAdaptalo a: [tu proyecto]."
    }
  ],
  "sources": [
    {
      "name": "CSS Design Awards",
      "url": "https://www.cssdesignawards.com/",
      "note": "Muy buena. Webs premiadas con buen nivel de detalle en UI e interacción.",
      "bestFor": ["premiadas","detalle"],
      "fav": true
    },
    {
      "name": "Minimal Gallery",
      "url": "https://minimal.gallery/",
      "note": "Muy buena. Webs minimalistas y limpias, ideal para tipografía y aire.",
      "bestFor": ["minimal","tipografía"],
      "fav": true
    },
    {
      "name": "Savee",
      "url": "https://savee.com/",
      "note": "Como Pinterest pero para creativos, mucho mejor. Para armar moodboards.",
      "bestFor": ["moodboards","imágenes"],
      "fav": true
    },
    {
      "name": "Awwwards",
      "url": "https://www.awwwards.com/",
      "note": "Premios diarios (Site of the Day). Lo último en interacción y movimiento.",
      "bestFor": ["tendencias","interacción"],
      "fav": false
    },
    {
      "name": "Site of Sites",
      "url": "https://www.siteofsites.co/?p=1",
      "note": "Directorio enorme de webs que se recorre rápido.",
      "bestFor": ["volumen","variedad"],
      "fav": false
    },
    {
      "name": "Land-book",
      "url": "https://land-book.com/",
      "note": "Landing pages ordenadas por categoría y estilo.",
      "bestFor": ["landings","categorías"],
      "fav": false
    },
    {
      "name": "One Page Love",
      "url": "https://onepagelove.com/",
      "note": "Sitios de una sola página: portfolios, eventos y productos.",
      "bestFor": ["one page","portfolios"],
      "fav": false
    },
    {
      "name": "Fonts In Use",
      "url": "https://fontsinuse.com/",
      "note": "Buena para ver tipografías y cómo funcionan en piezas reales.",
      "bestFor": ["tipografía","pares de fuentes"],
      "fav": false
    },
    {
      "name": "Behance",
      "url": "https://www.behance.net/search/projects/web%20design",
      "note": "Ejemplos reales y específicos: portfolios y proyectos completos.",
      "bestFor": ["casos reales","portfolios"],
      "fav": false
    },
    {
      "name": "ecomm.design",
      "url": "https://ecomm.design/",
      "note": "Buena para ecommerce.",
      "bestFor": ["ecommerce","tiendas"],
      "fav": false
    },
    {
      "name": "21st.dev",
      "url": "https://21st.dev/",
      "note": "Componentes de UI para ver y copiar: heros, menús, botones, cards. Está buena para components.",
      "bestFor": ["componentes","UI"],
      "fav": false
    }
  ],
  "taste": {
    "summary": "Me gustan las webs donde la tipografía hace el trabajo: grotesk enorme y apretada, una base casi monocroma con un solo acento y fotos o texturas que le dan cuerpo. Sobrias, pero con un detalle que te frena.",
    "rules": ["Grotesk protagonista a tamaño enorme con tracking negativo (Neue Montreal, Neue Haas, Diatype, Switzer, Poppins): 7 de 8. Varsity es la excepción, con serif.","Contraste de pesos dentro de una misma familia, fino contra bold (Julia Marro, Cactus).","Base casi monocroma con un único acento: lima o verde ácido en 4 de 8 (Room & Pillar, Varsity, Julia Marro, Cactus).","Fotografía editorial a sangre, muchas veces en blanco y negro: 5 de 8.","Grano o textura sobre fondos lisos: 4 de 8 (Juan Mora, Mersi, Julia Marro, Cactus).","Metadata como diseño: fecha y hora en vivo, contadores (01/05), etiquetas entre paréntesis o corchetes en mono.","Grillas suizas marcadas con líneas de 1px (Varsity, Juan Mora, Mersi).","Scroll suave y animación cuidada: Lenis en 5 de 8 y GSAP en 5 de 8."],
    "avoid": ["Intros y loaders largos antes de ver el contenido (lo marcaste en Ledup).","Diseño con cara de IA: cards redondeadas con sombra, gradientes, todo centrado, etiquetas en mayúscula arriba de cada sección.","Más de un color de acento compitiendo.","Fuentes por defecto sin carácter (Inter, Arial) como protagonistas."],
    "brief": "Diseñá con el gusto de Atus:\n- Tipografía protagonista: una grotesk neo (PP Neue Montreal, Neue Haas Grotesk, ABC Diatype; en Google Fonts: Host Grotesk, Hanken Grotesk o Poppins) a tamaño grande con tracking negativo (-0.03em a -0.04em). Contraste de pesos dentro de la misma familia (200 contra 700). Mono chica para datos y etiquetas.\n- Color: base casi monocroma (negro cálido entre #0A0A0B y #1A1A1A, o blanco roto como #F2EFEA) con UN solo acento fuerte (lima o verde ácido tipo #8EDB2E o #DBFD85, o un tono tierra si el rubro lo pide). Sin gradientes.\n- Imagen: fotografía editorial a sangre, en blanco y negro o con grano; textura sutil de ruido sobre fondos lisos.\n- Grilla: suiza, con líneas de 1px que dividen paneles; columnas asimétricas; mucho aire.\n- Detalles: metadata como diseño (fecha, hora, contadores 01/05, etiquetas entre paréntesis o corchetes en mono chica).\n- Movimiento: scroll suave (Lenis) + GSAP; texto que entra por línea o por palabra; hovers que cambian la imagen; transiciones de 200 a 600 ms con ease-out. Sin intros ni loaders largos.\n- Tono: sobrio y premium, con un detalle que te frena (un logo con textura, una palabra en otra tipografía, un objeto 3D o retro).\n- Evitar: cards redondeadas con sombra, etiquetas en mayúscula en cada sección, todo centrado, íconos genéricos, más de un acento."
  }
};
