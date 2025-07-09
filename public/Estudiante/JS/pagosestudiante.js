async function mostrarHistorialPagos() {
    const res = await fetch('/api/estudiante/pagos');
    const pagos = await res.json();

    const tabla = document.getElementById("tablaPagos");
    pagos.forEach(p => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${p.tipo_propiedad}</td>
            <td>${p.descripcion}</td>
            <td>$${parseFloat(p.monto).toFixed(2)}</td>
            <td>${new Date(p.fecha_pago).toLocaleString()}</td>
            <td>${p.estado_pago}</td>
        `;
        tabla.appendChild(fila);
    });
}
document.addEventListener("DOMContentLoaded", mostrarHistorialPagos);
