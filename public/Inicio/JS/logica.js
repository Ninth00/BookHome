const container = document.querySelector(".container");
const btnSignIn = document.getElementById("btn-sign-in");
const btnSignUp = document.getElementById("btn-sign-up");
const formSignIn = document.querySelector(".sign-in");
const formSignUp = document.querySelector(".sign-up");
// Mostrar el modal al dar clic en el enlace
    const abrirModal = document.getElementById('abrirModal');
    const modal = document.getElementById('modalTerminos');
    const cerrarModal = document.getElementById('cerrarModal');

    abrirModal.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'flex';
    });

    cerrarModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
function validateName(name) {
    const regex = /^[a-zA-Z\s]{1,30}$/;
    return regex.test(name);
}

function validateTelefono(telefono) {
    const regex = /^[0-9]{10}$/;
    return regex.test(telefono);
}

function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return regex.test(email);
}

function validatePassword(password) {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,16}$/;
    return regex.test(password);
}


function showAlert(icon, title, text) {
    document.body.style.overflow = 'hidden';
    Swal.fire({
        icon: icon,
        title: title,
        text: text,
        confirmButtonColor: '#3AB397',
    }).then(() => {
        document.body.style.overflow = 'auto';
    });
}

// Función para verificar que los campos no estén vacíos ni contengan solo espacios
function isEmptyOrSpaces(str) {
    return str.trim().length === 0;
}

// Registro con validación de nombre, numero y correo únicos
formSignUp.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = formSignUp.querySelector('input[placeholder="Nombre"]').value.trim();
    const rol = formSignUp.querySelector('select').value;
    const telefono = formSignUp.querySelector('input[placeholder="Telefono"]').value.trim();
    const email = formSignUp.querySelector('input[placeholder="Email"]').value.trim();
    const password = formSignUp.querySelector('input[placeholder="Contraseña"]').value.trim();
    const confirmPassword = formSignUp.querySelector('input[placeholder="Confirmar Contraseña"]').value.trim();

    // Verificar que no haya campos vacíos o solo con espacios
    if (isEmptyOrSpaces(name) || isEmptyOrSpaces(email) || isEmptyOrSpaces(password) || isEmptyOrSpaces(confirmPassword)) {
        showAlert('error', 'Campos vacíos', 'Por favor, llene todos los campos sin dejar espacios vacíos.');
        return;
    }

    if (!validateName(name)) {
        showAlert('error', 'Nombre inválido', 'El nombre solo puede contener letras y un máximo de 30 caracteres.');
        return;
    }

    if (!validateTelefono(telefono)) {
        showAlert('error', 'Telefono inválido', 'Por favor ingrese los datos correctamente, el telefono solo puede tener numeros y 10 caracteres');
        return;
    }

    if (!validateEmail(email)) {
        showAlert('error', 'Email inválido', 'Por favor, ingrese un correo válido.');
        return;
    }

    if (!validatePassword(password)) {
        showAlert('error', 'Contraseña inválida', 'La contraseña debe tener entre 8 y 16 caracteres, al menos una mayúscula, un carácter especial y un número.');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('error', 'Contraseñas no coinciden', 'Por favor, asegúrese de que ambas contraseñas sean iguales.');
        return;
    }

    // Verificar si el usuario ya existe
    fetch(`/verificarUsuario?email=${email}&nombre=${name}`)
        .then(response => response.json())
        .then(data => {
            if (data.emailExistente) {
                showAlert('error', 'Email duplicado', 'Este correo ya está registrado.');
            } else if (data.nombreExistente) {
                showAlert('error', 'Nombre duplicado', 'Este nombre de usuario ya está registrado.');
            } else if (data.numeroExistente) {
                showAlert('error', 'Telefono duplicado', 'Este telefono ya está registrado.');
            } else {
                
                if (!document.getElementById('aceptaTerminos').checked) {
                showAlert('warning', 'Términos no aceptados', 'Debes aceptar los términos y condiciones y el aviso de privacidad para registrarte.');
                return; // No continúa
                }
                // Registro del usuario
                fetch("/agregarUsuario", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nombre: name, rol: rol, telefono: telefono, email: email, password: password })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.authenticated) {
                        if(rol === 'arrendador'){
                            window.location.href = '/Arrendador/Arrendador.html'; 
                        }
                        else{
                            window.location.href = '/Estudiante/Estudiante.html';
                        }
                    } else {
                        showAlert('error', 'Error en el registro', 'No se pudo registrar el usuario.');
                    }
                })
                .catch(error => {
                    console.error("Error en la solicitud:", error);
                    showAlert('error', 'Error de conexión', 'Hubo un problema al conectar con el servidor.');
                });
                
            }
        })
        .catch(error => {
            console.error("Error en la solicitud:", error);
            showAlert('error', 'Error de conexión', 'Hubo un problema al conectar con el servidor.');
        });
});

// Validación de inicio de sesión
formSignIn.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = formSignIn.querySelector('input[placeholder="Email"]').value.trim();
    const password = formSignIn.querySelector('input[placeholder="Contraseña"]').value.trim();

    // Verificar que no haya campos vacíos o solo con espacios
    if (isEmptyOrSpaces(email) || isEmptyOrSpaces(password)) {
        showAlert('error', 'Campos vacíos', 'Por favor, ingrese tanto el correo como la contraseña.');
        return;
    }

    if (!validateEmail(email)) {
        showAlert('error', 'Email inválido', 'Por favor, ingrese un correo válido.');
        return;
    }

    if (!validatePassword(password)) {
        showAlert('error', 'Contraseña inválida', 'La contraseña debe tener entre 8 y 16 caracteres, al menos una mayúscula, un carácter especial y un número.');
        return;
    }

    // Hacer una petición para obtener la información del usuario autenticado
    fetch("/usuario")
    .then(response => response.json())
    .then(data => {
        if (data.userId) {
            console.log('Usuario autenticado:', data.username);
        // Aquí puedes redirigir o mostrar el nombre del usuario en el frontend
        } else {
            console.log('Usuario no autenticado');
        }
    }).catch(error => {
        console.error('Error al verificar la sesión', error);
    });


    // Autenticación del usuario
    fetch("/iniciarSesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password, rol: rol })
    })
    .then(response => response.json())
    .then(data => {
        if (data.authenticated) {
            const rol = data.rol;
            if (rol === 'arrendador') {
                formSignIn.reset();
                window.location.href = '/Arrendador/Arrendador.html';
            } else {
                formSignIn.reset();
                window.location.href = '/Estudiante/Estudiante.html';
            }
        } else {
            showAlert('error', 'Error en inicio de sesión', data.message);
        }
    })
    .catch(error => {
        console.error("Error en la solicitud:", error);
        showAlert('error', 'Error de conexión', 'Hubo un problema al conectar con el servidor.');
    });
});

// Alternar entre formularios
btnSignIn.addEventListener("click", () => {
    container.classList.remove("toggle");
});

btnSignUp.addEventListener("click", () => {
    container.classList.add("toggle");
});
