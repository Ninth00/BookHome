document.addEventListener("DOMContentLoaded", () => {
    cargarFavoritos(); // Cargar propiedades favoritas al iniciar
    document.getElementById("year").textContent = new Date().getFullYear(); // Año en el footer
});

function cargarFavoritos() {
    fetch('/usuario')
        .then(response => {
            if (!response.ok) throw new Error('No autenticado');
            return response.json();
        })
        .then(usuario => {
            return fetch(`/favoritos/propiedades?userId=${usuario.userId}`);
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al obtener favoritos');
            return response.json();
        })
        .then(data => {
            mostrarPropiedades(data);
        })
        .catch(error => {
            console.error('Error al cargar favoritos:', error);
            document.getElementById("catalogoPropiedades").innerHTML = "<p>No se pudieron cargar tus favoritos.</p>";
        });
}

function mostrarPropiedades(propiedades = []) {
    const catalogo = document.getElementById("catalogoPropiedades");
    catalogo.innerHTML = ''; // Limpiar el catálogo

    if (propiedades.length === 0) {
        catalogo.innerHTML = '<p>No se encontraron propiedades.</p>';
        return;
    }

    // Crear un conjunto de ids para evitar duplicados
    const idsMostrados = new Set();

    // Para cada propiedad, comprobamos si está en favoritos
    (async () => {
        for (const propiedad of propiedades) {
            if (idsMostrados.has(propiedad.id_propiedad)) {
                continue;  // Si ya se ha mostrado, no lo agregamos nuevamente
            }

            idsMostrados.add(propiedad.id_propiedad);  // Añadir el id a la lista de mostrados

            // Asignar valores con un fallback a "No disponible" si los campos están vacíos
            const colonia = propiedad.colonia || 'No disponible';
            const tipo_propiedad = propiedad.tipo_propiedad || 'No disponible';
            const precio = propiedad.precio || 'No disponible';
            const metros_cuadrados = propiedad.metros_cuadrados || 'No disponible';
            const habitaciones = propiedad.habitaciones || 'No disponible';
            const banios = propiedad.banos || 'No disponible';
            const imagenUrl = propiedad.url_imagen || '/uploads/default.jpg';

            // Crear el div para la propiedad
            const propiedadDiv = document.createElement("div");
            propiedadDiv.className = "propiedad";

            // Comprobar si ya está en favoritos
            try {
                const isFavorito = await checkFavorito(propiedad.id_propiedad);

                // Crear el botón de favoritos
                const favoritoBtn = document.createElement('button');
                favoritoBtn.innerHTML = isFavorito 
                    ? `<i class="fa-solid fa-heart"></i>` // Quitar de favoritos
                    : `<i class="fa-regular fa-heart"></i>`; // Agregar a favoritos

                // Asignar el evento de clic al botón
                favoritoBtn.addEventListener('click', function() {
                    console.log(`Clic en el botón de favoritos para la propiedad ${propiedad.id_propiedad}`);
                    if (isFavorito) {
                        quitarFavorito(propiedad.id_propiedad, favoritoBtn); // Pasamos el botón para actualizar el ícono
                    } else {
                        agregarFavorito(propiedad.id_propiedad, favoritoBtn); // Pasamos el botón para actualizar el ícono
                    }
                });

                // Completar la estructura de la propiedad
                propiedadDiv.innerHTML = `
                    <div class="propiedad-img-container">
                        <img src="${imagenUrl}" alt="Propiedad" class="propiedad-img">
                    </div>
                    <div class="propiedad-info">
                        <h3>${tipo_propiedad} en ${colonia}</h3>
                        <p><strong>Metros cuadrados: </strong>${metros_cuadrados}</p>
                        <p><strong>Habitaciones: </strong> ${habitaciones} <strong>Baños: </strong> ${banios}</p>
                        <p><strong>Precio:</strong> $${precio}</p>
                        <button onclick="verDetalles(${propiedad.id_propiedad})">Ver detalles</button>
                    </div>
                `;
                
                // Insertar el botón de favoritos directamente en la estructura HTML
                propiedadDiv.querySelector('.propiedad-info').insertBefore(favoritoBtn, propiedadDiv.querySelector('.propiedad-info').firstChild);

                catalogo.appendChild(propiedadDiv);
            } catch (error) {
                console.error("Error al comprobar si es favorito:", error);
            }
        }
    })();
}

function verDetalles(id) {
    window.location.href = `/Estudiante/detalles.html?id=${id}`;
}

function checkFavorito(idPropiedad) {
    console.log(`Verificando si la propiedad ${idPropiedad} está en favoritos...`);
    return fetch('/usuario')
        .then(response => {
            if (!response.ok) throw new Error('No autenticado');
            return response.json();
        })
        .then(data => {
            return fetch(`/favoritos?userId=${data.userId}&propiedadId=${idPropiedad}`)
                .then(response => {
                    if (!response.ok) throw new Error('Error al obtener el estado de favorito');
                    return response.json();
                })
                .then(favoritoData => favoritoData.isFavorito || false);
        })
        .catch(error => {
            console.error("Error al verificar si es favorito:", error);
            return false;
        });
}

function agregarFavorito(idPropiedad, favoritoBtn) {
    console.log(`Agregando la propiedad ${idPropiedad} a favoritos...`);
    fetch(`/favoritos/agregar?id_propiedad=${idPropiedad}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_propiedad: idPropiedad })
    })
    .then(response => {
        if (!response.ok) throw new Error('Error al agregar favorito');
        return response.json();
    })
    .then(data => {
        console.log('Favorito agregado:', data);
        // Actualizamos el ícono para reflejar que es un favorito
        favoritoBtn.innerHTML = `<i class="fa-solid fa-heart"></i>`; // Cambiar a corazón lleno
        // Actualizamos solo el catálogo de propiedades
        cargarFavoritos();
    })
    .catch(error => {
        console.error('Error al agregar favorito:', error);
    });
}

function quitarFavorito(idPropiedad, favoritoBtn) {
    console.log(`Quitando la propiedad ${idPropiedad} de favoritos...`);
    fetch(`/favoritos/quitar?id_propiedad=${idPropiedad}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        if (!response.ok) throw new Error('Error al quitar favorito');
        return response.json();
    })
    .then(data => {
        console.log('Favorito quitado:', data);
        // Actualizamos el ícono para reflejar que ya no es un favorito
        favoritoBtn.innerHTML = `<i class="fa-regular fa-heart"></i>`; // Cambiar a corazón vacío
        // Actualizamos solo el catálogo de propiedades
        cargarFavoritos();
    })
    .catch(error => {
        console.error('Error al quitar favorito:', error);
    });
}
