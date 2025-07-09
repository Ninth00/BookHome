// Lógica para cerrar sesión
document.getElementById('logout-button').addEventListener('click', async () => {
    try {
      const response = await fetch('/logout', { method: 'GET' });
  
      if (response.ok) {
        // Redirige al usuario a la página de inicio de sesión
        window.location.href = '../Inicio/index.html';
      } else {
        alert('Hubo un error al cerrar la sesión.');
      }
    } catch (error) {
      console.error('Error al cerrar la sesión:', error);
      alert('Error en la comunicación con el servidor.');
    }
  });
  