document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formFiltros");
    const catalogo = document.getElementById("catalogoPropiedades");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const precioMin = form.precioMin.value.trim();
        const precioMax = form.precioMax.value.trim();
        const colonia = form.colonia.value.trim();
        const tipo = form.tipo.value;
        const comparte = form.comparte.value;

        // Validaciones
        if ((precioMin && isNaN(precioMin)) || (precioMax && isNaN(precioMax))) {
            alert("El precio mínimo y máximo deben ser números válidos.");
            return;
        }

        if (precioMin && precioMax && Number(precioMin) > Number(precioMax)) {
            alert("El precio mínimo no puede ser mayor que el precio máximo.");
            return;
        }

        const params = new URLSearchParams();
        if (precioMin) params.append("precioMin", precioMin);
        if (precioMax) params.append("precioMax", precioMax);
        if (colonia) params.append("colonia", colonia);
        if (tipo) params.append("tipo", tipo);
        if (comparte !== "") params.append("comparte", comparte);

        try {
            const response = await fetch(`/filtrarPropiedades?${params.toString()}`);
            if (!response.ok) throw new Error("Error al filtrar propiedades");

            const propiedadesFiltradas = await response.json();
            mostrarPropiedades(propiedadesFiltradas); // Usa la misma función global de catalogo.js
        } catch (error) {
            console.error("Error al aplicar filtros:", error);
            catalogo.innerHTML = "<p>Error al obtener resultados. Intenta más tarde.</p>";
        }
    });
});