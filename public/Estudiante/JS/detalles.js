async function cargarDetallesPropiedad() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        console.error("ID de la propiedad no encontrado en la URL");
        return;
    }

    try {
        const response = await fetch(`/obtenerDetallesPropiedad?id=${id}`);
        if (!response.ok) {
            throw new Error("Error al cargar los detalles");
        }

        const propiedad = await response.json();
        console.log("Propiedad recibida:", propiedad); // Confirmamos que los datos llegan
        mostrarDetalles(propiedad);
    } catch (error) {
        console.error("Error al obtener los detalles de la propiedad:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDetallesPropiedad();
});

function mostrarDetalles(propiedad) {
    const detallesDiv = document.getElementById("detallesPropiedad");

    if (!detallesDiv) {
        console.error("No se encontró el contenedor de detalles");
        return;
    }

    // Asegurarnos de que propiedad.fotos sea un array (si es undefined o no es un array, lo convertimos en uno)
    const imagenes = Array.isArray(propiedad.fotos) ? propiedad.fotos : [propiedad.fotos];

    console.log("IMAGENES 1:", propiedad.fotos); // Log para ver qué tiene propiedad.fotos
    console.log("IMAGENES 2:", imagenes); // Log para verificar el array de imágenes

    // Verificar que el array no esté vacío
    if (imagenes.length === 0) {
        detallesDiv.innerHTML = "<p>No hay imágenes disponibles para esta propiedad.</p>";
        return;
    }

    // Crear el HTML para las imágenes
    const imagenesHtml = imagenes.map(url => `
        <div class="imagen-item">
            <img src="${url}" alt="Imagen de la propiedad" class="foto-detalle">
        </div>
    `).join('');  // Usamos 'join' para que las imágenes se agreguen en una sola cadena de texto

    detallesDiv.innerHTML = `
    <div class="detalle-contenedor">
        <!-- Contenedor de las imágenes (FLEX PARA FILA HORIZONTAL) -->
        <div class="imagenes-contenedor">
            ${imagenesHtml}
        </div>

        <!-- Información -->
        <div class="info-detalle">
            <h1>${propiedad.tipo_propiedad || "Tipo no disponible"}</h1>
            <p><strong>Precio:</strong> ${propiedad.precio ? `$${Number(propiedad.precio).toLocaleString()}` : "No disponible"}</p>
            <p><strong>Descripción:</strong> ${propiedad.descripcion || "No disponible"}</p>
            <p><strong>Metros cuadrados:</strong> ${propiedad.metros_cuadrados ? `${Number(propiedad.metros_cuadrados).toLocaleString()} m²` : "No disponible"}</p>
            <p><strong>Habitaciones:</strong> ${propiedad.habitaciones || "No disponible"}</p>
            <p><strong>Baños:</strong> ${propiedad.banos || "No disponible"}</p>
            <p><strong>Número de compañeros:</strong> ${propiedad.companeros_cuarto || "Sin compañeros de cuarto"}</p>
            <p><strong>Dirección:</strong> 
                ${propiedad.calle || ""} ${propiedad.numero_exterior || ""}${propiedad.numero_interior ? `, Int. ${propiedad.numero_interior}` : ""}, 
                ${propiedad.colonia || ""}, ${propiedad.delegacion || ""}, 
                C.P. ${propiedad.codigo_postal || ""}
            </p>
            <p><strong>Reglas:</strong> ${propiedad.reglas || ""}</p>

            <!-- Botón de PayPal -->
            <div id="paypal-button-container" style="margin-top: 20px;"></div>
        </div>
    </div>
`;

    // Crear dirección para geocodificar
const direccion = `${propiedad.calle} ${propiedad.numero_exterior}, ${propiedad.colonia}, ${propiedad.delegacion}, México`;
console.log("Dirección geocodificada:", direccion);

fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}`)
  .then(response => response.json())
  .then(data => {
    console.log("Resultado de Nominatim:", data);
    if (data.length === 0) {
      document.getElementById("map").innerHTML = "<p>No se pudo cargar el mapa para esta propiedad.</p>";
      return;
    }

    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);

    const map = L.map('map').setView([lat, lon], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    L.marker([lat, lon]).addTo(map)
      .bindPopup('Ubicación de la propiedad')
      .openPopup();
  })
  .catch(error => {
    console.error("Error en la geocodificación:", error);
  });

  document.addEventListener("DOMContentLoaded", async () => {
    await cargarDetallesPropiedad(); // Esperamos a que la propiedad se cargue

    const urlParams = new URLSearchParams(window.location.search);
    const id_propiedad = urlParams.get('id');

    if (!id_propiedad) return;

    
});

// Validar si se puede pagar antes de renderizar el botón 
fetch(`/api/puede-pagar/${id_propiedad}`)
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById('paypal-button-container');

        if (data.puedePagar) {
            // Agregar botón de PayPal
            paypal.Buttons({
                createOrder: function(data, actions) {
                    return fetch('/api/paypal/create-order', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id_propiedad })
                    })
                    .then(res => {
                        if (!res.ok) {
                            return res.json().then(errorData => {
                                throw new Error(errorData.error || 'Error desconocido al crear orden');
                            });
                        }
                        return res.json();
                    })
                    .then(data => data.orderID)
                    .catch(err => {
                        container.innerHTML = `
                            <p style="color: darkred; font-weight: bold;">
                                ❌ ${err.message}
                            </p>
                        `;
                        throw err; // Evita que continúe el flujo
                    });
                },
                onApprove: function(data, actions) {
                    return fetch('/api/paypal/capture-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ orderID: data.orderID })
                    })
                    // Alertas
                    .then(res => res.json())
                    .then(details => {
                        Swal.fire({
                        icon: 'succes',
                        title: 'Pago realizado con éxito',
                        text: 'Disfruta tu nuevo hogar',
                        });
                        

                        // Desactivar botón por 30 segundos
                        container.innerHTML = '<p>Gracias por tu pago. Disfruta tu nuevo hogar.</p>';

                        setTimeout(() => {
                            location.reload(); // O volver a consultar /api/puede-pagar si deseas
                        }, 30000);
                    });
                },
                onError: function(err) {
                    console.error('Error en el pago:', err);
                    Swal.fire({
                        icon: 'error',
                        title: 'Ocurrió un error al procesar el pago.',
                        text: 'Intentalo nuevamente',
                        });
                }
            }).render('#paypal-button-container');
        } else {
            // Si no se puede pagar (ya se pagó), mostrar mensaje genérico
            container.innerHTML = `
                <p style="color: darkred; font-weight: bold;">
                    Esta propiedad se encuentra actualmente en renta.
                </p>
            `;
        }
    })
    .catch(err => {
        console.error('Error al verificar si se puede pagar:', err);
        document.getElementById('paypal-button-container').innerHTML = `
            <p style="color: red;">No se pudo verificar el estado del pago. Intenta más tarde.</p>
        `;
    });

}
