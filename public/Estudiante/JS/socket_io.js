// socket_io.js (CORREGIDO Y FINALIZADO PARA AMBAS VISTAS)

const socket = io();
let id_usuario = null;
let id_conversacion = null;
let id_propiedad = null;
let id_arrendador = null;

const chatBox = document.getElementById('chat-box');
const messagesDiv = document.getElementById('messages');

// Obtener ID de la propiedad desde la URL
const urlParams = new URLSearchParams(window.location.search);
id_propiedad = urlParams.get('id');

// Obtener usuario actual
fetch('/usuario')
  .then(res => res.json())
  .then(user => {
    id_usuario = user.userId;

    // Obtener ID del arrendador desde la propiedad
    fetch(`/api/propiedad/${id_propiedad}`)
      .then(res => res.json())
      .then(propiedad => {
        id_arrendador = propiedad.id_usuario;

        // Activar botón de chat
        document.getElementById('start-chat').onclick = () => {
          chatBox.classList.remove('hidden');

          // Iniciar conversación
          fetch('/conversacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id_arrendador,
              id_estudiante: id_usuario,
              id_propiedad
            })
          })
            .then(res => res.json())
            .then(data => {
              id_conversacion = data.id_conversacion;

              // Unirse a la sala antes de enviar o recibir
              socket.emit('unirseSala', `chat-${id_conversacion}`);

              // Escuchar mensajes justo después de unirse
              configurarSocketListener();

              // Cargar historial
              fetch(`/mensajes/${id_conversacion}`)
                .then(res => res.json())
                .then(mensajes => {
                  messagesDiv.innerHTML = '';
                  mensajes.forEach(msg => {
                    agregarMensaje(msg.mensaje, msg.id_usuario == id_usuario);
                  });
                  messagesDiv.scrollTop = messagesDiv.scrollHeight;
                });
            });
        };
      });
  });

// Cerrar chat
const closeBtn = document.getElementById('close-chat');
if (closeBtn) {
  closeBtn.onclick = () => {
    chatBox.classList.add('hidden');
    messagesDiv.innerHTML = '';
    socket.off('nuevoMensaje');
  };
}

function agregarMensaje(mensaje, esPropio) {
  const msgEl = document.createElement('div');
  msgEl.classList.add('mensaje');
  msgEl.classList.add(esPropio ? 'mensaje-propio' : 'mensaje-otro');
  msgEl.textContent = esPropio ? `Tú: ${mensaje}` : `Arrendador: ${mensaje}`;
  messagesDiv.appendChild(msgEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('inputMessage');
  const mensaje = input.value.trim();

  if (mensaje && id_conversacion) {
    fetch('/mensaje', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_conversacion,
        id_usuario,
        mensaje
      })
    })
      .then(res => res.json())
      .then(() => {
        input.value = '';
        ultimoMensaje = mensaje; // registrar el ultimo enviado para no duplicarlo
      });
  }
}

document.getElementById('inputMessage').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

let ultimoMensaje = '';
function configurarSocketListener() {
  socket.off('nuevoMensaje');
  socket.on('nuevoMensaje', (data) => {
    if (!id_conversacion || data.id_conversacion !== id_conversacion) return;
    const esPropio = data.id_usuario === id_usuario;
    if (esPropio && data.mensaje === ultimoMensaje) return;
    agregarMensaje(data.mensaje, esPropio);
  });
}
