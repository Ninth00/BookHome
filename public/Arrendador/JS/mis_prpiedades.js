document.addEventListener("DOMContentLoaded", () => {
    cargarPropiedades(); // Cargar propiedades al iniciar
});
// Este script obtiene el año actual y lo inserta en el lugar indicado.
document.getElementById("year").textContent = new Date().getFullYear();

function cargarPropiedades() {
    // Arreglar fetch para que agarre el método
    fetch('/obtenerMisPropiedades')
        .then(response => {
            if (!response.ok) throw new Error("Error al cargar las propiedades");
            return response.json();
        })
        .then(data => {
            mostrarPropiedades(data);
        })
        .catch(error => {
            console.error("Error al cargar propiedades:", error);
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

    propiedades.forEach(propiedad => {
        if (idsMostrados.has(propiedad.id_propiedad)) {
            return;  // Si ya se ha mostrado, no lo agregamos nuevamente
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

        const propiedadDiv = document.createElement("div");
        propiedadDiv.className = "propiedad";
        propiedadDiv.innerHTML = `
            <img src="${imagenUrl}" alt="Propiedad" class="propiedad-img">
            <div class="propiedad-info">
                <h3>${tipo_propiedad} en ${colonia}</h3>
                <p><strong>Metros cuadrados: </strong>${metros_cuadrados}</p>
                <p><strong>Habitaciones: </strong> ${habitaciones} <strong>Baños: </strong> ${banios}</p>
                <p><strong>Precio:</strong> $${precio}</p>
                <button onclick="verPropiedad(${propiedad.id_propiedad})">Editar</button>
                <button onclick="EliminarPropiedad(${propiedad.id_propiedad})">Eliminar</button>
            </div>
        `;
        catalogo.appendChild(propiedadDiv);
    });
}



function verPropiedad(id) {
    window.location.href = `editarPropiedad.html?id=${id}`;
}

function EliminarPropiedad(id) {
    // Confirmación de eliminación
    if (!confirm("¿Estás seguro de que deseas eliminar esta propiedad?")) {
        return; // Si el usuario cancela, no hacemos nada
    }

    // Realizar la solicitud DELETE al servidor
    fetch(`/eliminarPropiedad/${id}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Error al eliminar la propiedad");
        }
        return response.text();
    })
    .then(message => {
        // Si se elimina correctamente, mostrar mensaje y actualizar la interfaz
        alert(message);  // Puedes cambiar esto por algún tipo de notificación en tu interfaz
        cargarPropiedades();  // Recargar la lista de propiedades
    })
    .catch(error => {
        console.error("Error al eliminar la propiedad:", error);
        alert("Hubo un error al eliminar la propiedad.");
    });
}
