// Función para mostrar u ocultar el campo de habitaciones según el tipo de propiedad
function toggleHabitaciones() {
    var tipo = document.getElementById('tipo_propiedad').value;
    var habitacionesDiv = document.getElementById('habitaciones-div');
    
    // Si el tipo es "habitacion", ocultamos el campo de habitaciones
    if (tipo === 'habitacion') {
        habitacionesDiv.style.display = 'none';
    } else {
        habitacionesDiv.style.display = 'block';
    }
}

function toggleCompCuarto(){
    var comparte = document.getElementById('compañeros_cuarto').value
    var comparteDiv = document.getElementById('Comparte');
    console.log(comparte)
    //Si comparte es 0 ocultamos el campo de Comparte
    if (comparte === '0'){
        comparteDiv.style.display = 'none';
    }else{
        comparteDiv.style.display = 'block';
    }
}

// Llamamos a la función al cargar la página para configurar el estado inicial

window.onload = toggleHabitaciones;
window.onload = toggleCompCuarto;